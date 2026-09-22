"""Obtain actual word timings for generated narration; key stays in process memory."""
import json
import os
from pathlib import Path
import urllib.request
import urllib.error
import uuid

root = Path(__file__).resolve().parents[2]
script = json.loads((root / "scripts/video/narration.json").read_text())
key = os.environ.get("OPENAI_API_KEY")
if not key:
    raise SystemExit("Set OPENAI_API_KEY through your private environment.")
for segment in script["segments"]:
    audio = root / segment["audio"]
    target = audio.with_suffix(".words.json")
    if target.exists():
        print(f"Already aligned segment {segment['index']}")
        continue
    boundary = "pactshift-" + uuid.uuid4().hex
    parts = []
    for name, value in {"model":"whisper-1", "language":"en", "response_format":"verbose_json", "timestamp_granularities[]":"word", "prompt":"Pactshift. Northstar Studio. Forma Architecture."}.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.extend([f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{audio.name}"\r\nContent-Type: audio/wav\r\n\r\n'.encode(), audio.read_bytes(), f'\r\n--{boundary}--\r\n'.encode()])
    request = urllib.request.Request("https://api.openai.com/v1/audio/transcriptions", data=b"".join(parts), headers={"Authorization":f"Bearer {key}", "Content-Type":f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Transcription API returned HTTP {error.code}; no credential was logged.") from None
    if not result.get("words"):
        raise SystemExit("No alignment words returned.")
    target.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Aligned segment {segment['index']}: {len(result['words'])} words", flush=True)
