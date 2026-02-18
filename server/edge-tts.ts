import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { spawn } from "child_process";
import OpenAI from "openai";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type VoiceGender = "male" | "female";

interface VoiceConfig {
  voice: string;
  gender: VoiceGender;
}

const OPENAI_VOICE_CONFIGS: Record<string, VoiceConfig[]> = {
  "hi": [
    { voice: "ash", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "en-US": [
    { voice: "echo", gender: "male" },
    { voice: "onyx", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "en-GB": [
    { voice: "fable", gender: "male" },
    { voice: "shimmer", gender: "female" },
  ],
  "en-IN": [
    { voice: "onyx", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "es": [
    { voice: "echo", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "fr": [
    { voice: "echo", gender: "male" },
    { voice: "shimmer", gender: "female" },
  ],
  "de": [
    { voice: "echo", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "pt": [
    { voice: "onyx", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "ja": [
    { voice: "echo", gender: "male" },
    { voice: "alloy", gender: "female" },
  ],
  "ko": [
    { voice: "echo", gender: "male" },
    { voice: "alloy", gender: "female" },
  ],
  "zh": [
    { voice: "echo", gender: "male" },
    { voice: "alloy", gender: "female" },
  ],
  "ar": [
    { voice: "onyx", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "it": [
    { voice: "echo", gender: "male" },
    { voice: "shimmer", gender: "female" },
  ],
  "nl": [
    { voice: "echo", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "ru": [
    { voice: "onyx", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
  "tr": [
    { voice: "ash", gender: "male" },
    { voice: "nova", gender: "female" },
  ],
};

const DEFAULT_OPENAI_CONFIGS: VoiceConfig[] = [
  { voice: "echo", gender: "male" },
  { voice: "nova", gender: "female" },
];

const MALE_FACE_IDS = [
  "7e74d6e7-d559-4394-bd56-4923a3ab75ad",
  "804c347a-26c9-4dcf-bb49-13df4bed61e8",
  "f0ba4efe-7946-45de-9955-c04a04c367b9",
];

const FEMALE_FACE_IDS = [
  "b9e5fba3-071a-4e35-896e-211c4d6eaa7b",
  "d2a5c7c6-fed9-4f55-bcb3-062f7cd20103",
  "b1f6ad8f-ed78-430b-85ef-2ec672728104",
];

const EDGE_VOICE_CONFIGS: Record<string, VoiceConfig[]> = {
  "hi": [
    { voice: "hi-IN-MadhurNeural", gender: "male" },
    { voice: "hi-IN-SwaraNeural", gender: "female" },
  ],
  "en-US": [
    { voice: "en-US-BrianNeural", gender: "male" },
    { voice: "en-US-ChristopherNeural", gender: "male" },
    { voice: "en-US-JennyNeural", gender: "female" },
  ],
  "en-GB": [
    { voice: "en-GB-RyanNeural", gender: "male" },
    { voice: "en-GB-LibbyNeural", gender: "female" },
  ],
  "en-IN": [
    { voice: "en-IN-PrabhatNeural", gender: "male" },
    { voice: "en-IN-NeerjaNeural", gender: "female" },
  ],
  "es": [
    { voice: "es-ES-AlvaroNeural", gender: "male" },
    { voice: "es-ES-ElviraNeural", gender: "female" },
  ],
  "fr": [
    { voice: "fr-FR-HenriNeural", gender: "male" },
    { voice: "fr-FR-DeniseNeural", gender: "female" },
  ],
  "de": [
    { voice: "de-DE-ConradNeural", gender: "male" },
    { voice: "de-DE-KatjaNeural", gender: "female" },
  ],
  "pt": [
    { voice: "pt-BR-AntonioNeural", gender: "male" },
    { voice: "pt-BR-FranciscaNeural", gender: "female" },
  ],
  "ja": [
    { voice: "ja-JP-KeitaNeural", gender: "male" },
    { voice: "ja-JP-NanamiNeural", gender: "female" },
  ],
  "ko": [
    { voice: "ko-KR-InJoonNeural", gender: "male" },
    { voice: "ko-KR-SunHiNeural", gender: "female" },
  ],
  "zh": [
    { voice: "zh-CN-YunxiNeural", gender: "male" },
    { voice: "zh-CN-XiaoxiaoNeural", gender: "female" },
  ],
  "ar": [
    { voice: "ar-SA-HamedNeural", gender: "male" },
    { voice: "ar-SA-ZariyahNeural", gender: "female" },
  ],
  "it": [
    { voice: "it-IT-DiegoNeural", gender: "male" },
    { voice: "it-IT-ElsaNeural", gender: "female" },
  ],
  "nl": [
    { voice: "nl-NL-MaartenNeural", gender: "male" },
    { voice: "nl-NL-ColetteNeural", gender: "female" },
  ],
  "ru": [
    { voice: "ru-RU-DmitryNeural", gender: "male" },
    { voice: "ru-RU-SvetlanaNeural", gender: "female" },
  ],
  "tr": [
    { voice: "tr-TR-AhmetNeural", gender: "male" },
    { voice: "tr-TR-EmelNeural", gender: "female" },
  ],
};

const DEFAULT_EDGE_CONFIGS: VoiceConfig[] = [
  { voice: "en-US-BrianNeural", gender: "male" },
  { voice: "en-US-JennyNeural", gender: "female" },
];

export interface InterviewerProfile {
  openaiVoice: string;
  edgeVoice: string;
  gender: VoiceGender;
  faceId: string;
}

export function selectInterviewerProfile(language: string): InterviewerProfile {
  const gender: VoiceGender = Math.random() < 0.5 ? "male" : "female";

  const openaiConfigs = OPENAI_VOICE_CONFIGS[language] || DEFAULT_OPENAI_CONFIGS;
  const matchingOpenai = openaiConfigs.filter(c => c.gender === gender);
  const openaiConfig = matchingOpenai.length > 0
    ? matchingOpenai[Math.floor(Math.random() * matchingOpenai.length)]
    : openaiConfigs[0];

  const edgeConfigs = EDGE_VOICE_CONFIGS[language] || DEFAULT_EDGE_CONFIGS;
  const matchingEdge = edgeConfigs.filter(c => c.gender === gender);
  const edgeConfig = matchingEdge.length > 0
    ? matchingEdge[Math.floor(Math.random() * matchingEdge.length)]
    : edgeConfigs[0];

  const facePool = gender === "male" ? MALE_FACE_IDS : FEMALE_FACE_IDS;
  const faceId = facePool[Math.floor(Math.random() * facePool.length)];

  const profile: InterviewerProfile = {
    openaiVoice: openaiConfig.voice,
    edgeVoice: edgeConfig.voice,
    gender,
    faceId,
  };

  log(`Interviewer profile: gender=${gender}, openai=${openaiConfig.voice}, edge=${edgeConfig.voice}, faceId=${faceId}`, "tts");
  return profile;
}

async function openaiTTS(
  text: string,
  language: string,
  voice: string,
  onAudioChunk: (audioBase64: string) => void,
  onDone: () => void,
): Promise<boolean> {
  try {
    log(`OpenAI TTS starting: voice=${voice}, language=${language}, text=${text.length} chars`, "openai-tts");

    const langInstruction = language === "hi" ? "Speak in Hindi exactly as written." :
      language === "es" ? "Speak in Spanish exactly as written." :
      language === "fr" ? "Speak in French exactly as written." :
      language === "de" ? "Speak in German exactly as written." :
      language === "pt" ? "Speak in Portuguese exactly as written." :
      language === "ja" ? "Speak in Japanese exactly as written." :
      language === "ko" ? "Speak in Korean exactly as written." :
      language === "zh" ? "Speak in Chinese exactly as written." :
      language === "ar" ? "Speak in Arabic exactly as written." :
      language === "it" ? "Speak in Italian exactly as written." :
      language === "nl" ? "Speak in Dutch exactly as written." :
      language === "ru" ? "Speak in Russian exactly as written." :
      language === "tr" ? "Speak in Turkish exactly as written." :
      "Speak in English exactly as written.";

    const response = await openai.chat.completions.create({
      model: "gpt-audio-mini",
      modalities: ["text", "audio"],
      audio: { voice: voice as any, format: "pcm16" },
      messages: [
        {
          role: "system",
          content: `You are a professional interviewer conducting an interview. Read the following text aloud exactly as written with no changes, additions, or omissions. Use a warm, natural, conversational tone - like a real human interviewer. ${langInstruction}`
        },
        { role: "user", content: text }
      ],
    } as any);

    const audioData = (response.choices[0]?.message as any)?.audio?.data;
    if (!audioData || audioData.length === 0) {
      log(`OpenAI TTS returned no audio data`, "openai-tts");
      return false;
    }

    log(`OpenAI TTS got audio data (${audioData.length} chars base64), converting to PCM 16kHz`, "openai-tts");

    const audioBuffer = Buffer.from(audioData, "base64");

    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "s16le",
      "-ar", "24000",
      "-ac", "1",
      "-i", "pipe:0",
      "-af", "aresample=resampler=soxr:precision=28",
      "-f", "s16le",
      "-ar", "16000",
      "-ac", "1",
      "pipe:1"
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let chunkCount = 0;
    let totalBytes = 0;

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      chunkCount++;
      totalBytes += chunk.length;
      onAudioChunk(chunk.toString("base64"));
    });

    return new Promise<boolean>((resolve) => {
      ffmpeg.on("close", (code: number) => {
        log(`OpenAI TTS complete: ${chunkCount} chunks, ${totalBytes} bytes PCM 16kHz`, "openai-tts");
        onDone();
        resolve(true);
      });

      ffmpeg.on("error", () => resolve(false));

      ffmpeg.stdin.write(audioBuffer);
      ffmpeg.stdin.end();
    });

  } catch (error: any) {
    log(`OpenAI TTS error: ${error.message}`, "openai-tts");
    return false;
  }
}

async function edgeTTSFallback(
  text: string,
  voiceName: string,
  onAudioChunk: (audioBase64: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    log(`Edge TTS fallback starting: voice=${voiceName}, text=${text.length} chars`, "edge-tts");

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const result = tts.toStream(text, {
      rate: "-5%",
      pitch: "+0Hz",
      volume: "+0%",
    });
    const audioStream = result.audioStream;

    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-af", "aresample=resampler=soxr:precision=28",
      "-f", "s16le",
      "-ar", "16000",
      "-ac", "1",
      "-acodec", "pcm_s16le",
      "pipe:1"
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let totalBytes = 0;
    let chunkCount = 0;

    audioStream.pipe(ffmpeg.stdin);

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      if (chunk && chunk.length > 0) {
        chunkCount++;
        totalBytes += chunk.length;
        onAudioChunk(chunk.toString("base64"));
      }
    });

    ffmpeg.on("close", (code: number) => {
      log(`Edge TTS fallback complete: ${chunkCount} chunks, ${totalBytes} bytes`, "edge-tts");
      if (chunkCount > 0) {
        onDone();
      } else {
        onError("Edge TTS produced no audio");
      }
    });

    ffmpeg.on("error", (err: Error) => onError(err.message));
    audioStream.on("error", (err: Error) => {
      ffmpeg.stdin.end();
      onError(err.message);
    });

  } catch (error: any) {
    log(`Edge TTS fallback error: ${error.message}`, "edge-tts");
    onError(error.message);
  }
}

export async function streamTTS(
  text: string,
  profile: InterviewerProfile,
  onAudioChunk: (audioBase64: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  language: string
): Promise<void> {
  const success = await openaiTTS(text, language, profile.openaiVoice, onAudioChunk, onDone);
  if (success) return;

  log(`OpenAI TTS failed, falling back to Edge TTS`, "openai-tts");
  await edgeTTSFallback(text, profile.edgeVoice, onAudioChunk, onDone, onError);
}
