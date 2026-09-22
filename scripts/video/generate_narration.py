"""Generate disclosed AI narration from the reviewed script. Never saves credentials."""
import json
import os
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parents[2]
script = json.loads((root / "scripts/video/narration.json").read_text())
key = os.environ.get("OPENAI_API_KEY")
if not key:
    raise SystemExit("Set OPENAI_API_KEY through your private environment.")
for segment in script["segments"]:
    target = root / segment["audio"]
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 1000:
        print(f"Already generated segment {segment['index']}")
        continue
    payload = json.dumps({
        "model": "gpt-4o-mini-tts",
        "voice": "cedar",
        "input": segment["text"],
        "instructions": "Narrate a clear, thoughtful software product demonstration. Warm, confident, natural English. Speak at about 140 words per minute with brief pauses between sentences. Keep numbers easy to understand. Do not add any words or music. Pronounce Pactshift as pact shift.",
        "response_format": "wav",
        "speed": 0.97,
    }).encode()
    request = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=payload, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            audio = response.read()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Speech API returned HTTP {error.code}; no credential was logged.") from None
    if not audio.startswith(b"RIFF"):
        raise SystemExit("Unexpected audio response format.")
    target.write_bytes(audio)
    print(f"Generated segment {segment['index']}: {len(audio)} bytes", flush=True)
