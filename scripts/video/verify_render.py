#!/usr/bin/env python3
"""Check encoded subtitle presence and color continuity, then make QA sheets.

These checks complement a listening and visual review. They do not claim that
automatic image comparisons establish narration quality or product correctness.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build import ROOT, font, read_srt

build = ROOT/'scripts/video/.build'
report = json.loads((build/'render-report.json').read_text())
video = ROOT/report['output']
cues = read_srt(video.with_suffix('.srt'))


def frame(t, target, crop=False):
    command = ['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', str(video), '-frames:v', '1']
    if crop:
        command += ['-vf', 'crop=1920:176:0:904']
    subprocess.run(command+[str(target)], check=True)


results = []
for i, cue in enumerate(cues):
    path = build/f'caption-proof-{i:02}.png'
    frame((cue['start']+cue['end'])/2, path, crop=True)
    actual = np.asarray(Image.open(path).convert('RGB'))
    expected = np.asarray(Image.open(build/f'caption-{i:03}.png').convert('RGB'))[904:]
    actual_white = np.min(actual, axis=2) > 205
    expected_white = np.min(expected, axis=2) > 205
    intersection = np.logical_and(actual_white, expected_white).sum()
    union = np.logical_or(actual_white, expected_white).sum()
    iou = float(intersection/max(1, union))
    dark_fraction = float((np.max(actual, axis=2) < 80).mean())
    results.append({'cue': i+1, 'time': round((cue['start']+cue['end'])/2, 3),
                    'text_mask_overlap': round(iou, 4), 'dark_band_fraction': round(dark_fraction, 4)})
    if iou < 0.88 or dark_fraction < 0.8:
        raise SystemExit(f'Encoded caption mismatch: {results[-1]}')

colors = []
for i, shot in enumerate(report['shots']):
    path = build/f'final-{i:02}.png'
    frame(shot['start']+min(shot['duration']/2, 1.1), path)
    im = Image.open(path).convert('RGB')
    color = im.getpixel((3, 3))
    colors.append({'shot': i+1, 'header_pixel': list(color)})
    if max(abs(a-b) for a, b in zip(color, (23, 46, 41))) > 5:
        raise SystemExit(f'Color continuity mismatch: {colors[-1]}')

for page in range((len(report['shots'])+3)//4):
    sheet = Image.new('RGB', (1920, 1144), '#E7EBE5')
    d = ImageDraw.Draw(sheet)
    for slot in range(4):
        index = page*4+slot
        if index >= len(report['shots']):
            break
        x = (slot % 2)*960
        y = (slot // 2)*572
        shot = report['shots'][index]
        d.text((x+14, y+5), f"{index+1:02}   {shot['start']:.2f}s   {shot['heading']}", font=font(22), fill='#172E29')
        im = Image.open(build/f'final-{index:02}.png').convert('RGB').resize((960, 540), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y+32))
    sheet.save(build/f'contact-sheet-{page+1}.jpg', quality=94)

qa = {'video_sha256': report['sha256'], 'caption_cues_checked': len(results),
      'minimum_text_mask_overlap': min(r['text_mask_overlap'] for r in results),
      'color_samples': colors, 'caption_samples': results,
      'scope': 'Encoded caption presence and placement, constant header color, and per-shot contact sheets. Listening review remains separate.'}
(build/'encoded-qa.json').write_text(json.dumps(qa, indent=2))
print(json.dumps({key: qa[key] for key in ['caption_cues_checked', 'minimum_text_mask_overlap', 'video_sha256']}, indent=2))
