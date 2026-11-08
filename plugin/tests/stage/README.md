# Reader stage — headless Chrome rendering + geometry probe

A standalone page that mounts the reader's `ReaderView` in plain Chrome, so a
layout bug can be shown with a screenshot and numbers instead of a description.
It imports the real plugin sources — `src/ui/reader.js`, `src/ui/styles.js`
and the English dictionary from `src/client-entry.js` — and nothing in
`reader/` outside this directory is modified.

## Run

```bash
cd reader

# every mode, both variants: screenshots + geometry JSON into tests/stage/out/
node tests/stage/run.mjs

# only the tree as it is now, only one mode
node tests/stage/run.mjs --variant current --modes type

# the 390px phone comparison (see the limitation below)
node tests/stage/run.mjs --variant current --modes type,speak --phone
```

Options: `--modes listen,type,speak` · `--variant current|before|both`
(default `both`) · `--size 1440x900` · `--phone` · `--skip-build` ·
`--chrome <path>`.

`build.mjs` alone only writes the page and bundle:

```bash
node tests/stage/build.mjs --variant current   # out/stage.html + out/stage.js
node tests/stage/build.mjs --variant before    # out/stage-before.html + out/stage-before.js
```

## Variants

The bug this stage exists for is one line: the player bar (`.er-read-foot`) used
to be rendered in **every** mode, while each practice mode also brought its own
bar (`.er-mode-dock` for type and speak). Switching mode therefore showed two
bottom control surfaces at once, the lower one covering the upper one.

* **current** — the working tree as it is. `renderFoot()` is guarded by
  `mode === 'listen'`, so exactly one control surface is on screen.
* **before** — the same tree with that guard replaced by an unconditional
  `renderFoot()`. This is done by a build-time text substitution inside
  esbuild, **not** by editing `src/ui/reader.js`; if the guard line is gone
  the build fails loudly instead of mislabelling a screenshot.

The probe records the exact source files it measured in `stageMeta.sources`
(path, mtime, sha256 prefix), so a capture stays traceable even while the
working tree is being edited.

## Artifacts (in `tests/stage/out/`, git-ignored)

| file | what it is |
|---|---|
| `shot-<mode>.png` | current tree, 1440x900 |
| `shot-<mode>-before.png` | before variant, 1440x900 |
| `shot-<mode>-phone.png` | current tree, 390x844 |
| `probe-<mode>.json` | geometry JSON for the current tree |
| `probe-<mode>-before.json` | geometry JSON for the before variant |
| `stage.html` / `stage.js` | the page and its bundle |
| `stage-before.html` / `stage-before.js` | the before-variant page and bundle |

Modes are `listen`, `type`, `speak`.

## Probe JSON

Written into a hidden `<pre id="probe">` once the frame has settled, and read
back by `run.mjs` from `--dump-dom`.

```
stageMeta      variant, buildStamp, sources[{path,mtime,sha256}]
mode           the requested mode
pressedMode    the label of the `.er-mode[aria-pressed=true]` button
phone          whether ?phone=1 was used
viewport       innerWidth / innerHeight / devicePixelRatio
document       scrollWidth / scrollHeight / body overflow
elements       .er-read-foot, .er-mode-dock, .er-reading-page, .er-read-body,
               .er-modes, .er-page -> { rect, style, visible, text } or null
visibleBars    which of read-foot / mode-dock is actually visible
barDetails     per bar: rect, paper overlap, read-body overlap, text overlap
barsOverlap / barOverlaps   visible bars whose rects intersect (two bars at once)
readBodyCovered / readBodyCoveredArea   <- the coverage criterion
textCovered / textCoveredArea           <- stricter cross-check
paperCovered / paperCoveredArea / paperCoveredRatio   <- reference only
coverageCriterion / coverageNote
footButtons    visible button labels inside .er-read-foot
dockText       text of .er-mode-dock
consoleErrors  window.onerror, unhandledrejection, console.error
image          written by run.mjs: file, width, height, bytes, inkRatio
```

`visible` is not "in the DOM": the element must have a non-zero box, not be
`display:none` / `visibility:hidden` / `opacity:0`, intersect the viewport,
and carry text.

`inkRatio` is the share of pixels that differ from the modal page colour, so a
blank render (one flat colour) reports ~0 and a rendered page reports tens of
percent. Screenshots are decoded in `run.mjs` with zlib; no external tool is
needed.

### Coverage semantics

**Use `readBodyCovered` to decide whether the text is covered by a control.**
It intersects the visible bars with `.er-read-body`, the scroll container that
holds the paper.

`paperCovered` is reference only. It intersects the bars with the geometric
box of `.er-reading-page`, which is taller than the visible paper and clipped
by the scroll container's `overflow`. That element's box keeps reaching under
the floating player bar even after the layout is fixed, so `paperCovered` can
stay `true` while nothing is actually covered — do not read it as a verdict.

`textCovered` is the stricter cross-check: each `.er-paragraph-body` text box
is clipped to `.er-read-body` and intersected with the visible bars. It uses
the text box geometry, which includes the line leading, so a few thousand
square pixels can be a leading-only sliver with no glyph under the bar — read it
together with the screenshot.

## Known limitations

* **Headless Chrome under `--virtual-time-budget` never fires
  `requestAnimationFrame`** (verified with a minimal page: only timers advance).
  The generated page therefore installs a timer-backed `requestAnimationFrame`
  shim before the bundle loads. The reader's measuring effects do run, but each
  frame is a 16ms timer, so layout can differ by a frame from a real browser.
* **Window size is not viewport size.** With `--window-size=1440,900` the
  viewport is 1440x813 on this Chrome/macOS build (87px of window chrome), so
  the PNG is 1440x900 and the layout sees 1440x813.
* **Phone capture is approximate.** Headless Chrome enforces a ~500px minimum
  window width, so `--phone` produces a 390px container inside a 390x844 image
  but a 500x757 viewport. The reader still takes its phone layout because
  `(max-width: 600px)` matches, but the viewport is 110px wider than the
  container.
* **Host tokens are approximated.** The stage defines the `--dsw-*` tokens the
  plugin reads (light theme: warm paper canvas, near-black ink, brass focus).
  It is the same product family, not a pixel match with the real shell. The
  dark theme (`body[data-ds-dark-theme]`) is not exercised.
* **System fonts only.** No webfonts are loaded; the reading face is Georgia and
  the UI face is the macOS system stack. Text metrics differ from the shell.
* **Static frame.** The capture is one settled frame: nothing is playing, no
  hover/focus state, no speech recognition. `playing`, `speechFeedback` and the
  other runtime states are not exercised.
* **No app chrome.** `ReaderView` is mounted directly inside an `.er-page`
  container; the page's own app bar / tab strip from `ui/page.js` is not
  rendered, so `.er-page` geometry is the reader's container only.
* **Mode switching is programmatic.** The stage clicks the hidden
  `.er-mode` chip in `.er-mode-chips`; a real learner opens the modes menu
  first. The DOM result is the same, the intermediate menu is not captured.
