#!/usr/bin/env python3
"""Create the judge upload ZIP from a strict allowlist of reviewed deliverables."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import posixpath
import re
from urllib.parse import urlparse
import zipfile

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--video-url',required=True)
args=parser.parse_args()
parsed=urlparse(args.video_url)
if parsed.scheme!='https' or parsed.hostname not in ('www.youtube.com','youtube.com','youtu.be'):
    raise SystemExit('Supply the actual HTTPS YouTube watch URL after public playback verification.')
files={
    'Product/Pactshift-brief.pdf':'deliverables/Pactshift-brief.pdf',
    'Product/Pactshift-pitch.pptx':'deliverables/Pactshift-pitch.pptx',
    'Product/Project-story.md':'docs/PROJECT_STORY.md',
    'Review/Testing-instructions.md':'docs/TESTING_INSTRUCTIONS.md',
    'Demo/Narration-and-shot-plan.md':'docs/DEMO_SCRIPT.md',
    'Demo/Pactshift-captions.srt':'deliverables/Pactshift-demo.srt',
    'Demo/Pactshift-demo.mp4':'deliverables/Pactshift-demo.mp4',
}
for source in files.values():
    if not (ROOT/source).is_file():raise SystemExit(f'Missing final required file: {source}')
source_targets={source:target for target,source in files.items()}
contents={}
for target,source in files.items():
    data=(ROOT/source).read_bytes()
    if source.endswith('.md'):
        def rewrite_link(match):
            link=match[2]
            if urlparse(link).scheme or link.startswith('#'):
                return match[0]
            path,separator,anchor=link.partition('#')
            resolved=posixpath.normpath(posixpath.join(posixpath.dirname(source),path))
            if resolved in source_targets:
                destination=posixpath.relpath(source_targets[resolved],posixpath.dirname(target))
            else:
                destination='https://github.com/shi1720/Galuxium-Nexus-V2/blob/main/'+resolved
            if separator:
                destination+='#'+anchor
            return match[1]+destination+match[3]
        data=re.sub(r'(\[[^\]]+\]\()([^\)]+)(\))',rewrite_link,data.decode()).encode()
    if source.endswith(('.md','.srt')):
        if '\u2014' in data.decode():
            raise SystemExit(f'Unexpected em dash in public package source: {source}')
        if re.search(rb'(?:sk-[A-Za-z0-9_-]{24,}|AIza[A-Za-z0-9_-]{25,})',data):
            raise SystemExit(f'Potential credential pattern in public package source: {source}')
    contents[target]=data
links={'project':'Pactshift','founder_and_builder':'Shivam Gupta','live_application':'https://pactshift.web.app','video':args.video_url,'repository':'https://github.com/shi1720/Galuxium-Nexus-V2','narration_disclosure':'AI narration','sample_data':'The demonstration project and client identity are fictional.','commercial_status':'Proposed pricing. No verified customer or revenue traction is claimed.','packaged_at':datetime.now(timezone.utc).isoformat(),'files':{target:{'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)} for target,data in contents.items()}}
readme=f'''# Pactshift - judge submission package

Pactshift helps small agencies turn an extra client request into an agreed change in budget or deliverables. An accepted addition or exchange updates the saved project baseline.

Built by Shivam Gupta with substantial AI assistance. The demonstration uses explicitly disclosed AI narration and fictional sample data.

## Open the product and video

- Live application: https://pactshift.web.app
- Product demo video: {args.video_url}
- Public code and local setup: https://github.com/shi1720/Galuxium-Nexus-V2

## A useful review order

1. Watch the product demonstration and open the live application.
2. Follow `Review/Testing-instructions.md` to try an isolated sample workflow.
3. Read `Product/Pactshift-brief.pdf` for the customer problem, architecture and business model.
4. Open the editable `Product/Pactshift-pitch.pptx` or read `Product/Project-story.md`.

`Demo/` contains the complete 1080p video for offline playback, the exact narration plan and the separate caption track. The video also has burned subtitles. `Links.json` records the public URLs and file digests. The original repository contains implementation details and reproducible setup instructions.

The product records commercial agreements. A proposed fee is not cash collected, and preserved capacity is not revenue. Launch prices remain a commercial hypothesis. Client acknowledgment records a decision without independently verifying the signer's identity.

This ZIP contains reviewed documents, the finished video and public links. It does not include credentials, environment files, raw voice assets, build caches or third-party runtime packages.
'''
for label,text in [('README',readme),('Links',json.dumps(links,ensure_ascii=False))]:
    if '\u2014' in text:raise SystemExit(f'Unexpected em dash in {label}.')
out=ROOT/'deliverables/Pactshift-submission.zip'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    archive.writestr('README.md',readme)
    archive.writestr('Links.json',json.dumps(links,indent=2,ensure_ascii=False))
    for target,data in contents.items():archive.writestr(target,data)
if out.stat().st_size>=35_000_000:raise SystemExit('The submission package exceeds the 35 MB upload limit.')
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist())==set(files)|{'README.md','Links.json'}
    for target,data in contents.items():
        assert hashlib.sha256(archive.read(target)).hexdigest()==links['files'][target]['sha256']
        if target.endswith('.md'):
            for linked in re.findall(r'\]\(([^)]+)\)',data.decode()):
                if not urlparse(linked).scheme and not linked.startswith('#'):
                    resolved=posixpath.normpath(posixpath.join(posixpath.dirname(target),linked.split('#')[0]))
                    assert resolved in archive.namelist(),(target,linked)
print(f'{out}\n{out.stat().st_size:,} bytes; {len(files)+2} explicitly allowlisted entries.')
