"""Generate a local teleprompter and a draft caption timeline from exact narration."""
from pathlib import Path
import json
import re
import textwrap

ROOT = Path(__file__).resolve().parents[2]
source = (ROOT / 'docs/DEMO_SCRIPT.md').read_text()
section = source.split('## Verbatim narration', 1)[1].split('## Operator checks', 1)[0]
paragraphs = [line[2:] for line in section.splitlines() if line.startswith('> ')]
assert len(paragraphs) == 10, 'Review shot cues if the narration structure changes.'
cues = [
    ['The problem', 'Open Pactshift, enter an isolated demo, and open Forma website.'],
    ['The agreed project', 'Show the $12,000 budget and 96 estimated hours. Open Spanish-language pages.'],
    ['Review the request', 'Show the analysis engine, confirmed 12 hours, $1,500 fee and supplied-copy assumption.'],
    ['A scope exchange', 'Show the eligible 16-hour Resource library and the constraints on other work. Save the draft.'],
    ['The client view', 'Share the proposal and open its real client offer in another tab. Show all three options.'],
    ['The client decision', 'Act as fictional client Jamie, sample client. Acknowledge the terms, choose the exchange, and wait.'],
    ['The updated agreement', 'Return to the owner view. Show version two, $12,000, 92 estimated hours and the replaced deliverable.'],
    ['The record', 'Show previous baselines, decision history and the workspace export control.'],
    ['The business', 'Show the proposed Free, Studio $29 and Agency $79 plans with their stored-project allowances.'],
    ['The close', 'End on the actual project or Pactshift brand. Do not show invented customers or revenue.'],
]
data = [{'text': text, 'title': cue[0], 'cue': cue[1]} for text, cue in zip(paragraphs, cues)]
word_count = sum(len(p.split()) for p in paragraphs)

template = (Path(__file__).parent / 'teleprompter.template.html').read_text()
serialized = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
html = template.replace('__NARRATION_JSON__', serialized).replace('__WORD_COUNT__', str(word_count))
(ROOT / 'deliverables/Pactshift-teleprompter.html').write_text(html)

# Preserve every spoken word while wrapping captions into at most two short lines.
chunks = []
for pi, paragraph in enumerate(paragraphs):
    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
    paragraph_chunks = []
    for sentence in sentences:
        words = sentence.split()
        while words:
            take = min(12, len(words))
            while take > 1 and len(' '.join(words[:take])) > 80:
                take -= 1
            chunk = ' '.join(words[:take])
            lines = textwrap.wrap(chunk, width=42, break_long_words=False, break_on_hyphens=False)
            while len(lines) > 2 and take > 1:
                take -= 1
                chunk = ' '.join(words[:take])
                lines = textwrap.wrap(chunk, width=42, break_long_words=False, break_on_hyphens=False)
            paragraph_chunks.append({'text': '\n'.join(lines), 'words': take, 'paragraph': pi})
            words = words[take:]
    paragraph_chunks[-1]['paragraph_end'] = True
    chunks.extend(paragraph_chunks)

assert ' '.join(x['text'].replace('\n', ' ') for x in chunks) == ' '.join(paragraphs)
target_ms = 240_000
start_ms, end_padding_ms = 1_000, 1_000
gaps = [700 if x.get('paragraph_end') else 160 for x in chunks[:-1]] + [0]
speech_ms = target_ms - start_ms - end_padding_ms - sum(gaps)

def timestamp(ms):
    ms = round(ms)
    seconds, millis = divmod(ms, 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f'{hours:02}:{minutes:02}:{seconds:02},{millis:03}'

entries = []
cursor = start_ms
for i, (chunk, gap) in enumerate(zip(chunks, gaps), 1):
    duration = speech_ms * chunk['words'] / word_count
    finish = cursor + duration
    entries.append(f"{i}\n{timestamp(cursor)} --> {timestamp(finish)}\n{chunk['text']}\n")
    cursor = finish + gap
assert abs(cursor - (target_ms - end_padding_ms)) < 1
(ROOT / 'deliverables/Pactshift-captions-draft.srt').write_text('\n'.join(entries), encoding='utf-8')
print(f'Created teleprompter: {len(paragraphs)} paragraphs, {word_count} exact words.')
print(f'Created caption timing draft: {len(chunks)} cues, 00:01 to {timestamp(cursor)}, with estimated pauses.')
