import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Radio, Square, Volume2, WifiOff, Wifi, AlertTriangle, Monitor, CheckCircle2 } from "lucide-react";

type CaptureStatus = "idle" | "connecting" | "listening" | "error" | "no_audio";

interface TranscriptMessage {
  text: string;
  isFinal: boolean;
}

interface HintMessage {
  hint: string;
  transcript: string;
}

interface AudioCaptureProps {
  interviewId?: string | null;
  onTranscript?: (msg: TranscriptMessage) => void;
  onHint?: (msg: HintMessage) => void;
  onDeepgramStatus?: (status: string) => void;
  onListeningChange?: (listening: boolean) => void;
}

export default function AudioCapture({
  interviewId,
  onTranscript,
  onHint,
  onDeepgramStatus,
  onListeningChange,
}: AudioCaptureProps) {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [wsConnected, setWsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fullStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (fullStreamRef.current) {
      fullStreamRef.current.getTracks().forEach((track) => track.stop());
      fullStreamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  const connectWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const searchParams = new URLSearchParams();
      if (interviewId) searchParams.set("interviewId", interviewId);
      const answerLength = localStorage.getItem("copilot_answer_length") || "medium";
      const tone = localStorage.getItem("copilot_tone") || "professional";
      searchParams.set("answerLength", answerLength);
      searchParams.set("tone", tone);
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/audio?${searchParams.toString()}`);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setWsConnected(true);
        resolve(ws);
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
        reject(new Error("WebSocket connection failed"));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          switch (data.type) {
            case "transcript":
              onTranscript?.({ text: data.text, isFinal: data.isFinal });
              break;
            case "hint":
              onHint?.({ hint: data.hint, transcript: data.transcript });
              break;
            case "deepgram_status":
              onDeepgramStatus?.(data.status);
              break;
            case "error":
              toast({
                title: "Service Error",
                description: data.message,
                variant: "destructive",
              });
              break;
          }
        } catch {
          // Binary or non-JSON message
        }
      };

      wsRef.current = ws;
    });
  }, [toast, interviewId, onTranscript, onHint, onDeepgramStatus]);

  const monitorAudioLevel = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(average / 128, 1));
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setStatus("connecting");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        systemAudio: "include",
      } as any);

      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setStatus("no_audio");
        return;
      }

      fullStreamRef.current = stream;

      const audioStream = new MediaStream(audioTracks);
      mediaStreamRef.current = audioStream;

      audioTracks[0].onended = () => {
        stopCapture();
      };

      const ws = await connectWebSocket();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then((buffer) => {
            ws.send(buffer);
          });
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      monitorAudioLevel(audioStream);
      setStatus("listening");
      onListeningChange?.(true);

      toast({
        title: "Listening Started",
        description: "Capturing audio from the selected tab.",
      });
    } catch (error: any) {
      setStatus("idle");
      cleanupAudio();
      cleanupWebSocket();

      if (error.name === "NotAllowedError") {
        return;
      }

      toast({
        title: "Capture Failed",
        description: error.message || "Could not start audio capture.",
        variant: "destructive",
      });
    }
  }, [toast, connectWebSocket, monitorAudioLevel, cleanupAudio, cleanupWebSocket, onListeningChange]);

  const stopCapture = useCallback(() => {
    cleanupAudio();
    cleanupWebSocket();
    setStatus("idle");
    onListeningChange?.(false);

    toast({
      title: "Listening Stopped",
      description: "Audio capture has been stopped.",
    });
  }, [cleanupAudio, cleanupWebSocket, toast, onListeningChange]);

  useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupWebSocket();
    };
  }, [cleanupAudio, cleanupWebSocket]);

  const isListening = status === "listening";
  const isConnecting = status === "connecting";
  const isNoAudio = status === "no_audio";

  return (
    <Card data-testid="card-audio-capture">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                isListening
                  ? "bg-destructive/10 text-destructive"
                  : isNoAudio
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                    : "bg-primary/10 text-primary"
              }`}
            >
              {isListening ? (
                <Radio className="w-5 h-5 animate-pulse" />
              ) : isNoAudio ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {isNoAudio ? "No Audio Detected" : "System Audio Capture"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isNoAudio
                  ? "Audio sharing was not enabled. Please try again following the steps below."
                  : "Capture audio from Zoom, Google Meet, or any browser tab"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isListening && (
              <Badge
                variant="outline"
                className="text-xs gap-1"
                data-testid="badge-ws-status"
              >
                {wsConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-500" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-destructive" />
                    Disconnected
                  </>
                )}
              </Badge>
            )}
            <Button
              variant={isListening ? "destructive" : "default"}
              size="sm"
              onClick={isListening ? stopCapture : () => { setStatus("idle"); startCapture(); }}
              disabled={isConnecting}
              data-testid="button-toggle-listening"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Connecting...
                </div>
              ) : isListening ? (
                <div className="flex items-center gap-2">
                  <Square className="w-3.5 h-3.5" />
                  Stop Listening
                </div>
              ) : isNoAudio ? (
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" />
                  Try Again
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" />
                  Start Listening
                </div>
              )}
            </Button>
          </div>
        </div>

        {isNoAudio && (
          <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3" data-testid="area-no-audio-guide">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">How to enable audio sharing:</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">1</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click <span className="font-medium text-foreground">Try Again</span> above to open the sharing dialog
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">2</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Select the <span className="font-medium text-foreground">Chrome Tab</span> option (not Window or Entire Screen)</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Monitor className="w-3 h-3" />
                    <span className="text-[10px] text-muted-foreground">Only browser tabs support audio sharing</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">3</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Make sure the <span className="font-medium text-foreground">"Also share tab audio"</span> toggle is turned ON at the bottom of the dialog</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] text-muted-foreground">This toggle is often off by default</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus("idle")}
                data-testid="button-dismiss-audio-guide"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {!isListening && !isNoAudio && !isConnecting && (
          <div className="rounded-md bg-muted/50 p-3 space-y-1.5" data-testid="area-audio-tips">
            <p className="text-xs font-medium text-muted-foreground">Quick tips for audio capture:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-none">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
                <span>Use <span className="font-medium text-foreground">Google Chrome</span> for best audio sharing support</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
                <span>Share a <span className="font-medium text-foreground">browser tab</span>, not a window or screen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
                <span>Enable <span className="font-medium text-foreground">"Also share tab audio"</span> in the share dialog</span>
              </li>
            </ul>
          </div>
        )}

        {isListening && (
          <div className="space-y-2" data-testid="area-audio-visualizer">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Audio Level</span>
              <span className="text-xs font-mono text-muted-foreground">
                {Math.round(audioLevel * 100)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-md overflow-hidden">
              <div
                className="h-full bg-primary rounded-md transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
                data-testid="bar-audio-level"
              />
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-sm transition-all duration-75 ${
                    i / 32 < audioLevel ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
