#!/usr/bin/env python3
"""Render editorial title images without inventing an application interface."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
FONTS=Path('/System/Library/Fonts/Supplemental')
INK,PAPER,LIME,MUTED='#172E29','#F7F8F5','#DFF2AE','#B6C7BC'
def font(size,bold=False):return ImageFont.truetype(str(FONTS/('Arial Bold.ttf' if bold else 'Arial.ttf')),size)
for name,size in [('Pactshift-youtube-thumbnail.png',(1920,1080)),('Pactshift-devpost-thumbnail.png',(1500,1000))]:
    w,h=size;im=Image.new('RGB',size,INK);d=ImageDraw.Draw(im);margin=round(w*.063)
    d.text((margin,round(h*.082)),'Pactshift',font=font(round(w*.044),True),fill=PAPER)
    d.text((margin,round(h*.325)),'One more thing.',font=font(round(w*.068),True),fill=PAPER)
    second='One clear agreement.';size2=round(w*.065)
    while font(size2,True).getlength(second)>w-margin*2:size2-=1
    d.text((margin,round(h*.48)),second,font=font(size2,True),fill=LIME)
    d.text((margin,round(h*.73)),'Scope changes your clients can approve',font=font(round(w*.025)),fill=MUTED)
    d.text((margin,round(h*.865)),'Built by Shivam Gupta',font=font(round(w*.024),True),fill=PAPER)
    d.text((margin,round(h*.917)),'Galuxium Nexus V2',font=font(round(w*.018)),fill=MUTED)
    target=ROOT/'deliverables'/name;im.save(target,optimize=True);print(target)
