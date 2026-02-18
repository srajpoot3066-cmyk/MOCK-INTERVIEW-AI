import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Lightbulb, MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HintEntry {
  id: number;
  hint: string;
  transcript: string;
  timestamp: Date;
}

interface AiAssistantProps {
  isListening: boolean;
  currentTranscript: string;
  hints: HintEntry[];
  deepgramStatus: string;
}

export default function AiAssistant({
  isListening,
  currentTranscript,
  hints,
  deepgramStatus,
}: AiAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hintsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isListening) {
      setIsVisible(true);
      setIsMinimized(false);
    }
  }, [isListening]);

  useEffect(() => {
    if (hintsEndRef.current && hints.length > 0) {
      hintsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [hints.length]);

  if (!isVisible) return null;

  const latestHint = hints.length > 0 ? hints[hints.length - 1] : null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]"
      data-testid="card-ai-assistant"
    >
      <Card className="border-primary/20 shadow-lg">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <BrainCircuit className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold truncate">AI Assistant</span>
            {isListening && (
              <Badge variant="outline" className="text-xs gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              data-testid="button-minimize-assistant"
            >
              {isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              data-testid="button-close-assistant"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <CardContent className="p-3 space-y-3">
            {deepgramStatus === "connected" && currentTranscript && (
              <div className="space-y-1" data-testid="area-live-transcript">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Live Transcript</span>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">
                  {currentTranscript}
                </p>
              </div>
            )}

            {latestHint ? (
              <div className="space-y-1" data-testid="area-latest-hint">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">Live Hint (STAR)</span>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
                  <p
                    className="text-sm leading-relaxed"
                    data-testid="text-ai-hint"
                  >
                    {latestHint.hint}
                  </p>
                </div>
              </div>
            ) : isListening ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Listening for interview questions...
                  <br />
                  Hints will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <p className="text-xs text-muted-foreground text-center">
                  Start listening to receive AI-powered hints
                  <br />
                  based on your resume and job description.
                </p>
              </div>
            )}

            {hints.length > 1 && (
              <div className="space-y-2 max-h-40 overflow-y-auto" data-testid="area-hints-history">
                <span className="text-xs font-medium text-muted-foreground">Previous Hints</span>
                {hints.slice(0, -1).reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-muted/50 rounded-md p-2"
                    data-testid={`hint-entry-${entry.id}`}
                  >
                    <p className="text-xs leading-relaxed">{entry.hint}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                <div ref={hintsEndRef} />
              </div>
            )}

            {hints.length > 0 && (
              <div className="text-[10px] text-muted-foreground text-center pt-1">
                {hints.length} hint{hints.length !== 1 ? "s" : ""} generated
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
