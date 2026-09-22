# Submission artifact sources

`brief.py` creates the five-page executive brief with ReportLab. `pitch.mjs` creates the seven-slide editable presentation with `@oai/artifact-tool`, including two native tables and one editable chart with an embedded data workbook. Both use the shared, reviewed values in `facts.json`.

The files in `deliverables/` are the handoff artifacts. `.build/` contains private renders and structural validation receipts, and is excluded from Git. The screenshot field must point to a real application capture relative to the repository root. It must not point to a fabricated interface or an image containing real customer data.

The current product visual is a fair crop of `docs/images/request.png`, an authentic browser capture of the local application using fictional demo data. `facts.json` records the source and pixel crop. `brief.py` regenerates the cropped image without changing its content, and the deck identifies it as the owner review screen rather than the client offer.

## Rebuild in the Codex workspace runtime

Load the installed PDF and presentations skills and runtime dependencies first. The deck script resolves its runtime under the current home directory. Set `PACTSHIFT_RUNTIME` and `PACTSHIFT_PRESENTATIONS_SKILL` to override those paths. The PDF uses the macOS supplemental fonts by default. Set `PACTSHIFT_FONT_DIR` to another directory containing `Arial.ttf`, `Arial Bold.ttf`, and `Georgia.ttf` if needed.

1. Link this directory's `node_modules` to the bundled runtime package directory.
2. Run `brief.py` with the bundled Python interpreter.
3. Run `pitch.mjs` with the bundled Node interpreter.
4. Render every PDF page and every final presentation slide. Inspect each at a readable size.
5. Recheck `facts.json` against the seeded domain data, product capabilities, `docs/MARKET.md`, and `docs/BUSINESS.md` before publication.

`pitch.mjs` finalizes to a unique output and copies the validated file to the stable delivery filename. It checks seven slides, native tables on slides 3 and 6, the chart on slide 2, chart workbook data, package integrity, font usage, and text geometry. Rendering and human visual inspection still matter.

If LibreOffice is used, use only the bundled headless executable resolved by `load_workspace_dependencies`, not an installed desktop application.

## Evidence policy

- Example work, budgets, and the Northstar/Forma project are fictional demonstration data.
- Prices are launch hypotheses. The materials do not claim paid customers, revenue, or completed pilots.
- Analysis token costs are explicit planning assumptions, not measured bills.
- Projected capacity and approved fees are not cash received.
- The founder and builder is Shivam Gupta. The materials disclose AI-assisted engineering and content production without inventing work history.
- Source links appear in PDF references and presentation speaker notes.
