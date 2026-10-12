"""Decode original packed stages, tile quadrants and enemy rosters from annotated NES data."""
import json,re,hashlib,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
ref=root/'tmp/tank'
asm=(ref/'bank_FF.asm').read_text()
counters=asm.split('tbl_E578_stage_enemies_type_counter:',1)[1].split('tbl_E604',1)[0]
counts=[list(map(lambda n:int(n,16),re.findall(r'\$([0-9A-F]{2})',line.split(';')[0].split('.byte',1)[1]))) for line in counters.splitlines() if '.byte' in line][:35]
orders=asm.split('tbl_E4EC_stage_enemies:',1)[1].split('tbl_E578_stage_enemies_type_counter:',1)[0]
orders=[list(map(lambda n:(int(n,16)-0x80)//32,re.findall(r'\$([0-9A-F]{2})',line.split(';')[0].split('.byte',1)[1]))) for line in orders.splitlines() if '.byte' in line][:35]
block_table=asm.split('tbl_DACB_block_data:',1)[1].split('sub_DB0B',1)[0]
quads=[list(map(lambda n:int(n,16),re.findall(r'\$([0-9A-F]{2})',line.split(';')[0].split('.byte',1)[1]))) for line in block_table.splitlines() if '.byte' in line][:16]
levels=[]
provenance=[]
for i in range(1,36):
 p=ref/'stages'/f'{i:02}.bin'; data=p.read_bytes(); assert len(data)==91
 roster=[kind for kind,count in zip(orders[i-1],counts[i-1]) for _ in range(count)]
 assert len(roster)==20
 terrain=[]
 for y in range(13):
  for x in range(13):
   packed=data[y*7+x//2]; tile=packed&15 if x%2 else packed>>4
   for q,v in enumerate(quads[tile]):
    kind={0x0f:1,0x10:2,0x12:3,0x22:4,0x21:5}.get(v,0)
    if kind:terrain.append([x*32+(q%2)*16,y*32+(q//2)*16,16,16,kind])
 # HQ ring is drawn separately by the original stage loader.
 terrain.extend([[176,368,64,16,1],[176,384,16,32,1],[224,384,16,32,1]])
 levels.append({'terrain':terrain,'enemies':roster})
 provenance.append({'stage':i,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'roster':roster})
(root/'docs/assets/tank/stage-sources.json').write_text(json.dumps({'source':'https://github.com/cyneprepou4uk/NES-Games-Disassembly/tree/main/Battle%20City','blockTable':'tbl_DACB_block_data','enemyOrderTable':'tbl_E4EC_stage_enemies','enemyCountTable':'tbl_E578_stage_enemies_type_counter','stages':provenance},indent=2)+'\n')
(root/'src/games/tankLevels.json').write_text(json.dumps(levels,separators=(',',':'))+'\n')
tracks={'intro':('level-intro','01–03'),'over':('game-over','18–1A'),'fire':('fire','0F'),'brick':('hit-brick','0C'),'steel':('hit-steel','0D'),'armor':('hit-enemy','0E'),'enemy':('enemy-explosion','0A'),'player':('player-explosion','07'),'hq':('hq','0B'),'bonus':('bonus','1B'),'appear':('powerup-appear','09'),'pickup':('powerup-pickup','06'),'life':('life','04–05'),'pause':('pause','00'),'ice':('ice','10'),'idle':('tank-idle','12'),'move':('tank-move','11'),'score':('score','13–14')}
out=root/'public/assets/games/tank/audio';out.mkdir(parents=True,exist_ok=True)
manifest={ 'game':'Battle City (Namco, 1985)', 'source':'https://github.com/dderevjanik/battle-city-reforged', 'originalArchives':['https://www.sounds-resource.com/nes/battlecity/sound/3710/','https://www.zophar.net/music/nintendo-nes-nsf/battle-city'], 'soundIdReference':'https://github.com/cyneprepou4uk/NES-Games-Disassembly/tree/main/Battle%20City','rights':'Original game audio belongs to Namco; archive availability is not an asset license.','tracks':{}}
for name,(filename,ids) in tracks.items():
 p=ref/'audio'/f'{filename}.mp3'; target=out/f'{name}-fc-v1.wav'
 # Keep native waveform/attack, trim recording lead-in silence and unused trailing padding.
 filt='silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.003,areverse,silenceremove=start_periods=1:start_threshold=-58dB:start_silence=0.012,areverse'
 args=['/opt/homebrew/bin/ffmpeg','-v','error','-y','-i',str(p)]
 if name in ('idle','move'):
  args+=['-ss','2','-t','2'] # Stable original hum, no MP3 delay/warmup.
 else:args+=['-af',filt]
 args+=['-ac','1','-ar','22050','-c:a','pcm_s16le',str(target)]
 subprocess.run(args,check=True)
 manifest['tracks'][name]={'file':target.name,'originalRecording':filename+'.mp3','originalSoundIds':ids,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'loop':name in ('idle','move')}
manifest['tracks']['hq']['originalRecording']='SFX 7.mp3'
manifest['tracks']['hq']['download']='https://fi.zophar.net/soundfiles/nintendo-nes-nsf/battle-city/SFX%207.mp3'
manifest['tracks']['bonus']['originalRecording']='SFX 17.mp3'
manifest['tracks']['bonus']['download']='https://fi.zophar.net/soundfiles/nintendo-nes-nsf/battle-city/SFX%2017.mp3'
manifest['verification']='Original NSF init flags verified in docs/assets/tank/nsf-sound-map.json: SFX 7→0B HQ, SFX 17→1B 1000-point bonus.'
(out/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('35 authentic rosters verified; 18 original event recordings prepared')
