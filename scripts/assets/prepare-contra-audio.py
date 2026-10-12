"""Render original NSF tracks using a locally built Game Music Emu renderer.

Usage: python3 scripts/assets/prepare-contra-audio.py source.nsf renderer
The source archive, SHA256, original track IDs and measured loops are recorded.
No ROM or external service is required to play the resulting local assets.
"""
from pathlib import Path
import numpy as np
import hashlib
import json
import subprocess
import sys

source, renderer = Path(sys.argv[1]), Path(sys.argv[2]).resolve()
output = Path('public/assets/games/contra/audio')
output.mkdir(parents=True, exist_ok=True)
work = Path('tmp/contra/audio')
work.mkdir(parents=True, exist_ok=True)
tracks = [('title', 1, 9), ('jungle', 2, 125), ('base', 7, 125),
          ('boss', 8, 125), ('waterfall', 3, 125), ('snow', 4, 125),
          ('energy', 5, 125), ('lair', 6, 125), ('clear', 9, 9),
          ('ending', 10, 90), ('over', 11, 10)]
manifest = {}
for name, track, seconds in tracks:
    pcm = work / (name + '.pcm')
    subprocess.run([str(renderer), str(source), str(track), str(seconds), str(pcm)], check=True)
    loop = None
    if name in ['jungle', 'base', 'boss', 'waterfall', 'snow', 'energy', 'lair']:
        # Pitch-aware fingerprints distinguish a full melodic loop from drum motifs.
        samples = np.fromfile(pcm, dtype='<i2').reshape(-1, 2).mean(axis=1)
        frame = 735  # 1/60 second, independent of the game simulator.
        windows = samples[:len(samples) // frame * frame].reshape(-1, frame)
        spectrum = np.abs(np.fft.rfft(windows * np.hanning(frame), axis=1))
        features = np.log1p(spectrum[:, 2:160])
        features -= features.mean(axis=1, keepdims=True)
        start, span = 1200, 1200
        def difference(lag):
            return float(np.mean((features[start:start + span:3] - features[start + lag:start + lag + span:3]) ** 2))
        period = min(range(600, 3601), key=difference)
        best = difference(period)
        # Some tracks repeat twice inside this range. Prefer the full shorter loop.
        candidates = [lag for lag in range(600, period - 4) if difference(lag) <= best * 1.3]
        if candidates:
            period = min(candidates)
        # Refine the temporal boundary against the original PCM, to one sample.
        indices = np.arange(44100 * 20, 44100 * 30, 71)
        reference = samples[indices]
        def pcm_difference(lag):
            return float(np.mean((reference - samples[indices + lag]) ** 2))
        center = round(period / 60 * 44100)
        fine = min(range(center - 800, center + 801, 4), key=pcm_difference)
        fine = min(range(fine - 4, fine + 5), key=pcm_difference)
        loop = {'start': 20, 'end': 20 + fine / 44100}
        seconds = loop['end'] + 0.08
    target = output / (name + '-fc-v1.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', '44100', '-ac', '2', '-i', str(pcm), '-t', str(seconds), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', str(target)], check=True)
    manifest[name] = {'file': target.name, 'nsfTrack': track, 'loop': loop, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    print(name, track, loop, target.stat().st_size, flush=True)
Path('src/games/contraSoundtrack.json').write_text(json.dumps(manifest, indent=2) + '\n')
metadata = {'source': 'https://www.zophar.net/music/nintendo-nes-nsf/contra',
            'archive': 'https://fi.zophar.net/soundfiles/nintendo-nes-nsf/contra/Contra%20%28EMU%29.zophar.zip',
            'sourceFile': source.name, 'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'renderer': 'Game Music Emu, NES 2A03, NTSC, tempo 1.0, 44100 Hz',
            'rights': 'Original music by Konami; public archive availability is not an open-source license.',
            'loopMethod': '20-second pitch-aware spectral comparison, first complete matching phrase; temporal refinement against PCM; not claimed emulator-cycle-exact.',
            'tracks': manifest}
(output / 'sources.json').write_text(json.dumps(metadata, indent=2) + '\n')
