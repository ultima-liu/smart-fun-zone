"""Render the original NSF sound routines by changing only its init selector table.
Usage: python3 scripts/assets/prepare-contra-effects.py source.nsf render-nsf
"""
import array, hashlib, json, pathlib, subprocess, sys, tempfile
source, renderer = map(pathlib.Path, sys.argv[1:3])
data = bytearray(source.read_bytes())
load = int.from_bytes(data[8:10], 'little')
init = int.from_bytes(data[10:12], 'little')
init_offset = 128 + init - load
assert data[init_offset:init_offset+7] == bytes.fromhex('aa bd c5 c3 4c 9b 87'), 'Unexpected NSF init routine'
offset = 128 + 0xc3c5 - load
assert data[offset:] == bytes.fromhex('26 2a 2e 32 36 3a 3e 42 46 4a 4e')
effects = {'shot':0x0a, 'shotM':0x0c, 'shotL':0x0e, 'shotF':0x10, 'shotS':0x12, 'armor':0x14, 'hit':0x16, 'heart':0x18, 'kill':0x19, 'explosion':0x24, 'bridge':0x25, 'death':0x52, 'power':0x1f, 'life':0x20, 'splash':0x03}
data[6] = len(effects)
data[offset:] = bytes(effects.values())
out = pathlib.Path('public/assets/games/contra/audio')
tracks = {}
with tempfile.TemporaryDirectory() as temp:
    temp = pathlib.Path(temp)
    nsf = temp/'effects.nsf'; nsf.write_bytes(data)
    for i, (name, code) in enumerate(effects.items()):
        pcm = temp/(name+'.pcm')
        subprocess.run([str(renderer.resolve()), str(nsf), str(i+1), '3', str(pcm)], check=True, stdout=subprocess.DEVNULL)
        samples = array.array('h', pcm.read_bytes())
        # Average stereo, trim silence, retaining 20ms of the driver tail.
        mono = array.array('h', ((samples[n]+samples[n+1])//2 for n in range(0,len(samples),2)))
        active = [n for n,v in enumerate(mono) if abs(v)>32]
        assert active, name+' is silent'
        first=max(0,active[0]-220); last=min(len(mono),active[-1]+882)
        cut=temp/(name+'-cut.pcm'); cut.write_bytes(mono[first:last].tobytes())
        filename='sfx-'+name+'-fc-v1.mp3'
        subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','44100','-ac','1','-i',str(cut),'-codec:a','libmp3lame','-b:a','96k',str(out/filename)],check=True)
        tracks[name]={'file':filename,'soundCode':hex(code),'duration':(last-first)/44100,'peak':max(abs(v) for v in mono),'sha256':hashlib.sha256((out/filename).read_bytes()).hexdigest()}
        print(name, tracks[name]['duration'])
manifest={'source':'https://www.zophar.net/music/nintendo-nes-nsf/contra','reference':'https://github.com/vermiceli/nes-contra-us/blob/main/docs/Sound%20Documentation.md','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Original NTSC NSF sound driver, 44100 Hz. Init selector at $c3c5 replaced by SFX codes; original sound instructions/data unmodified. Leading/trailing silence trimmed, mono MP3 96k.','selectorOffset':offset,'effectsNsfSha256':hashlib.sha256(data).hexdigest(),'effects':tracks}
(out/'effects-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
pathlib.Path('src/games/contraEffects.json').write_text(json.dumps(tracks,indent=2)+'\n')
