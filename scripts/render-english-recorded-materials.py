"""Render reviewed activity regions, never infer audio bindings from a page number.
Usage: python render-english-recorded-materials.py /absolute/textbook.pdf
Requires Poppler and Pillow. Printed page = PDF page - 5.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,subprocess,sys,tempfile
from PIL import Image
root=Path(__file__).resolve().parent.parent
clips=json.loads((root/'src/content/englishG3AudioCatalog.json').read_text())
frames=[f for c in clips for f in c['material']]
exercises=json.loads((root/'src/content/englishG3SoundExercises.json').read_text())
frames += [{**question, 'src':question['picture']} for questions in exercises.values() for question in questions]
with tempfile.TemporaryDirectory(prefix='sfz-recorded-materials-') as temp:
 def render(p):
  subprocess.run(['pdftoppm','-f',str(p+5),'-l',str(p+5),'-scale-to','1800','-png','-singlefile',sys.argv[1],str(Path(temp)/str(p))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(render,sorted({f['page'] for f in frames})))
 for f in frames:
  im=Image.open(Path(temp)/f"{f['page']}.png")
  x1,y1,x2,y2=f['region'];im=im.crop((round(x1*im.width),round(y1*im.height),round(x2*im.width),round(y2*im.height)))
  target=root/'public'/f['src'].lstrip('/');target.parent.mkdir(parents=True,exist_ok=True);im.save(target,'WEBP',quality=83)
print(f'Rendered {len(frames)} activity regions for {len(clips)} recordings')
