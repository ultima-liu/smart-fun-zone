"""Install the dedicated local reading recognizer; models stay in ignored server/var."""
import concurrent.futures
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import urllib.request
import venv

if sys.version_info < (3, 12):
    raise SystemExit('Python 3.12+ is required for the pinned NumPy runtime.')
root = Path(__file__).resolve().parents[1] / 'var' / 'reading-asr'
model = root / 'sense-voice'
model.mkdir(parents=True, exist_ok=True)
base = 'https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/'
assets = [
    (model / 'model.int8.onnx', base + 'model.int8.onnx', 239233841, 'c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51'),
    (model / 'tokens.txt', base + 'tokens.txt', 315894, 'f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc'),
    (root / 'silero_vad.onnx', 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx', 643854, '9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6'),
]
def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
def download(asset):
    file, url, size, sha = asset
    if file.exists() and file.stat().st_size == size and digest(file) == sha:
        print(f'Verified {file.name}', flush=True)
        return
    with tempfile.TemporaryDirectory(dir=root) as directory:
        def part(start):
            end = min(size, start + 8 * 1024 * 1024) - 1
            headers = {'Range': f'bytes={start}-{end}'} if size > 8*1024*1024 else {}
            request = urllib.request.Request(url + f'?download=true&part={start}', headers=headers)
            with urllib.request.urlopen(request, timeout=120) as response:
                data = response.read()
                if len(data) != end-start+1 or (headers and response.headers.get('Content-Range') != f'bytes {start}-{end}/{size}'):
                    raise RuntimeError(f'Incomplete download: {file.name}')
            path = Path(directory) / str(start)
            path.write_bytes(data)
            return path
        starts = list(range(0, size, 8 * 1024 * 1024))
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            parts = list(pool.map(part, starts))
        pending = Path(directory) / 'complete'
        with pending.open('wb') as out:
            for path in parts:
                out.write(path.read_bytes())
        if digest(pending) != sha:
            raise RuntimeError(f'Checksum mismatch: {file.name}')
        os.replace(pending, file)
        print(f'Installed {file.name}', flush=True)
for asset in assets:
    download(asset)
license_file = model / 'MODEL_LICENSE'
if not license_file.exists():
    with urllib.request.urlopen('https://raw.githubusercontent.com/modelscope/FunASR/main/MODEL_LICENSE', timeout=30) as response:
        license_file.write_bytes(response.read())
python = root / 'venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
if not python.exists():
    venv.create(root / 'venv', with_pip=True)
subprocess.run([str(python), '-m', 'pip', 'install', 'sherpa-onnx==1.13.8', 'numpy==2.5.4'], check=True)
(model / 'ATTRIBUTION.txt').write_text('SenseVoiceSmall by FunAudioLLM / Alibaba. ONNX conversion by sherpa-onnx.\nModel license: https://github.com/modelscope/FunASR/blob/main/MODEL_LICENSE\nSilero VAD: https://github.com/snakers4/silero-vad (MIT).\n', encoding='utf-8')
print('Local English reading ASR ready. Restart the server after installation.', flush=True)
