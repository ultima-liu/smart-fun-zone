"""Render the original Bomberman DMC sample, without the incomplete NSF rip."""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

sample_path = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/assets/bomber/blast-sample-v2.dmc')
sample = sample_path.read_bytes()
if len(sample) != 4081:
    raise ValueError('Original $4013=$FF playback must contain 4081 bytes')
if hashlib.sha256(sample).hexdigest() != 'd65319c03f74e795e80e6c0c793d80b65cbd2f7524af728d684a40800a47452a':
    raise ValueError('Original BOOM sample checksum mismatch')
# BMAN.NAS: $4010=$0E (72 CPU cycles), $4012=$C0 ($F000), $4013=$FF.
# BOOM.NAS has 4080 bytes; the following DUMMY byte in BMAN.NAS is $FF.
cpu_hz = 1789772.7272727273
bit_hz = cpu_hz / 72
levels = []
dac = 0
for byte in sample:
    for bit in range(8):
        if byte & (1 << bit):
            if dac <= 125:
                dac += 2
        elif dac >= 2:
            dac -= 2
        # Isolated DMC contribution to the nonlinear TND mixer.
        levels.append(159.79 / (22638 / dac + 100) if dac else 0)

# Oversample the held DAC level before anti-aliasing to 44.1 kHz PCM.
# Hold the last level after playback; the analogue high-pass filters remove DC.
rate = 176400
duration = len(levels) / bit_hz
raw = array.array('f', (levels[min(len(levels) - 1, int(i * bit_hz / rate))]
                        for i in range(math.ceil((duration + .08) * rate))))
filtered = subprocess.check_output([
    'ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(rate), '-ac', '1', '-i', '-',
    '-af', 'highpass=f=90:p=1,highpass=f=440:p=1,lowpass=f=14000:p=1',
    '-ar', '44100', '-f', 'f32le', '-',
], input=raw.tobytes())
pcm = array.array('f', filtered)
peak = max(abs(v) for v in pcm)
encoded = array.array('h', (round(v / peak * .85 * 32767) for v in pcm))
target = Path('public/assets/games/bomber/audio/blast-fc-v2.wav')
target.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(target), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(44100)
    output.writeframes(encoded.tobytes())

metadata = {
    'track': 'blast', 'file': target.name,
    'source': 'https://github.com/emu-russia/bomberman-nes/blob/master/BOOM.NAS',
    'sourceGitBlob': 'f6cb1f7e1cbf768b70d0a635288451d7f69f20d0',
    'registerSource': 'https://github.com/emu-russia/bomberman-nes/blob/master/BMAN.NAS',
    'sourceSHA256': hashlib.sha256(sample).hexdigest(),
    'sourceFile': 'blast-sample-v2.dmc', 'sampleBytes': len(sample),
    'bitRate': bit_hz, 'sampleDuration': duration, 'duration': len(encoded) / 44100,
    'processing': 'LSB-first 7-bit DMC, isolated TND mixer, HP90/HP440/LP14000, peak 0.85, mono PCM16 44100 Hz',
    'bytes': target.stat().st_size, 'loop': None,
}
manifest_path = Path('docs/assets/bomber/audio-manifest.json')
manifest = json.loads(manifest_path.read_text())
manifest = [m for m in manifest if m['track'] != 'blast']
manifest.insert(next(i for i, m in enumerate(manifest) if m['track'] == 'plant') + 1, metadata)
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
config_path = Path('src/games/bomberSoundtrack.json')
config = json.loads(config_path.read_text())
config['blast'] = {'file': target.name, 'loop': None}
config_path.write_text(json.dumps(config, indent=2) + '\n')
print(json.dumps(metadata, indent=2))
