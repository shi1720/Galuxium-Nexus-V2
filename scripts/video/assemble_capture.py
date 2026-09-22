#!/usr/bin/env python3
"""Assemble supplied browser screencast frames at their recorded timestamps.

This is an offline media operation. It never controls a browser or invents
intermediate UI frames. Repeated frames preserve the observed elapsed time.
"""
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('metadata', type=Path)
    parser.add_argument('--crop', type=int, nargs=4, metavar=('LEFT', 'TOP', 'RIGHT', 'BOTTOM'))
    parser.add_argument('--output', type=Path, default=ROOT/'scripts/video/.build/decision-capture.mp4')
    args = parser.parse_args()
    frames = json.loads(args.metadata.read_text())
    if len(frames) < 2:
        raise ValueError('At least two authentic timestamped frames are required.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    listing = args.output.with_suffix('.ffconcat')
    lines = ['ffconcat version 1.0']
    for i, frame in enumerate(frames):
        source = ROOT / frame['path']
        if not source.is_file():
            raise FileNotFoundError(source)
        seconds = frames[i+1]['time']-frame['time'] if i+1 < len(frames) else 1/30
        if seconds <= 0:
            raise ValueError('Capture timestamps must increase.')
        lines += ["file '"+str(source).replace("'", "'\\''")+"'", f'duration {seconds:.8f}']
    lines += ["file '"+str(ROOT/frames[-1]['path']).replace("'", "'\\''")+"'"]
    listing.write_text('\n'.join(lines)+'\n')
    filters = []
    if args.crop:
        left, top, right, bottom = args.crop
        filters.append(f'crop={right-left}:{bottom-top}:{left}:{top}')
    filters.extend(['fps=30', 'setsar=1'])
    duration = frames[-1]['time']-frames[0]['time']+1/30
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(listing),
                    '-vf', ','.join(filters), '-t', str(duration), '-an', '-c:v', 'libx264',
                    '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', str(args.output)], check=True)
    print(json.dumps({'output': str(args.output), 'observed_seconds': duration,
                      'source_frames': len(frames), 'speed': 'recorded'}))


if __name__ == '__main__':
    main()
