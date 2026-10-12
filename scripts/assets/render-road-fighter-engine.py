"""Offline original engine capture. Usage: python3 SCRIPT SOURCE.nsf LIBGME_LIBRARY"""
import array
import ctypes
import hashlib
import json
from pathlib import Path
import sys
import wave

source = Path(sys.argv[1]).read_bytes()
expected = 'abeee4be936db5a4380b6d2fb29b21736f74870c94f05f5a0f6b6fb868b423d0'
if hashlib.sha256(source).hexdigest() != expected:
    raise ValueError('Unexpected original NSF; do not patch an unknown sound driver')
patched = bytearray(source)
load = int.from_bytes(source[8:10], 'little')
def write(address, data):
    patched[128 + address - load:128 + address - load + len(data)] = data
# Original init reads three channel commands from these tables. Capture the actual
# driving triangle voice ($89), not the low-fuel warning ($01 / archive Track 8).
for address, command in [(0xc140, 0), (0xc160, 0x40), (0xc180, 0x89)]:
    write(address, bytes([command]))
write(0xc13a, bytes([0x4c, 0xa0, 0xc1]))  # init returns through capture-only setup
# Speed $0068/$0069 = 196; A/high gear pad bit. Only the offline wrapper is changed.
write(0xc1a0, bytes([0xa9, 196, 0x85, 0x68, 0xa9, 0, 0x85, 0x69,
                    0xa9, 0x80, 0x85, 0x07, 0x60]))

lib = ctypes.CDLL(sys.argv[2])
lib.gme_open_data.argtypes = [ctypes.c_void_p, ctypes.c_long, ctypes.POINTER(ctypes.c_void_p), ctypes.c_int]
lib.gme_open_data.restype = ctypes.c_char_p
lib.gme_start_track.argtypes = [ctypes.c_void_p, ctypes.c_int]
lib.gme_start_track.restype = ctypes.c_char_p
lib.gme_play.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_short)]
lib.gme_play.restype = ctypes.c_char_p
lib.gme_delete.argtypes = [ctypes.c_void_p]
def check(error):
    if error:
        raise RuntimeError(error.decode())
emu = ctypes.c_void_p()
data = ctypes.create_string_buffer(bytes(patched))
rate = 22050
check(lib.gme_open_data(data, len(patched), ctypes.byref(emu), rate))
try:
    check(lib.gme_start_track(emu, 0))
    count = round(2.25 * rate) * 2
    stereo = (ctypes.c_short * count)()
    check(lib.gme_play(emu, count, stereo))
    start = round(.25 * rate)
    pcm = array.array('h', (round((stereo[i * 2] + stereo[i * 2 + 1]) / 2)
                           for i in range(start, start + rate * 2)))
finally:
    lib.gme_delete(emu)
fade = round(.005 * rate)
for i in range(fade):
    pcm[i] = round(pcm[i] * i / fade)
    pcm[-1 - i] = round(pcm[-1 - i] * i / fade)
target = Path('public/assets/games/road-fighter/audio/engine-fc-v2.wav')
with wave.open(str(target), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(pcm.tobytes())
manifest_path = target.parent / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['tracks']['engine'] = {
    'file': target.name,
    'sourceFile': 'Road Fighter (1985-07-11)(Konami).nsf',
    'sourceUrl': 'https://fi.zophar.net/soundfiles/nintendo-nes-nsf/road-fighter/Road%20Fighter%20%28EMU%29.zophar.zip',
    'sourceSha256': expected, 'soundCommand': '0x89',
    'processing': 'Original driver triangle engine, RAM speed=196/high gear; libgme 0.6.5 offline capture; 0.25 s warmup, 2 s mono PCM22050, 5 ms edge fades',
    'bytes': target.stat().st_size, 'durationSec': 2,
}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(manifest['tracks']['engine'])
