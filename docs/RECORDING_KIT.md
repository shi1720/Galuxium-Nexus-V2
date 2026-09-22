# Pactshift recording kit

This kit prepares the recording. **Shivam still needs to record the real application and his voice, edit the take, and upload a playable video.** Neither the teleprompter nor the captions file is a finished video.

- [Exact narration and full storyboard](DEMO_SCRIPT.md)
- [Open the self-contained teleprompter](../deliverables/Pactshift-teleprompter.html)
- [Download the estimated caption timing draft](../deliverables/Pactshift-captions-draft.srt)
- [Live application](https://pactshift-wh46bdeima-uc.a.run.app)

## A straightforward recording setup

Open the HTML file locally in a browser. It needs no server, account, network access, or external libraries. Put it near the camera or on a second display, outside the area being recorded. Read only the large narration text. The small shot cue is an instruction for the operator.

Start with a fresh isolated demo workspace. The sample agency, project and client identity are fictional. Keep the owner view and the generated client offer in separate tabs. Record at 1920 x 1080 or higher with system notifications and unrelated windows hidden. Capture the actual application, including the decision and saved result. Do not substitute the pitch deck for the required product workflow.

At the default 135 words per minute, the 510-word narration takes about 3 minutes 47 seconds before action pauses. Leave time for the client decision, loading, and the owner refresh. A finished take around four minutes should fit the event's 2-5 minute requirement. Actual pace determines the duration.

## Teleprompter controls

| Control | Behavior |
| --- | --- |
| Play / Pause, Space or P | Start or pause the reading position. |
| Reading speed | Choose 80-200 words per minute. Up and Down change it by five when a control does not have focus. |
| Text size | Set large text between 28 and 64 pixels. On narrow screens, text also fits the viewport. |
| Reset or R | Return to the first word and pause. |
| Previous shot / Next shot | Jump to a narration paragraph and show its matching operator cue. |
| Script position slider | Seek to a word and pause. |
| Click a word | Put the reading position on that exact word. |
| Manual scrolling | Pause playback. Click a word afterward to continue from the place you want. |
| Mirror | Reverse only the narration for a physical teleprompter. |
| Full screen or F | Use browser full screen when supported. |

Keyboard shortcuts defer to focused buttons and sliders, so normal keyboard control still works. Switching browser tabs pauses playback. If recording the application on the same screen, pause before each action, switch to the application, perform it, and resume the narration. A second display or separate device is more convenient for continuous reading.

The progress display measures words in the script. Its remaining time assumes continuous speech at the chosen speed and excludes action pauses. The teleprompter does not record audio or video, save settings, send data, or synthesize a voice.

## Shot order

1. Introduce the problem and open the demo project.
2. Show the $12,000 baseline and 96 estimated hours, then the Spanish-language request.
3. Review the analysis engine, the 12-hour effort, supplied-copy assumption and $1,500 fee.
4. Show the 16-hour Resource library exchange and the restrictions on other work. Save the draft.
5. Share the proposal and open the actual client view.
6. As fictional client Alex Morgan, acknowledge the terms and accept the exchange. Keep the action and response visible.
7. Return to the owner view. Show version two, unchanged $12,000 budget and date, and 92 estimated hours.
8. Show the decision history, previous baselines and workspace export.
9. Show the proposed pricing and stored-project allowances.
10. Close on the project or brand with the accurate pre-validation statement.

The script deliberately avoids an exact due date because each demo uses a date relative to creation. The 96-to-92 comparison is total estimated work in the baseline, including work already done or underway. It is not a measurement of hours remaining or time worked.

## Caption timing draft

`Pactshift-captions-draft.srt` contains the exact spoken words from the verbatim narration, with short readable caption lines. The generator distributes them across a four-minute planning timeline, from 00:01 to 03:59, including estimated gaps. **These timestamps are estimates, not alignment to recorded audio.** No recorded speech was available when they were generated.

After editing the real take, import the SRT into the video editor or the upload platform. Align every cue to the actual speech, extend gaps for actions, and check that captions never reveal a decision before the viewer hears it. Preview the complete exported video with sound and captions. Keep the wording exact unless Shivam intentionally changes the spoken script, then update the source and captions together.

The `draft` filename is intentional. Rename it only after synchronization and review. Do not upload the timing draft as final synchronized captions without checking it.

## Before submitting

Confirm that the result is 2-5 minutes, the voice is clear, all text shown is readable, the central client decision is visible, and the project state actually changes. Open the uploaded video while logged out to verify playback. Add its real URL to [SUBMISSION.md](SUBMISSION.md).

To regenerate the kit after an intentional narration edit, run `python3 scripts/artifacts/recording_kit.py`. The generator checks the ten-paragraph structure and verifies that the caption words match the narration exactly. Review the operator cues if the script structure changes.
