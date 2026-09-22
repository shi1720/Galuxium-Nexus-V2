#!/usr/bin/env python3
"""Prepare an editable, asset-requiring manifest from the approved narration."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
narration=json.loads((ROOT/'scripts/video/narration.json').read_text())
paragraphs=[segment['text'] for segment in narration['segments']]
assert len(paragraphs)==10
shots=[('01-opening','The extra request','landing.png'),('02-baseline','The original agreement','baseline.png'),('03-analysis','A request against the agreed scope','request.png'),('04-swap','The proposed exchange','swap.png'),('05-offer','The client sees the trade-offs','offer.png'),('06-decision','The client accepts the exchange','accepted.png'),('07-result','The saved agreement changes','result.png'),('08-history','The decision remains inspectable','history.png'),('09-pricing','Proposed subscription plans','pricing.png'),('10-close','A product ready for customer validation','result.png')]
segments=[]
plan_path=ROOT/'scripts/video/shot_plan.json'
edit_plan=json.loads(plan_path.read_text()) if plan_path.exists() else {}
for i,(text,(sid,heading,filename)) in enumerate(zip(paragraphs,shots)):
    visuals=[{'kind':'image','path':f'scripts/video/assets/{filename}','heading':heading,'seconds':'remaining','sample':i not in (0,8,9)}]
    if i==0:visuals.insert(0,{'kind':'title','title':'Pactshift','subtitle':'Scope changes your clients can approve','seconds':4})
    if i==9:visuals.append({'kind':'title','title':'Pactshift','subtitle':'When the request changes, the agreement should too.','seconds':6,'show_url':True})
    visuals=edit_plan.get(sid,visuals)
    segments.append({'id':sid,'text':text,'audio':f'scripts/video/assets/voice/{i+1:02}.wav','pause_after':0.3,'visuals':visuals})
manifest={'title':'Pactshift - A client request becomes an agreed change','live_url':narration['live_url'],'voice_disclosure':'AI narration','require_word_timestamps':True,'output':'deliverables/Pactshift-demo.mp4','segments':segments}
target=ROOT/'scripts/video/manifest.local.json'
if target.exists():raise SystemExit('manifest.local.json already exists. Preserve its asset choices or explicitly move it before regenerating.')
target.write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print(target)
