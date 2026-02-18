import OpenAI from "openai";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

type ConversationPhase =
  | "greeting"
  | "intro"
  | "deep_dive"
  | "cross_exam"
  | "closing"
  | "completed";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  shouldFollowUp: boolean;
  followUpReason?: string;
}

interface SessionContext {
  interviewType: string;
  resumeText: string | null;
  jobDescription: string | null;
  totalQuestions: number;
  language: string;
  candidateName?: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "en-IN": "English (Indian)",
  "hi": "Hindi",
  "es": "Spanish",
  "fr": "French",
  "de": "German",
  "pt": "Portuguese",
  "ja": "Japanese",
  "ko": "Korean",
  "zh": "Chinese (Mandarin)",
  "ar": "Arabic",
  "it": "Italian",
  "nl": "Dutch",
  "ru": "Russian",
  "tr": "Turkish",
};

const QUESTION_PATTERNS = [
  {
    name: "Scenario-Based",
    instruction: `Ask a HYPOTHETICAL SCENARIO question: "Imagine you are [specific situation relevant to their role]. How would you handle it?" or "Suppose [challenging work scenario]. Walk me through your approach step by step."`,
  },
  {
    name: "STAR Behavioral",
    instruction: `Ask a STAR-method behavioral question: "Tell me about a specific time when you [faced a challenge/achieved something/dealt with conflict]. What was the situation, what did you do, and what was the outcome?"`,
  },
  {
    name: "Problem-Solving",
    instruction: `Ask a PROBLEM-SOLVING question: "How would you debug/fix/solve [specific technical or work problem]?" or "If you encountered [specific issue in their domain], what steps would you take to resolve it?"`,
  },
  {
    name: "Opinion & Strategy",
    instruction: `Ask an OPINION or STRATEGY question: "What's your approach to [specific practice in their field]?" or "How do you decide between [two approaches/tools/strategies]? What factors do you consider?"`,
  },
  {
    name: "Deep Technical",
    instruction: `Ask a DEEP TECHNICAL question: "Can you explain how [specific technology/concept from their resume] works under the hood?" or "What are the tradeoffs between [two technical approaches] and when would you choose one over the other?"`,
  },
  {
    name: "Past Achievement",
    instruction: `Ask about a PAST ACHIEVEMENT: "What's the project or accomplishment you're most proud of in your career? Walk me through the challenges you faced and how you overcame them."`,
  },
  {
    name: "Failure & Learning",
    instruction: `Ask about FAILURE and LEARNING: "Tell me about a time when something didn't go as planned at work. What happened, what did you learn, and how did it change your approach going forward?"`,
  },
  {
    name: "Leadership & Collaboration",
    instruction: `Ask about LEADERSHIP or COLLABORATION: "Describe a situation where you had to lead a team, mentor someone, or collaborate across departments. How did you ensure alignment and deliver results?"`,
  },
  {
    name: "Real-World Application",
    instruction: `Ask a REAL-WORLD APPLICATION question: "If I gave you [specific task/project relevant to their skills] right now, how would you plan and execute it? What would be your first steps?"`,
  },
  {
    name: "Compare & Contrast",
    instruction: `Ask a COMPARE & CONTRAST question: "You mentioned experience with [skill/tool A]. How does it compare to [alternative B]? When would you recommend one over the other and why?"`,
  },
];

export class ConversationManager {
  private phase: ConversationPhase = "greeting";
  private history: ConversationMessage[] = [];
  private questionIndex = 0;
  private currentQuestion = "";
  private scores: number[] = [];
  private consecutiveFollowUps = 0;
  private maxConsecutiveFollowUps = 2;
  private topicsExplored: string[] = [];
  private extractedKeywords: string[] = [];
  private candidateName = "";
  private context: SessionContext;
  private usedPatterns: number[] = [];
  private resumeProjects: string[] = [];
  private usedProjects: string[] = [];

  constructor(context: SessionContext) {
    this.context = context;
    this.extractCandidateName();
    this.extractResumeProjects();
  }

  getPhase(): ConversationPhase {
    return this.phase;
  }

  getQuestionIndex(): number {
    return this.questionIndex;
  }

  getScores(): number[] {
    return [...this.scores];
  }

  getHistory(): ConversationMessage[] {
    return [...this.history];
  }

  getAverageScore(): number {
    if (this.scores.length === 0) return 0;
    return Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length);
  }

  private getNextPattern(): { name: string; instruction: string } {
    const available = QUESTION_PATTERNS
      .map((p, i) => ({ ...p, idx: i }))
      .filter(p => !this.usedPatterns.includes(p.idx));
    const pool = available.length > 0 ? available : QUESTION_PATTERNS.map((p, i) => ({ ...p, idx: i }));
    if (available.length === 0) this.usedPatterns = [];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.usedPatterns.push(pick.idx);
    return { name: pick.name, instruction: pick.instruction };
  }

  private extractResumeProjects(): void {
    if (!this.context.resumeText) return;
    const text = this.context.resumeText;
    const items: string[] = [];

    const projectPatterns = [
      /(?:project|built|developed|created|designed|implemented|worked on|contributed to|led|managed|launched|deployed)\s*[:\-–]?\s*(.+?)(?:\.|,|\n|$)/gi,
      /(?:^|\n)\s*[-•*]\s*(.+?)(?:\.|,|\n|$)/gm,
    ];
    for (const regex of projectPatterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const item = match[1]?.trim();
        if (item && item.length > 5 && item.length < 120 && !item.match(/^(the|a|an|i|my|our)\s*$/i)) {
          items.push(`[Project] ${item}`);
        }
      }
    }

    const companyPatterns = /(?:worked at|employed at|experience at|company|employer|organization|at\s+)?\s*[-•*]?\s*(.+?)\s*(?:\||–|-|—)\s*(.+?)(?:\n|$)/gi;
    let companyMatch;
    while ((companyMatch = companyPatterns.exec(text)) !== null) {
      const company = companyMatch[1]?.trim();
      const role = companyMatch[2]?.trim();
      if (company && company.length > 2 && company.length < 60 && role && role.length > 2) {
        items.push(`[Company Experience] ${role} at ${company}`);
      }
    }

    const expPatterns = /(?:experience|work history|employment|professional background)\s*[:\-–]?\s*\n([\s\S]*?)(?:\n\n|\n(?=[A-Z]))/gi;
    let expMatch;
    while ((expMatch = expPatterns.exec(text)) !== null) {
      const lines = expMatch[1]?.split("\n").map(l => l.trim()).filter(l => l.length > 10 && l.length < 120);
      if (lines) {
        for (const line of lines.slice(0, 5)) {
          items.push(`[Experience] ${line}`);
        }
      }
    }

    const softwarePatterns = /(?:skills?|technologies?|tech stack|tools?|software|frameworks?|languages?|platforms?|proficient|experienced?\s+(?:in|with))\s*[:\-–]?\s*(.+?)(?:\n|$)/gi;
    let softMatch;
    while ((softMatch = softwarePatterns.exec(text)) !== null) {
      const tools = softMatch[1]?.split(/[,;|•]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
      if (tools) {
        for (const tool of tools) {
          items.push(`[Software/Tool] ${tool}`);
        }
      }
    }

    const seen = new Set<string>();
    this.resumeProjects = items.filter(p => {
      const key = p.toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 40);
    log(`ConversationManager: Extracted ${this.resumeProjects.length} resume items for rotation (projects, software, company experience)`, "conversation");
  }

  private getNextProjectFocus(): string {
    const available = this.resumeProjects.filter(p => !this.usedProjects.includes(p));
    if (available.length === 0) {
      this.usedProjects = [];
      return "";
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    this.usedProjects.push(pick);
    return pick;
  }

  private extractCandidateName(): void {
    if (this.context.candidateName && this.context.candidateName.trim().length > 0) {
      this.candidateName = this.context.candidateName.trim();
      log(`ConversationManager: Using provided candidate name: "${this.candidateName}"`, "conversation");
      return;
    }
    if (!this.context.resumeText) return;

    const skipPatterns = [
      /^curriculum\s*vitae$/i,
      /^resume$/i,
      /^cv$/i,
      /^bio\s*data$/i,
      /^biodata$/i,
      /^personal\s*(info|information|details|data|profile)$/i,
      /^profile$/i,
      /^about\s*me$/i,
      /^contact\s*(info|information|details)?$/i,
      /^professional\s*(summary|profile|resume|cv)$/i,
      /^summary$/i,
      /^objective$/i,
      /^career\s*(objective|summary|profile)$/i,
      /^experience$/i,
      /^education$/i,
      /^skills$/i,
      /^page\s*\d+/i,
      /^\d+$/,
      /^-+$/,
      /^=+$/,
      /^_+$/,
    ];

    const lines = this.context.resumeText.split("\n").filter(l => l.trim().length > 0);

    for (const line of lines.slice(0, 15)) {
      const trimmed = line.trim();
      if (trimmed.length < 2 || trimmed.length > 40) continue;
      if (trimmed.includes("@") || trimmed.includes("http") || trimmed.includes("www.")) continue;
      if (skipPatterns.some(p => p.test(trimmed))) continue;

      if (/\d/.test(trimmed)) continue;
      if (/[\/\\,;:|#]/.test(trimmed)) continue;

      const words = trimmed.split(/\s+/);
      if (words.length < 1 || words.length > 4) continue;

      const onlyLetters = words.every(w => /^[a-zA-Z\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F.']+$/i.test(w));
      if (!onlyLetters) continue;

      const looksLikeName = words.every(w => {
        const clean = w.replace(/[.']/g, "");
        return clean.length >= 2 && clean.length <= 20;
      });
      if (!looksLikeName) continue;

      this.candidateName = trimmed;
      log(`ConversationManager: Extracted candidate name: "${trimmed}"`, "conversation");
      break;
    }
  }

  private get typeLabel(): string {
    return this.context.interviewType || "General";
  }

  private get languageLabel(): string {
    return LANGUAGE_LABELS[this.context.language] || this.context.language || "English (US)";
  }

  private get languageInstruction(): string {
    const lang = this.context.language || "en-US";
    if (lang.startsWith("en")) {
      return `\nLANGUAGE: Conduct this entire interview in ${this.languageLabel}. Use ${lang === "en-GB" ? "British" : lang === "en-IN" ? "Indian" : "American"} English spelling and expressions.`;
    }
    return `\nLANGUAGE: Conduct this entire interview COMPLETELY in ${this.languageLabel}. ALL questions, greetings, acknowledgments, follow-ups, and closing remarks MUST be in ${this.languageLabel}. Do NOT use English at all — respond only in ${this.languageLabel}.`;
  }

  private get resumeSection(): string {
    return this.context.resumeText
      ? `\n--- CANDIDATE RESUME ---\n${this.context.resumeText.slice(0, 3000)}\n--- END RESUME ---\n`
      : "";
  }

  private get jdSection(): string {
    return this.context.jobDescription
      ? `\n--- JOB DESCRIPTION ---\n${this.context.jobDescription.slice(0, 2000)}\n--- END JOB DESCRIPTION ---\n`
      : "";
  }

  async startIntroduction(): Promise<string> {
    this.phase = "greeting";

    const nameRef = this.candidateName
      ? `The candidate's name is "${this.candidateName}". Greet them by their first name warmly.`
      : "Greet the candidate warmly.";

    const greetingPrompt = `You are a senior ${this.typeLabel} interviewer starting a professional video interview.
${this.languageInstruction}
${this.resumeSection}${this.jdSection}

PHASE: GREETING (Phase 1 of 4)
${nameRef}

Your task:
1. Say hello and address the candidate by name (if available). Be warm and personable, like a real hiring manager on a video call.
2. Briefly introduce yourself as their AI interviewer for today's ${this.typeLabel} interview.
3. Ask them a simple warm-up question like "How are you doing today?" to build rapport.

RULES:
- Respond with ONLY your spoken words. No labels, no prefixes, no stage directions.
- Keep it to 2-3 sentences max. Be natural and friendly.
- Do NOT ask any technical or interview questions yet — this is just the warm-up greeting.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: greetingPrompt },
          { role: "user", content: "The interview is starting now. Please greet me." },
        ],
        max_completion_tokens: 200,
        temperature: 0.85,
      });
      const text = response.choices[0]?.message?.content?.trim()
        || `Hello${this.candidateName ? ` ${this.candidateName.split(" ")[0]}` : ""}! I'm your AI interviewer for today. How are you doing?`;
      this.history.push({ role: "assistant", content: text });
      this.currentQuestion = text;
      this.phase = "greeting";
      log(`ConversationManager: Greeting delivered (Phase 1)`, "conversation");
      return text;
    } catch (error: any) {
      log(`ConversationManager: Greeting error: ${error.message}`, "conversation");
      const fallback = `Hello${this.candidateName ? ` ${this.candidateName.split(" ")[0]}` : ""}! I'm your AI interviewer for today's ${this.typeLabel} interview. How are you doing today?`;
      this.history.push({ role: "assistant", content: fallback });
      this.currentQuestion = fallback;
      return fallback;
    }
  }

  async processUserAnswer(answer: string): Promise<{
    evaluation: EvaluationResult;
    nextResponse: string;
    isComplete: boolean;
    questionIndex: number;
    isConversational: boolean;
  }> {
    this.history.push({ role: "user", content: answer });
    log(`ConversationManager: Processing answer in phase "${this.phase}" (${answer.length} chars)`, "conversation");

    if (this.phase === "greeting") {
      const introResponse = await this.generateIntroRequest(answer);
      this.phase = "intro";
      this.currentQuestion = introResponse;
      return {
        evaluation: { score: 0, feedback: "", shouldFollowUp: false },
        nextResponse: introResponse,
        isComplete: false,
        questionIndex: 0,
        isConversational: true,
      };
    }

    if (this.phase === "intro") {
      this.extractKeywordsFromAnswer(answer);
      const firstQuestion = await this.generateFirstDeepDiveQuestion(answer);
      this.phase = "deep_dive";
      this.currentQuestion = firstQuestion;
      return {
        evaluation: { score: 0, feedback: "", shouldFollowUp: false },
        nextResponse: firstQuestion,
        isComplete: false,
        questionIndex: 0,
        isConversational: true,
      };
    }

    const evaluation = await this.evaluateAnswer(this.currentQuestion, answer);
    this.scores.push(evaluation.score);
    this.extractKeywordsFromAnswer(answer);
    this.questionIndex++;

    if (this.questionIndex >= this.context.totalQuestions) {
      this.phase = "closing";
      const closingMessage = await this.generateClosing();
      this.phase = "completed";
      return {
        evaluation,
        nextResponse: closingMessage,
        isComplete: true,
        questionIndex: this.questionIndex,
        isConversational: false,
      };
    }

    let nextResponse: string;

    if (evaluation.shouldFollowUp && this.consecutiveFollowUps < this.maxConsecutiveFollowUps) {
      this.phase = "cross_exam";
      nextResponse = await this.generateCrossExamQuestion(answer, evaluation);
      this.consecutiveFollowUps++;
      log(`ConversationManager: Cross-exam follow-up (reason: ${evaluation.followUpReason})`, "conversation");
    } else {
      this.phase = "deep_dive";
      nextResponse = await this.generateNextDeepDiveQuestion(answer);
      this.consecutiveFollowUps = 0;
      log(`ConversationManager: Deep dive question ${this.questionIndex + 1}`, "conversation");
    }

    this.currentQuestion = nextResponse;

    return {
      evaluation,
      nextResponse,
      isComplete: false,
      questionIndex: this.questionIndex,
      isConversational: false,
    };
  }

  private extractKeywordsFromAnswer(answer: string): void {
    const words = answer.toLowerCase().split(/\s+/);
    const techTerms = words.filter(w =>
      w.length > 3 &&
      !["that", "this", "with", "from", "have", "been", "were", "they", "about", "would", "could", "should", "there", "their", "which", "where", "think", "really", "because", "actually"].includes(w)
    );
    const uniqueNew = techTerms.filter(t => !this.extractedKeywords.includes(t)).slice(0, 5);
    this.extractedKeywords.push(...uniqueNew);
  }

  private async generateIntroRequest(greetingAnswer: string): Promise<string> {
    const prompt = `You are a senior ${this.typeLabel} interviewer. The candidate just responded to your greeting.
${this.languageInstruction}
${this.resumeSection}

PHASE: INTRODUCTION (Phase 2 of 4)
The candidate said: "${greetingAnswer.slice(0, 300)}"

Your task:
1. Respond warmly to their greeting (1 sentence — be specific, not generic).
2. Then ask them to introduce themselves: "Could you please tell me a bit about yourself and walk me through your professional journey?"
3. This helps you validate the resume content and understand the candidate.

RULES:
- Respond with ONLY your spoken words. No labels, no prefixes.
- 2-3 sentences max. Be natural and conversational.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          ...this.history,
        ],
        max_completion_tokens: 250,
        temperature: 0.8,
      });
      const text = response.choices[0]?.message?.content?.trim()
        || "Great to hear that! To start off, could you please tell me a bit about yourself and walk me through your professional journey?";
      this.history.push({ role: "assistant", content: text });
      log(`ConversationManager: Intro request delivered (Phase 2)`, "conversation");
      return text;
    } catch (error: any) {
      log(`ConversationManager: Intro request error: ${error.message}`, "conversation");
      const fallback = "That's great to hear! Could you please tell me a bit about yourself and walk me through your professional journey?";
      this.history.push({ role: "assistant", content: fallback });
      return fallback;
    }
  }

  private async generateFirstDeepDiveQuestion(introAnswer: string): Promise<string> {
    const avgScore = this.getAverageScore();
    const keywordsNote = this.extractedKeywords.length > 0
      ? `\nKEYWORDS EXTRACTED FROM CANDIDATE'S INTRO: ${this.extractedKeywords.join(", ")}. Use these to craft a targeted question.`
      : "";

    const pattern = this.getNextPattern();
    const projectFocus = this.getNextProjectFocus();
    const focusNote = projectFocus
      ? `\nFOCUS THIS QUESTION ON: "${projectFocus}" — This specific item from the resume. Ask about THIS, not about anything else.`
      : "";

    const prompt = `You are a senior ${this.typeLabel} interviewer. The candidate just introduced themselves. Now begin the Deep Dive phase.
${this.languageInstruction}
${this.resumeSection}${this.jdSection}
${keywordsNote}

PHASE: DEEP DIVE (Phase 3 of 4) — Starting Question 1 of ${this.context.totalQuestions}

The candidate's introduction: "${introAnswer.slice(0, 800)}"
${focusNote}

Your task:
1. Briefly acknowledge something specific from their introduction (1 sentence — reference a skill, project, or experience they mentioned).
2. Ask your FIRST deep dive question using the pattern below, specifically about the FOCUS item mentioned above.

QUESTION PATTERN TO USE: "${pattern.name}"
${pattern.instruction}

Adapt this pattern to the candidate's resume, introduction, and the interview type "${this.typeLabel}".

CRITICAL RULES:
- You MUST ask about the specific FOCUS item above. Do NOT pick your own topic.
- Respond with ONLY your spoken words. No labels, no prefixes, no question numbers.
- 2-3 sentences max: 1 sentence acknowledgment + 1-2 sentence question.
- Make it feel natural, like a real interviewer who listened carefully.
- Do NOT mention the pattern name. Just ask the question naturally.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          ...this.history,
        ],
        max_completion_tokens: 350,
        temperature: 0.8,
      });
      const text = response.choices[0]?.message?.content?.trim()
        || "Thank you for that introduction. Based on your experience, could you describe a challenging problem you've solved recently?";
      this.history.push({ role: "assistant", content: text });
      this.trackTopic(text);
      log(`ConversationManager: First deep dive question delivered (Phase 3)`, "conversation");
      return text;
    } catch (error: any) {
      log(`ConversationManager: First deep dive error: ${error.message}`, "conversation");
      const fallback = "Thank you for sharing that. Let's dive deeper — can you tell me about a challenging project you've worked on and how you handled it?";
      this.history.push({ role: "assistant", content: fallback });
      return fallback;
    }
  }

  private async generateNextDeepDiveQuestion(userAnswer: string): Promise<string> {
    const avgScore = this.getAverageScore();
    const performanceNote = this.scores.length > 0
      ? `\nCANDIDATE PERFORMANCE: Average score ${avgScore}/10 across ${this.scores.length} answers.`
      : "";
    const topicsNote = this.topicsExplored.length > 0
      ? `\nTOPICS ALREADY COVERED: ${this.topicsExplored.join(", ")}. Ask about something DIFFERENT.`
      : "";
    const keywordsNote = this.extractedKeywords.length > 0
      ? `\nKEYWORDS FROM CANDIDATE'S ANSWERS: ${this.extractedKeywords.slice(-15).join(", ")}. Use these to craft targeted questions.`
      : "";

    const pattern = this.getNextPattern();
    const projectFocus = this.getNextProjectFocus();
    const focusNote = projectFocus
      ? `\nFOCUS THIS QUESTION ON: "${projectFocus}" — This specific item from the resume. Ask about THIS, not about previously discussed topics.`
      : "";
    const usedProjectsNote = this.usedProjects.length > 1
      ? `\nALREADY ASKED ABOUT (DO NOT REPEAT): ${this.usedProjects.slice(0, -1).join(", ")}`
      : "";

    const prompt = `You are a senior ${this.typeLabel} interviewer conducting the Deep Dive phase of a professional interview.
${this.languageInstruction}
${this.resumeSection}${this.jdSection}

PHASE: DEEP DIVE (Phase 3 of 4) — Question ${this.questionIndex + 1} of ${this.context.totalQuestions}
${performanceNote}${topicsNote}${keywordsNote}
${focusNote}${usedProjectsNote}

INTERVIEW PROGRESS:
- Questions completed: ${this.questionIndex}
- Questions remaining: ${this.context.totalQuestions - this.questionIndex}

Your task:
1. Briefly acknowledge the candidate's previous answer (1 sentence — be SPECIFIC about what they said, don't use generic praise).
2. Ask the NEXT deep dive question using the pattern below, specifically about the FOCUS item mentioned above.

QUESTION PATTERN TO USE: "${pattern.name}"
${pattern.instruction}

QUESTION GENERATION RULES:
- You MUST ask about the specific FOCUS item above. Do NOT repeat topics from "ALREADY ASKED ABOUT" list.
- Adapt this pattern to the candidate's resume, skills, and the interview type "${this.typeLabel}".
- Progress naturally: start broader, get more specific/challenging as the interview progresses.
- ADAPT DIFFICULTY: Score ${avgScore}/10 average → ${avgScore >= 8 ? "Ask harder, more nuanced questions" : avgScore <= 4 ? "Ask slightly easier but still substantive questions" : "Maintain moderate difficulty"}.

RULES:
- Respond with ONLY your spoken words. No labels, no prefixes, no question numbers.
- 2-4 sentences: 1 sentence acknowledgment + 1-3 sentence question.
- Never repeat a question already asked in this interview.
- Do NOT mention the pattern name. Just ask the question naturally.
- Maintain natural conversational flow — feel like a real dialogue.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          ...this.history,
        ],
        max_completion_tokens: 400,
        temperature: 0.8,
      });
      const text = response.choices[0]?.message?.content?.trim()
        || "That's interesting. Could you tell me more about your experience with a different project?";
      this.history.push({ role: "assistant", content: text });
      this.trackTopic(text);
      return text;
    } catch (error: any) {
      log(`ConversationManager: Deep dive question error: ${error.message}`, "conversation");
      const fallback = "That's a great answer. Could you tell me about another challenging project you've worked on?";
      this.history.push({ role: "assistant", content: fallback });
      return fallback;
    }
  }

  private async generateCrossExamQuestion(userAnswer: string, evaluation: EvaluationResult): Promise<string> {
    const prompt = `You are a senior ${this.typeLabel} interviewer in CROSS-EXAMINATION mode. You need to verify the candidate's claims and probe deeper into their answer.
${this.languageInstruction}
${this.resumeSection}${this.jdSection}

PHASE: CROSS-EXAM (Phase 4) — Probing deeper into the candidate's answer.

The candidate just said: "${userAnswer.slice(0, 600)}"

${evaluation.followUpReason ? `WHY CROSS-EXAMINE: ${evaluation.followUpReason}` : "The answer needs more depth or verification."}

Your task — ask ONE targeted cross-examination question that:
1. References something SPECIFIC from their answer (a project they mentioned, a claim they made, a technology they referenced).
2. Probes with "Why?", "How exactly?", "What was YOUR specific role?", or "Can you walk me through the steps?"
3. Tests whether the candidate has genuine, deep understanding vs surface-level knowledge.
4. Feels like a curious, sharp interviewer probing deeper — NOT hostile or interrogating.

CROSS-EXAM EXAMPLES:
- If they mentioned a project: "That sounds interesting. Could you explain exactly what YOUR role was in that specific project?"
- If they claimed expertise: "You mentioned [skill]. Can you walk me through how you would approach [specific scenario] using it?"
- If vague answer: "I'd like to understand that better. Can you give me a specific example with concrete numbers or outcomes?"

RULES:
- Respond with ONLY your spoken words. No labels, no prefixes.
- 1-2 sentences: brief acknowledgment + probing follow-up question.
- Be professional but direct — you're verifying, not attacking.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          ...this.history,
        ],
        max_completion_tokens: 250,
        temperature: 0.75,
      });
      const text = response.choices[0]?.message?.content?.trim()
        || "That's interesting. Could you elaborate on your specific contribution to that?";
      this.history.push({ role: "assistant", content: text });
      return text;
    } catch (error: any) {
      log(`ConversationManager: Cross-exam error: ${error.message}`, "conversation");
      const fallback = "Interesting. Could you walk me through exactly how you approached that?";
      this.history.push({ role: "assistant", content: fallback });
      return fallback;
    }
  }

  private async evaluateAnswer(question: string, answer: string): Promise<EvaluationResult> {
    const resumeContext = this.context.resumeText
      ? `\nCandidate Resume (excerpt): ${this.context.resumeText.slice(0, 1000)}`
      : "";
    const jdContext = this.context.jobDescription
      ? `\nJob Description (excerpt): ${this.context.jobDescription.slice(0, 800)}`
      : "";

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert interview evaluator analyzing a candidate's answer in a ${this.typeLabel} interview.

Score the answer and decide if the interviewer should CROSS-EXAMINE (ask a probing follow-up) or move to a new topic.

CROSS-EXAMINATION TRIGGERS (shouldFollowUp = true):
- Answer is vague or lacks specific examples
- Candidate makes a claim that seems exaggerated or unverifiable
- Candidate mentions a project/achievement but doesn't explain their role clearly
- Answer touches on something interesting that deserves deeper exploration
- Candidate gives a surface-level response without demonstrating real understanding

MOVE ON TRIGGERS (shouldFollowUp = false):
- Answer is detailed, specific, and uses concrete examples
- Candidate clearly demonstrated deep understanding of the topic
- Answer used STAR method or equivalent structured response
- Further probing wouldn't add meaningful value
${resumeContext}${jdContext}

Consider:
- Relevance to the question asked
- Use of concrete examples and specifics (STAR method for behavioral)
- Communication clarity and structure
- Depth of technical or domain knowledge demonstrated
- Alignment with the job requirements if a JD is provided

Return JSON only:
{
  "score": <number 1-10>,
  "feedback": "<2-3 sentence feedback with one strength and one improvement>",
  "shouldFollowUp": <true for cross-exam, false to move on>,
  "followUpReason": "<if shouldFollowUp is true, specific reason — e.g., 'mentioned leading a team but didn't explain the outcome or team size'>"
}`,
          },
          {
            role: "user",
            content: `Interview Question: ${question}\n\nCandidate's Answer: ${answer}`,
          },
        ],
        max_completion_tokens: 250,
        temperature: 0.3,
      });
      const content = response.choices[0]?.message?.content?.trim() || "{}";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        score: typeof parsed.score === "number" && parsed.score >= 1 && parsed.score <= 10
          ? Math.round(parsed.score) : 7,
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Good response.",
        shouldFollowUp: typeof parsed.shouldFollowUp === "boolean" ? parsed.shouldFollowUp : false,
        followUpReason: typeof parsed.followUpReason === "string" ? parsed.followUpReason : undefined,
      };
    } catch (error: any) {
      log(`ConversationManager: Evaluation error: ${error.message}`, "conversation");
      return { score: 7, feedback: "Good response.", shouldFollowUp: false };
    }
  }

  private async generateClosing(): Promise<string> {
    const avgScore = this.getAverageScore();
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are wrapping up a professional ${this.typeLabel} interview and delivering the final verdict.
${this.languageInstruction}

The candidate${this.candidateName ? ` (${this.candidateName})` : ""} answered ${this.context.totalQuestions} questions and scored ${avgScore}/10 on average.
Individual question scores: ${this.scores.map((s, i) => `Q${i + 1}: ${s}/10`).join(", ")}.

SELECTION CRITERIA:
- Average score 7 or above: SELECTED (recommend for next round / hiring)
- Average score 5-6: ON HOLD / MAYBE (needs improvement in specific areas)
- Average score below 5: NOT SELECTED (does not meet the bar)

Your closing MUST include:
1. Thank them warmly for their time (1 sentence).
2. Announce the VERDICT clearly: "Based on your performance today, I would say you are [SELECTED / ON HOLD / NOT SELECTED] for this role."
3. Give 2-3 specific reasons WHY — reference actual answers, skills demonstrated, or gaps observed during the interview.
   - If SELECTED: mention their strongest answers, key skills, or impressive examples they gave.
   - If ON HOLD: mention what was good but also what specific areas need improvement.
   - If NOT SELECTED: explain specifically what was lacking — vague answers, missing depth, lack of examples, weak technical knowledge, etc.
4. End with brief encouragement or next-step advice.

RULES:
- Respond with ONLY your spoken words. No labels, no prefixes.
- 5-7 sentences. Be honest, specific, and professional — like a real interviewer delivering a verdict.
- Do NOT be generic. Reference specific topics, questions, or answers from the interview conversation.`,
          },
          ...this.history,
        ],
        max_completion_tokens: 400,
        temperature: 0.7,
      });
      const text = response.choices[0]?.message?.content?.trim()
        || `Thank you for completing the interview! Your overall score is ${avgScore}/10. ${avgScore >= 7 ? "Based on your performance, I would recommend you for the next round. Your answers showed strong depth and clarity." : avgScore >= 5 ? "Your performance was decent, but there are areas where you need to improve before being selected." : "Unfortunately, based on today's performance, I would not recommend moving forward. I'd suggest practicing more and working on giving specific examples."}`;
      this.history.push({ role: "assistant", content: text });
      return text;
    } catch {
      const fallback = `Thank you for completing the interview! Your overall score is ${avgScore}/10. ${avgScore >= 7 ? "Based on your performance, I would say you are selected. Your answers were detailed and impressive." : avgScore >= 5 ? "Your performance was on hold. Some answers were good but others lacked depth." : "Unfortunately, based on today's performance, you are not selected. I'd recommend practicing with more specific examples and deeper technical knowledge."}`;
      this.history.push({ role: "assistant", content: fallback });
      return fallback;
    }
  }

  private trackTopic(text: string): void {
    const topicMatch = text.match(/(?:about|regarding|with|experience in|work on|expertise in|role at|project)\s+(.+?)[\?.!,]/i);
    if (topicMatch) {
      this.topicsExplored.push(topicMatch[1].slice(0, 50));
    }
  }
}
