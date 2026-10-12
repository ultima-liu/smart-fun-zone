"""Prepare short FC recordings already downloaded from the documented source.

Usage: python3 scripts/assets/prepare-road-fighter-audio.py SOURCE_DIRECTORY
Requires ffmpeg; does not add a ROM or an emulator to the application.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote

root = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1])
target = root / 'public/assets/games/road-fighter/audio'
target.mkdir(parents=True, exist_ok=True)
tracks = {
    'start': ('1 - Track 1.mp3', None, 0x17),
    'checkpoint': ('2 - Track 2.mp3', None, 0x14),
    'goal': ('3 - Track 3.mp3', None, 0x1a),
    'over': ('4 - Track 4.mp3', None, 0x1d),
    'lowFuel': ('8 - Track 8.mp3', 2, 0x01),
    'crash': ('6 - Track 6.mp3', 0.9, 0x0f),
    'skid': ('SFX 1.mp3', None, 0x03),
    'fuel': ('SFX 5.mp3', None, 0x08),
}
manifest = {
    'game': 'Road Fighter (FC, Konami, 1985)',
    'sourcePage': 'https://www.zophar.net/music/nintendo-nes-nsf/road-fighter',
    'rights': 'Original game audio by Konami; archive availability does not confer an open-source license.',
    'processing': 'Original recordings, mono 22050 Hz; trim silent tails. Low-fuel warning has 5 ms edge fades. Engine captured separately from original driver; no composed music.',
    'tracks': {},
}
# Preserve the separately captured driving voice; never use archive Track 8 as engine.
engine = json.loads((target / 'manifest.json').read_text())['tracks']['engine']
if engine['soundCommand'] != '0x89':
    raise ValueError('Run render-road-fighter-engine.py before preparing the other recordings')
manifest['tracks']['engine'] = engine
for name, (filename, duration, sound_id) in tracks.items():
    path = source / filename
    args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(path)]
    if duration is not None:
        args += ['-t', str(duration)]
    filters = 'aresample=22050'
    if name == 'lowFuel':
        filters += ',afade=t=in:st=0:d=0.005,afade=t=out:st=1.995:d=0.005'
    else:
        filters += ',areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.08,areverse'
    # PCM avoids codec padding at the engine loop boundary; short fanfares use MP3.
    extension = 'wav' if name == 'lowFuel' else 'mp3'
    out = target / ('low-fuel-fc-v2.wav' if name == 'lowFuel' else f'{name}-fc-v1.{extension}')
    args += ['-af', filters, '-ac', '1']
    if extension == 'mp3':
        args += ['-c:a', 'libmp3lame', '-b:a', '96k']
    args += [str(out)]
    subprocess.run(args, check=True)
    manifest['tracks'][name] = {
        'file': out.name,
        'sourceFile': filename,
        'sourceUrl': 'https://fi.zophar.net/soundfiles/nintendo-nes-nsf/road-fighter/' + quote(filename),
        'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'soundCommand': hex(sound_id),
        'bytes': out.stat().st_size,
        'durationSec': float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)])),
    }
(target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(manifest['tracks'], ensure_ascii=False, indent=2))
