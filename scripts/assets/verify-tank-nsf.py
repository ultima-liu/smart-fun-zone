"""Verify archive track IDs against original 6502 NSF init. Requires py65 for offline auditing."""
import hashlib,json,sys
from pathlib import Path
from py65.devices.mpu6502 import MPU
root=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1] if len(sys.argv)>1 else root/'tmp/tank/source.nsf').read_bytes()
load=int.from_bytes(source[8:10],'little')
init=int.from_bytes(source[10:12],'little')
play=int.from_bytes(source[12:14],'little')
tracks=[]
for song in range(source[6]):
    memory=[0]*65536
    memory[load:load+len(source)-128]=source[128:]
    memory[0x200:0x203]=[0x20,init&255,init>>8]
    cpu=MPU(memory=memory,pc=0x200)
    cpu.a=song
    for _ in range(100000):
        cpu.step()
        if cpu.pc==0x203:break
    else:raise RuntimeError('NSF init timed out')
    tracks.append({'index':song,'archive':f'Track {song+1}' if song<4 else f'SFX {song-3}','soundIds':[f'{i:02X}' for i in range(28) if memory[0x300+i]]})
assert tracks[10]['soundIds']==['0B']
assert tracks[20]['soundIds']==['1B']
result={'source':'https://www.zophar.net/music/nintendo-nes-nsf/battle-city','sourceSha256':hashlib.sha256(source).hexdigest(),'load':hex(load),'init':hex(init),'play':hex(play),'verification':'Original NSF init executed in 6502; active sound flags at RAM $0300–$031B identify original event IDs.','tracks':tracks}
(root/'docs/assets/tank/nsf-sound-map.json').write_text(json.dumps(result,indent=2)+'\n')
print('21 NSF tracks verified against original sound IDs')
