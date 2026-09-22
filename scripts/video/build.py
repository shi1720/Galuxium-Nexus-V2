#!/usr/bin/env python3
"""Compose an authentic narrated screen walkthrough with burned captions.

UI capture must happen separately through the authorized browser tools. This
script only reads supplied files and renders them offline with Pillow/FFmpeg.
"""
from __future__ import annotations
import argparse
import difflib
import hashlib
import json
import math
import re
import shutil
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS = 1920, 1080, 30
COLOR_ARGS = ['-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709']
COLOR_FILTER = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p'
INK, PAPER, GREEN, LIME, MUTED = '#172E29', '#F7F8F5', '#167D5A', '#DFF2AE', '#B6C7BC'
FONT_DIR = Path('/System/Library/Fonts/Supplemental')

def run(args, **kwargs):
    result = subprocess.run([str(x) for x in args], text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(f"Command failed: {args[0]}\n{result.stderr[-6000:]}")
    return result

def duration(path):
    data=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',path]).stdout)
    return float(data['format']['duration'])

def font(size, bold=False, serif=False):
    return ImageFont.truetype(str(FONT_DIR / ('Georgia.ttf' if serif else 'Arial Bold.ttf' if bold else 'Arial.ttf')), size)

def no_em_dash(value):
    if '\u2014' in str(value):
        raise ValueError('An em dash appears in video text or metadata. Replace it with ordinary punctuation.')

def relative_path(value):
    p = Path(value)
    return p if p.is_absolute() else ROOT / p

def wrapped(text, f, max_width):
    words = text.split()
    lines, current = [], ''
    for word in words:
        proposed = f'{current} {word}'.strip()
        if current and f.getlength(proposed) > max_width:
            lines.append(current); current = word
        else:
            current = proposed
    if current: lines.append(current)
    return lines

def header_canvas(heading, sample=True, transparent=False):
    im = Image.new('RGBA', (W,H), (0,0,0,0) if transparent else PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle((0,0,W,92), fill=INK)
    d.text((64,25), 'Pactshift', font=font(38,True), fill=PAPER)
    d.text((330,31), heading, font=font(26), fill=LIME)
    if sample:
        label='Fictional demonstration project'
        d.text((W-64-font(22).getlength(label),35),label,font=font(22),fill=MUTED)
    return im

def make_still(visual, target, live_url):
    no_em_dash(visual)
    if visual['kind'] == 'title':
        im=Image.new('RGB',(W,H),INK);d=ImageDraw.Draw(im)
        d.text((108,158),visual.get('kicker','SHIVAM GUPTA  /  GALUXIUM NEXUS V2'),font=font(27,True),fill=LIME)
        d.text((102,285),visual.get('title','Pactshift'),font=font(132,True),fill=PAPER)
        subtitle=visual.get('subtitle','Scope changes your clients can approve')
        for i,line in enumerate(wrapped(subtitle,font(58,serif=True),1650)):
            d.text((108,472+i*76),line,font=font(58,serif=True),fill=LIME)
        if visual.get('show_url'):
            d.text((108,740),live_url.removeprefix('https://'),font=font(32),fill=PAPER)
        d.text((108,825),visual.get('disclosure','AI narration. Fictional sample data. Built by Shivam Gupta.'),font=font(25),fill=MUTED)
    elif visual['kind'] == 'image':
        im=header_canvas(visual.get('heading','The project agreement'),visual.get('sample',True))
        source=Image.open(relative_path(visual['path'])).convert('RGB')
        if visual.get('crop'):
            left,top,right,bottom=visual['crop']
            if not (0<=left<right<=source.width and 0<=top<bottom<=source.height):
                raise ValueError(f"Invalid factual image crop: {visual['path']}")
            source=source.crop((left,top,right,bottom))
        box=(52,116,1816,768)
        scale=min(box[2]/source.width,box[3]/source.height)
        source=source.resize((round(source.width*scale),round(source.height*scale)),Image.Resampling.LANCZOS)
        im.paste(source,(box[0]+(box[2]-source.width)//2,box[1]+(box[3]-source.height)//2))
        im=im.convert('RGB')
    else:
        raise ValueError('Still type must be title or image.')
    im.save(target)

def stamp(seconds):
    ms=round(seconds*1000);whole,millis=divmod(ms,1000);minutes,secs=divmod(whole,60);hours,minutes=divmod(minutes,60)
    return f'{hours:02}:{minutes:02}:{secs:02},{millis:03}'

def parse_stamp(value):
    h,m,s,ms=map(int,re.split('[:,]',value));return h*3600+m*60+s+ms/1000

def split_captions(text):
    groups=[]
    for sentence in re.split(r'(?<=[.!?])\s+',text.strip()):
        words=sentence.split()
        while words:
            take=math.ceil(len(words)/math.ceil(len(words)/12))
            while take>1 and len(' '.join(words[:take]))>80: take-=1
            chunk=' '.join(words[:take]);lines=textwrap.wrap(chunk,42,break_long_words=False,break_on_hyphens=False)
            while len(lines)>2 and take>1:
                take-=1;chunk=' '.join(words[:take]);lines=textwrap.wrap(chunk,42,break_long_words=False,break_on_hyphens=False)
            remainder=len(words)-take
            if 0<remainder<4 and take>4:
                take-=4-remainder;chunk=' '.join(words[:take]);lines=textwrap.wrap(chunk,42,break_long_words=False,break_on_hyphens=False)
            groups.append(('\n'.join(lines),take));words=words[take:]
    return groups

def auto_captions(segments):
    cues=[]
    for s in segments:
        chunks=split_captions(s['text']);count=sum(w for _,w in chunks);cursor=s['start']
        for text,words in chunks:
            end=cursor+s['speech_duration']*words/count
            cues.append({'start':cursor,'end':end,'text':text});cursor=end
    return cues

def timestamp_captions(segments):
    """Anchor canonical caption words to monotonic recognized word timestamps."""
    cues,coverage=[],[]
    for segment in segments:
        supplied=relative_path(segment.get('word_timestamps') or str(Path(segment['audio']).with_suffix('.words.json')))
        if not supplied.is_file():raise FileNotFoundError(f'Missing narration word timestamps: {supplied}')
        data=json.loads(supplied.read_text());recognized=data['words'] if isinstance(data,dict) else data
        canonical=segment['text'].split();a=[];a_owner=[];b=[];b_times=[]
        for i,word in enumerate(canonical):
            units=re.findall(r'[a-z0-9]+',word.lower());a.extend(units);a_owner.extend([i]*len(units))
        # Whisper renders spoken amounts as digits and can separate a thousands
        # group. Expand this approved script's numeric phrases for alignment only.
        numeric={'4':'four','12':'twelve','16':'sixteen','96':'ninety six','92':'ninety two','29':'twenty nine dollars','79':'seventy nine dollars','125':'one hundred and twenty five dollars','1500':'fifteen hundred dollars','12000':'twelve thousand dollars'}
        i=0
        while i<len(recognized):
            word=recognized[i];text=word['word'].lower().strip();start=float(word['start']);end=float(word['end'])
            if text=='12' and i+1<len(recognized) and recognized[i+1]['word'].strip()=='000':
                text='12000';end=float(recognized[i+1]['end']);i+=1
            units=re.findall(r'[a-z0-9]+',numeric.get(text,text));b.extend(units)
            for j in range(len(units)):
                b_times.append((start+(end-start)*j/len(units),start+(end-start)*(j+1)/len(units)))
            i+=1
        anchors={};matched=0
        for block in difflib.SequenceMatcher(None,a,b,autojunk=False).get_matching_blocks():
            matched+=block.size
            for k in range(block.size):
                ci=a_owner[block.a+k]
                anchors.setdefault(ci,[]).append(b_times[block.b+k])
        fraction=matched/max(1,len(a))
        if fraction<0.72:raise ValueError(f"Low transcript alignment for {segment['id']}: {fraction:.1%}. Inspect narration and word timestamps.")
        times=[None]*len(canonical)
        for i,pairs in anchors.items():times[i]=(min(p[0] for p in pairs),max(p[1] for p in pairs))
        i=0
        while i<len(times):
            if times[i] is not None:i+=1;continue
            start=i
            while i<len(times) and times[i] is None:i+=1
            left=times[start-1][1] if start else 0
            right=times[i][0] if i<len(times) else segment['speech_duration']
            step=max(0,right-left)/(i-start)
            for j in range(start,i):times[j]=(left+(j-start)*step,left+(j-start+1)*step)
        offset=0;previous=segment['start']
        for text,count in split_captions(segment['text']):
            begin=max(previous,segment['start']+times[offset][0]);end=segment['start']+times[offset+count-1][1]
            end=min(segment['start']+segment['speech_duration'],max(begin+0.04,end))
            if end<=begin:raise ValueError('Timestamp alignment produced an empty caption; review the supplied transcript.')
            cues.append({'start':begin,'end':end,'text':text});previous=end;offset+=count
        coverage.append({'segment':segment['id'],'canonical_unit_coverage':round(fraction,4),'timestamp_source':str(supplied.relative_to(ROOT))})
    # Let a short final phrase linger into a real pause, without crossing the
    # next spoken cue. Do not create flashing one-word subtitles.
    for i,cue in enumerate(cues[:-1]):
        if cue['end']-cue['start']<1:
            cue['end']=max(cue['end'],min(cue['start']+1,cues[i+1]['start']-0.05))
    return cues,coverage

def read_srt(path):
    cues=[]
    for block in path.read_text(encoding='utf-8-sig').strip().split('\n\n'):
        lines=block.splitlines();start,end=lines[1].split(' --> ')
        cues.append({'start':parse_stamp(start),'end':parse_stamp(end),'text':'\n'.join(lines[2:])})
    return cues

def save_srt(cues,path):
    path.write_text('\n'.join(f"{i}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n" for i,c in enumerate(cues,1)),encoding='utf-8')

def concat_line(path,seconds=None):
    escaped=str(path.resolve()).replace("'", "'\\''")
    return f"file '{escaped}'\n"+(f'duration {seconds:.6f}\n' if seconds is not None else '')

def make_caption(text,path):
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    if text:
        lines=text.splitlines()
        if len(lines)>2:raise ValueError('Captions must have at most two lines.')
        f=font(44)
        if any(f.getlength(line)>1770 for line in lines):raise ValueError('Caption line exceeds the readable frame.')
        d.rectangle((0,904,W,H),fill=(15,34,28,248))
        y=940 if len(lines)==2 else 968
        for line in lines:
            d.text(((W-f.getlength(line))/2,y),line,font=f,fill=PAPER);y+=57
    im.save(path)

def normalize_audio(segments,build):
    cursor=0
    for i,s in enumerate(segments):
        original=relative_path(s['audio'])
        if not original.is_file():raise FileNotFoundError(f'Missing real narration audio: {original}')
        s['speech_duration']=duration(original);s['start']=cursor
        s['duration']=s['speech_duration']+float(s.get('pause_after',0.25))
        target=build/f'voice-{i:02}.wav'
        run(['ffmpeg','-y','-v','error','-i',original,'-af',f"apad=pad_dur={s.get('pause_after',0.25)}",'-ar','48000','-ac','1','-c:a','pcm_s16le',target])
        s['duration']=duration(target);s['normalized']=target;cursor+=s['duration']
    listing=build/'voice.ffconcat';listing.write_text('ffconcat version 1.0\n'+''.join(concat_line(s['normalized']) for s in segments))
    voice=build/'voice.wav';run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',listing,'-c','copy',voice])
    return voice,cursor

def encode_visual(v,seconds,index,build,live_url):
    out=build/f'shot-{index:03}.mp4'
    if v['kind'] in ('image','title'):
        frame=build/f'shot-{index:03}.png';make_still(v,frame,live_url)
        run(['ffmpeg','-y','-v','error','-loop','1','-framerate',str(FPS),'-i',frame,'-t',str(seconds),'-an','-vf',COLOR_FILTER,'-c:v','libx264','-preset','fast','-tune','stillimage','-crf','18','-pix_fmt','yuv420p',*COLOR_ARGS,out])
    elif v['kind']=='video':
        source=relative_path(v['path']);clip_start=float(v.get('clip_start',0));available=duration(source)-clip_start
        if seconds>available+0.05 and not v.get('hold_last',False):raise ValueError('Video shot exceeds source duration. Explicitly opt into a still hold or supply a longer authentic clip.')
        header=build/f'header-{index:03}.png';header_canvas(v.get('heading','The client decision'),v.get('sample',True),True).save(header)
        filters=f"[0:v]trim=start={clip_start},setpts=PTS-STARTPTS,scale=1816:768:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:116+(768-ih)/2:color={PAPER},fps={FPS},setsar=1"
        if v.get('hold_last'):filters+=f',tpad=stop_mode=clone:stop_duration={max(0,seconds-available)+1}'
        filters+='[base];[base][1:v]overlay=0:0:format=auto,'+COLOR_FILTER+'[v]'
        run(['ffmpeg','-y','-v','error','-i',source,'-i',header,'-filter_complex',filters,'-map','[v]','-t',str(seconds),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',*COLOR_ARGS,out])
    else:raise ValueError(f"Unknown visual kind: {v['kind']}")
    return out

def main():
    parser=argparse.ArgumentParser();parser.add_argument('manifest',type=Path);parser.add_argument('--allow-draft',action='store_true');parser.add_argument('--captions',type=Path);args=parser.parse_args()
    manifest=json.loads(args.manifest.read_text());no_em_dash(manifest)
    build=ROOT/'scripts/video/.build';build.mkdir(parents=True,exist_ok=True)
    output=relative_path(manifest.get('output','deliverables/Pactshift-demo.mp4'));output.parent.mkdir(parents=True,exist_ok=True)
    segments=manifest['segments']
    voice,total=normalize_audio(segments,build)
    if not args.allow_draft and not 120<=total<=300:raise ValueError(f'The video must last 2-5 minutes. Audio timeline is {total:.2f}s.')
    caption_source=args.captions or (relative_path(manifest['captions']) if manifest.get('captions') else None)
    word_files=[relative_path(s.get('word_timestamps') or str(Path(s['audio']).with_suffix('.words.json'))).is_file() for s in segments]
    coverage=[]
    if caption_source:
        cues=read_srt(caption_source);alignment='supplied timecodes; listening review required'
    elif all(word_files):
        cues,coverage=timestamp_captions(segments);alignment='recognized word timestamps anchored to exact narration; listening review required'
    elif manifest.get('require_word_timestamps',False):
        raise ValueError('The final manifest requires word timestamps for every narration segment.')
    else:
        cues=auto_captions(segments);alignment='proportional within measured audio segments; listening review required'
    caption_words=' '.join(c['text'].replace('\n',' ') for c in cues).split()
    script_words=' '.join(s['text'] for s in segments).split()
    if caption_words!=script_words:raise ValueError('Captions do not preserve the exact narration words.')
    last=0
    for c in cues:
        no_em_dash(c['text'])
        if not last<=c['start']<c['end']<=total+0.05:raise ValueError('Caption timestamps overlap or exceed narration.')
        last=c['end']
    srt=output.with_suffix('.srt');save_srt(cues,srt)
    shots=[];timeline=[]
    for s in segments:
        visuals=s['visuals'];fixed=sum(float(v.get('seconds',0)) for v in visuals if v.get('seconds')!='remaining')
        remaining=[v for v in visuals if v.get('seconds')=='remaining']
        if len(remaining)>1:raise ValueError('At most one visual per segment can use remaining duration.')
        if not remaining and abs(fixed-s['duration'])>0.04:raise ValueError('Visual durations must fill the audio segment.')
        local=0
        for v in visuals:
            seconds=s['duration']-fixed if v.get('seconds')=='remaining' else float(v['seconds'])
            if seconds<=0:raise ValueError('A shot has no positive duration.')
            start=s['start']+local
            render_seconds=(round((start+seconds)*FPS)-round(start*FPS))/FPS
            clip=encode_visual(v,render_seconds,len(shots),build,manifest['live_url']);shots.append(clip)
            timeline.append({'segment':s['id'],'start':start,'duration':seconds,'render_duration':render_seconds,'kind':v['kind'],'source':v.get('path'),'heading':v.get('heading',v.get('title','Pactshift'))});local+=seconds
    listing=build/'shots.ffconcat';listing.write_text('ffconcat version 1.0\n'+''.join(concat_line(p) for p in shots))
    base=build/'base.mp4';run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',listing,'-c','copy',base])
    blank=build/'caption-blank.png';make_caption('',blank);sequence='ffconcat version 1.0\n';cursor=0
    for i,c in enumerate(cues):
        if c['start']>cursor:sequence+=concat_line(blank,c['start']-cursor)
        path=build/f'caption-{i:03}.png';make_caption(c['text'],path);sequence+=concat_line(path,c['end']-c['start']);cursor=c['end']
    if cursor<total:sequence+=concat_line(blank,total-cursor)
    sequence+=concat_line(blank);caption_list=build/'captions.ffconcat';caption_list.write_text(sequence)
    measured=run(['ffmpeg','-hide_banner','-i',voice,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']).stderr
    stats=json.loads(re.findall(r'\{[^{}]+\}',measured)[-1])
    loudness=f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
    run(['ffmpeg','-y','-v','error','-i',base,'-f','concat','-safe','0','-i',caption_list,'-i',voice,'-filter_complex','[0:v][1:v]overlay=0:0:eof_action=pass:format=auto,'+COLOR_FILTER+'[v]','-map','[v]','-map','2:a:0','-af',loudness,'-t',str(total),'-r',str(FPS),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',*COLOR_ARGS,'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',output])
    probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',output]).stdout)
    video=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (video['width'],video['height'],video['codec_name'],audio['codec_name'])==(W,H,'h264','aac')
    report={'output':str(output.relative_to(ROOT)),'duration_seconds':float(probe['format']['duration']),'resolution':[W,H],'fps':FPS,'spoken_words':len(script_words),'caption_cues':len(cues),'caption_alignment':alignment,'alignment_coverage':coverage,'audio_loudness_measurement':stats,'shots':timeline,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'review_status':'Rendering complete. Full audiovisual and subtitle alignment review required before publication.'}
    (build/'render-report.json').write_text(json.dumps(report,indent=2))
    (build/'timing.json').write_text(json.dumps([{k:v for k,v in s.items() if k not in ('normalized','visuals')} for s in segments],indent=2))
    print(json.dumps({k:report[k] for k in ('output','duration_seconds','resolution','spoken_words','caption_cues','caption_alignment')},indent=2))

if __name__=='__main__':main()
