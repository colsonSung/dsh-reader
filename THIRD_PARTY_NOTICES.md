# Third-party notices

Reader's own code is licensed under MIT. It also builds on these packages:

- **pdfjs-dist** (including the inlined PDF worker) — Apache License 2.0, Mozilla Foundation. The PDF bundle retains the upstream license notices.
- **esbuild** — MIT License.
- **fflate** — MIT License.
- **jsdom** — MIT License.
- **React and ReactDOM** — MIT License, Meta Platforms.

Optional, installed by the user rather than shipped here:

- **Kokoro-82M** (hexgrad/kokoro, HuggingFace) — Apache License 2.0. The plugin does not bundle the model or its weights; `src/host/kokoro-server.py` drives a user-installed copy through the `kokoro` Python package. If you install it, its licence and its model card apply to your installation.

These are development/build dependencies, not code copied into the plugin except for the PDF.js distribution included by the build. Consult the package's own license files under `node_modules` after `pnpm install` for the complete upstream terms.
