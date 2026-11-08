#!/usr/bin/env python3
"""
Kokoro, as a local speech service for the Reader.

The page asks the Host for speech; the Host asks this process. Loading an 82M
parameter speech model takes a few seconds, so the model is loaded once and the
process stays warm between sentences. It exits by itself after a quiet period,
so no speech process outlives the reading session.

    python3 kokoro-server.py            # binds an ephemeral port, prints "port=<n>"

POST /synthesize  {"text": "...", "voice": "af_heart", "speed": 1.0}
    -> 200 audio/wav (24 kHz, mono)
GET  /health      -> {"ok": true, "voices": [...]}
"""

import argparse
import io
import json
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline
except Exception as error:  # pragma: no cover - reported to the Host
    print(json.dumps({"error": "import-failed", "message": str(error)}), file=sys.stderr)
    raise SystemExit(2)

# The voices the Reader offers, per accent. All of them are Kokoro v1.0 voices.
VOICES = {
    "en-US": ["af_heart", "am_michael", "af_bella", "am_adam"],
    "en-GB": ["bf_emma", "bm_george", "bf_isabella", "bm_lewis"],
}

# Kokoro takes a language code per pipeline: 'a' American, 'b' British.
LANG_CODE = {"af": "a", "am": "a", "bf": "b", "bm": "b"}

IDLE_EXIT_SECONDS = 600


def lang_code(voice: str) -> str:
    return LANG_CODE.get(voice[:2], "a")


class Speech:
    """One Kokoro model, pipelines per language, guarded by a lock."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.pipelines = {}
        self.last_used = time.time()

    def pipeline(self, code: str):
        with self.lock:
            if code not in self.pipelines:
                self.pipelines[code] = KPipeline(lang_code=code)
            return self.pipelines[code]

    def say(self, text: str, voice: str, speed: float) -> bytes:
        pipeline = self.pipeline(lang_code(voice))
        with self.lock:
            chunks = [audio for _, _, audio in pipeline(text, voice=voice, speed=speed)]
        audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]
        buffer = io.BytesIO()
        sf.write(buffer, audio, 24000, format="WAV")
        self.last_used = time.time()
        return buffer.getvalue()


SPEECH = Speech()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # silence the console
        return

    def _json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json({"ok": True, "voices": VOICES})
            return
        self._json({"ok": False, "error": "not-found"}, 404)

    def do_POST(self):
        if self.path != "/synthesize":
            self._json({"ok": False, "error": "not-found"}, 404)
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._json({"ok": False, "error": "bad-json"}, 400)
            return
        text = str(payload.get("text") or "").strip()
        voice = str(payload.get("voice") or "af_heart")
        speed = float(payload.get("speed") or 1.0)
        if text == "":
            self._json({"ok": False, "error": "empty-text"}, 400)
            return
        try:
            audio = SPEECH.say(text, voice, max(0.5, min(2.0, speed)))
        except Exception as error:  # the Host turns this into a fallback
            self._json({"ok": False, "error": "synth-failed", "message": str(error)}, 500)
            return
        self.send_response(200)
        self.send_header("content-type", "audio/wav")
        self.send_header("content-length", str(len(audio)))
        self.end_headers()
        self.wfile.write(audio)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--idle-seconds", type=int, default=IDLE_EXIT_SECONDS)
    args = parser.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print("port=" + str(server.server_address[1]), flush=True)

    def watchdog():
        while True:
            time.sleep(5)
            if time.time() - SPEECH.last_used > args.idle_seconds:
                server.shutdown()
                return

    threading.Thread(target=watchdog, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
