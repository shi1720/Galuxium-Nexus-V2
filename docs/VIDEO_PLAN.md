# Pactshift product video

Published video: [Pactshift: When a Client Asks for One More Thing](https://youtu.be/BF9QX1_Pppg). The final export runs 3:21 at 1080p, with disclosed AI narration and 63 burned subtitle cues. See [publication and encoding evidence](VIDEO_EVIDENCE.json).

Target: a clear 1080p product demonstration lasting 2-5 minutes, with a human-sounding narration track, readable burned captions, and a separate SRT. The existing approved narration contains 506 words. The recorded AI narration, with short pauses, runs 3 minutes 21 seconds.

The current production assets must come from the working application and the actual narration files. This pipeline does not generate a fake interface, simulate a client click, invent customers, or claim that an approval collected revenue. A sequence of still captures is a narrated screen walkthrough. It must not be described as an uninterrupted recording of a live client decision.

## Asset handoff

Supply ten voice files, one per segment in `scripts/video/narration.json`, named `scripts/video/assets/voice/01.wav` through `10.wav`. The [verbatim narration](DEMO_SCRIPT.md) mirrors these words. Other audio formats work when their actual paths are entered in the manifest. Keep the wording exact. The compositor measures each supplied audio file and aligns its corresponding visual segment to the measured duration. The opening and closing identify this voice as AI narration rather than a recording of Shivam's own voice.

Authentic screenshots or clips should show these steps in this order:

| Segment | Required visual evidence | Default asset |
| --- | --- | --- |
| 1 | Landing page or the real opening workspace | `landing.png` |
| 2 | Forma website at baseline one, $12,000, 96 estimated hours | `baseline.png` |
| 3 | Spanish-language request, engine label, 12-hour estimate, $1,500 fee, supplied-copy assumption | `request.png` |
| 4 | Resource library at 16 hours, eligible for exchange; restrictions on other work | `swap.png` |
| 5 | Public client offer with add, exchange and defer options | `offer.png` |
| 6 | Actual accepted-exchange receipt, or preferably the authentic continuous decision clip | `accepted.png` or a clip path |
| 7 | Owner view at baseline two, $12,000, 92 estimated hours and updated deliverables | `result.png` |
| 8 | Previous baselines, decision history or audit record | `history.png` |
| 9 | Proposed Free, Studio $29 and Agency $79 plans with stored-project and storage limits | `pricing.png` |
| 10 | The resulting project, then the closing title and public application URL | Reuse the real result capture |

Place these under `scripts/video/assets/` or update their paths in the manifest. That directory is ignored by Git because source recordings can be large. Public delivery files belong in `deliverables/`.

Use browser captures at 1920 x 1080 or higher when possible, or a tight crop of the relevant real content. Keep labels readable. Remove unrelated browser chrome and personal information through an honest crop. Do not paint over values or add controls. Capture UI only through the authorized `cua_repl` workflow. The offline compositor has no browser-control code.

For a real decision clip, replace segment 6's image entry with `kind: "video"`, the clip path, a `clip_start` in seconds and `seconds: "remaining"`. It plays at its recorded speed. Set `hold_last: true` only if a still hold on the final authentic frame is acceptable. The builder otherwise rejects a clip shorter than its assigned duration. It never invents intermediate UI activity.

## Composition

The final edit uses 25 shots. Most are readable crops of authentic hosted product captures. A 1.1-second client confirmation sequence uses four captured browser frames at their original timestamps, with separately identified still holds before and after. It is an edited walkthrough, not a claim of an uninterrupted recording. The opening title lasts four seconds before the real product appears. The closing title lasts six seconds. Forest, cream and lime match the product and submission artifacts. Product frames carry a small section label, with a fictional sample label where appropriate. Captions sit in a reserved dark band below the application, so they do not hide an approval button or project value.

The output is H.264, 1920 x 1080, 30 frames per second, with AAC audio and fast-start metadata for web playback. Every scene uses the same limited-range BT.709 color profile, including JPEG browser screencast frames, so transitions cannot change the decoder color state or interrupt the subtitle overlay. The AI narrator remains the only required audio. Opening and closing cards explicitly say AI narration. Music is omitted to keep the demonstration clear. Two-pass loudness normalization targets -16 LUFS and a -1.5 dBTP ceiling.

## Build commands

The builder needs Python with Pillow, FFmpeg with libx264 and AAC, and FFprobe. The local bundled Python runtime includes Pillow. Arial and Georgia fonts default to the system supplemental font directory. The code renders text with Pillow, because the installed FFmpeg does not include the libass or drawtext filters.

```sh
python3 scripts/video/assemble_capture.py scripts/video/assets/decision-frames.json \
  --crop 420 585 1500 1010
python3 scripts/video/prepare_manifest.py
# The reviewed shot_plan.json supplies authentic crops and shot durations.
# Edit manifest.local.json only when using replacement real audio or captures.
python3 scripts/video/build.py scripts/video/manifest.local.json
python3 scripts/video/verify_render.py
```

The manifest generator refuses to overwrite an existing manifest. The builder requires all real files and rejects a final duration outside 2-5 minutes. `--allow-draft` is only for a short local pipeline smoke check, not for a submission export.

The first pass generates `deliverables/Pactshift-demo.mp4` and `deliverables/Pactshift-demo.srt`. The final manifest requires word timestamps for each voice file, stored beside it as `01.words.json` and so on. The accepted JSON is a `words` array of objects with `word`, `start` and `end` fields, using seconds relative to that voice file. The compositor maps recognized words monotonically to the exact approved narration and rejects weak alignment. The private report records coverage for each segment. This improves synchronization, but a listening review is still required.

For a private editing draft only, disabling `require_word_timestamps` permits proportional timing within each measured audio segment. That fallback is not proof of precise alignment. Listen to the full cut, adjust the SRT to the spoken words where needed, then rebuild with:

```sh
python3 scripts/video/build.py scripts/video/manifest.local.json \
  --captions deliverables/Pactshift-demo.srt
```

Exact word checks prevent subtitles from drifting away from the approved script. The SRT has at most two lines per cue. Caption PNGs preserve readable white text on forest and do not depend on a playback platform's caption styling. The separate SRT also allows an accessible selectable track after upload.

Private timing data, encoded intermediate clips and the render report stay in `scripts/video/.build/`. The report records source shots, measured timing, output properties and a SHA-256 digest. It explicitly marks listening review as outstanding until a reviewer completes it.

The encoded verification checks the displayed white text and dark caption band at the midpoint of every actual cue. It also samples each shot's header color and produces seven contact sheets for visual inspection. This detects subtitle disappearance and color changes after clips, including failures that are absent from the original PNGs. It supplements listening and visual review.

## Final review before public upload

Watch the complete rendered MP4 with sound. Check every caption against the actual narration. Inspect the client choice and saved result at full size. Verify that the named options, $1,500 addition, unchanged $12,000 swap budget and 96-to-92 estimate match the real captures. Keep fictional sample data and pre-validation language clear.

Check the beginning, every shot transition and the final frame for black gaps or frozen frames presented as active interaction. Confirm that audio is intelligible, does not clip, and ends naturally. The technical file check must report H.264, AAC, 1920 x 1080 and a duration between two and five minutes.

Only after those checks should the actual completed video be uploaded. Verify public playback and captions while logged out. Then record the real watch URL in the submission materials. Until that happens, neither a published video nor a submitted entry is a completed claim.
