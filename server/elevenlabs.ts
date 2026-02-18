import WebSocket from "ws";
import { log } from "./index";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=elevenlabs",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("ElevenLabs not connected");
  }
  return connectionSettings.settings.api_key;
}

export async function getElevenLabsApiKey() {
  return await getCredentials();
}

export async function createElevenLabsStreamingTTS(
  voiceId: string,
  onAudioChunk: (audioBase64: string) => void,
  options: { modelId?: string; outputFormat?: string; onError?: (error: string) => void } = {}
) {
  const { modelId = "eleven_flash_v2_5", outputFormat = "pcm_16000" } = options;
  const apiKey = await getCredentials();
  const uri =
    "wss://api.elevenlabs.io/v1/text-to-speech/" +
    voiceId +
    "/stream-input?model_id=" +
    modelId +
    "&output_format=" +
    outputFormat;

  log(`ElevenLabs WS connecting: voice=${voiceId}, model=${modelId}`, "elevenlabs");

  const websocket = new WebSocket(uri, {
    headers: { "xi-api-key": apiKey },
  });

  return new Promise<{
    send: (text: string) => void;
    flush: () => void;
    close: () => void;
  }>((resolve, reject) => {
    websocket.on("error", (err) => {
      log(`ElevenLabs WS error: ${err.message}`, "elevenlabs");
      reject(err);
    });

    websocket.on("open", () => {
      log(`ElevenLabs WS opened successfully`, "elevenlabs");
      websocket.send(
        JSON.stringify({
          text: " ",
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.8,
            style: 0.15,
            use_speaker_boost: true,
          },
          generation_config: { chunk_length_schedule: [120, 160, 250, 290] },
        })
      );

      resolve({
        send: (text: string) => {
          if (websocket.readyState === WebSocket.OPEN) {
            log(`ElevenLabs sending text (${text.length} chars)`, "elevenlabs");
            websocket.send(JSON.stringify({ text }));
          } else {
            log(`ElevenLabs WS not open (state=${websocket.readyState}), can't send`, "elevenlabs");
          }
        },
        flush: () => {
          if (websocket.readyState === WebSocket.OPEN) {
            log(`ElevenLabs flushing`, "elevenlabs");
            websocket.send(JSON.stringify({ text: " ", flush: true }));
          }
        },
        close: () => {
          if (websocket.readyState === WebSocket.OPEN) {
            log(`ElevenLabs sending EOS signal`, "elevenlabs");
            websocket.send(JSON.stringify({ text: "" }));
          }
        },
      });
    });

    let audioChunkCount = 0;
    websocket.on("message", (event) => {
      try {
        const data = JSON.parse(event.toString());
        if (data.audio) {
          audioChunkCount++;
          log(`ElevenLabs audio chunk #${audioChunkCount} received (${data.audio.length} bytes b64)`, "elevenlabs");
          onAudioChunk(data.audio);
        }
        if (data.error) {
          log(`ElevenLabs API error: ${JSON.stringify(data.error)}`, "elevenlabs");
          if (options.onError) options.onError(String(data.error));
        }
        if (data.message) {
          log(`ElevenLabs message: ${data.message}`, "elevenlabs");
        }
        if (data.isFinal) {
          log(`ElevenLabs stream complete, total chunks: ${audioChunkCount}`, "elevenlabs");
          setTimeout(() => {
            if (websocket.readyState === WebSocket.OPEN) {
              websocket.close();
            }
          }, 500);
        }
      } catch (e: any) {
        log(`ElevenLabs message parse error: ${e.message}`, "elevenlabs");
      }
    });

    websocket.on("close", (code, reason) => {
      log(`ElevenLabs WS closed: code=${code}, reason=${reason?.toString() || 'none'}`, "elevenlabs");
    });
  });
}
