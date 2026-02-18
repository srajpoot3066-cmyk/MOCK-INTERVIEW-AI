import { useEffect, useRef, useCallback, useState } from "react";
import avatarFemale from "@/assets/images/ai-interviewer-female.png";
import avatarMale from "@/assets/images/ai-interviewer-male.png";

interface AnimatedAvatarProps {
  isSpeaking: boolean;
  className?: string;
  gender?: "female" | "male";
}

const VISEMES = [
  { upper: 0, lower: 0, width: 1 },
  { upper: -2, lower: 3, width: 1.05 },
  { upper: -3, lower: 5, width: 0.85 },
  { upper: -1, lower: 7, width: 0.75 },
  { upper: -4, lower: 6, width: 0.9 },
  { upper: -2, lower: 4, width: 1.1 },
  { upper: -1, lower: 2, width: 0.95 },
  { upper: -3, lower: 8, width: 0.7 },
  { upper: -2, lower: 5, width: 1.0 },
  { upper: 0, lower: 1, width: 1.02 },
];

export function AnimatedAvatar({ isSpeaking, className = "", gender = "female" }: AnimatedAvatarProps) {
  const avatarImg = gender === "male" ? avatarMale : avatarFemale;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const animFrameRef = useRef<number>(0);
  const visemeIndexRef = useRef(0);
  const visemeProgressRef = useRef(0);
  const targetVisemeRef = useRef(VISEMES[0]);
  const currentVisemeRef = useRef({ upper: 0, lower: 0, width: 1 });
  const lastVisemeTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let running = true;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = (time: number) => {
      if (!running) return;

      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      if (isSpeaking) {
        const now = time;
        if (now - lastVisemeTimeRef.current > 80 + Math.random() * 100) {
          lastVisemeTimeRef.current = now;
          visemeIndexRef.current = Math.floor(Math.random() * VISEMES.length);
          targetVisemeRef.current = VISEMES[visemeIndexRef.current];
        }

        const smooth = 0.18;
        currentVisemeRef.current = {
          upper: lerp(currentVisemeRef.current.upper, targetVisemeRef.current.upper, smooth),
          lower: lerp(currentVisemeRef.current.lower, targetVisemeRef.current.lower, smooth),
          width: lerp(currentVisemeRef.current.width, targetVisemeRef.current.width, smooth),
        };
      } else {
        currentVisemeRef.current = {
          upper: lerp(currentVisemeRef.current.upper, 0, 0.12),
          lower: lerp(currentVisemeRef.current.lower, 0, 0.12),
          width: lerp(currentVisemeRef.current.width, 1, 0.12),
        };
      }

      const { upper, lower, width: mouthWidth } = currentVisemeRef.current;

      if (Math.abs(upper) > 0.15 || Math.abs(lower) > 0.15) {
        const mouthCenterX = w * 0.5;
        const mouthCenterY = h * 0.62;
        const baseWidth = w * 0.06;
        const mw = baseWidth * mouthWidth;
        const openAmount = Math.abs(lower) + Math.abs(upper);

        ctx.save();

        const gradient = ctx.createRadialGradient(
          mouthCenterX, mouthCenterY, 0,
          mouthCenterX, mouthCenterY, mw * 1.5
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.45, openAmount * 0.06)})`);
        gradient.addColorStop(0.5, `rgba(0, 0, 0, ${Math.min(0.3, openAmount * 0.04)})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(mouthCenterX, mouthCenterY + lower * 0.5, mw * 1.4, openAmount * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(mouthCenterX - mw, mouthCenterY);

        ctx.bezierCurveTo(
          mouthCenterX - mw * 0.5, mouthCenterY + upper * 1.2,
          mouthCenterX + mw * 0.5, mouthCenterY + upper * 1.2,
          mouthCenterX + mw, mouthCenterY
        );

        ctx.bezierCurveTo(
          mouthCenterX + mw * 0.5, mouthCenterY + lower * 1.2,
          mouthCenterX - mw * 0.5, mouthCenterY + lower * 1.2,
          mouthCenterX - mw, mouthCenterY
        );

        ctx.closePath();

        const mouthGradient = ctx.createLinearGradient(
          mouthCenterX, mouthCenterY + upper,
          mouthCenterX, mouthCenterY + lower
        );
        mouthGradient.addColorStop(0, "rgba(60, 20, 20, 0.7)");
        mouthGradient.addColorStop(0.3, "rgba(40, 10, 15, 0.85)");
        mouthGradient.addColorStop(1, "rgba(25, 5, 10, 0.75)");
        ctx.fillStyle = mouthGradient;
        ctx.fill();

        if (openAmount > 3) {
          ctx.beginPath();
          const teethY = mouthCenterY + upper * 0.6;
          const teethW = mw * 0.7;
          const teethH = Math.min(openAmount * 0.25, 3);
          ctx.roundRect(mouthCenterX - teethW * 0.5, teethY, teethW, teethH, 1);
          ctx.fillStyle = "rgba(240, 235, 230, 0.35)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(mouthCenterX - mw * 0.95, mouthCenterY);
        ctx.bezierCurveTo(
          mouthCenterX - mw * 0.45, mouthCenterY + upper * 1.1,
          mouthCenterX + mw * 0.45, mouthCenterY + upper * 1.1,
          mouthCenterX + mw * 0.95, mouthCenterY
        );
        ctx.strokeStyle = `rgba(180, 100, 100, ${Math.min(0.4, openAmount * 0.05)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mouthCenterX - mw * 0.95, mouthCenterY + 0.5);
        ctx.bezierCurveTo(
          mouthCenterX - mw * 0.45, mouthCenterY + lower * 1.1,
          mouthCenterX + mw * 0.45, mouthCenterY + lower * 1.1,
          mouthCenterX + mw * 0.95, mouthCenterY + 0.5
        );
        ctx.strokeStyle = `rgba(160, 80, 80, ${Math.min(0.35, openAmount * 0.04)})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
    };
  }, [isSpeaking]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={avatarImg}
        alt="AI Interviewer"
        className="w-full h-full object-cover"
        data-testid="img-ai-avatar"
        draggable={false}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        data-testid="canvas-mouth-animation"
        style={{ zIndex: 2 }}
      />
    </div>
  );
}

export function useTTSAudioPlayer() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const onSpeakingChangeRef = useRef<(speaking: boolean) => void>(() => {});
  const activeSourcesRef = useRef(0);
  const disposedRef = useRef(false);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEnqueueTimeRef = useRef(0);

  const getAudioContext = useCallback(() => {
    if (disposedRef.current) return null;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const scheduleSpeakingOff = useCallback(() => {
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    speakingTimeoutRef.current = setTimeout(() => {
      if (disposedRef.current) return;
      const timeSince = Date.now() - lastEnqueueTimeRef.current;
      if (queueRef.current.length === 0 && activeSourcesRef.current <= 0 && timeSince > 200) {
        onSpeakingChangeRef.current(false);
      }
    }, 400);
  }, []);

  const playQueue = useCallback(() => {
    if (disposedRef.current || isPlayingRef.current) return;
    isPlayingRef.current = true;

    const processNext = () => {
      if (disposedRef.current || queueRef.current.length === 0) {
        isPlayingRef.current = false;
        scheduleSpeakingOff();
        return;
      }
      const ctx = getAudioContext();
      if (!ctx) { isPlayingRef.current = false; return; }

      const samples = queueRef.current.shift()!;
      const buffer = ctx.createBuffer(1, samples.length, 16000);
      buffer.getChannelData(0).set(samples);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      nextStartTimeRef.current = startTime + buffer.duration;

      activeSourcesRef.current++;
      source.onended = () => {
        if (disposedRef.current) return;
        activeSourcesRef.current = Math.max(0, activeSourcesRef.current - 1);
        if (activeSourcesRef.current <= 0 && queueRef.current.length === 0) scheduleSpeakingOff();
      };
      source.start(startTime);
      processNext();
    };
    processNext();
  }, [getAudioContext, scheduleSpeakingOff]);

  const enqueuePCM16Audio = useCallback((base64Audio: string) => {
    if (disposedRef.current) return;
    try {
      if (speakingTimeoutRef.current) { clearTimeout(speakingTimeoutRef.current); speakingTimeoutRef.current = null; }
      lastEnqueueTimeRef.current = Date.now();

      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      onSpeakingChangeRef.current(true);
      queueRef.current.push(float32);
      playQueue();
    } catch (err) {
      console.warn("TTS audio decode error:", err);
    }
  }, [playQueue]);

  const setOnSpeakingChange = useCallback((cb: (speaking: boolean) => void) => {
    onSpeakingChangeRef.current = cb;
  }, []);

  const cleanup = useCallback(() => {
    disposedRef.current = true;
    queueRef.current = [];
    if (speakingTimeoutRef.current) { clearTimeout(speakingTimeoutRef.current); speakingTimeoutRef.current = null; }
    activeSourcesRef.current = 0;
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== "closed") {
      setTimeout(() => { try { ctx.close(); } catch {} }, 500);
    }
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    return () => { disposedRef.current = true; };
  }, []);

  return { enqueuePCM16Audio, setOnSpeakingChange, cleanup };
}
