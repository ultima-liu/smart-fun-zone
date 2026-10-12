"""Transcribe PCM audio without receiving a lesson, expected answer or word hints."""
import base64
import io
import json
import sys
import wave
from pathlib import Path

import numpy as np
import sherpa_onnx

model = Path(sys.argv[1])
payload = json.load(sys.stdin)
if payload.get("language") != "en-US":
    raise ValueError("English recognizer only")
with wave.open(io.BytesIO(base64.b64decode(payload["audio"], validate=True)), "rb") as audio:
    if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getframerate() != 16000:
        raise ValueError("Expected 16 kHz mono PCM16")
    samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2").astype(np.float32) / 32768
vad_config = sherpa_onnx.VadModelConfig()
vad_config.silero_vad.model = str(model.parent / "silero_vad.onnx")
vad_config.silero_vad.min_speech_duration = 0.1
vad_config.sample_rate = 16000
vad = sherpa_onnx.VoiceActivityDetector(vad_config, buffer_size_in_seconds=50)
for start in range(0, len(samples), 512):
    frame = samples[start:start + 512]
    vad.accept_waveform(np.pad(frame, (0, 512 - len(frame))))
vad.flush()
if vad.empty():
    print(json.dumps({"text": "", "engine": "sense-voice"}), flush=True)
    sys.exit(0)
recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
    model=str(model / "model.int8.onnx"), tokens=str(model / "tokens.txt"),
    num_threads=2, language="en", use_itn=False,
)
stream = recognizer.create_stream()
stream.accept_waveform(16000, samples)
recognizer.decode_stream(stream)
print(json.dumps({"text": stream.result.text.strip(), "engine": "sense-voice"}), flush=True)
