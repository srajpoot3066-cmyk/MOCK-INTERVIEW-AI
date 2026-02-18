import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./index";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import OpenAI from "openai";
import { URL } from "url";
import { z } from "zod";
import { ConversationManager } from "./conversation-manager";
import { selectInterviewerProfile, streamTTS } from "./edge-tts";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { updateProfileSchema, users, payments } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { db } from "./db";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  starter: { amount: 200, name: "Starter" },
  pro: { amount: 500, name: "Pro" },
  enterprise: { amount: 1000, name: "Enterprise" },
};

const ALLOWED_MIMETYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Word (.doc/.docx), and image (.jpg/.png) files are allowed"));
    }
  },
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function extractTextFromImage(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    const base64 = buffer.toString("base64");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract ALL text from this resume/document image. Return the complete text content exactly as it appears, preserving the structure. If there is no readable text, return an empty string." },
            { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 4000,
    });
    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error: any) {
    log(`Image text extraction failed: ${error.message}`, "pdf");
    return "";
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (error: any) {
    log(`DOCX text extraction failed: ${error.message}`, "pdf");
    return "";
  }
}

async function extractResumeText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "image/jpeg" || mimetype === "image/png" || mimetype === "image/jpg") {
    return extractTextFromImage(buffer, mimetype);
  }
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimetype === "application/msword") {
    return extractDocxText(buffer);
  }
  return extractPdfText(buffer);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  let parser: InstanceType<typeof PDFParse> | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text.trim();
  } catch (error: any) {
    log(`PDF text extraction failed: ${error.message}`, "pdf");
    return "";
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

async function generateLiveHint(
  transcript: string,
  resumeText: string,
  jobDescription: string,
  answerLength: string = "medium",
  tone: string = "professional"
): Promise<string> {
  const lengthInstruction = answerLength === "short" ? "Keep your hint to 1 sentence max." :
    answerLength === "long" ? "Provide a detailed 3-4 sentence response with specific examples." :
    "Your hint must be exactly 1-2 sentences max.";

  const toneInstruction = tone === "casual" ? "Use a friendly, conversational tone." :
    tone === "technical" ? "Use precise technical language and terminology." :
    "Use a professional, polished tone.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a real-time interview coach. The candidate is in a live interview right now. Based on the interview question being asked (from the transcript), the candidate's resume, and the job description, provide a concise "Live Hint" using the STAR method (Situation, Task, Action, Result). ${lengthInstruction} ${toneInstruction} Be specific and actionable — reference actual experiences from their resume that match the question. Do NOT repeat the question. Do NOT use labels like "Situation:" or "STAR:". Just give the hint naturally.`,
        },
        {
          role: "user",
          content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nLIVE TRANSCRIPT (what the interviewer is saying right now):\n${transcript}`,
        },
      ],
      max_completion_tokens: answerLength === "short" ? 80 : answerLength === "long" ? 300 : 150,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error: any) {
    log(`OpenAI hint generation failed: ${error.message}`, "openai");
    return "";
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ AUTH SETUP ============
  await setupAuth(app);
  registerAuthRoutes(app);

  // ============ Profile Update ============
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const [updated] = await db.update(users).set({
        ...parsed.data,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)).returning();
      res.json(updated);
    } catch (error: any) {
      log(`Profile update error: ${error.message}`, "express");
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ============ Payment: Create Razorpay Order ============
  app.post("/api/payments/create-order", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;

      if (!plan || !PLAN_PRICES[plan]) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      const planInfo = PLAN_PRICES[plan];
      const amountInPaise = planInfo.amount * 100;

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: { plan: planInfo.name, userId },
      });

      const [payment] = await db.insert(payments).values({
        userId,
        planName: planInfo.name,
        amount: String(planInfo.amount),
        currency: "INR",
        razorpayOrderId: order.id,
        status: "created",
      }).returning();

      res.json({
        orderId: order.id,
        amount: amountInPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment.id,
        planName: planInfo.name,
      });
    } catch (error: any) {
      log(`Payment order error: ${error.message}`, "express");
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // ============ Payment: Verify Razorpay Payment ============
  app.post("/api/payments/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
      if (!payment) {
        return res.status(404).json({ error: "Payment record not found" });
      }
      if (payment.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized payment access" });
      }
      if (payment.razorpayOrderId !== razorpay_order_id) {
        return res.status(400).json({ error: "Order ID mismatch" });
      }
      if (payment.status !== "created") {
        return res.status(400).json({ error: "Payment already processed" });
      }

      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
        return res.status(400).json({ error: "Payment verification failed" });
      }

      const [updated] = await db.update(payments).set({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
      }).where(eq(payments.id, paymentId)).returning();

      res.json({ success: true, payment: updated });
    } catch (error: any) {
      log(`Payment verify error: ${error.message}`, "express");
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  // ============ Payment: Get User Payments ============
  app.get("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userPayments = await db.select().from(payments).where(eq(payments.userId, userId));
      res.json(userPayments);
    } catch (error: any) {
      log(`Get payments error: ${error.message}`, "express");
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // ============ EXISTING: Upload & Mock Interviews ============

  app.post("/api/upload", upload.single("resume"), async (req, res) => {
    try {
      const file = req.file;
      const jobDescription = req.body.jobDescription;

      if (!file) {
        return res.status(400).json({ error: "Resume file is required" });
      }

      const jd = jobDescription?.trim() || "";

      const resumeText = await extractResumeText(file.buffer, file.mimetype);

      if (!resumeText) {
        return res.status(422).json({ error: "Could not extract text from the file. Please ensure the file contains readable text." });
      }

      const interview = await storage.createMockInterview({
        resumeFileName: file.originalname,
        resumeContent: file.buffer.toString("base64"),
        resumeText,
        jobDescription: jd,
        status: "pending",
        questionCount: 5,
      });

      log(`PDF text extracted: ${resumeText.length} characters from ${file.originalname}`, "pdf");

      res.json({
        id: interview.id,
        resumeFileName: interview.resumeFileName,
        resumeText,
        resumeTextLength: resumeText.length,
        resumeTextPreview: resumeText.substring(0, 200) + (resumeText.length > 200 ? "..." : ""),
        jobDescription: interview.jobDescription,
        status: interview.status,
        createdAt: interview.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/mock-interviews", upload.single("resume"), async (req, res) => {
    try {
      const file = req.file;
      const jobDescription = req.body.jobDescription?.trim() || "";

      if (!file) {
        return res.status(400).send("Resume file is required");
      }

      const resumeText = await extractResumeText(file.buffer, file.mimetype);

      const interview = await storage.createMockInterview({
        resumeFileName: file.originalname,
        resumeContent: file.buffer.toString("base64"),
        resumeText,
        jobDescription,
        status: "pending",
        questionCount: 5,
      });

      res.json(interview);
    } catch (error: any) {
      res.status(500).send(error.message || "Internal server error");
    }
  });

  app.get("/api/mock-interviews", async (_req, res) => {
    try {
      const interviews = await storage.getMockInterviews();
      res.json(interviews);
    } catch (error: any) {
      res.status(500).send(error.message || "Internal server error");
    }
  });

  app.get("/api/mock-interviews/:id", async (req, res) => {
    try {
      const interview = await storage.getMockInterview(req.params.id);
      if (!interview) {
        return res.status(404).send("Interview not found");
      }
      res.json(interview);
    } catch (error: any) {
      res.status(500).send(error.message || "Internal server error");
    }
  });

  app.get("/api/mock-interviews/:id/context", async (req, res) => {
    try {
      const interview = await storage.getMockInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      res.json({
        id: interview.id,
        resumeText: interview.resumeText,
        jobDescription: interview.jobDescription,
        status: interview.status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ NEW: Practice Sessions ============

  const createPracticeSessionSchema = z.object({
    interviewType: z.string().min(1, "Interview type is required"),
    resumeText: z.string().optional().default(""),
    jobDescription: z.string().optional().default(""),
  });

  const submitAnswerSchema = z.object({
    questionIndex: z.number().int().min(0),
    question: z.string().min(1, "Question is required"),
    answer: z.string().min(10, "Answer must be at least 10 characters"),
  });

  const resumeBuilderSchema = z.object({
    resumeText: z.string().optional().default(""),
    jobDescription: z.string().optional().default(""),
  }).refine((data) => data.resumeText.trim().length > 0 || data.jobDescription.trim().length > 0, {
    message: "Please provide resume text or job description",
  });

  const companyQuestionsSchema = z.object({
    company: z.string().min(1, "Company name is required"),
    role: z.string().optional().default(""),
    resumeText: z.string().optional().default(""),
    jobDescription: z.string().optional().default(""),
    language: z.string().optional().default("en-US"),
  });

  app.get("/api/dashboard-scores", async (_req, res) => {
    try {
      const [practiceSess, videoSess, quizSess] = await Promise.all([
        storage.getPracticeSessions(),
        storage.getVideoInterviewSessions(),
        storage.getQuizSessions(),
      ]);

      const completedPractice = practiceSess.filter(s => s.status === "completed" && s.totalScore !== null);
      const completedVideo = videoSess.filter(s => s.status === "completed" && s.totalScore !== null);
      const completedQuiz = quizSess.filter(s => s.status === "completed");

      const practiceAvg = completedPractice.length > 0
        ? Math.round(completedPractice.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completedPractice.length)
        : null;
      const videoAvg = completedVideo.length > 0
        ? Math.round(completedVideo.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completedVideo.length)
        : null;
      const quizAvg = completedQuiz.length > 0
        ? Math.round(completedQuiz.reduce((sum, s) => {
            const total = s.totalQuestions || 1;
            const correct = s.correctAnswers || 0;
            return sum + (correct / total) * 100;
          }, 0) / completedQuiz.length)
        : null;

      const totalSessions = completedPractice.length + completedVideo.length + completedQuiz.length;
      const allScores = [
        ...completedPractice.map(s => s.totalScore || 0),
        ...completedVideo.map(s => s.totalScore || 0),
        ...completedQuiz.map(s => Math.round(((s.correctAnswers || 0) / (s.totalQuestions || 1)) * 100)),
      ];
      const overallAvg = allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null;

      const recentSessions = [
        ...completedPractice.slice(0, 5).map(s => ({
          id: s.id,
          type: "practice" as const,
          label: s.interviewType,
          score: s.totalScore || 0,
          total: s.totalQuestions || 0,
          answered: s.answeredQuestions || 0,
          date: s.createdAt,
        })),
        ...completedVideo.slice(0, 5).map(s => ({
          id: s.id,
          type: "video" as const,
          label: s.interviewType,
          score: s.totalScore || 0,
          total: s.totalQuestions || 0,
          answered: s.currentQuestion || 0,
          date: s.createdAt,
        })),
        ...completedQuiz.slice(0, 5).map(s => ({
          id: s.id,
          type: "quiz" as const,
          label: s.detectedRole || "Skill Quiz",
          score: Math.round(((s.correctAnswers || 0) / (s.totalQuestions || 1)) * 100),
          total: s.totalQuestions || 0,
          answered: s.answeredQuestions || 0,
          date: s.createdAt,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

      res.json({
        overallAvg,
        totalSessions,
        practiceAvg,
        practiceCount: completedPractice.length,
        videoAvg,
        videoCount: completedVideo.length,
        quizAvg,
        quizCount: completedQuiz.length,
        recentSessions,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/practice-sessions", async (req, res) => {
    try {
      const parsed = createPracticeSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { interviewType, resumeText, jobDescription } = parsed.data;

      const typePrompts: Record<string, string> = {
        behavioral: "Generate 5 behavioral interview questions using the STAR method framework. Focus on leadership, teamwork, conflict resolution, problem-solving, and adaptability.",
        technical: "Generate 5 technical interview questions. Include system design, coding concepts, data structures, algorithms, and debugging scenarios.",
        product: "Generate 5 product management interview questions. Cover product strategy, metrics, prioritization, user research, and go-to-market.",
        consulting: "Generate 5 consulting case interview questions. Include market sizing, profitability analysis, market entry, and operations improvement.",
        data_science: "Generate 5 data science interview questions. Cover statistics, machine learning, SQL, A/B testing, and data pipeline design.",
      };

      const prompt = typePrompts[interviewType] || typePrompts.behavioral;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. ${prompt} ${resumeText ? "Tailor questions to the candidate's background based on their resume." : ""} ${jobDescription ? "Make questions relevant to the target job description." : ""} Return ONLY a JSON array of strings, each being one question. No markdown, no explanation.`,
          },
          {
            role: "user",
            content: `${resumeText ? `RESUME:\n${resumeText}\n\n` : ""}${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : "Generate general interview questions."}`,
          },
        ],
        max_completion_tokens: 1000,
      });

      let questions: string[] = [];
      try {
        const content = response.choices[0]?.message?.content?.trim() || "[]";
        questions = JSON.parse(content);
      } catch {
        questions = ["Tell me about yourself.", "What is your greatest strength?", "Describe a challenging situation you faced.", "Why are you interested in this role?", "Where do you see yourself in 5 years?"];
      }

      const session = await storage.createPracticeSession({
        interviewType,
        resumeText: resumeText || "",
        jobDescription: jobDescription || "",
        questions: JSON.stringify(questions),
        totalQuestions: questions.length,
        answeredQuestions: 0,
        status: "in_progress",
        totalScore: null,
      });

      res.json({ ...session, questions });
    } catch (error: any) {
      log(`Practice session creation failed: ${error.message}`, "practice");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/practice-sessions", async (_req, res) => {
    try {
      const sessions = await storage.getPracticeSessions();
      const normalized = sessions.map((s) => ({
        ...s,
        questions: (() => { try { return JSON.parse(s.questions); } catch { return []; } })(),
      }));
      res.json(normalized);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/practice-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getPracticeSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const answers = await storage.getPracticeAnswers(session.id);
      res.json({ ...session, questions: JSON.parse(session.questions), answers });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/practice-sessions/:id/answer", async (req, res) => {
    try {
      const parsed = submitAnswerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { questionIndex, question, answer } = parsed.data;
      const session = await storage.getPracticeSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach evaluating a candidate's answer. Analyze the answer for:
1. Relevance to the question
2. Use of STAR method (Situation, Task, Action, Result)
3. Clarity and structure
4. Specific examples and metrics

Provide your evaluation as JSON with this exact format:
{
  "score": <number 1-10>,
  "feedback": "<2-3 sentences of constructive feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<area1>", "<area2>"]
}
Return ONLY valid JSON, no markdown.`,
          },
          {
            role: "user",
            content: `${session.resumeText ? `RESUME:\n${session.resumeText}\n\n` : ""}${session.jobDescription ? `JOB:\n${session.jobDescription}\n\n` : ""}QUESTION: ${question}\n\nCANDIDATE'S ANSWER: ${answer}`,
          },
        ],
        max_completion_tokens: 500,
      });

      let evaluation = { score: 7, feedback: "Good answer with room for improvement.", strengths: ["Clear communication"], improvements: ["Add more specific examples"] };
      try {
        const content = response.choices[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(content);
        evaluation = {
          score: typeof parsed.score === "number" && parsed.score >= 1 && parsed.score <= 10 ? Math.round(parsed.score) : 7,
          feedback: typeof parsed.feedback === "string" && parsed.feedback.length > 0 ? parsed.feedback : evaluation.feedback,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: any) => typeof s === "string") : evaluation.strengths,
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((s: any) => typeof s === "string") : evaluation.improvements,
        };
      } catch {
        // use default
      }

      const practiceAnswer = await storage.createPracticeAnswer({
        sessionId: session.id,
        questionIndex,
        question,
        answer,
        feedback: evaluation.feedback,
        score: evaluation.score,
        strengths: JSON.stringify(evaluation.strengths || []),
        improvements: JSON.stringify(evaluation.improvements || []),
      });

      const answeredCount = session.answeredQuestions + 1;
      const allAnswers = await storage.getPracticeAnswers(session.id);
      const totalScore = Math.round(allAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / allAnswers.length);

      await storage.updatePracticeSession(session.id, {
        answeredQuestions: answeredCount,
        totalScore,
        status: answeredCount >= session.totalQuestions ? "completed" : "in_progress",
      });

      res.json(practiceAnswer);
    } catch (error: any) {
      log(`Answer evaluation failed: ${error.message}`, "practice");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ NEW: Skill Quiz ============

  const createQuizSchema = z.object({
    resumeText: z.string().min(1, "Resume text is required"),
    skills: z.array(z.string()).min(1, "At least one skill is required"),
    detectedRole: z.string().optional().default(""),
  });

  app.post("/api/quiz-sessions", async (req, res) => {
    try {
      const parsed = createQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { resumeText, skills, detectedRole } = parsed.data;

      const skillList = skills.slice(0, 15).join(", ");

      const batchPromises = [];
      const questionsPerBatch = 10;
      const totalBatches = 5;

      for (let batch = 0; batch < totalBatches; batch++) {
        const startIdx = batch * questionsPerBatch + 1;
        const endIdx = startIdx + questionsPerBatch - 1;
        batchPromises.push(
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an expert technical quiz generator. Generate exactly ${questionsPerBatch} multiple-choice quiz questions (numbered ${startIdx} to ${endIdx}) based on the candidate's skills. Each question should test practical knowledge of these skills: ${skillList}.${detectedRole ? ` The candidate is a ${detectedRole}.` : ""}

Mix difficulty levels: 40% easy, 40% medium, 20% hard.
Cover different skills evenly across questions.

Return ONLY a valid JSON array with exactly ${questionsPerBatch} objects in this format:
[
  {
    "question": "What is the primary purpose of...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Brief explanation of why this is correct"
  }
]
No markdown, no extra text.`,
              },
              {
                role: "user",
                content: `SKILLS: ${skillList}\n\nRESUME CONTEXT:\n${resumeText.substring(0, 2000)}`,
              },
            ],
            max_completion_tokens: 3000,
          })
        );
      }

      const batchResults = await Promise.all(batchPromises);
      let allQuestions: Array<{ question: string; options: string[]; correctAnswer: string; explanation: string }> = [];

      for (const result of batchResults) {
        try {
          const content = result.choices[0]?.message?.content?.trim() || "[]";
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const questions = JSON.parse(cleaned);
          if (Array.isArray(questions)) {
            allQuestions = allQuestions.concat(questions);
          }
        } catch {
          log("Failed to parse a quiz batch", "quiz");
        }
      }

      allQuestions = allQuestions.slice(0, 50);

      if (allQuestions.length < 10) {
        return res.status(500).json({ error: "Could not generate enough quiz questions. Please try again." });
      }

      const session = await storage.createQuizSession({
        resumeText,
        skills: JSON.stringify(skills),
        detectedRole,
        totalQuestions: allQuestions.length,
        answeredQuestions: 0,
        correctAnswers: 0,
        status: "in_progress",
      });

      for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i];
        await storage.createQuizAnswer({
          sessionId: session.id,
          questionIndex: i,
          question: q.question,
          options: JSON.stringify(q.options || []),
          correctAnswer: q.correctAnswer || "",
          userAnswer: "",
          isCorrect: 0,
          explanation: q.explanation || "",
        });
      }

      const answers = await storage.getQuizAnswers(session.id);

      res.json({
        ...session,
        questions: answers.map((a) => ({
          index: a.questionIndex,
          question: a.question,
          options: JSON.parse(a.options),
        })),
      });
    } catch (error: any) {
      log(`Quiz session creation failed: ${error.message}`, "quiz");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/quiz-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getQuizSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Quiz session not found" });
      }
      const answers = await storage.getQuizAnswers(session.id);
      res.json({
        ...session,
        questions: answers.map((a) => ({
          index: a.questionIndex,
          question: a.question,
          options: JSON.parse(a.options),
          userAnswer: a.userAnswer,
          correctAnswer: session.status === "completed" ? a.correctAnswer : undefined,
          isCorrect: a.userAnswer ? a.isCorrect : undefined,
          explanation: session.status === "completed" ? a.explanation : undefined,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/quiz-sessions/:id/answer", async (req, res) => {
    try {
      const answerSchema = z.object({
        questionIndex: z.number().int().min(0),
        answer: z.string().min(1, "Answer is required"),
      });
      const parsed = answerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const session = await storage.getQuizSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Quiz session not found" });
      }
      if (session.status === "completed") {
        return res.status(400).json({ error: "Quiz already completed" });
      }

      const answers = await storage.getQuizAnswers(session.id);
      const questionAnswer = answers.find((a) => a.questionIndex === parsed.data.questionIndex);
      if (!questionAnswer) {
        return res.status(404).json({ error: "Question not found" });
      }

      const isCorrect = parsed.data.answer.trim().toLowerCase() === questionAnswer.correctAnswer.trim().toLowerCase() ? 1 : 0;

      await storage.updateQuizAnswer(questionAnswer.id, {
        userAnswer: parsed.data.answer,
        isCorrect,
      });

      res.json({ isCorrect, correctAnswer: questionAnswer.correctAnswer, explanation: questionAnswer.explanation });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/quiz-sessions/:id/submit", async (req, res) => {
    try {
      const submitSchema = z.object({
        answers: z.array(z.object({
          questionIndex: z.number().int().min(0),
          answer: z.string(),
        })),
      });
      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const session = await storage.getQuizSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Quiz session not found" });
      }

      const storedAnswers = await storage.getQuizAnswers(session.id);
      let correctCount = 0;
      const results: Array<{ questionIndex: number; question: string; userAnswer: string; correctAnswer: string; isCorrect: boolean; explanation: string }> = [];

      for (const userAns of parsed.data.answers) {
        const stored = storedAnswers.find((a) => a.questionIndex === userAns.questionIndex);
        if (!stored) continue;

        const isCorrect = userAns.answer.trim().toLowerCase() === stored.correctAnswer.trim().toLowerCase();
        if (isCorrect) correctCount++;

        await storage.updateQuizAnswer(stored.id, {
          userAnswer: userAns.answer,
          isCorrect: isCorrect ? 1 : 0,
        });

        results.push({
          questionIndex: userAns.questionIndex,
          question: stored.question,
          userAnswer: userAns.answer,
          correctAnswer: stored.correctAnswer,
          isCorrect,
          explanation: stored.explanation,
        });
      }

      await storage.updateQuizSession(session.id, {
        answeredQuestions: parsed.data.answers.length,
        correctAnswers: correctCount,
        status: "completed",
      });

      res.json({
        totalQuestions: session.totalQuestions,
        answeredQuestions: parsed.data.answers.length,
        correctAnswers: correctCount,
        score: Math.round((correctCount / session.totalQuestions) * 100),
        results,
      });
    } catch (error: any) {
      log(`Quiz submission failed: ${error.message}`, "quiz");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ NEW: Resume Builder ============

  app.post("/api/resume-builder", async (req, res) => {
    try {
      const parsed = resumeBuilderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { resumeText, jobDescription } = parsed.data;
      const templateName = req.body.templateName || "Professional";
      const templateStyle = req.body.templateStyle || "";
      const templateCategory = req.body.templateCategory || "modern";

      const templateInstruction = templateStyle
        ? `\n\nTEMPLATE STYLE: "${templateName}" (${templateCategory} category)
Style guidelines: ${templateStyle}
Adapt the resume content, tone, and formatting to match this template style. For example:
- For "tech" templates: emphasize technical skills, use technical terminology, include project descriptions
- For "executive" templates: focus on leadership, strategic achievements, P&L responsibility
- For "creative" templates: use engaging language, highlight creative accomplishments
- For "healthcare" templates: emphasize certifications, patient outcomes, compliance
- For "finance" templates: highlight quantitative achievements, regulatory knowledge
- For "entry-level" templates: focus on education, projects, internships, transferable skills
- For "ats-focused" templates: maximize keyword density, use standard section headers, simple formatting`
        : "";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert resume writer specializing in ATS-optimized resumes. Based on the provided resume text and/or job description, generate a complete, improved, ATS-friendly resume with full structured data.${templateInstruction}

Return ONLY valid JSON with this EXACT format:
{
  "name": "<Full name extracted or inferred from resume>",
  "title": "<Professional title/designation>",
  "email": "<Email if found, or generate a professional one>",
  "phone": "<Phone if found, or leave empty string>",
  "location": "<Location if found, or leave empty string>",
  "linkedin": "<LinkedIn URL if found, or leave empty string>",
  "website": "<Website/portfolio if found, or leave empty string>",
  "summary": "<Professional summary, 3-4 impactful sentences tailored to the template style>",
  "experience": [
    {
      "title": "<Job title>",
      "company": "<Company name>",
      "location": "<City, State/Country>",
      "dates": "<Start – End>",
      "bullets": ["<Achievement bullet with metrics>", "<Another achievement>", "<Third bullet point>"]
    }
  ],
  "skills": ["<skill1>", "<skill2>", "<skill3>", "<skill4>", "<skill5>", "<skill6>", "<skill7>", "<skill8>", "<skill9>", "<skill10>"],
  "education": {
    "degree": "<Degree name>",
    "school": "<University/School name>",
    "dates": "<Year range>",
    "gpa": "<GPA if available, or empty string>"
  },
  "certifications": ["<cert1>", "<cert2>"],
  "languages": ["<language1 (proficiency)>", "<language2 (proficiency)>"],
  "keywords": ["<ats keyword1>", "<ats keyword2>", "<ats keyword3>", "<ats keyword4>", "<ats keyword5>", "<ats keyword6>", "<ats keyword7>", "<ats keyword8>"]
}

IMPORTANT: Include at least 2-3 experience entries with 3 achievement bullets each. Use metrics and numbers wherever possible. If information is not available in the resume, create realistic placeholders based on the job description context. Generate at least 10 relevant skills and 8 ATS keywords.`,
          },
          {
            role: "user",
            content: `${resumeText ? `CURRENT RESUME:\n${resumeText}\n\n` : ""}${jobDescription ? `TARGET JOB:\n${jobDescription}` : ""}`,
          },
        ],
        max_completion_tokens: 3000,
      });

      let result: any = {};
      try {
        const content = response.choices[0]?.message?.content?.trim() || "{}";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        result = {
          name: "Your Name",
          title: "Professional",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          website: "",
          summary: response.choices[0]?.message?.content?.trim() || "Could not generate resume.",
          experience: [],
          skills: [],
          education: { degree: "", school: "", dates: "", gpa: "" },
          certifications: [],
          languages: [],
          keywords: [],
        };
      }

      res.json(result);
    } catch (error: any) {
      log(`Resume builder failed: ${error.message}`, "resume");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ NEW: Company Questions ============

  app.post("/api/company-questions", async (req, res) => {
    try {
      const parsed = companyQuestionsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { company, role, resumeText, jobDescription, language } = parsed.data;

      const hasResumeContext = resumeText.trim().length > 0;
      const hasJD = jobDescription.trim().length > 0;
      const contextInfo = hasResumeContext || hasJD
        ? `\n\nIMPORTANT: The candidate has provided their resume${hasJD ? " and target job description" : ""}. Personalize the interview questions based on their specific background, skills, and experience. Ask questions relevant to their actual skills and career level. Make questions that test their claimed expertise.`
        : "";

      const languageMap: Record<string, string> = {
        "en-US": "English", "en-GB": "English", "en-IN": "English",
        "hi": "Hindi", "es": "Spanish", "fr": "French", "de": "German",
        "pt": "Portuguese", "ja": "Japanese", "ko": "Korean",
        "zh": "Chinese (Simplified)", "ar": "Arabic", "it": "Italian",
        "nl": "Dutch", "ru": "Russian", "tr": "Turkish",
      };
      const langName = languageMap[language] || "English";
      const isNonEnglish = !language.startsWith("en");
      const languageInstruction = isNonEnglish
        ? `\n\nCRITICAL: Generate ALL questions, categories, tips, and difficulty labels in ${langName} language. The entire JSON output must be in ${langName}.`
        : "";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert interview preparation coach with deep knowledge of company interview processes. Generate realistic interview questions commonly asked at the specified company.${contextInfo}${languageInstruction} Return ONLY valid JSON array with this format:
[
  { "question": "<question text>", "category": "<Behavioral|Technical|System Design|Product|Culture Fit>", "difficulty": "<Easy|Medium|Hard>", "tip": "<1 sentence tip for answering>" }
]
Generate 10 diverse questions covering different categories.${hasResumeContext ? " Make at least 5 questions specifically tailored to the candidate's resume skills and experience." : ""}`,
          },
          {
            role: "user",
            content: `Company: ${company}${role ? `\nRole: ${role}` : ""}${hasResumeContext ? `\n\nCandidate Resume:\n${resumeText.substring(0, 3000)}` : ""}${hasJD ? `\n\nTarget Job Description:\n${jobDescription.substring(0, 2000)}` : ""}`,
          },
        ],
        max_completion_tokens: 2500,
      });

      let questions: any[] = [];
      try {
        const content = response.choices[0]?.message?.content?.trim() || "[]";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        questions = JSON.parse(cleaned);
      } catch {
        questions = [
          { question: `Tell me about a time you faced a challenge at work.`, category: "Behavioral", difficulty: "Medium", tip: "Use the STAR method." },
          { question: `Why do you want to work at ${company}?`, category: "Culture Fit", difficulty: "Easy", tip: "Research the company values." },
        ];
      }

      res.json({ company, role: role || "General", questions });
    } catch (error: any) {
      log(`Company questions failed: ${error.message}`, "questions");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ Resume Analysis ============

  app.post("/api/resume-analyze", upload.single("resume"), async (req, res) => {
    try {
      let resumeText = req.body.resumeText || "";

      if (req.file) {
        resumeText = await extractResumeText(req.file.buffer, req.file.mimetype);
        if (!resumeText) {
          return res.status(422).json({ error: "Could not extract text from the file." });
        }
      }

      if (!resumeText || resumeText.trim().length < 20) {
        return res.status(400).json({ error: "Please provide resume text or upload a PDF." });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert resume analyst. Analyze the given resume and extract structured information. Return ONLY valid JSON:
{
  "name": "<candidate's full name>",
  "detectedRole": "<most likely job title/role, e.g. Software Engineer, Digital Marketer, Data Scientist>",
  "industry": "<primary industry domain, e.g. Technology, Finance, Healthcare, Marketing>",
  "experienceLevel": "<entry/mid/senior/executive>",
  "totalYears": <estimated total years of experience as number>,
  "skills": {
    "technical": ["<skill1>", "<skill2>", "...up to 10 most relevant technical/hard skills"],
    "soft": ["<skill1>", "<skill2>", "...up to 5 soft skills inferred from experience"]
  },
  "experience": [
    {"title": "<job title>", "company": "<company>", "duration": "<duration>", "highlights": "<1 sentence summary>"}
  ],
  "education": [
    {"degree": "<degree>", "institution": "<institution>", "year": "<year if available>"}
  ],
  "suggestedInterviewTypes": ["<type1>", "<type2>", "<type3>"],
  "profileSummary": "<2-3 sentence professional summary>"
}

For suggestedInterviewTypes, suggest 3-5 interview categories that are most relevant. Examples: "Behavioral", "Technical - Software Engineering", "System Design", "Data Science & ML", "Product Management", "Trading & Quantitative Finance", "Digital Marketing", "Sales Strategy", "HR & People Management", "Financial Analysis", "Cloud Architecture", "DevOps & Infrastructure", "UI/UX Design", "Consulting Case Study", "Healthcare Administration", "Project Management", "Cybersecurity", etc.
Be specific to the candidate's actual field - do NOT use generic categories.`
          },
          {
            role: "user",
            content: `Analyze this resume:\n\n${resumeText.slice(0, 4000)}`
          }
        ],
        max_completion_tokens: 1500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content?.trim() || "{}";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      res.json({
        name: parsed.name || "Unknown",
        detectedRole: parsed.detectedRole || "Professional",
        industry: parsed.industry || "General",
        experienceLevel: parsed.experienceLevel || "mid",
        totalYears: parsed.totalYears || 0,
        skills: {
          technical: Array.isArray(parsed.skills?.technical) ? parsed.skills.technical : [],
          soft: Array.isArray(parsed.skills?.soft) ? parsed.skills.soft : [],
        },
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        suggestedInterviewTypes: Array.isArray(parsed.suggestedInterviewTypes) ? parsed.suggestedInterviewTypes : ["Behavioral", "Technical"],
        profileSummary: parsed.profileSummary || "",
        resumeText: resumeText.trim(),
      });
    } catch (error: any) {
      log(`Resume analysis failed: ${error.message}`, "resume");
      res.status(500).json({ error: error.message || "Failed to analyze resume" });
    }
  });

  // ============ Simli Avatar Status ============

  app.get("/api/simli/status", (_req, res) => {
    res.json({
      configured: !!process.env.SIMLI_API_KEY,
      apiKey: process.env.SIMLI_API_KEY || null,
    });
  });

  // ============ NEW: Video Interview Sessions ============

  const createVideoSessionSchema = z.object({
    interviewType: z.string().min(1, "Interview type is required"),
    resumeText: z.string().optional().default(""),
    jobDescription: z.string().optional().default(""),
    language: z.string().optional().default("en-US"),
    candidateName: z.string().optional().default(""),
  });

  app.post("/api/video-interviews", async (req, res) => {
    try {
      const parsed = createVideoSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const session = await storage.createVideoInterviewSession(parsed.data);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/video-interviews", async (_req, res) => {
    try {
      const sessions = await storage.getVideoInterviewSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/video-interviews/:id", async (req, res) => {
    try {
      const session = await storage.getVideoInterviewSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      const messages = await storage.getVideoInterviewMessages(req.params.id);
      res.json({ ...session, messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ Video Interview Report ============

  app.post("/api/video-interviews/:id/report", async (req, res) => {
    try {
      const session = await storage.getVideoInterviewSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const messages = await storage.getVideoInterviewMessages(req.params.id);

      const aiQuestions = messages.filter(m => m.role === "ai" && !m.score);
      const userAnswers = messages.filter(m => m.role === "user");
      const evaluations = messages.filter(m => m.role === "ai" && m.score);

      const conversationSummary = messages.map(m => {
        if (m.role === "ai" && m.score) {
          return `[Evaluation] Score: ${m.score}/10 - ${m.content}`;
        }
        return `[${m.role === "ai" ? "Interviewer" : "Candidate"}]: ${m.content}`;
      }).join("\n\n");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach generating a comprehensive interview performance report. Analyze the full conversation transcript between the AI interviewer and the candidate. Return ONLY valid JSON with this exact format:
{
  "totalScore": <number 0-100, overall interview score>,
  "summary": "<3-4 sentence executive summary of the candidate's overall performance>",
  "strengths": ["<strength 1 with specific example from the interview>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1 with specific example>", "<weakness 2>", "<weakness 3>"],
  "improvements": ["<actionable improvement 1 tied to the job description if available>", "<improvement 2>", "<improvement 3>", "<improvement 4>"],
  "communicationAnalysis": {
    "clarity": <number 1-10>,
    "confidence": <number 1-10>,
    "structure": <number 1-10>,
    "articulation": <number 1-10>,
    "summary": "<2-3 sentence analysis of communication style>"
  },
  "technicalRating": {
    "domainKnowledge": <number 1-10>,
    "problemSolving": <number 1-10>,
    "practicalApplication": <number 1-10>,
    "summary": "<2-3 sentence analysis of technical/domain competence>"
  },
  "careerGuidance": ["<specific career recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "questionBreakdown": [
    {
      "question": "<the interviewer's question>",
      "score": <number 1-10>,
      "feedback": "<1-2 sentence feedback for this specific answer>"
    }
  ]
}

When generating improvements, specifically reference the job description requirements if provided and explain how the candidate can better align their answers to the role.
For communicationAnalysis, assess how clearly and confidently the candidate communicated their ideas.
For technicalRating, assess domain knowledge depth even for non-technical roles (marketing, sales, HR etc. - assess their domain expertise).
For careerGuidance, provide specific next steps for career development based on the interview performance.`,
          },
          {
            role: "user",
            content: `INTERVIEW TYPE: ${session.interviewType}\n${session.resumeText ? `\nRESUME:\n${session.resumeText.slice(0, 2000)}` : ""}${session.jobDescription ? `\n\nJOB DESCRIPTION:\n${session.jobDescription.slice(0, 1500)}` : ""}\n\nFULL INTERVIEW TRANSCRIPT:\n${conversationSummary}`,
          },
        ],
        max_completion_tokens: 2000,
        temperature: 0.4,
      });

      let report: any = {
        totalScore: 0,
        summary: "",
        strengths: [] as string[],
        weaknesses: [] as string[],
        improvements: [] as string[],
        communicationAnalysis: { clarity: 0, confidence: 0, structure: 0, articulation: 0, summary: "" },
        technicalRating: { domainKnowledge: 0, problemSolving: 0, practicalApplication: 0, summary: "" },
        careerGuidance: [] as string[],
        questionBreakdown: [] as { question: string; score: number; feedback: string }[],
      };

      try {
        const content = response.choices[0]?.message?.content?.trim() || "{}";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const safeNum = (v: any, min = 0, max = 10) => typeof v === "number" ? Math.min(max, Math.max(min, Math.round(v))) : 0;
        report = {
          totalScore: safeNum(parsed.totalScore, 0, 100),
          summary: typeof parsed.summary === "string" ? parsed.summary : "Report generation completed.",
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: any) => typeof s === "string") : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.filter((s: any) => typeof s === "string") : [],
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((s: any) => typeof s === "string") : [],
          communicationAnalysis: {
            clarity: safeNum(parsed.communicationAnalysis?.clarity),
            confidence: safeNum(parsed.communicationAnalysis?.confidence),
            structure: safeNum(parsed.communicationAnalysis?.structure),
            articulation: safeNum(parsed.communicationAnalysis?.articulation),
            summary: typeof parsed.communicationAnalysis?.summary === "string" ? parsed.communicationAnalysis.summary : "",
          },
          technicalRating: {
            domainKnowledge: safeNum(parsed.technicalRating?.domainKnowledge),
            problemSolving: safeNum(parsed.technicalRating?.problemSolving),
            practicalApplication: safeNum(parsed.technicalRating?.practicalApplication),
            summary: typeof parsed.technicalRating?.summary === "string" ? parsed.technicalRating.summary : "",
          },
          careerGuidance: Array.isArray(parsed.careerGuidance) ? parsed.careerGuidance.filter((s: any) => typeof s === "string") : [],
          questionBreakdown: Array.isArray(parsed.questionBreakdown) ? parsed.questionBreakdown.map((q: any) => ({
            question: typeof q.question === "string" ? q.question : "",
            score: typeof q.score === "number" ? q.score : 0,
            feedback: typeof q.feedback === "string" ? q.feedback : "",
          })) : [],
        };
      } catch {
        report.summary = "Could not parse the interview report. Please try again.";
      }

      res.json(report);
    } catch (error: any) {
      log(`Interview report generation failed: ${error.message}`, "report");
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ============ WebSocket for Audio & Video Interview ============

  const wss = new WebSocketServer({ noServer: true });
  const videoWss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/ws/video-interview")) {
      videoWss.handleUpgrade(request, socket, head, (ws) => {
        videoWss.emit("connection", ws, request);
      });
    } else if (request.url?.startsWith("/ws/audio")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (!request.url?.startsWith("/__vite")) {
      socket.destroy();
    }
  });

  // ============ Video Interview WebSocket ============

  videoWss.on("connection", async (ws: WebSocket, request: any) => {
    log("Video Interview WebSocket connected", "websocket");

    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const sessionId = parsedUrl.searchParams.get("sessionId");
    const candidateName = parsedUrl.searchParams.get("candidateName") || "";

    if (!sessionId) {
      ws.send(JSON.stringify({ type: "error", message: "No sessionId provided" }));
      ws.close();
      return;
    }

    let session = await storage.getVideoInterviewSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
      ws.close();
      return;
    }

    let deepgramConnection: any = null;
    let currentTranscript = "";
    let isProcessing = false;
    let aiSpeaking = false;

    const sessionLanguage = session.language || "en-US";

    const conversation = new ConversationManager({
      interviewType: session.interviewType,
      resumeText: session.resumeText,
      jobDescription: session.jobDescription,
      totalQuestions: session.totalQuestions,
      language: sessionLanguage,
      candidateName: candidateName,
    });

    function sendToClient(data: any) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }

    let ttsChunkCount = 0;
    let ttsTotalBytes = 0;

    const interviewerProfile = selectInterviewerProfile(sessionLanguage);

    sendToClient({
      type: "avatar_config",
      faceId: interviewerProfile.faceId,
      gender: interviewerProfile.gender,
    });

    async function streamTTSToClient(text: string) {
      try {
        log(`Starting TTS for text (${text.length} chars) in ${sessionLanguage}`, "tts");
        ttsChunkCount = 0;
        ttsTotalBytes = 0;
        aiSpeaking = true;
        currentTranscript = "";

        await streamTTS(
          text,
          interviewerProfile,
          (audioBase64: string) => {
            ttsChunkCount++;
            const binaryLen = Math.floor(audioBase64.length * 3 / 4);
            ttsTotalBytes += binaryLen;
            sendToClient({ type: "tts_audio", audio: audioBase64 });
          },
          () => {
            const playDurationMs = Math.ceil((ttsTotalBytes / 32000) * 1000) + 1500;
            log(`TTS done, ${ttsChunkCount} chunks sent, ${ttsTotalBytes} bytes (~${Math.round(playDurationMs/1000)}s play buffer)`, "tts");
            sendToClient({ type: "ai_speaking_done", playDurationMs });
            setTimeout(() => {
              aiSpeaking = false;
              currentTranscript = "";
            }, playDurationMs);
          },
          (error: string) => {
            log(`TTS error, sending browser TTS fallback: ${error}`, "tts");
            sendToClient({ type: "tts_fallback", text, language: sessionLanguage });
            sendToClient({ type: "ai_speaking_done", playDurationMs: 5000 });
            setTimeout(() => {
              aiSpeaking = false;
              currentTranscript = "";
            }, 5000);
          },
          sessionLanguage
        );
      } catch (error: any) {
        log(`TTS error: ${error.message}`, "tts");
        sendToClient({ type: "tts_fallback", text, language: sessionLanguage });
        sendToClient({ type: "ai_speaking_done", playDurationMs: 5000 });
        setTimeout(() => {
          aiSpeaking = false;
          currentTranscript = "";
        }, 5000);
      }
    }

    const DEEPGRAM_LANGUAGE_MAP: Record<string, string> = {
      "en-US": "en-US",
      "en-GB": "en-GB",
      "en-IN": "en-IN",
      "hi": "hi",
      "es": "es",
      "fr": "fr",
      "de": "de",
      "pt": "pt",
      "ja": "ja",
      "ko": "ko",
      "zh": "zh",
      "ar": "ar",
      "it": "it",
      "nl": "nl",
      "ru": "ru",
      "tr": "tr",
    };

    function setupDeepgramForVideo() {
      const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramApiKey) {
        sendToClient({ type: "error", message: "Deepgram API key not configured." });
        return;
      }

      const deepgramLang = DEEPGRAM_LANGUAGE_MAP[sessionLanguage] || "en";
      const useNova3 = sessionLanguage.startsWith("en");

      try {
        const deepgram = createClient(deepgramApiKey);
        deepgramConnection = deepgram.listen.live({
          model: useNova3 ? "nova-3" : "nova-2",
          language: deepgramLang,
          smart_format: true,
          interim_results: true,
          utterance_end_ms: 1500,
          vad_events: true,
          encoding: "linear16",
          sample_rate: 48000,
        });

        deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
          log("Video interview Deepgram connected", "deepgram");
          sendToClient({ type: "deepgram_status", status: "connected" });
        });

        deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (!transcript) return;

          if (aiSpeaking) return;

          const isFinal = data.is_final;
          sendToClient({ type: "transcript", text: transcript, isFinal });
          if (isFinal && transcript.trim().length > 0) {
            currentTranscript += " " + transcript.trim();
          }
        });

        deepgramConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
          log(`Video Deepgram error: ${JSON.stringify(error)}`, "deepgram");
        });

        deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
          log("Video interview Deepgram closed", "deepgram");
          sendToClient({ type: "deepgram_status", status: "disconnected" });
        });
      } catch (error: any) {
        log(`Video Deepgram setup failed: ${error.message}`, "deepgram");
        sendToClient({ type: "error", message: "Failed to start transcription." });
      }
    }

    setupDeepgramForVideo();

    await storage.updateVideoInterviewSession(sessionId, { status: "in_progress" });
    session = await storage.getVideoInterviewSession(sessionId);

    const firstQuestion = await conversation.startIntroduction();
    await storage.createVideoInterviewMessage({
      sessionId,
      role: "ai",
      content: firstQuestion,
      questionIndex: 0,
    });
    sendToClient({ type: "ai_question", text: firstQuestion, questionIndex: 0, totalQuestions: session!.totalQuestions });
    streamTTSToClient(firstQuestion);

    ws.on("message", async (data: any) => {
      try {
        if (Buffer.isBuffer(data) || data instanceof ArrayBuffer || data instanceof Uint8Array) {
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
          if (buf.length > 0 && buf[0] === 0x7B) {
            try {
              const msg = JSON.parse(buf.toString("utf8"));
              if (msg.type) {
                handleJsonMessage(msg);
                return;
              }
            } catch {
            }
          }
          if (deepgramConnection && deepgramConnection.getReadyState() === 1) {
            deepgramConnection.send(buf);
          }
          return;
        }

        const strData = typeof data === "string" ? data : data.toString();
        if (strData.startsWith("{")) {
          const msg = JSON.parse(strData);
          handleJsonMessage(msg);
        }
      } catch (error: any) {
        log(`Video WS message error: ${error.message}`, "websocket");
        isProcessing = false;
      }
    });

    async function handleJsonMessage(msg: any) {
      try {
          if (msg.type === "end_turn") {
            if (isProcessing) return;
            isProcessing = true;

            const userAnswer = currentTranscript.trim();
            if (userAnswer.length > 5) {
              const questionIndex = conversation.getQuestionIndex();

              await storage.createVideoInterviewMessage({
                sessionId,
                role: "user",
                content: userAnswer,
                questionIndex,
              });

              sendToClient({ type: "processing", message: "Processing..." });

              const result = await conversation.processUserAnswer(userAnswer);

              if (!result.isConversational) {
                await storage.createVideoInterviewMessage({
                  sessionId,
                  role: "ai",
                  content: result.evaluation.feedback,
                  questionIndex: result.questionIndex,
                  score: result.evaluation.score,
                  feedback: result.evaluation.feedback,
                });

                sendToClient({
                  type: "evaluation",
                  score: result.evaluation.score,
                  feedback: result.evaluation.feedback,
                  questionIndex: result.questionIndex,
                });
              }

              await storage.updateVideoInterviewSession(sessionId, {
                currentQuestion: result.questionIndex,
              });

              if (result.isComplete) {
                const avgScore = conversation.getAverageScore();

                await storage.updateVideoInterviewSession(sessionId, {
                  status: "completed",
                  totalScore: avgScore,
                  currentQuestion: result.questionIndex,
                });

                await storage.createVideoInterviewMessage({
                  sessionId,
                  role: "ai",
                  content: result.nextResponse,
                  questionIndex: result.questionIndex,
                });

                sendToClient({
                  type: "ai_question",
                  text: result.nextResponse,
                  questionIndex: result.questionIndex,
                  totalQuestions: session!.totalQuestions,
                  isComplete: true,
                });
                streamTTSToClient(result.nextResponse);
                sendToClient({
                  type: "interview_complete",
                  totalScore: avgScore,
                  totalQuestions: session!.totalQuestions,
                });
              } else {
                await storage.createVideoInterviewMessage({
                  sessionId,
                  role: "ai",
                  content: result.nextResponse,
                  questionIndex: result.questionIndex,
                });

                sendToClient({
                  type: "ai_question",
                  text: result.nextResponse,
                  questionIndex: result.questionIndex,
                  totalQuestions: session!.totalQuestions,
                });
                streamTTSToClient(result.nextResponse);
              }
            }

            currentTranscript = "";
            isProcessing = false;
          }
      } catch (error: any) {
        log(`Video WS handleJsonMessage error: ${error.message}`, "websocket");
        isProcessing = false;
      }
    }

    ws.on("close", () => {
      log("Video Interview WebSocket disconnected", "websocket");
      if (deepgramConnection) {
        try { deepgramConnection.requestClose(); } catch {}
      }
    });
  });

  // ============ Audio Copilot WebSocket ============

  wss.on("connection", (ws: WebSocket, request: any) => {
    log("Audio WebSocket client connected", "websocket");

    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const interviewId = parsedUrl.searchParams.get("interviewId");
    const answerLength = parsedUrl.searchParams.get("answerLength") || "medium";
    const tone = parsedUrl.searchParams.get("tone") || "professional";

    let chunkCount = 0;
    let totalBytes = 0;
    let transcriptBuffer = "";
    let lastHintTime = 0;
    let deepgramConnection: any = null;
    let resumeText = "";
    let jobDescription = "";
    let hintPending = false;

    const HINT_DEBOUNCE_MS = 8000;
    const MIN_TRANSCRIPT_LENGTH = 30;

    async function loadInterviewContext() {
      if (!interviewId) {
        sendToClient({ type: "error", message: "No interviewId provided. Hints will not be generated." });
        return;
      }

      try {
        const interview = await storage.getMockInterview(interviewId);
        if (!interview) {
          sendToClient({ type: "error", message: "Interview session not found." });
          return;
        }

        resumeText = interview.resumeText || "";
        jobDescription = interview.jobDescription || "";

        if (!resumeText) {
          sendToClient({ type: "error", message: "No resume text available for this interview." });
        }

        log(`Loaded interview context: ${resumeText.length} chars resume, ${jobDescription.length} chars JD`, "websocket");
      } catch (error: any) {
        log(`Failed to load interview context: ${error.message}`, "websocket");
        sendToClient({ type: "error", message: "Failed to load interview context." });
      }
    }

    function sendToClient(data: any) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }

    async function requestHint() {
      if (hintPending) return;
      if (transcriptBuffer.trim().length < MIN_TRANSCRIPT_LENGTH) return;
      if (!resumeText && !jobDescription) return;

      const now = Date.now();
      if (now - lastHintTime < HINT_DEBOUNCE_MS) return;

      hintPending = true;
      lastHintTime = now;

      const currentTranscript = transcriptBuffer;
      log(`Generating hint for transcript: "${currentTranscript.slice(-100)}"`, "openai");

      try {
        const hint = await generateLiveHint(currentTranscript, resumeText, jobDescription, answerLength, tone);
        if (hint) {
          sendToClient({ type: "hint", hint, transcript: currentTranscript.slice(-200) });
        }
      } catch (error: any) {
        log(`Hint generation error: ${error.message}`, "openai");
      } finally {
        hintPending = false;
      }
    }

    function setupDeepgram() {
      const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramApiKey) {
        sendToClient({ type: "error", message: "Deepgram API key not configured. Audio transcription is unavailable." });
        log("DEEPGRAM_API_KEY not set", "deepgram");
        return;
      }

      try {
        const deepgram = createClient(deepgramApiKey);
        deepgramConnection = deepgram.listen.live({
          model: "nova-3",
          language: "en",
          smart_format: true,
          interim_results: true,
          utterance_end_ms: 1500,
          vad_events: true,
          encoding: "linear16",
          sample_rate: 48000,
        });

        deepgramConnection.on(LiveTranscriptionEvents.Open, () => {
          log("Deepgram connection opened", "deepgram");
          sendToClient({ type: "deepgram_status", status: "connected" });
        });

        deepgramConnection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (!transcript) return;

          const isFinal = data.is_final;

          sendToClient({
            type: "transcript",
            text: transcript,
            isFinal,
          });

          if (isFinal && transcript.trim().length > 0) {
            transcriptBuffer += " " + transcript.trim();
            transcriptBuffer = transcriptBuffer.slice(-2000);
            requestHint();
          }
        });

        deepgramConnection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
          requestHint();
        });

        deepgramConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
          log(`Deepgram error: ${JSON.stringify(error)}`, "deepgram");
          sendToClient({ type: "error", message: "Transcription error occurred." });
        });

        deepgramConnection.on(LiveTranscriptionEvents.Close, () => {
          log("Deepgram connection closed", "deepgram");
          sendToClient({ type: "deepgram_status", status: "disconnected" });
        });
      } catch (error: any) {
        log(`Deepgram setup failed: ${error.message}`, "deepgram");
        sendToClient({ type: "error", message: "Failed to start transcription service." });
      }
    }

    loadInterviewContext().then(() => {
      setupDeepgram();
    });

    ws.on("message", (data: Buffer) => {
      chunkCount++;
      totalBytes += data.length;

      if (chunkCount % 10 === 0) {
        log(`Received ${chunkCount} audio chunks (${(totalBytes / 1024).toFixed(1)} KB total)`, "websocket");
      }

      if (deepgramConnection && deepgramConnection.getReadyState() === 1) {
        deepgramConnection.send(data);
      }

      sendToClient({
        type: "ack",
        chunks: chunkCount,
        bytes: totalBytes,
      });
    });

    ws.on("close", () => {
      log(`Audio WebSocket disconnected after ${chunkCount} chunks (${(totalBytes / 1024).toFixed(1)} KB)`, "websocket");
      if (deepgramConnection) {
        try {
          deepgramConnection.requestClose();
        } catch {
          // ignore
        }
      }
    });

    ws.on("error", (error) => {
      log(`Audio WebSocket error: ${error.message}`, "websocket");
    });
  });

  return httpServer;
}
