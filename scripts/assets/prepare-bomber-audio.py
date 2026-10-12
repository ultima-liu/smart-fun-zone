from pathlib import Path
import subprocess,json,array,hashlib,math
# Source MP3 files are supplied locally; URLs and hashes are recorded in the manifest.
import sys
src=Path(sys.argv[1] if len(sys.argv)>1 else 'tmp/bomber/original-audio');out=Path('public/assets/games/bomber/audio');out.mkdir(parents=True,exist_ok=True)
tracks={'title':1,'start':2,'main':3,'upgrade':4,'clear':5,'bonus':6,'invincible':7,'ending':8,'miss':9,'over':10,'step-horizontal':'SFX 1','step-vertical':'SFX 2','plant':'SFX 3','blast':'SFX 4','power':'SFX 5','hurt':'SFX 6','pause':'SFX 7'}
meta=[]
for name,n in tracks.items():
 if name == 'blast':
  continue # The NSF explosion rip lacks DMC data; render the original sample below.
 filename=f'{n} - Track {n}.mp3' if isinstance(n,int) else n+'.mp3'; original=src/filename; target=out/(name+'-fc-v1.mp3')
 if name in ['main','upgrade','bonus','invincible']:
  pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(original),'-t','28','-ac','1','-ar','1000','-f','f32le','-'])
  samples=array.array('f',pcm);a=3000; span=5000
  candidates=range(4400,11001)
  lag=min(candidates,key=lambda lag:sum((samples[a+i]-samples[a+i+lag])**2 for i in range(0,span,19)))
  # Search at the source sample rate around the coarse repeat, choose matching waveform boundaries.
  raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(original),'-t','28','-ac','1','-ar','22050','-f','f32le','-']);fine=array.array('f',raw);start=6*22050;center=round(lag*22.05)
  period=min(range(center-44,center+45),key=lambda p:sum((fine[start+i]-fine[start+i+p])**2 for i in range(0,110250,73)))
  loopStart=6;loopEnd=6+period/22050
  target=out/(name+'-fc-v1.wav')
  subprocess.run(['ffmpeg','-y','-v','error','-i',str(original),'-t',str(loopEnd),'-ac','1','-ar','22050','-c:a','pcm_s16le',str(target)],check=True)
  loop={'start':loopStart,'end':loopEnd};print(name,loop)
 else:
  subprocess.run(['ffmpeg','-y','-v','error','-i',str(original),'-af','silenceremove=start_periods=1:start_duration=0.005:start_threshold=-55dB:stop_periods=1:stop_duration=0.15:stop_threshold=-55dB','-ac','1','-ar','22050','-b:a','96k',str(target)],check=True);loop=None
 meta.append({'track':name,'file':target.name,'source':'https://fi.zophar.net/soundfiles/nintendo-nes-nsf/bomberman/'+__import__('urllib.parse',fromlist=['quote']).quote(filename),'sourceSHA256':hashlib.sha256(original.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'loop':loop})
Path('docs/assets/bomber/audio-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
Path('src/games/bomberSoundtrack.json').write_text(json.dumps({m['track']:{'file':m['file'],'loop':m['loop']} for m in meta},indent=2)+'\n')
subprocess.run([sys.executable, str(Path(__file__).with_name('render-bomber-blast.py'))], check=True)
