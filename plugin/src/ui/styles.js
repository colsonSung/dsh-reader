import { TOKENS } from './tokens.js';

/**
 * The plugin's stylesheet.
 *
 * The reader and Minutes are one product family, and the family kit
 * (~/.dsh/skills/dsh-plugin-visual-system/kit.css) is the single source of
 * truth for it: one surface ramp, one brass accent, one text ramp, one set of
 * semantic triples, one shadow recipe.
 *
 * The plugin declares its own surfaces and accent because the host's four
 * surface tokens are all white in light mode: a card built from them is white
 * on white. The accent is brass, the colour of a book, and it appears in three
 * places only: the primary action, the active state, and the brass rail on
 * the left edge of the reading column. The host is still followed for the
 * primary text colour, the focus ring and the radii.
 *
 * The word card, the note editor, the modes panel and the playback options
 * float over the panel, so they live outside the page root and carry the same
 * token block with them.
 */
export const STYLE = `${TOKENS}
.er-page{display:flex;flex-direction:column;height:100%;min-height:0;position:relative;background:var(--er-surface-0);color:var(--er-ink-1);font-family:var(--dsw-font,inherit);font-size:13px;container-type:inline-size;container-name:erpage;--er-touch:32px;--er-gutter:24px;--er-shelf-min:168px}.er-body{flex:1;min-height:0;overflow:auto;padding:24px 24px 48px}
.er-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;min-height:220px;color:var(--er-ink-3);text-align:center}
.er-empty-title{font-size:16px;color:var(--er-ink-2);font-weight:500}
.er-empty-hint{font-size:12px;max-width:420px;line-height:1.7}/* A notice, not a banner: the reading surface must not be interrupted by a
   full width red box. */
.er-error{background:var(--er-err-soft);border:1px solid var(--er-line);color:var(--er-err-ink);font-size:12px;line-height:1.4;display:inline-flex;align-self:flex-start;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:999px}
.er-error::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.er-note{margin-top:12px;padding:12px 16px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card);color:var(--er-ink-2);font-size:12px}.er-book{display:flex;align-items:center;gap:16px;padding:12px 16px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card)}
.er-book-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.er-book-title{font-size:14px;color:var(--er-ink-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-book-meta{font-size:12px;color:var(--er-ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-book-progress{height:4px;border-radius:999px;background:var(--er-surface-3);overflow:hidden}
.er-book-progress>span{display:block;height:100%;background:var(--er-accent)}
.er-book-actions{display:flex;gap:8px;flex:none}
/* Filled buttons keep their fill on hover: washing them out made the light
   label unreadable. The reference app dims the fill instead. */
.er-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:12px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease,filter var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
.er-btn:hover:not(:disabled){background:var(--er-hover)}
.er-btn:disabled{cursor:default}
.er-btn:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-btn-primary{background:var(--er-accent);border-color:var(--er-accent);color:var(--er-on-accent)}
.er-btn-primary:hover:not(:disabled){background:var(--er-accent);filter:brightness(.94)}
.er-btn-primary:disabled{background:var(--er-surface-3);border-color:var(--er-line);color:var(--er-ink-3);filter:none}
.er-btn-danger:hover:not(:disabled){border-color:var(--er-err);color:var(--er-err-ink)}
.er-btn-icon{padding:6px 8px}
.er-reader{display:flex;flex-direction:column;gap:16px;min-width:0;height:100%;min-height:0}/* A select without an arrow does not read as a dropdown: the chevron is
   drawn with the text colour, so it follows the theme. */
.er-select{appearance:none;-webkit-appearance:none;padding:6px 26px 6px 10px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background-color:var(--er-surface-1);box-shadow:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 14px) 52%,calc(100% - 9px) 52%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;color:var(--er-ink-1);font:inherit;font-size:13px;max-width:200px;text-overflow:ellipsis;cursor:pointer;transition:border-color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
.er-select:hover{border-color:var(--er-line-strong);background-color:var(--er-hover)}
.er-select:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-select option{background:var(--er-surface-1);color:var(--er-ink-1)}/* The page. It is the one surface the reader owns: warm paper, sepia ink,
   an inset top highlight and a soft foot shadow. The brass rail that runs
   down its left edge is the plugin's signature device. */
.er-paragraph{position:relative;font-family:Georgia,'Songti SC','Times New Roman',serif;font-size:18px;line-height:1.95;color:var(--er-paper-ink);padding:28px 30px 28px 44px;border-radius:var(--dsw-radius-md);background:var(--er-paper);border:1px solid var(--er-paper-line);box-shadow:var(--er-shadow-page);word-break:break-word}
.er-word{display:inline-block;padding:1px 3px;border-radius:var(--dsw-radius-xs);cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
/* A Chinese character is a word of its own: the padding that spaces out an
   English word would leave a gap between every character. */
.er-word.is-cjk{padding:1px 0}
.er-word:hover{background:var(--er-hover)}
.er-word.is-spoken{background:var(--er-paper-ink-wash)}
\.er-word\.is-current\{color:var\(--er-accent-ink\)\}
/* A word read correctly keeps the paper's own ink: painting every matched
   word green would turn the passage into a highlighter. Only the words that
   differ from what was said get a mark. */
.er-word.is-ok{text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--er-ok-ink) 42%,transparent);text-underline-offset:3px}
.er-word.is-bad{color:var(--er-err-ink);text-decoration:underline wavy var(--er-err-ink)}
.er-word.is-missing{color:var(--er-warn-ink);text-decoration:underline dotted var(--er-warn-ink)}
.er-word.is-extra{color:var(--er-ink-3);text-decoration:line-through}
.er-char.is-bad-char{color:var(--er-err-ink)}
.er-char.is-pending-char{color:var(--er-ink-3)}
.er-type-bar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:16px;font-size:13px;padding:6px 0;background:var(--er-surface-0)}
.er-type-panel{position:sticky;bottom:0;z-index:3;background:var(--er-surface-0);padding:12px 0 8px;border-top:1px solid var(--er-line)}
.er-type-metric{font-variant-numeric:tabular-nums;color:var(--er-ink-1)}
.er-type-icon{appearance:none;border:0;font:inherit;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px 6px;border-radius:var(--dsw-radius-xs);font-size:14px;line-height:1;display:inline-flex;align-items:center}
.er-type-icon:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-type-icon[aria-pressed="true"]{opacity:.55}
.er-settings{display:flex;flex-direction:column;gap:12px;padding:12px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card)}
.er-setting-row{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--er-ink-2)}
.er-setting-label{width:88px;flex:none;color:var(--er-ink-2)}
.er-setting-value{width:58px;flex:none;text-align:right;color:var(--er-ink-3);font-variant-numeric:tabular-nums}
.er-setting-hint{color:var(--er-ink-3);font-size:12px}
.er-input-row{display:flex;justify-content:center;padding:12px 0}
.er-input-row.is-hidden{opacity:0;height:0;padding:0;overflow:hidden;pointer-events:none}
.er-word-input{max-width:100%;min-width:96px;box-sizing:border-box;padding:10px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line-strong);background:var(--er-surface-1);box-shadow:none;color:var(--er-ink-1);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;text-align:center}
.er-word-input:focus{outline:none;border-color:var(--er-accent)}
.er-word-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-word-input::placeholder{color:var(--er-ink-3);opacity:.55}
.er-word.is-muted{color:var(--er-ink-3)}
.er-scope-label{font-size:12px;color:var(--er-ink-3);margin-left:8px;align-self:center}
.er-scope{display:inline-flex;gap:2px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-3);align-self:center}
.er-scope-item{appearance:none;border:0;border-radius:var(--dsw-radius-xs);padding:5px 12px;background:transparent;color:var(--er-ink-2);font:inherit;font-size:12px;cursor:pointer}
.er-scope-item:hover{background:var(--er-hover)}
.er-scope-item[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink);box-shadow:none}
/* The mode row stays put while the text scrolls: the controls are always
   within reach. */
.er-modes{display:flex;gap:8px;flex-wrap:wrap;flex:none;position:sticky;top:0;z-index:6;padding:8px 0;margin:-8px 0 8px;background:var(--er-surface-0)}
.er-mode-chips{display:flex;gap:8px;flex-wrap:wrap;min-width:0}
.er-mode-text{white-space:nowrap}
.er-mode{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card);color:var(--er-ink-2);font:inherit;font-size:13px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
/* One selected style for the whole panel: a mode, a practice unit and an aid
   are never "selected" in three different colours. */
.er-mode[aria-pressed="true"]{background:var(--er-accent-soft);border-color:transparent;color:var(--er-accent-ink);font-weight:500}
.er-mode:disabled{opacity:.45;cursor:not-allowed}
/* The active mode is marked three ways: fill, edge and weight. Colour on
   its own would not carry the state. */
.er-mode:hover{background:var(--er-hover)}
.er-mode[aria-pressed="true"]:hover{background:var(--er-surface-1)}
.er-mode[aria-pressed="true"]{border-color:var(--er-accent);background:var(--er-accent-soft);color:var(--er-ink-1);font-weight:500}
.er-mode:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-panel{display:flex;flex-direction:column;gap:12px}
.er-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.er-stats{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--er-ink-3)}
.er-stat{display:flex;align-items:baseline;gap:5px}
.er-stat-value{font-size:14px;color:var(--er-ink-1)}
.er-transcript{min-height:40px;padding:12px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card);font-size:14px;line-height:1.7;color:var(--er-ink-2)}
.er-chips{display:flex;flex-wrap:wrap;gap:8px}
.er-chip{padding:4px 8px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);box-shadow:none;font-size:13px;color:var(--er-ink-2)}
.er-chip.is-ok{color:var(--er-ok-ink)}
.er-chip.is-bad{color:var(--er-err-ink);background:transparent;border:1px solid var(--er-err)}
.er-chip.is-missing{color:var(--er-warn-ink)}
.er-chip.is-extra{color:var(--er-ink-3);text-decoration:line-through}.er-label{font-size:12px;color:var(--er-ink-3)}
.er-wordlist-button{display:inline-flex;align-items:center;gap:6px;flex:none;appearance:none;border:1px solid var(--er-line);border-radius:var(--dsw-radius-sm);padding:6px 10px 6px 8px;background:var(--er-surface-1);box-shadow:none;color:var(--er-ink-2);font:inherit;font-size:12px;line-height:1.4;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease}
.er-wordlist-button:hover{border-color:var(--er-line-strong);background:var(--er-hover);color:var(--er-ink-1)}
.er-wordlist-label{white-space:nowrap}
/* The mind map and the podcast sit next to the vocabulary button. They are
   icon only: the bar is one line, and a label each would push the reading
   figures off the edge. */
.er-read-extra{width:28px;height:28px;flex:none;color:var(--er-ink-2)}
/* The top bar is a row of icons: the word list keeps its icon and its count
   badge, and drops the label (the name stays in the title and aria-label). */
.er-reader.is-immersive .er-wordlist-button{position:relative;border:0;background:transparent;box-shadow:none;padding:0;width:28px;min-width:28px;height:28px;border-radius:999px;gap:0;justify-content:center;color:var(--er-ink-2)}
.er-reader.is-immersive .er-wordlist-count{position:absolute;top:-2px;right:-4px;min-width:14px;height:14px;padding:0 3px;font-size:10px;box-shadow:0 0 0 2px var(--er-surface-0)}
.er-reader.is-immersive .er-wordlist-button:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-reader.is-immersive .er-wordlist-label{display:none}
.er-read-extra:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-wordlist-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--er-accent);color:var(--er-on-accent);font-size:11px;line-height:1}
.er-wordcard{position:fixed;z-index:1100;box-sizing:border-box;padding:16px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);font-size:13px;color:var(--er-ink-1)}
.er-wordcard-head{display:flex;align-items:flex-start;gap:12px}
.er-wordcard-word{flex:1;min-width:0;font-size:18px;font-weight:600;word-break:break-word}
.er-wordcard-actions{display:flex;gap:2px;flex:none}
.er-wordcard-icon{appearance:none;border:0;font:inherit;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px 6px;border-radius:var(--dsw-radius-xs);font-size:14px;line-height:1;display:inline-flex;align-items:center}
.er-wordcard-icon:hover{background:var(--er-hover);color:var(--er-ink-1)}
\.er-wordcard-icon\.is-saved\{color:var\(--er-accent-ink\)\}
.er-wordcard-phonetic{margin-top:8px;font-size:13px;color:var(--er-ink-2)}
.er-wordcard-pos{margin-top:2px;font-size:12px;color:var(--er-ink-3);font-style:italic}
.er-wordcard-definition{margin-top:8px;font-size:14px;line-height:1.6}
.er-wordcard-error{margin-top:8px;font-size:12px;color:var(--er-err-ink)}
.er-wordcard-loading{margin-top:8px;font-size:12px;color:var(--er-ink-3)}
.er-wordcard-examples{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.er-wordcard-example{padding-left:8px;border-left:2px solid var(--er-line-strong)}
.er-wordcard-example-en{font-size:13px;line-height:1.5}
.er-wordcard-example-zh{margin-top:2px;font-size:12px;color:var(--er-ink-2)}
.er-wordcard-note{margin-top:12px;padding-top:8px;border-top:1px solid var(--er-line);font-size:12px;line-height:1.6;color:var(--er-ink-2)}
.er-wordcard-foot{margin-top:12px;display:flex;gap:8px}
.er-setting-column{align-items:flex-start;flex-direction:column;gap:8px}
.er-replacements{width:100%;box-sizing:border-box;min-height:64px;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-3);box-shadow:none;color:var(--er-ink-1);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6;resize:vertical}
.er-replacements:focus{outline:none;border-color:var(--er-accent)}
.er-replacements:focus-visible{outline:var(--er-focus);outline-offset:1px}
/* The drawer belongs to the plugin area: it never covers the host chrome. */
.er-wordlist{position:absolute;inset:0;z-index:1050}
.er-wordlist.is-closed{pointer-events:none}
.er-wordlist-mask{position:absolute;inset:0;background:rgba(0,0,0,.22);opacity:1;transition:opacity var(--er-dur-modal) var(--er-ease)}
.er-wordlist.is-closed .er-wordlist-mask{opacity:0}
.er-wordlist-panel{transform:translateX(-100%);transition:transform var(--er-dur-modal) var(--er-ease)}
.er-wordlist.is-open .er-wordlist-panel{transform:none}
.er-wordlist-panel{position:absolute;top:0;left:0;bottom:0;width:min(320px,88%);display:flex;flex-direction:column;background:var(--er-surface-1);border-right:1px solid var(--er-line);box-shadow:var(--er-shadow-float);color:var(--er-ink-1)}
.er-wordlist-head{display:flex;align-items:center;gap:12px;padding:16px 16px;border-bottom:1px solid var(--er-line);flex:none}
.er-wordlist-title{flex:1;font-size:16px;font-weight:600;letter-spacing:.01em}
.er-wordlist-close{appearance:none;border:0;background:var(--er-surface-3);color:var(--er-ink-2);font-size:16px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.er-wordlist-close:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-wordlist-body{flex:1;min-height:0;overflow:auto;padding:16px}
.er-wordlist-progress{display:flex;flex-direction:column;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--er-line)}
.er-wordlist-ring{flex:none}
.er-wordlist-ring-track{fill:none;stroke:var(--er-line-strong);stroke-width:7}
.er-wordlist-ring-value{fill:none;stroke:var(--er-accent);stroke-width:7;transition:stroke-dasharray var(--er-dur-state) var(--er-ease)}
.er-wordlist-ring-text{fill:var(--er-ink-1);font-size:18px;font-weight:600}
.er-wordlist-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;text-align:center}
.er-wordlist-stat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 4px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-3)}
.er-wordlist-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--er-ink-3)}
.er-wordlist-dot.is-known{background:var(--er-ok)}
.er-wordlist-dot.is-learning{background:var(--er-accent)}
.er-wordlist-dot.is-tolearn{background:var(--er-ink-3)}
.er-wordlist-stat-label{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--er-ink-2)}
.er-wordlist-stat-value{font-size:18px;font-weight:600;color:var(--er-ink-1);font-variant-numeric:tabular-nums;line-height:1.1}
.er-wordlist-added{color:var(--er-ink-3);font-size:12px;text-align:center;margin-top:4px}
.er-wordlist-review{display:flex;align-items:center;gap:12px;padding:16px 0}
.er-wordlist-review-button{flex:1;appearance:none;border:1px solid var(--er-accent);background:var(--er-accent);box-shadow:none;color:var(--er-on-accent);border-radius:var(--dsw-radius-sm);padding:10px 12px;font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.er-wordlist-review-button:hover:not(:disabled){filter:brightness(.94)}
.er-wordlist-review-button:disabled{background:var(--er-surface-2);border-color:var(--er-line);color:var(--er-ink-3);box-shadow:none}
.er-wordlist-filters{display:flex;flex-direction:column;gap:8px;padding:4px 0 16px;border-bottom:1px solid var(--er-line)}
.er-wordlist-chips{display:flex;gap:8px;flex-wrap:wrap}
.er-wordlist-chip{appearance:none;border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:none;color:var(--er-ink-2);border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease}
.er-wordlist-chip:hover{background:var(--er-hover)}
.er-wordlist-chip.is-active{background:var(--er-accent);border-color:var(--er-accent);color:var(--er-on-accent);font-weight:500}
.er-wordlist-searchwrap{position:relative;display:flex;align-items:center}
.er-wordlist-search-icon{position:absolute;left:9px;color:var(--er-ink-3);pointer-events:none}
.er-wordlist-search{width:100%;box-sizing:border-box;padding:8px 12px 8px 32px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-3);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:13px}
.er-wordlist-search:focus{outline:none;border-color:var(--er-accent);background:var(--er-surface-1)}
.er-wordlist-search:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-wordlist-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.er-wordlist-row{display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card)}
.er-wordlist-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.er-wordlist-row-head{display:flex;align-items:baseline;gap:8px}
.er-wordlist-word{appearance:none;border:0;background:transparent;padding:0;font:inherit;font-size:14px;font-weight:600;color:var(--er-ink-1);cursor:pointer;text-align:left}
\.er-wordlist-word:hover\{color:var\(--er-accent-ink\)\}
.er-wordlist-phonetic{font-size:12px;color:var(--er-ink-3)}
.er-wordlist-definition{font-size:12px;color:var(--er-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-wordlist-row.is-known{border-color:var(--er-ok)}
.er-wordlist-meta{display:flex;gap:12px;font-size:12px;color:var(--er-ink-3)}
.er-wordlist-time,.er-wordlist-book{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-wordlist-actions{display:flex;align-items:center;gap:4px;flex:none}
.er-wordlist-speak{display:inline-flex;align-items:center;gap:4px;appearance:none;border:1px solid var(--er-line);background:var(--er-surface-1);color:var(--er-ink-2);border-radius:var(--dsw-radius-xs);padding:4px 6px;font:inherit;font-size:12px;cursor:pointer}
.er-wordlist-speak:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-wordlist-speak-text{display:none}
.er-wordlist-delete{appearance:none;border:0;font:inherit;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);display:inline-flex;align-items:center}
.er-wordlist-delete:hover{background:var(--er-hover);color:var(--er-err-ink)}
.er-wordlist-empty{padding:32px 16px;text-align:center;font-size:13px;color:var(--er-ink-3);line-height:1.8}
.er-wordlist-note{margin-top:12px;padding:8px 12px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-3);font-size:12px;color:var(--er-ink-2)}
.er-library{display:flex;flex-direction:column;gap:16px;margin-top:16px}.er-library-toolbar{display:flex;align-items:center;gap:12px}
.er-library-search{flex:1;min-width:0}
.er-library-search input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:13px}
.er-library-search input:focus{outline:none;border-color:var(--er-accent)}
.er-library-search input:focus-visible{outline:var(--er-focus);outline-offset:1px}.er-view-switch-item{appearance:none;border:0;background:transparent;color:var(--er-ink-2);cursor:pointer;padding:6px 10px;border-radius:var(--dsw-radius-xs);font-size:13px;line-height:1;display:inline-flex;align-items:center}
.er-view-switch-item:hover{background:var(--er-hover)}
.er-view-switch-item[aria-pressed="true"]:hover{background:var(--er-surface-1)}
.er-view-switch-item[aria-pressed="true"]{background:var(--er-surface-1);color:var(--er-ink-1);box-shadow:none}
.er-book-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:24px 16px}.er-cover-image{width:100%;height:100%;object-fit:cover;display:block}
/* A book without a cover still looks like a book: a calm gradient with the
   initials, not an empty white rectangle. */
/* A book without a cover still looks like a book: a cloth-bound board with
   a spine and a brass rule, not a grey placeholder rectangle. */
.er-cover-fallback{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;text-align:center;font-size:18px;font-weight:600;letter-spacing:.06em;color:var(--er-ink-2);background:linear-gradient(155deg,color-mix(in oklab,var(--er-accent-base) 9%,var(--er-surface-1)) 0%,var(--er-surface-1) 62%,color-mix(in oklab,var(--er-accent-base) 14%,var(--er-surface-1)) 100%)}
.er-cover-fallback::before{content:'';position:absolute;left:0;top:0;bottom:0;width:7px;background:linear-gradient(to right,color-mix(in oklab,var(--er-ink-1) 14%,transparent),transparent);border-right:1px solid color-mix(in oklab,var(--er-ink-1) 10%,transparent)}
.er-cover-fallback::after{content:'';width:28px;height:2px;border-radius:999px;background:var(--er-accent-line)}
.er-cover-progress{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(0,0,0,.18)}
.er-cover-progress>span{display:block;height:100%;background:var(--er-accent);box-shadow:0 0 6px rgba(0,0,0,.25)}
.er-book-cover-small{width:44px;flex:none}.er-book-list{display:flex;flex-direction:column;gap:8px}
.er-book-stats{font-size:12px;color:var(--er-ink-3)}

.er-appbar{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--er-line);flex:none}
.er-appbar-left,.er-appbar-right{display:flex;align-items:center;gap:8px;min-width:96px}
.er-appbar-right{justify-content:flex-end}
.er-segmented{display:flex;gap:2px;margin:0 auto;padding:3px;border-radius:999px;background:var(--er-surface-3)}
.er-segmented-item{appearance:none;border:0;border-radius:999px;padding:8px 18px;background:transparent;color:var(--er-ink-2);font:inherit;font-size:13px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-segmented-item:hover{background:var(--er-hover)}
.er-segmented-item[aria-selected="true"]:hover{background:var(--er-surface-1)}
.er-segmented-item[aria-selected="true"]{background:var(--er-surface-1);color:var(--er-ink-1);font-weight:500;box-shadow:none}
.er-round-button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:none;color:var(--er-ink-2);font:inherit;font-size:16px;line-height:1;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
.er-round-button:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-library-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px}
.er-library-card{padding:16px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card)}
.er-library-card-label{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--er-ink-3);margin-bottom:8px}
.er-library-card-value{display:flex;align-items:baseline;gap:4px}
.er-library-card-number{font-size:18px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums}
.er-library-card-number.is-read{color:var(--er-warn-ink)}
\.er-library-card-number\.is-played\{color:var\(--er-accent-ink\)\}
.er-library-card-number.is-speed{color:var(--er-ok-ink)}
.er-library-card-unit{font-size:12px;color:var(--er-ink-2)}
.er-book-grid{grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:24px 16px}
.er-shelf-card{position:relative;display:flex;flex-direction:column;gap:4px}.er-shelf-cover{position:relative;width:100%;aspect-ratio:2/3;transition:transform var(--er-dur-state) var(--er-ease),box-shadow var(--er-dur-state) var(--er-ease);border-radius:var(--dsw-radius-sm);overflow:hidden;background:var(--er-surface-3);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card)}
/* The two round buttons are the whole point of a cover: a learner starts the
   book from them, so they are drawn on the cover at all times instead of
   waiting for a hover. Both are discs of the panel's own surface colour, with
   the label colour for the glyph, so they follow the light and the dark
   theme; the drop shadow is what lifts them off a pale cover. The native
   button chrome is switched off, or the browser rounds the box instead of
   drawing a circle, and the corner shape is pinned to a plain circle, because
   the shell draws every box with a soft superellipse and a disc must be a
   disc. */
.er-cover-action{position:absolute;bottom:8px;display:inline-flex;font:inherit;align-items:center;justify-content:center;box-sizing:border-box;appearance:none;-webkit-appearance:none;padding:0;border:0;border-radius:50%;corner-shape:round;background:var(--er-surface-1,var(--dsw-alias-bg-layer-1));color:var(--er-ink-1);cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.30),0 0 0 1px var(--er-line-strong);transition:transform var(--er-dur-hover) ease,box-shadow var(--er-dur-hover) ease}
.er-cover-action:hover{transform:scale(1.07);box-shadow:0 4px 12px rgba(0,0,0,.36),0 0 0 1px var(--er-line-strong)}
.er-cover-action:active{transform:scale(.97)}
.er-cover-action:focus-visible{outline:var(--er-focus);outline-offset:2px}
/* The play button is the bigger of the two: it carries the triangle of the
   reader's transport control. The glyph is a share of the disc, so the
   button shrinks with the cover instead of with a font size. */
.er-cover-listen{left:8px;width:34px;height:34px}
.er-cover-listen svg{width:70%;height:70%;position:relative;left:-1px}
.er-cover-menu{right:8px;width:22px;height:22px}
.er-cover-menu svg{width:62%;height:62%}
.er-shelf-card:hover .er-shelf-cover{transform:translateY(-2px);box-shadow:var(--er-shadow-lift)}
.er-shelf-title{font-size:13px;color:var(--er-ink-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-shelf-percent{font-size:12px;color:var(--er-ink-3)}
.er-book-menu{position:absolute;z-index:20;top:100%;right:0;margin-top:4px;min-width:168px;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);display:flex;flex-direction:column}
.er-book-menu-top{position:absolute;top:46px;right:16px}
.er-book-menu-label{padding:8px 12px;font-size:12px;color:var(--er-ink-3)}
.er-book-menu-item{appearance:none;border:0;background:transparent;color:var(--er-ink-1);font:inherit;font-size:13px;text-align:left;padding:8px 12px;border-radius:var(--dsw-radius-xs);cursor:pointer}
.er-book-menu-item:hover{background:var(--er-hover)}
.er-book-menu-item.is-danger{color:var(--er-err-ink)}
\.er-book-menu-item\.is-active\{font-weight:600;color:var\(--er-accent-ink\)\}
.er-modal-mask{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
.er-modal{display:flex;flex-direction:column;width:min(460px,92vw);max-height:80vh;overflow:auto;padding:16px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);color:var(--er-ink-1)}
/* The body is written before the head, so the head is put back on top with
   the order. Nothing of the panel shrinks to fit: the modal still scrolls. */
.er-modal>*{flex:0 0 auto}
/* The mind map and the podcast player need more room than a form. */
.er-modal.is-wide{width:min(980px,94vw);max-height:86vh}
.er-modal-head{order:-1;display:flex;align-items:center;gap:12px;margin-bottom:16px}
.er-modal-title{flex:1;font-size:16px;font-weight:600}
.er-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.er-rename-input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-3);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:13px}
.er-rename-input:focus{outline:none;border-color:var(--er-accent)}
.er-rename-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-frequency{display:flex;flex-direction:column;gap:4px}
.er-frequency-row{display:grid;grid-template-columns:96px 1fr 40px;align-items:center;gap:8px;font-size:12px}
.er-frequency-word{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--er-ink-1)}
.er-frequency-bar{height:8px;border-radius:999px;background:var(--er-surface-3);overflow:hidden}
.er-frequency-bar>span{display:block;height:100%;background:var(--er-accent)}
.er-frequency-count{text-align:right;color:var(--er-ink-3);font-variant-numeric:tabular-nums}
.er-details{display:flex;flex-direction:column;gap:8px}
.er-details-row{display:flex;gap:12px;font-size:13px}
.er-details-label{flex:none;width:110px;color:var(--er-ink-3)}
.er-details-value{flex:1;color:var(--er-ink-1)}
.er-wordlist.is-page{position:static;inset:auto;display:block}
.er-wordlist.is-page .er-wordlist-mask{display:none}
.er-wordlist.is-page .er-wordlist-panel{position:static;width:auto;height:auto;box-shadow:none;border-right:0;border-radius:0;background:transparent}
.er-wordlist.is-page .er-wordlist-head{padding:4px 24px 8px;border-bottom:0}
/* The page variant has no title, so the close button keeps the right margin
   the title's flex spacer used to give it. */
.er-wordlist.is-page .er-wordlist-close{margin-left:auto}
.er-wordlist.is-page .er-wordlist-body{overflow:visible;padding:0 24px 32px;max-width:720px;margin:0 auto;width:100%}
.er-wordlist.is-page .er-wordlist-progress{flex-direction:row;align-items:center;gap:28px;padding:20px 24px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card)}
.er-wordlist.is-page .er-wordlist-stats{max-width:400px}
.er-wordlist.is-page .er-wordlist-added{text-align:left;align-self:flex-start}
.er-wordlist.is-page .er-wordlist-review-button{flex:none;padding:10px 20px}
.er-wordlist.is-page .er-wordlist-list{max-width:640px}


/* The whole tile opens the book, so the overlay sits under the two round
   buttons: a click on the play button must not fall through to it. */
.er-cover-open{position:absolute;inset:0;border:0;background:transparent;cursor:pointer;z-index:0}
.er-cover-action{z-index:2}
.er-shelf-cover .er-cover-image{z-index:0}
/* The list view shows a small cover: the two round buttons must not overlap
   each other on a thumbnail that is only 46 pixels wide. */
.er-book-cover-small{width:46px;flex:none;position:relative}
.er-book-cover-small .er-cover-action{width:17px;height:17px;bottom:3px;box-shadow:0 1px 4px rgba(0,0,0,.32),0 0 0 1px var(--er-line-strong)}
.er-book-cover-small .er-cover-listen{left:3px}
.er-book-cover-small .er-cover-menu{right:3px}
.er-book-cover-small .er-cover-progress{height:3px}
/* In the list view the menu opens to the right of the small cover, so it is
   not cut off by the edge of the panel. */
.er-book-cover-small .er-book-menu{left:100%;right:auto;top:0;margin:0 0 0 8px}


/* The read bar: three zones, separated by a hairline — the book you are
   reading, the place you are in it, and what you can do from here. The book
   is the heading, so it leads; the numbers about the book are the quietest. */
.er-read-bar{display:block;padding:0;border-bottom:1px solid var(--er-line);flex:none;white-space:nowrap;overflow:hidden}
/* The inner row keeps the content of the bar on the same frame as the paper.
   When the panel is narrower than the frame the padding is all that is left,
   so the two can never drift apart. The bar's own width is the container the
   zones answer to. */
.er-read-bar-inner{display:flex;align-items:center;gap:14px;flex-wrap:nowrap;box-sizing:border-box;max-width:var(--er-frame,none);margin:0 auto;padding:9px 16px;min-width:0;container-type:inline-size}
.er-read-head{display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 auto}
.er-read-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;color:var(--er-ink-1);letter-spacing:.01em}
.er-read-place{display:flex;align-items:center;gap:12px;min-width:0;flex:0 1 auto;padding-left:16px;border-left:1px solid var(--er-line)}
.er-read-counter{flex:none;max-width:132px;font-size:12px;color:var(--er-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* The chapter picker is a chip, not a form field: it is a place in the book,
   not a setting. */
.er-read-chapter{appearance:none;-webkit-appearance:none;max-width:18ch;flex:none;padding:6px 26px 6px 10px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background-color:var(--er-surface-1);box-shadow:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 14px) 55%,calc(100% - 10px) 55%;background-size:4px 4px,4px 4px;background-repeat:no-repeat;color:var(--er-ink-2);font:inherit;font-size:12px;line-height:1.4;text-overflow:ellipsis;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease}
.er-read-chapter:hover{border-color:var(--er-line-strong);background-color:var(--er-hover);color:var(--er-ink-1)}
.er-read-chapter:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-read-chapter option{background:var(--er-surface-1);color:var(--er-ink-1)}
/* The actions: one row of round buttons, then the word list. */
.er-read-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex:0 0 auto;margin-left:auto;padding-left:16px;border-left:1px solid var(--er-line)}
.er-read-actions .er-round-icon{width:28px;height:28px}
.er-read-stats{display:flex;align-items:center;gap:16px;flex:none;padding-left:16px;border-left:1px solid var(--er-line)}
/* The bar answers to the width of the panel, not of the window: a narrow
   sidebar must not squeeze the title into nothing. The numbers go first, then
   the position. */
/* The book is the heading of the bar and the figures are a reference: when
   the bar is not wide enough for both, the figures go first. */
/* A single line cannot hold the book, the place, the actions and the figures
   once the frame is narrower than ~1300px: they end up shoulder to shoulder.
   The bar becomes two rows there — the book and its place, then the actions
   and the figures — so every zone keeps its own air. */
@media (min-width: 901px){
  .er-reader[data-bar-rows="2"] .er-read-bar-inner{display:grid;grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"head place place" "actions actions stats";align-items:center;gap:6px 14px;padding:8px 16px}
  .er-reader[data-bar-rows="2"] .er-read-head{grid-area:head;min-width:0;flex:none}
  .er-reader[data-bar-rows="2"] .er-read-place{grid-area:place;justify-self:end;border-left:0;padding-left:0;flex:none}
  .er-reader[data-bar-rows="2"] .er-read-actions{grid-area:actions;margin-left:0;padding-left:0;border-left:0;flex-wrap:wrap}
  .er-reader[data-bar-rows="2"] .er-read-stats{grid-area:stats;justify-self:end;padding-left:12px}
}
@container (max-width: 900px){.er-read-stats{display:none}}
@container (max-width: 700px){.er-read-counter{display:none}}
@container (max-width: 540px){.er-read-chapter{display:none}}
.er-read-stat{font-size:12px;color:var(--er-ink-3);white-space:nowrap}
.er-read-stat.is-learn{color:var(--er-warn-ink)}
.er-read-stat.is-known{color:var(--er-ok-ink)}
.er-read-main{display:flex;align-items:stretch;justify-content:center;gap:16px;flex:1;min-height:0;width:100%;box-sizing:border-box;margin:0 auto;padding:0 16px}
.er-read-body{flex:1 1 auto;width:min(100%,var(--er-measure,900px));min-width:0;max-width:100%;min-height:0;display:flex;flex-direction:column;gap:16px;overflow:hidden;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--er-ink-1) 22%,transparent) transparent}
/* The reading tools float as a slim card of round tiles, the way the
   reference reader does it. */
.er-read-tools{flex:none;display:flex;flex-direction:column;gap:4px;align-items:center;align-self:flex-start;position:sticky;top:4px;padding:8px 8px;border-radius:var(--dsw-radius-xl);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card)}
.er-read-tool{display:flex;flex-direction:column;align-items:center;gap:4px;width:60px;padding:6px 2px 4px;border-radius:var(--dsw-radius-lg);border:0;background:transparent;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-read-tool:hover{background:var(--er-hover)}
\.er-read-tool\[aria-pressed="true"\]\{color:var\(--er-accent-ink\);background:var\(--er-surface-3\)\}
.er-read-tool:disabled{opacity:.4;cursor:default}
/* The icon sits in a soft round tile; the active one is filled. */
/* Each tool gets a soft tinted tile with a coloured glyph, the way the
   reference app draws them; the active one is the solid accent colour. */
\.er-read-tool-icon\{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var\(--er-accent-soft\);color:var\(--er-accent-ink\);transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
.er-read-tool:hover .er-read-tool-icon{background:var(--er-accent-hover);transform:translateY(-1px)}
.er-read-tool[aria-pressed="true"] .er-read-tool-icon{background:var(--er-accent);color:var(--er-on-accent)}
.er-read-tool:disabled{opacity:.45;cursor:default}
\.er-read-tool:disabled:hover \.er-read-tool-icon\{background:var\(--er-accent-soft\);color:var\(--er-accent-ink\)\}
.er-read-tool-label{font-size:12px;line-height:1.2;text-align:center;color:var(--er-ink-3)}
\.er-read-tool\[aria-pressed="true"\] \.er-read-tool-label\{color:var\(--er-accent-ink\);font-weight:500\}
.er-read-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px auto 0;padding:12px 16px;border-top:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card);flex:none;width:100%;max-width:var(--er-frame,none);box-sizing:border-box}
/* Scrollbars inside the reader are part of the surface: thin, rounded and low
   contrast, so a scrolled page never shows a bright system bar next to the
   paper. */
.er-read-body::-webkit-scrollbar{width:8px;height:8px}
.er-read-body::-webkit-scrollbar-track{background:transparent}
.er-read-body::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--er-ink-1) 20%,transparent);border-radius:999px;border:2px solid transparent;background-clip:padding-box}
.er-read-body::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--er-ink-1) 34%,transparent);background-clip:padding-box}

/* ---- Immersive reading (desktop and tablet) -------------------------------
   The reference the learner pointed at: the page owns the screen and the
   chrome floats over it instead of stacking above it. The read bar stays a
   single slim row, the mode strip and the tool rail become floating layers,
   and the player becomes a pill at the foot of the page. Phones keep their
   own layout: there the chrome is two rows by design. */
.er-reader.is-immersive{position:relative;gap:0}
.er-reader.is-immersive .er-read-bar{position:absolute;top:0;left:0;right:0;z-index:12;padding:8px 16px 0;border-bottom:0;background:transparent}
.er-reader.is-immersive .er-read-actions{margin-left:auto;justify-content:flex-end;flex:0 0 auto}
.er-reader.is-immersive .er-read-bar-inner{display:flex;grid-template:none;padding:6px 14px;border-radius:999px;background:color-mix(in srgb,var(--er-surface-1) 88%,transparent);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card);backdrop-filter:blur(12px)}
.er-reader.is-immersive .er-read-stats{display:none}
.er-reader.is-immersive .er-modes-toggle{display:inline-flex}
/* The reading frame fills the room the bar leaves. In the reading mode the
   player floats at the foot, so the frame stops above it; in a practice mode
   the dock below is in the flow, so the frame ends right above it. */
.er-reader.is-immersive .er-read-main{position:relative;flex:1;min-height:0;padding:72px 0 100px;gap:0}
/* The 100px foot reserved room for the floating mode dock. Listening has no
   dock (the player is the bar), so the sheet runs down to the player instead of
   leaving a band of empty paper above it. */
.er-reader.is-immersive.is-mode-listen .er-read-main{padding-bottom:72px}
.er-reader.is-immersive.is-mode-type .er-read-main,
.er-reader.is-immersive.is-mode-speak .er-read-main{padding-bottom:0}
/* The paper uses the full frame width here: the tool rail no longer takes a
   column of its own. */
.er-reader.is-immersive .er-read-body{width:100%;max-width:100%;margin:0 auto;padding:0 24px}
.er-reader.is-immersive .er-reading-page{margin:0 auto;padding-top:18px;max-width:min(100%,max(calc(var(--er-column-width,68ch) + 75px),68cqw))}
.er-reader.is-immersive .er-page-note{display:none}
/* The desktop tools rail is gone: its actions moved into the top bar. The
   phone keeps its bottom bar, which is the only room it has. */
.er-reader.is-immersive .er-read-tool{width:54px}
.er-reader.is-immersive .er-read-tool-label{font-size:11px}
/* The mode strip floats above the player, at the left foot of the page. */
/* The practice panel: three zones (mode | unit | aids) in one pill, a
   hairline between them and exactly one selected style, so the row reads as a
   control panel instead of a line of unrelated chips. */
.er-reader.is-immersive .er-modes{position:absolute;left:auto;right:24px;top:56px;bottom:auto;z-index:13;margin:0;padding:4px 6px;border-radius:999px;background:color-mix(in srgb,var(--er-surface-1) 90%,transparent);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);backdrop-filter:blur(12px);flex-wrap:nowrap;align-items:center;gap:0;overflow-x:auto;max-width:calc(100% - 48px);opacity:0;visibility:hidden;transition:opacity var(--er-dur-pop) var(--er-ease),visibility var(--er-dur-pop) var(--er-ease)}
.er-reader.is-immersive.is-modes-open .er-modes,
.er-reader.is-immersive .er-modes:focus-within,
.er-reader.is-immersive .er-modes:hover{opacity:1;visibility:visible}
.er-reader.is-immersive .er-scope-label{display:none}
.er-reader.is-immersive .er-mode-chips{display:flex;gap:2px;flex-wrap:nowrap}
.er-reader.is-immersive .er-scope{display:flex;gap:2px;margin-left:8px;padding:0 0 0 8px;border-left:1px solid var(--er-line);background:transparent;border-radius:0}
.er-reader.is-immersive .er-modes-aids{display:flex;gap:2px;margin-left:8px;padding-left:8px;border-left:1px solid var(--er-line)}
.er-reader.is-immersive .er-mode,
.er-reader.is-immersive .er-scope-item{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border:0;border-radius:999px;background:transparent;box-shadow:none;color:var(--er-ink-2);font-size:12.5px;line-height:1;white-space:nowrap;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-reader.is-immersive .er-mode:hover,
.er-reader.is-immersive .er-scope-item:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-reader.is-immersive .er-mode[aria-pressed="true"],
.er-reader.is-immersive .er-scope-item[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink);font-weight:500}
.er-reader.is-immersive .er-mode:focus-visible,
.er-reader.is-immersive .er-scope-item:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-reader.is-immersive .er-scope-item:disabled{opacity:.4;cursor:not-allowed}
/* The player: a compact pill at the foot of the page instead of a full bar. */
.er-reader.is-immersive .er-read-foot{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:10;width:auto;max-width:calc(100% - 48px);margin:0;padding:5px 12px;border-radius:999px;background:color-mix(in srgb,var(--er-surface-1) 92%,transparent);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);backdrop-filter:blur(12px);flex-wrap:nowrap;justify-content:center;gap:16px}
.er-reader.is-immersive .er-read-foot .er-controls{gap:8px;flex-wrap:nowrap;align-items:center}
.er-reader.is-immersive .er-read-foot .er-select{max-width:150px;flex:0 1 150px;min-width:0}
.er-reader.is-immersive .er-read-foot .er-play-anchor{display:block}
.er-reader.is-immersive .er-read-foot .er-play-badge{display:none}
.er-reader.is-immersive .er-read-foot .er-read-position{white-space:nowrap}
/* A bare dock (only a notice) still floats above the player. A practice bar
   does not: it docks below the paper and takes its own height, because the
   sentence being typed or read aloud must never sit under the controls that
   practise it. */
.er-reader.is-immersive .er-mode-dock{position:absolute;left:50%;bottom:74px;transform:translateX(-50%);z-index:9;width:min(680px,calc(100% - 48px));margin:0;background:color-mix(in srgb,var(--er-surface-1) 94%,transparent);backdrop-filter:blur(12px);box-shadow:var(--er-shadow-float);max-height:min(34vh,300px)}
.er-reader.is-immersive .er-mode-dock.is-typing,
.er-reader.is-immersive .er-mode-dock.is-read-aloud{position:relative;left:auto;bottom:auto;transform:none;z-index:auto;flex:none;margin:8px auto 10px;box-shadow:var(--er-shadow-card)}
.er-type-panel{display:flex;flex-direction:column;gap:10px}
.er-reader.is-immersive .er-mode-dock.is-typing{width:min(600px,calc(100% - 48px));max-height:min(30dvh,220px)}
.er-reader.is-immersive .er-mode-dock.is-read-aloud{width:min(720px,calc(100% - 48px));max-height:min(52dvh,480px)}
.er-mode-dock.is-read-aloud{max-height:min(70dvh,640px)}

.er-speak-status{display:flex;align-items:center;gap:9px;min-height:26px;font-size:12px;color:var(--er-ink-2)}
.er-speak-recording-dots{display:inline-flex;align-items:center;gap:4px}
.er-speak-recording-dots span{width:6px;height:6px;border-radius:50%;background:var(--er-err);animation:er-record-pulse 1.2s infinite}
.er-speak-recording-dots span:nth-child(2){animation-delay:.2s}
.er-speak-recording-dots span:nth-child(3){animation-delay:.4s}
.er-speak-clock{font-variant-numeric:tabular-nums;color:var(--er-ink-3)}
.er-speak-spinner{width:13px;height:13px;border:2px solid var(--er-line);border-top-color:var(--er-accent);border-radius:50%;animation:er-speak-spin .7s linear infinite}
.er-speak-done-mark{color:var(--er-ok-ink);font-size:15px;line-height:1}
.er-speak-status.is-done{color:var(--er-ok-ink)}
@keyframes er-record-pulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
@keyframes er-speak-spin{to{transform:rotate(360deg)}}
.er-speech-feedback{display:flex;flex-direction:column;gap:10px;margin-top:4px;padding-top:12px;border-top:1px solid var(--er-line)}
.er-feedback-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.er-feedback-title{font-size:13px;font-weight:600;color:var(--er-ink-1)}
.er-feedback-pace{font-size:12px;color:var(--er-ink-3);font-variant-numeric:tabular-nums}
.er-feedback-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.er-feedback-item{display:flex;flex-direction:column;gap:3px;min-width:0;padding:8px 10px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);border-left:2px solid var(--er-line)}
.er-feedback-item.is-good{border-left-color:var(--er-ok-ink)}
.er-feedback-item.is-warn{border-left-color:var(--er-accent)}
.er-feedback-item.is-bad{border-left-color:var(--er-err)}
.er-feedback-label{font-size:11px;color:var(--er-ink-3)}
.er-feedback-summary{font-size:12px;line-height:1.4;color:var(--er-ink-2)}
.er-feedback-suggestions{display:flex;flex-direction:column;gap:5px;margin:0;padding-left:18px;font-size:12px;line-height:1.5;color:var(--er-ink-2)}
.er-standard-pronunciation{align-self:flex-start}
@container erpage (max-width: 600px){.er-feedback-grid{grid-template-columns:1fr}.er-feedback-item{min-height:44px}}
@media (prefers-reduced-motion: reduce){.er-speak-recording-dots span,.er-speak-spinner{animation:none}}
/* Turning the page lives in every practice bar, not only in the player. */
.er-practice-nav{display:inline-flex;align-items:center;gap:2px;flex:none}
.er-practice-nav-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid transparent;border-radius:50%;background:transparent;color:var(--er-ink-2);cursor:pointer}
.er-practice-nav-btn:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-practice-nav-btn:focus-visible{outline:var(--er-focus);outline-offset:1px}
/* The dictation needs one row of controls under the field, not three stacked
   bands: the field and its buttons ride together. */
.er-type-bar-row{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
.er-type-bar-row .er-input-row{padding:0}
.er-type-panel .er-type-actions{flex-wrap:nowrap;gap:6px}
.er-type-actions{display:flex;align-items:center;justify-content:center;gap:8px}
.er-type-action{gap:6px;color:var(--er-ink-2)}
.er-type-action:hover{color:var(--er-ink-1)}

.er-type-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:20px}
.er-type-metrics{display:flex;align-items:center;gap:14px}
.er-type-hint{font-size:12px;color:var(--er-ink-3)}
.er-type-panel-meta{font-size:12px;color:var(--er-ink-3);font-variant-numeric:tabular-nums}
.er-type-panel-tail{display:flex;align-items:center;gap:10px}
.er-play-status{display:none}
/* Inside a practice bar the playback state is a row of that bar, not a layer
   over the page: a floating pill is a pill the learner cannot click through
   (it sat on the word input), and a phone has no player bar under it to give
   the pause control a home. */
.er-mode-dock .er-play-status{display:flex;align-items:center;gap:8px;position:static;align-self:stretch;justify-content:center;margin:0 0 2px;padding:4px 6px 4px 10px;border-radius:999px;background:var(--er-surface-2);border:1px solid var(--er-line);font-size:12px;color:var(--er-ink-2)}
.er-reader.is-immersive .er-mode-dock .er-play-status{position:static;left:auto;bottom:auto;transform:none;z-index:auto;box-shadow:none;backdrop-filter:none}
.er-page.is-reading .er-body{padding:0;overflow:hidden}
.er-page.is-reading .er-reader{height:100%}
.er-reader.is-immersive .er-play-status{display:flex;align-items:center;gap:8px;position:absolute;left:50%;bottom:62px;transform:translateX(-50%);z-index:9;padding:4px 6px 4px 10px;border-radius:999px;background:color-mix(in srgb,var(--er-surface-1) 92%,transparent);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card);backdrop-filter:blur(12px);font-size:12px;color:var(--er-ink-2)}
.er-play-status-dot{width:7px;height:7px;border-radius:50%;background:var(--er-accent);animation:er-play-pulse 1.6s ease-in-out infinite}
.er-play-status-dot.is-paused{animation:none;opacity:.45}
.er-play-status-count{color:var(--er-ink-3);font-variant-numeric:tabular-nums}
/* The accent switch: two chips in one track, the selected one filled. */
.er-accent{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:999px;background:var(--er-surface-3);flex:none}
.er-accent-item{appearance:none;border:0;border-radius:999px;padding:3px 8px;background:transparent;color:var(--er-ink-2);font:inherit;font-size:11px;line-height:1.2;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-accent-item:hover{color:var(--er-ink-1)}
.er-accent-item[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink);font-weight:500}
.er-accent-item:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-play-note{margin:2px 0 0;font-size:11.5px;line-height:1.5;color:var(--er-ink-3);max-width:420px}
.er-play-status-pause{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;margin-left:2px;border:0;border-radius:50%;background:var(--er-accent-soft);color:var(--er-accent);cursor:pointer}
.er-play-status-pause:hover{background:var(--er-hover)}
.er-play-status-pause:focus-visible{outline:var(--er-focus);outline-offset:1px}
@keyframes er-play-pulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.er-play-status-dot{animation:none}}
.er-reader.is-immersive .er-mode-dock:empty{display:none}
.er-typography-pop{z-index:1300}
.er-typography-pop .er-play-panel{max-height:min(70vh,360px);padding:12px 14px}
.er-typography-pop .er-setting-row{min-height:36px}
.er-typography-pop input[type="range"]{accent-color:var(--er-accent);min-width:0;flex:1}
.er-reader.is-immersive .er-paragraph-row{position:relative}
.er-reader.is-immersive .er-paragraph-main{padding-right:36px}
.er-reader.is-immersive .er-paragraph-actions{position:absolute;right:0;top:0;flex-direction:column;align-items:flex-end;gap:4px;z-index:4}

/* Scrollbars never become a second strip of chrome. Scrolling still works
   with the wheel, a trackpad, touch and the keyboard; only the bar is hidden. */
.er-page *,.er-wordcard *,.er-modal *,.er-play-pop *,.er-modes-panel *,.er-note-editor *{scrollbar-width:none}
.er-page *::-webkit-scrollbar,.er-wordcard *::-webkit-scrollbar,.er-modal *::-webkit-scrollbar,.er-play-pop *::-webkit-scrollbar,.er-modes-panel *::-webkit-scrollbar,.er-note-editor *::-webkit-scrollbar{display:none}

.er-modes-toggle{display:none}
.er-modes-toggle-glyph{font-size:12px;font-weight:600;letter-spacing:.02em}

/* The mode panels (typing and read-aloud) dock below the reading frame, above
   the player bar: a control that lives at the end of the paper card is a
   control the learner has to scroll the whole page to reach. The dock never
   scrolls with the text, and it disappears when the mode has nothing to show. */
.er-mode-dock{flex:none;display:flex;flex-direction:column;gap:8px;width:100%;max-width:var(--er-frame,none);max-height:min(34vh,320px);overflow:auto;box-sizing:border-box;margin:12px auto 0;padding:12px 14px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card)}
/* The practice bars are one row of controls, not a panel: the mode owns a bar,
   and the review of a read-aloud is a panel of its own. */
.er-mode-dock.is-typing,.er-mode-dock.is-read-aloud{padding:8px 12px}
.er-type-bar{display:flex;flex-direction:row;align-items:center;gap:12px;flex-wrap:nowrap}
.er-type-bar-status{display:flex;align-items:center;gap:10px;min-width:0;flex:none}
.er-type-bar .er-input-row{flex:1 1 auto;min-width:0;justify-content:center;padding:0}
.er-type-bar .er-type-actions{flex:none;gap:6px;flex-wrap:nowrap}
/* Icon buttons in the practice bars wear the same round shape as the player's:
   a bar of square chips reads as a form, a row of circles reads as controls. */
.er-type-bar .er-btn-icon,.er-speak-bar .er-btn-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid transparent;border-radius:50%;background:transparent;color:var(--er-ink-2)}
.er-type-bar .er-btn-icon:hover,.er-speak-bar .er-btn-icon:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-type-bar .er-btn-icon[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink)}
.er-type-bar .er-btn-icon:focus-visible,.er-speak-bar .er-btn-icon:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-speak-bar{display:flex;flex-direction:row;align-items:center;gap:14px;justify-content:space-between}
.er-speak-line{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 auto;font-size:12px;color:var(--er-ink-2)}
.er-speak-line .er-speak-status-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-speak-actions{display:flex;align-items:center;gap:6px;flex:none}
.er-speak-bar .er-btn-primary{padding:8px 14px}
.er-paragraph-action.is-analysis{color:var(--er-accent)}
.er-paragraph-action.is-mode{color:var(--er-accent-ink);background:var(--er-accent-soft)}
.er-analysis{display:flex;flex-direction:column;gap:14px}
.er-analysis-heard{display:flex;flex-direction:column;gap:6px}
.er-analysis-text{margin:0;padding:10px 12px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);border:1px solid var(--er-line);font-size:13px;line-height:1.6;color:var(--er-ink-1);white-space:pre-wrap}
.er-mode-dock:empty{display:none}
.er-mode-dock .er-panel{gap:8px}
.er-mode-dock .er-type-panel{position:static;padding:0;border-top:0;background:transparent;z-index:auto}
.er-mode-dock .er-input-row{padding:0}
.er-mode-dock .er-controls{flex-wrap:wrap}
.er-mode-dock .er-transcript{min-height:34px}
/* The player uses round buttons, like the reference app. */
.er-read-foot .er-btn-icon,.er-round-icon{display:inline-flex;font:inherit;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border-radius:50%;border:1px solid transparent;background:transparent;color:var(--er-ink-2)}
.er-read-foot .er-btn-icon:hover,.er-round-icon:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-round-icon[aria-pressed="true"]{background:var(--er-accent);color:var(--er-on-accent)}
.er-round-icon[aria-pressed="true"]:hover{background:var(--er-accent);filter:brightness(.94);color:var(--er-on-accent)}
.er-read-foot .er-btn-primary{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 16px 8px 13px}
.er-read-position{font-size:12px;color:var(--er-ink-3);margin-left:8px}
/* The playback options. The panel is rendered into the document body and
   placed by the script, the way the note editor and the modes panel are: the
   reading column scrolls behind it, so a panel anchored to the button would be
   cut off by the very scroll container it sits in. */
.er-play-anchor{position:relative;display:inline-flex;align-items:center;gap:6px;flex:none}
/* The trigger keeps its round shape until it has something to say: the badge
   widens the disc into a pill. */
.er-read-foot .er-play-anchor .er-round-icon,
.er-read-foot .er-play-anchor .er-btn-icon{width:auto;min-width:32px;height:32px;padding:0 8px;gap:4px;border-radius:999px}
.er-play-pop{position:fixed;z-index:1200;box-sizing:border-box;width:min(300px,calc(100vw - 32px));font-family:var(--dsw-font,inherit);font-size:13px;animation:er-play-panel-in var(--er-dur-pop) var(--er-ease)}
/* The little foot that points at the button the panel belongs to. It sits on
   the wrapper, not on the panel: the panel scrolls, and a scroll container
   clips its own overflow. */
.er-play-pop::after{content:'';position:absolute;bottom:-5px;left:var(--er-play-arrow,24px);width:10px;height:10px;transform:rotate(45deg);background:var(--er-overlay);border-right:1px solid var(--er-line);border-bottom:1px solid var(--er-line);border-radius:0 0 3px 0}
.er-play-panel{position:relative;box-sizing:border-box;width:100%;max-height:min(70vh,420px);overflow:auto;padding:14px 16px 12px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);color:var(--er-ink-1)}
/* The panel fades in on its own: the script places it with an inline
   transform, so the entrance must not move the panel itself. */
@keyframes er-play-panel-in{from{opacity:0}to{opacity:1}}
/* The head: the panel's own name, and the way out of it. */
.er-play-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}
.er-play-title{flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--er-ink-1)}
.er-play-panel-head button{appearance:none;border:0;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px 6px;border-radius:var(--dsw-radius-xs);font:inherit;font-size:13px;line-height:1;display:inline-flex;align-items:center}
.er-play-panel-head button:hover{background:var(--er-hover);color:var(--er-ink-1)}
/* A group caption: the name of the group on the left, a quiet note on the
   right. */
.er-play-caption{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px}
.er-play-caption-label{font-size:12px;color:var(--er-ink-2)}
.er-play-caption-note{font-size:11px;color:var(--er-ink-3);white-space:nowrap}
/* The range: three choices, each one third of the width. The control sits on
   a line of its own, so it can never crowd the caption out. */
.er-play-segment{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-3);border:1px solid var(--er-line)}
.er-play-segment-item{appearance:none;border:none;background:transparent;color:var(--er-ink-2);font:inherit;font-size:12px;line-height:1.2;padding:6px 4px;border-radius:calc(var(--dsw-radius-sm) - 2px);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-play-segment-item:hover{background:var(--er-hover)}
.er-play-segment-item[aria-pressed="true"]{background:var(--er-accent);color:var(--er-on-accent);font-weight:500}
.er-play-segment-item[aria-pressed="true"]:hover{background:var(--er-accent);filter:brightness(.94)}
/* The rows of the settings: a fixed label column, so every control lines up on
   the right edge whatever its own width. */
.er-play-rows{display:flex;flex-direction:column;margin-top:12px}
.er-play-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:30px}
.er-play-label{flex:none;width:84px;font-size:13px;color:var(--er-ink-2)}
.er-play-row.is-disabled .er-play-label{color:var(--er-ink-3)}
/* The selects are the selects of the toolbar, a size smaller: the panel is
   narrow and the two of them share its rows. */
.er-play-select{appearance:none;-webkit-appearance:none;flex:none;padding:5px 24px 5px 9px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background-color:var(--er-surface-3);box-shadow:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 12px) 52%,calc(100% - 7px) 52%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;color:var(--er-ink-1);font:inherit;font-size:12px;width:124px;text-overflow:ellipsis;cursor:pointer;transition:border-color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
.er-play-select:hover{border-color:var(--er-line-strong);background-color:var(--er-hover)}
.er-play-select:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-play-select:disabled{opacity:.45;cursor:default}
.er-play-select:disabled:hover{border-color:var(--er-line);background-color:var(--er-surface-1)}
.er-play-select option{background:var(--er-surface-1);color:var(--er-ink-1)}
/* The one line that says what the settings mean. */
.er-play-hint{margin-top:12px;padding-top:10px;border-top:1px solid var(--er-line);font-size:12px;line-height:1.45;color:var(--er-ink-3)}
/* The badge sits inside the trigger, next to the glyph: it says what the
   playback is doing without opening anything. */
.er-play-badge{flex:none;font-size:11px;line-height:1;padding:2px 6px;border-radius:999px;background:var(--er-surface-2);color:var(--er-ink-2);white-space:nowrap}
.er-word.is-hard{background:var(--er-accent-soft);border-radius:var(--dsw-radius-xs);padding:1px 2px}
.er-hard-wrap{display:inline-flex;flex-direction:column;align-items:center;vertical-align:top}
.er-hard-gloss{margin-top:2px;max-width:180px;font-size:12px;line-height:1.35;color:var(--er-ink-3);text-align:center}
.er-cloze-blank{display:inline-block;min-width:48px;border-bottom:1px dashed var(--er-ink-3);color:transparent}


/* The column width follows the setting; the reading area never gets wider
   than the window. */
/* The paper is the frame, not a sheet that scrolls: it fills the reading area
   and the text scrolls inside it, so the page edges never move under the eye. */
.er-reading-page{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;box-sizing:border-box;max-width:calc(var(--er-column-width,68ch) + 75px);margin:0 auto;width:100%}
.er-reading-scroll{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;overflow:auto;overscroll-behavior:contain}
/* When even the smallest page is taller than the paper the text scrolls, and
   the line at the bottom edge fades out instead of being cut through the
   middle of its letters. */
.er-reading-scroll.is-clipped{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - var(--er-clip-fade,16px)),transparent 100%);mask-image:linear-gradient(to bottom,#000 calc(100% - var(--er-clip-fade,16px)),transparent 100%)}
/* The brass rail: the reader's one signature device. It runs down the left
   edge of the page and fills as the book is read. */
.er-reading-page::before{content:'';position:absolute;left:0;top:16px;bottom:16px;width:2px;border-radius:999px;background:linear-gradient(to bottom,var(--er-accent) 0 var(--er-progress,0%),color-mix(in srgb,var(--er-accent) 16%,transparent) var(--er-progress,0%) 100%);opacity:.85}
/* The reading surface leans on size and colour, not on boxes: the paragraph
   being read is large and dark, the ones around it are smaller and quiet. */
.er-page-paragraph{margin:0}
/* The context paragraphs follow the size the learner picked, a little smaller. */
.er-page-paragraph.is-context{font-size:calc(var(--er-text-size, 18px) * .82);line-height:var(--er-reading-line-height,1.85);color:color-mix(in oklab,var(--er-paper-ink) 78%,transparent)}
.er-page-paragraph.is-active{font-size:var(--er-text-size, 18px);line-height:var(--er-reading-line-height,1.95);color:var(--er-paper-ink)}
.er-sentence.is-active-sentence{background:var(--er-accent-soft);border-radius:var(--dsw-radius-xs);box-shadow:0 0 0 3px var(--er-accent-soft)}

/* Every paragraph carries a row of buttons in its right gutter: take a note,
   translate it, read it aloud. The text keeps its own column; the buttons only
   take the gutter next to it.
   The buttons lie in one row, not in a column: a column of three is taller
   than a single line of text, so it would stretch every short paragraph and
   leave a hole under it. A row is as tall as one line, so the paragraph keeps
   the height of its own text. */
.er-paragraph-row{display:flex;align-items:flex-start;gap:12px}
.er-paragraph-main{flex:1;min-width:0}
.er-paragraph-actions{flex:none;display:flex;flex-direction:row;align-items:center;gap:4px}
.er-paragraph-action{position:relative;flex:none;display:inline-flex;font:inherit;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--er-ink-3);cursor:pointer;transition:opacity var(--er-dur-hover) ease,color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
/* The buttons wait for the pointer: they are hidden until the paragraph is
   hovered (or the button itself is focused). A touch screen has no hover,
   so there they stay where they are. */
@media (hover: hover){
  /* A hidden button must also be un-hittable: the gutter of a short paragraph
     is taller than its row, so its own invisible buttons of the next paragraph
     used to sit on top of the ones the learner was reaching for and stole the
     hover. */
  .er-paragraph-action{opacity:0;pointer-events:none}
  .er-paragraph-actions{pointer-events:none}
  .er-paragraph-row.is-tools .er-paragraph-action,.er-paragraph-action:focus-visible{opacity:1;pointer-events:auto}
  .er-paragraph-row.is-tools .er-paragraph-actions{pointer-events:auto}
}
.er-paragraph-action:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-paragraph-action:focus-visible{outline:var(--er-focus);outline-offset:1px}
/* The buttons that already did something keep their mark: a note, a
   translation, a paragraph being read. */
.er-paragraph-action.is-noted{opacity:1;color:var(--er-warn-ink)}
.er-paragraph-action.is-translated{opacity:1;color:var(--er-ok-ink)}
\.er-paragraph-action\.is-speaking\{opacity:1;color:var\(--er-accent-ink\)\}
.er-paragraph-note-count{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--er-warn-fill);color:var(--er-on-semantic);font-size:12px;line-height:16px;text-align:center}

/* The note editor floats next to the paragraph it belongs to. */
.er-note-editor{position:fixed;z-index:1200;box-sizing:border-box;max-height:min(62vh,460px);overflow:auto;padding:12px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);font-size:13px;color:var(--er-ink-1)}
.er-note-editor-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.er-note-editor-title{flex:1;min-width:0;font-size:13px;font-weight:500;color:var(--er-ink-1)}
.er-note-editor-close{appearance:none;border:0;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);font-size:13px;line-height:1;display:inline-flex;align-items:center}
.er-note-editor-close:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-note-editor-quote{font-size:12px;line-height:1.55;color:var(--er-ink-3);font-style:italic;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.er-note-editor-input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line-strong);background:var(--er-surface-3);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.er-note-editor-input:focus{outline:none;border-color:var(--er-accent)}
.er-note-editor-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-note-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.er-note-editor-list{display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--er-line)}
.er-note-editor-item{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:var(--dsw-radius-xs);background:var(--er-surface-3)}
.er-note-editor-text{flex:1;min-width:0;font-size:12px;line-height:1.55;color:var(--er-ink-2);white-space:pre-wrap;word-break:break-word}
.er-note-editor-delete{appearance:none;border:0;font:inherit;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);display:inline-flex;flex:none;align-items:center}
.er-note-editor-delete:hover{background:var(--er-hover);color:var(--er-err-ink)}
.er-note-editor-error{margin-top:8px;font-size:12px;color:var(--er-err-ink)}


/* The learning-modes panel floats above the page: it is anchored to the tool
   that opened it and positioned in viewport coordinates, so the sticky mode
   row can never paint over it and it can never be cut off by a scroll
   container. */
.er-mode-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid var(--er-line)}
.er-mode-actions .er-mode{justify-content:center;min-width:0;padding:7px 6px}
.er-modes-panel{position:fixed;z-index:1200;box-sizing:border-box;max-height:min(74vh,600px);overflow:auto;padding:12px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float)}
.er-mode-row{display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer}
.er-mode-row+.er-mode-row{border-top:1px solid var(--er-line)}
/* The practice unit is a choice, not a switch: three chips on the right of the
   row, so the panel reads "what, how much, which aids" from top to bottom. */
.er-mode-row.is-choice{align-items:center;gap:10px;flex-wrap:wrap;cursor:default}
.er-mode-row.is-choice .er-mode-row-label{white-space:nowrap}
.er-mode-row.is-choice .er-scope{margin-left:auto}
.er-mode-row.is-choice+.er-mode-row{border-top:1px solid var(--er-line)}
/* Reset and All settings sit side by side in the same footer row. */
.er-typography-pop .er-setting-row:last-child{justify-content:space-between;gap:8px}
.er-setting-reset{flex:none;padding:0 10px;height:28px;font-size:12px}

.er-mode-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.er-mode-row-label{font-size:13px;color:var(--er-ink-1)}
.er-mode-row-hint{font-size:12px;line-height:1.4;color:var(--er-ink-3)}
.er-mode-row input{accent-color:var(--er-accent)}
.er-toc{display:flex;flex-direction:column;gap:2px;max-height:56vh;overflow:auto}
.er-toc-row{appearance:none;border:0;background:transparent;color:var(--er-ink-1);font:inherit;font-size:13px;text-align:left;display:flex;align-items:baseline;gap:12px;padding:8px;border-radius:var(--dsw-radius-xs);cursor:pointer}
.er-toc-row:hover{background:var(--er-hover)}
\.er-toc-row\.is-current\{color:var\(--er-accent-ink\);font-weight:600\}
.er-toc-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-toc-meta{flex:none;font-size:12px;color:var(--er-ink-3)}
.er-paragraph-body{margin:0}
.er-sentence{border-radius:var(--dsw-radius-xs);transition:filter var(--er-dur-state) var(--er-ease),background-color var(--er-dur-state) var(--er-ease);background:transparent;border:0;padding:0}
.er-sentence.is-blurred{cursor:pointer}
.er-sentence.is-revealed{filter:none}
.er-word.is-blurred-word{filter:blur(3.6px);transition:filter var(--er-dur-state) var(--er-ease)}
.er-sentence.is-blurred:hover .er-word.is-blurred-word{filter:blur(1.6px)}
.er-translation{margin-top:8px;font-size:13px;line-height:1.7;color:var(--er-ink-2)}
.er-word.is-known{color:var(--er-ok-ink)}
.er-word.is-learning{color:var(--er-warn-ink)}


.er-switch{position:relative;flex:none;width:34px;height:20px;border-radius:999px;border:1px solid var(--er-line-strong);background:var(--er-surface-3);cursor:pointer;padding:0}
.er-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--er-ink-2);transition:transform var(--er-dur-state) var(--er-ease),background-color var(--er-dur-state) var(--er-ease)}
.er-switch[aria-checked="true"]{background:var(--er-accent);border-color:var(--er-accent)}
.er-switch[aria-checked="true"]::after{transform:translateX(14px);background:var(--er-on-accent)}


.er-translate-toggle{margin-left:8px}
.er-toc-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.er-toc-hint{font-size:12px;color:var(--er-ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}


.er-source{display:flex;flex-direction:column;gap:12px}
.er-source-search{display:flex;gap:8px}
.er-source-search input{flex:1;min-width:0;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-3);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:13px}
.er-source-search input:focus{outline:none;border-color:var(--er-accent)}
.er-source-search input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-source-note{font-size:12px;color:var(--er-ink-3);line-height:1.6}
.er-source-hint{font-size:12px;color:var(--er-ink-3)}
.er-source-list{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto}
.er-source-row{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-sm);background:var(--er-surface-1);box-shadow:var(--er-shadow-card)}
.er-source-cover{width:44px;height:62px;flex:none;object-fit:cover;border-radius:var(--dsw-radius-xs);background:var(--er-surface-3)}
.er-source-main{flex:1;min-width:0}
.er-source-title{font-size:14px;font-weight:600;color:var(--er-ink-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-source-author{font-size:12px;color:var(--er-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-source-subjects{font-size:12px;color:var(--er-ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}


.er-page-note{margin-top:16px;padding-top:12px;border-top:1px solid var(--er-line);font-size:12px;color:var(--er-ink-3);letter-spacing:.01em}
.er-page-note.is-first{margin-top:0;margin-bottom:16px;padding:0 0 12px;border-top:0;border-bottom:1px solid var(--er-line)}
.er-page-note-keys{margin-left:12px;padding-left:12px;border-left:1px solid var(--er-line);color:var(--er-ink-3);opacity:.8}


/* Feedback while the model draws a cover. */
.er-notice{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:8px 16px;border-radius:999px;font-size:13px;background:var(--er-surface-2);border:1px solid var(--er-line);color:var(--er-ink-2)}
.er-notice.is-ok{border-color:color-mix(in srgb,var(--er-ok) 45%,transparent);color:var(--er-ok-ink)}
.er-notice.is-error{border-color:color-mix(in srgb,var(--er-err) 45%,transparent);color:var(--er-err-ink)}
.er-cover-busy{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;text-align:center;padding:12px}
.er-cover-spinner{width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:er-spin .8s linear infinite;flex:none}
@keyframes er-spin{to{transform:rotate(360deg)}}


/* =============================================================================
   状态组件：加载 / 空 / 失败 / 部分失败 / 无权限
   -----------------------------------------------------------------------------
   每个数据区域都有这五种状态。加载态的形状必须和最终布局对得上，
   否则内容落位时页面会跳一下；失败必须说清"发生了什么 + 下一步"，
   不能只丢一个错误码。状态语义不可改，也绝不借用强调色。
   ========================================================================== */

/* 状态块：原因 + 下一步 + 一个动作。 */
.er-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px 24px;text-align:center;color:var(--er-ink-2)}
.er-state-icon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex:none;border-radius:var(--er-r-pill);background:var(--er-surface-3);color:var(--er-ink-2)}
.er-state-title{font-size:16px;font-weight:600;line-height:1.35;color:var(--er-ink-1)}
.er-state-hint{font-size:13px;line-height:1.6;max-width:42ch;color:var(--er-ink-2)}
.er-state-action{margin-top:4px}
/* 失败与受限各有自己的语气，但都不靠大面积红色：工具界面里红色一大片
   看起来像出故障，而不是像状态。 */
.er-state.is-error .er-state-icon{background:var(--er-err-soft);color:var(--er-err-ink)}
.er-state.is-restricted .er-state-icon{background:var(--er-warn-soft);color:var(--er-warn-ink)}

/* 骨架：形状对齐最终布局。只有一处微弱的呼吸，动效归零由全局
   prefers-reduced-motion 兜底。 */
.er-skeleton{display:flex;flex-direction:column;gap:14px;width:100%;max-width:var(--er-column-width,68ch);margin:0 auto;padding:8px 0}
.er-skeleton-line{height:12px;border-radius:var(--er-r-ctl);background:var(--er-surface-3);width:var(--er-skeleton-width,100%);animation:er-skeleton-pulse 1.6s ease-in-out infinite}
.er-skeleton-block{height:160px;width:120px;border-radius:var(--er-r-card);background:var(--er-surface-3);animation:er-skeleton-pulse 1.6s ease-in-out infinite}
@keyframes er-skeleton-pulse{0%,100%{opacity:1}50%{opacity:.55}}

/* 部分失败：一块面板，逐条说清哪几个成了、哪几个没成。 */
.er-partial{display:flex;flex-direction:column;gap:10px;margin:0 0 16px;padding:14px 16px;border-radius:var(--er-r-card);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card)}
.er-partial-title{font-size:14px;font-weight:600;color:var(--er-ink-1)}
.er-partial-list{display:flex;flex-direction:column;gap:6px}
.er-partial-item{display:flex;align-items:baseline;gap:8px;font-size:12px;line-height:1.5;color:var(--er-ink-2)}
.er-partial-item::before{content:'';width:6px;height:6px;flex:none;align-self:center;border-radius:var(--er-r-pill);background:var(--er-ink-3)}
.er-partial-item.is-ok::before{background:var(--er-ok)}
.er-partial-item.is-fail::before{background:var(--er-err)}
.er-partial-item.is-fail{color:var(--er-err-ink)}
.er-partial-hint{font-size:12px;color:var(--er-ink-3)}

/* 三个面板各自的失败与加载态。它们复用上面那套状态块，
   只是各自的位置不同。 */
.er-wordlist-loading{padding:24px 16px}
.er-notes-error{padding:24px 8px}
.er-frequency-error{padding:24px 8px}

/* 跟读面板：指标条外面那层壳。 */
.er-typing-view{display:flex;flex-direction:column;gap:8px}

.er-crash{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;text-align:center;padding:48px}
.er-crash-title{font-size:16px;font-weight:600;color:var(--er-ink-1)}
.er-crash-hint{font-size:13px;color:var(--er-ink-2);max-width:360px;line-height:1.7}


/* The build stamp: how the reader tells a fresh window from a stale one. */
.er-book-menu-build{padding:8px 12px 4px;margin-top:4px;border-top:1px solid var(--er-line);font-size:12px;color:var(--er-ink-3);opacity:.7;font-variant-numeric:tabular-nums}


.er-exit-button{width:28px;height:28px;flex:none}


.er-crash-detail{margin-top:8px;max-width:520px;padding:8px 12px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--er-ink-1);word-break:break-word}
.er-crash-frame{max-width:520px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--er-ink-3);word-break:break-all}
.er-crash-actions{display:flex;gap:8px;margin-top:12px}


/* The reader's notes. */
.er-notes{display:flex;flex-direction:column;gap:16px;max-height:60vh;overflow:auto}
.er-note-new{display:flex;flex-direction:column;gap:8px}
.er-note-quote{font-size:12px;line-height:1.6;color:var(--er-ink-3);font-style:italic}
.er-note-input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-3);box-shadow:none;color:var(--er-ink-1);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.er-note-input:focus{outline:none;border-color:var(--er-accent)}
.er-note-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-note-actions{display:flex;justify-content:flex-end}
.er-notes-list{display:flex;flex-direction:column;gap:8px}
.er-note{display:flex;flex-direction:column;gap:4px;padding:12px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-2);box-shadow:var(--er-shadow-card)}
.er-note-text{font-size:13px;line-height:1.65;color:var(--er-ink-1);white-space:pre-wrap}
.er-note-meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--er-ink-3)}
\.er-note-link\{appearance:none;border:0;background:transparent;color:var\(--er-accent-ink\);font:inherit;font-size:12px;cursor:pointer;padding:0}
.er-note-link:hover{text-decoration:underline}
.er-note-delete{appearance:none;border:0;font:inherit;background:transparent;color:var(--er-ink-3);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);display:inline-flex;align-items:center}
.er-note-delete:hover{background:var(--er-hover);color:var(--er-err-ink)}
.er-notes-empty{padding:24px 8px;text-align:center;font-size:13px;color:var(--er-ink-3)}
.er-notes-button{position:relative;width:28px;height:28px;flex:none}
.er-notes-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--er-warn-fill);color:var(--er-on-semantic);font-size:12px;line-height:16px;text-align:center}


/* The import card: a toast at the bottom of the panel that says what the
   import is doing. It floats over the shelf, so the body gets extra room
   while it is up — the card must never hide a book. */
.er-page.is-importing .er-body{padding-bottom:112px}
.er-import{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:1300;box-sizing:border-box;display:flex;align-items:flex-start;gap:12px;width:min(420px,calc(100% - 32px));padding:12px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);pointer-events:none}
.er-import-spinner{width:16px;height:16px;margin-top:2px;flex:none;border-radius:50%;border:2px solid var(--er-accent);border-top-color:transparent;animation:er-spin .8s linear infinite}
.er-import-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.er-import-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.er-import-label{font-size:13px;font-weight:600;color:var(--er-ink-1)}
.er-import-count{font-size:12px;color:var(--er-ink-3);font-variant-numeric:tabular-nums}
.er-import-file{font-size:12px;color:var(--er-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-import-track{height:4px;border-radius:999px;background:var(--er-surface-3);overflow:hidden}
.er-import-bar{display:block;height:100%;border-radius:999px;background:var(--er-accent);transition:width var(--er-dur-state) var(--er-ease)}
.er-import-stage{font-size:12px;color:var(--er-ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* The source file preview: the original book, seen in the panel. */
.er-source{display:flex;flex-direction:column;gap:12px;min-height:0}
.er-source-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.er-source-title{flex:1;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-source-meta{font-size:12px;color:var(--er-ink-3);font-variant-numeric:tabular-nums;white-space:nowrap}
.er-source-body{flex:1;min-height:240px;max-height:62vh;overflow:auto;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-3)}
.er-source-text{margin:0;padding:16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word;color:var(--er-ink-1)}
.er-source-frame{display:block;width:100%;height:100%;min-height:240px;border:0;background:#fff}
.er-source-loading,.er-source-error{display:flex;align-items:center;justify-content:center;gap:8px;padding:32px 16px;font-size:13px;color:var(--er-ink-3);text-align:center}
.er-source-error{color:var(--er-err-ink)}
.er-source-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.er-source-picker{flex:1;min-width:120px;padding:6px 8px;border-radius:var(--dsw-radius-xs);border:1px solid var(--er-line);background:var(--er-surface-3);color:var(--er-ink-1);font:inherit;font-size:13px}
.er-source-pages{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px}
.er-source-page{display:block;max-width:100%;height:auto;border-radius:var(--dsw-radius-xs);box-shadow:var(--er-shadow-float);background:#fff}
.er-source-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}


/* =============================================================================
   移动端与窄面板（phone ≤600px / tablet 601–900px / desktop ≥901px）
   -----------------------------------------------------------------------------
   面板宽度不是窗口宽度：桌面应用里侧栏一开，面板就只剩几百像素。所以布局
   一律问"面板有多宽"（@container erpage），只有渲染到 body 的浮层（词卡、
   学习模式、笔记、播放设置）才问视口（@media）。两套查询不互相覆盖。

   移动端不引入第二套视觉语言：同一个黄铜、同一张纸、同一套圆角；改的只有
   密度、触控尺寸和浮层的形态。
   ========================================================================== */

/* ---- 触屏（平板、触摸笔记本、手机）：手指没有 hover，也没有 1px 的准头。
   所有可点的东西先抬到 40，手机档在下面的容器查询里再抬到 44。
   开关的轨道只有 26px 高，命中区由按钮自己的 44px 盒子和伪元素轨道分开承担：
   看得见的是轨道，点得到的是 44 的盒子。 ---- */
@media (pointer: coarse){
  .er-round-button{width:44px;height:44px}
  .er-segmented-item{min-height:44px}
  .er-library-search input{min-height:44px}
  .er-view-switch-item{width:44px;height:44px;justify-content:center;padding:0}
  .er-cover-listen{width:44px;height:44px}
  .er-cover-menu{width:44px;height:44px}
  .er-cover-menu svg{width:56%;height:56%}
  /* 列表视图的小封面只有 46px 宽，两个圆钮各占 17px；列表行本身已经带
     朗读/打开/删除三个按钮，所以圆钮让位，缩略图整体就是一个打开目标。 */
  .er-book-cover-small .er-cover-action{display:none}
  .er-book-menu-item{min-height:44px}
  .er-read-chapter{min-height:44px}
  .er-round-icon,.er-read-foot .er-btn-icon{width:44px;height:44px}
  .er-wordlist-button{min-height:44px}
  .er-mode{min-height:44px}
  .er-scope-item{min-height:36px}
  .er-paragraph-actions{display:none}
  .er-paragraph-row.is-active{flex-wrap:wrap}
  .er-paragraph-row.is-active .er-paragraph-main{flex:1 0 100%}
  .er-paragraph-row.is-active .er-paragraph-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:8px}
  .er-paragraph-action{width:44px;height:44px;background:var(--er-surface-1);border:1px solid var(--er-line);border-radius:var(--dsw-radius-sm);color:var(--er-ink-2)}
  .er-read-tool{min-height:64px}
  .er-read-foot .er-btn{min-height:44px}
  .er-read-foot .er-select{min-height:44px}
  .er-play-segment-item{min-height:44px}
  .er-play-select{min-height:44px}
  .er-modal .er-round-button{width:44px;height:44px}
  .er-modal .er-btn{min-height:44px}
  .er-toc-row{min-height:44px}
  .er-note-delete,.er-note-editor-delete{width:44px;height:44px;justify-content:center}
  .er-note-link{min-height:44px;display:inline-flex;align-items:center}
  .er-wordlist-close{width:44px;height:44px}
  .er-wordlist-chip{min-height:44px}
  .er-wordlist-search{min-height:44px}
  .er-wordlist-word{min-height:44px;display:inline-flex;align-items:center}
  .er-wordlist-speak,.er-wordlist-delete{width:44px;height:44px;justify-content:center}
  .er-wordlist-review-button{min-height:44px}
  .er-mm-switch-item{min-height:44px}
  .er-mm .er-btn{min-height:44px}
  .er-pod-btn{min-width:44px;min-height:44px}
  .er-pod-generate{min-height:44px}
  .er-pod-head .er-select,.er-pod-voice-select,.er-pod-rate-select{min-height:44px}
  .er-source-foot .er-btn,.er-source-nav .er-btn{min-height:44px}
  .er-source-picker{min-height:44px}
  .er-type-icon{width:44px;height:44px;justify-content:center}
  .er-switch{position:relative;width:48px;height:44px;border:0;background:transparent}
  .er-switch::before{content:'';position:absolute;left:0;right:0;top:50%;height:26px;margin-top:-13px;border-radius:999px;border:1px solid var(--er-line-strong);background:var(--er-surface-3);transition:background-color var(--er-dur-state) var(--er-ease)}
  .er-switch::after{top:50%;left:3px;margin-top:-10px;width:20px;height:20px}
  .er-switch[aria-checked="true"]{background:transparent}
  .er-switch[aria-checked="true"]::before{background:var(--er-accent);border-color:var(--er-accent)}
  .er-switch[aria-checked="true"]::after{transform:translateX(22px);background:var(--er-on-accent)}
  /* These controls are sized by a more specific rule in the base sheet (the
     action group of the read bar, the anchor of the transport bar), so the
     touch size has to match that specificity to win. */
  .er-read-actions .er-round-icon,
  .er-read-actions .er-wordlist-button{width:44px;height:44px;min-width:44px}
  .er-read-actions .er-wordlist-label{display:none}
  .er-read-actions .er-wordlist-count{margin-left:0}
  .er-read-foot .er-play-anchor .er-round-icon{height:44px;min-width:44px}
  .er-wordcard-icon{width:44px;height:44px;justify-content:center}
  .er-wordcard .er-btn{min-height:44px}
  .er-page .er-pod-talk-input{min-height:44px;font-size:16px}
  .er-page .er-pod-talk-send{min-height:44px;min-width:44px}
  .er-wordlist-chip{min-width:44px}
  .er-page .er-mm-bar .er-btn,.er-page .er-mm .er-btn{min-height:44px}
  .er-page .er-pod-episode-delete{width:44px;height:44px;justify-content:center;flex:none}
  .er-play-panel-head button{min-width:44px;min-height:44px}
  .er-note-editor-close{width:44px;height:44px;justify-content:center}
}

/* ---- 平板：密度略降，纸面仍然占满可用宽度 ---- */
@container erpage (max-width: 900px){
  .er-appbar,.er-body,.er-reader,.er-library,.er-wordlist{--er-touch:40px;--er-gutter:20px;--er-shelf-min:150px}
  .er-body{padding:var(--er-gutter) var(--er-gutter) 40px}
  .er-library-cards{grid-template-columns:repeat(3,1fr)}
  .er-library-card{padding:12px 14px}
  .er-book-grid{grid-template-columns:repeat(auto-fill,minmax(var(--er-shelf-min,150px),1fr))}
}

/* ---- 手机 ---- */
@container erpage (max-width: 600px){
  .er-appbar,.er-body,.er-reader,.er-library,.er-wordlist{--er-touch:44px;--er-gutter:16px;--er-shelf-min:132px}
  .er-body{padding:var(--er-gutter) var(--er-gutter) calc(40px + env(safe-area-inset-bottom))}

  /* 顶部工具条：图标一行，分段 tab 一行占满宽度。三段在 390px 下必须都看得见，
     所以它们不裁切、不隐藏，只换行。 */
  /* One row: two round buttons, the three section tabs and the shelf menu.
     The tabs shrink to their labels instead of wrapping to a second row —
     the row of chrome is the most expensive space on a phone screen. */
  .er-appbar{flex-wrap:nowrap;gap:6px;padding:8px 12px;position:relative}
  .er-appbar-left,.er-appbar-right{min-width:0;gap:4px;flex:none}
  .er-appbar-right{margin-left:0}
  .er-round-button{width:44px;height:44px;flex:none}
  .er-segmented{flex:1 1 auto;min-width:0;margin:0;display:flex;gap:2px;padding:3px}
  .er-segmented-item{flex:1 1 auto;min-width:0;padding:10px 6px;font-size:13px;min-height:44px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .er-book-menu-top{top:calc(100% + 6px);left:12px;right:12px;min-width:0}

  /* 书库：统计压成一行三格；搜索与视图切换一行；书架两列。 */
  .er-library{margin-top:12px;gap:12px}
  .er-library-cards{grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
  .er-library-card{padding:10px 10px}
  .er-library-card-label{font-size:12px;letter-spacing:.02em;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .er-library-card-number{font-size:16px}
  .er-library-card-unit{font-size:12px}
  .er-library-toolbar{gap:8px}
  .er-library-search input{min-height:var(--er-touch);font-size:16px}
  .er-view-switch-item{width:var(--er-touch);height:var(--er-touch);justify-content:center;padding:0}
  .er-book-grid{grid-template-columns:repeat(auto-fill,minmax(var(--er-shelf-min,132px),1fr));gap:16px 12px}
  .er-book-list{gap:10px}
  .er-book{flex-wrap:wrap;gap:12px;padding:12px}
  .er-book-cover-small{width:64px}
  .er-book-main{flex:1 1 calc(100% - 76px)}
  .er-book-actions{flex:1 0 100%;display:grid;grid-template-columns:1fr 1fr auto;gap:8px}
  .er-book-actions .er-btn{min-height:var(--er-touch);justify-content:center}
  .er-book-actions .er-btn-icon{width:var(--er-touch);min-width:var(--er-touch)}
  .er-book-menu{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));top:auto;min-width:0}
  .er-book-menu-item{min-height:48px;font-size:14px}
  .er-book-progress,.er-book-stats,.er-book-meta{font-size:12px}

  /* 导入卡片贴底并让出安全区。 */
  .er-import{left:0;right:0;bottom:0;width:100%;max-width:none;border-radius:var(--dsw-radius-lg) var(--dsw-radius-lg) 0 0;padding:12px 16px calc(12px + env(safe-area-inset-bottom));transform:none}
  .er-page.is-importing .er-body{padding-bottom:180px}

  /* 阅读条：两行。第一行是书名与操作，第二行是章节与位置——位置在手机上
     必须看得见，所以那两条"窄了就先藏"的容器规则在这里让位。 */
  .er-read-bar{padding:0}
  /* Two rows on a phone: the book and its actions, then the place in the
     book. The actions are placed by grid instead of a wrapper row, so the
     title keeps a readable width instead of being squeezed to a few
     characters between two blocks of buttons. */
  .er-read-bar-inner{display:grid;grid-template-columns:var(--er-touch) minmax(0,1fr) var(--er-touch) var(--er-touch);grid-template-areas:"exit title notes words" "place place mind pod";align-items:center;gap:4px 6px;padding:6px 12px;max-width:none;box-sizing:border-box}
  .er-read-head{display:contents}
  .er-exit-button{grid-area:exit;width:var(--er-touch);height:var(--er-touch)}
  .er-read-title{grid-area:title;font-size:15px}
  .er-read-place{grid-area:place;flex-wrap:nowrap;padding-left:0;border-left:0;gap:8px;min-height:var(--er-touch);min-width:0}
  .er-read-actions{display:contents}
  .er-read-actions > :nth-child(1){grid-area:notes}
  .er-read-actions > :nth-child(2){grid-area:mind}
  .er-read-actions > :nth-child(3){grid-area:pod}
  .er-read-actions > :nth-child(4){grid-area:words}
  .er-read-actions .er-round-icon,
  .er-read-actions .er-wordlist-button{width:var(--er-touch);height:var(--er-touch);min-width:0;padding:0;justify-content:center;position:relative}
  .er-read-actions .er-wordlist-label{display:none}
  .er-read-chapter,.er-read-counter{display:block}
  /* The chapter select takes whatever is left after the position; the
     position itself is never squeezed out (a flex-basis of 0 keeps the
     select from claiming its full intrinsic width first). */
  .er-read-chapter{max-width:none;flex:1 1 0;min-width:0;min-height:var(--er-touch);font-size:13px}
  .er-read-counter{flex:none;font-size:12px}
  .er-read-stats,.er-read-stat{display:none}

  /* 阅读主体：正文全宽，学习模式行横向滚动，竖向工具轨改成底部横条。 */
  .er-reader{gap:0;--er-read-rail:0px}
  .er-read-main{flex-direction:column;gap:0;max-width:none;padding:0}
  .er-read-body{padding:0;overflow:hidden}
  /* Two rows, nothing to scroll: the practice modes on top, the practice unit
     (and the full-text switch) under them. The unit is the control touched
     most often after the mode, so it never hides behind a horizontal scroll;
     8 controls fit in two 44 pixel rows because the rows are split by what
     they do, not squeezed into one line. */
  /* Two rows: the modes take the first one, the practice unit shares the
     second with the translation toggle, which sits at the far end where a
     reading aid belongs. */
  .er-modes{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"chips chips" "scope aids";flex:none;gap:6px 8px;align-items:center;overflow:visible;padding:8px 12px;margin:0;box-shadow:0 6px 10px -10px rgba(0,0,0,.45)}
  .er-mode-chips{grid-area:chips;flex:none;flex-wrap:nowrap;min-width:0;overflow-x:auto;overflow-y:hidden;gap:8px;padding:0;scrollbar-width:none}
  .er-modes .er-scope{grid-area:scope;justify-self:start;align-self:center}
  .er-modes-aids{grid-area:aids;justify-self:end;align-self:center;display:flex}
  .er-mode-chips::-webkit-scrollbar{display:none}
  .er-mode{flex:none;min-height:var(--er-touch);padding:8px 12px}
  /* The group keeps its accessible name; the visible "Practice unit" caption
     costs 80 pixels of a 358 pixel row and is not needed next to three
     self-explaining options. */
  .er-scope-label{display:none}
  .er-scope{flex:none;align-self:flex-start;padding:2px;max-width:100%}
  .er-scope-item{min-height:var(--er-touch);padding:6px 12px}
  .er-translate-toggle{flex:none;margin-left:0;width:var(--er-touch);justify-content:center;padding:8px 0}
  .er-translate-toggle .er-mode-text{display:none}
  .er-reading-page{padding:20px 16px 20px 26px;margin:0;border-radius:var(--dsw-radius-md)}
  .er-page-note{font-size:12px;margin-bottom:12px}
  .er-page-note-keys{display:none}
  .er-paragraph{font-size:17px;line-height:1.9}
  .er-page-paragraph.is-context{font-size:calc(var(--er-text-size,18px) * .86);line-height:var(--er-reading-line-height,1.9)}
  .er-page-paragraph.is-active{font-size:var(--er-text-size,18px);line-height:var(--er-reading-line-height,1.95)}
  /* 段落四角的三个按钮：触屏没有 hover，只在正在读的那一段下方常显，
     每一颗都是 44 的触控目标；上下文段落保持纯文本，不铺满一屏按钮。 */
  .er-paragraph-row{gap:0}
  .er-paragraph-actions{display:none}
  .er-paragraph-row.is-active{flex-wrap:wrap}
  .er-paragraph-row.is-active .er-paragraph-main{flex:1 0 100%}
  .er-paragraph-row.is-active .er-paragraph-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:10px}
  .er-paragraph-action{width:var(--er-touch);height:var(--er-touch);background:var(--er-surface-1);border:1px solid var(--er-line);border-radius:var(--dsw-radius-sm);color:var(--er-ink-2)}
  .er-paragraph-action:hover{background:var(--er-hover)}
  .er-read-tools{order:2;flex-direction:row;align-items:stretch;justify-content:space-between;position:static;align-self:stretch;box-sizing:border-box;width:100%;max-width:none;padding:4px 6px;gap:2px;border-radius:0;border:0;border-top:1px solid var(--er-line);box-shadow:none;background:var(--er-surface-1)}
  .er-read-tool{flex:1 1 0;width:auto;min-height:calc(var(--er-touch) + 8px);flex-direction:column;justify-content:center;gap:3px;padding:6px 2px;border-radius:var(--dsw-radius-sm)}
  .er-read-tool-icon{width:30px;height:30px}
  .er-read-tool-label{font-size:12px;line-height:1.2;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .er-read-tool:hover .er-read-tool-icon{transform:none}

  /* 播放条：一行，主播放键 44，次要键 44；速度与音色在小屏上横向滑动可达。 */
  .er-read-foot{flex-wrap:wrap;overflow:visible;gap:6px 8px;margin-top:0;padding:8px 12px calc(8px + env(safe-area-inset-bottom));border-radius:0;border-top:1px solid var(--er-line);box-shadow:none;position:sticky;bottom:0;z-index:7}
  .er-read-foot .er-controls{flex:1 1 100%;flex-wrap:nowrap;gap:6px;justify-content:space-between}
  .er-read-foot .er-controls:last-child{justify-content:flex-start;gap:8px}
  .er-read-foot .er-btn{min-height:var(--er-touch);min-width:var(--er-touch);justify-content:center}
  .er-read-foot .er-btn-primary{padding:10px 18px;font-size:14px;flex:none}
  .er-read-foot .er-btn-icon,.er-read-foot .er-round-icon{width:var(--er-touch);height:var(--er-touch)}
  .er-read-foot .er-select{min-height:var(--er-touch);font-size:16px;max-width:none}
  .er-read-foot .er-controls:last-child{min-width:0}
  .er-read-foot .er-controls:last-child .er-select{min-width:0}
  .er-read-foot .er-controls:last-child .er-select:first-of-type{flex:0 0 auto}
  .er-read-foot .er-controls:last-child .er-select:last-of-type{flex:1 1 0;width:0}
  .er-read-foot .er-play-anchor .er-round-icon{min-width:var(--er-touch);height:var(--er-touch);padding:0 10px}
  .er-read-foot .er-label{display:none}
  .er-read-position{margin-left:auto;white-space:nowrap}

  /* 打字/朗读面板：贴底、让出安全区，输入框 16px 起（iOS 不缩放）。 */
  .er-type-bar{position:sticky;top:0;z-index:5;background:var(--er-surface-0);padding:6px 12px;gap:12px}
  .er-type-icon{width:var(--er-touch);height:var(--er-touch);justify-content:center}
  /* The practice dock is the phone's bottom edge now that the player bar
     belongs to the reading mode: keep it shallow so the text keeps the
     screen, let it scroll inside itself, and clear the home indicator. */
  .er-mode-dock{max-height:min(38dvh,300px);margin:8px auto 0;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
  .er-mode-dock .er-type-panel{padding:0}
  .er-type-panel{padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--er-surface-0)}
  .er-word-input{font-size:16px;min-height:var(--er-touch);padding:10px 12px}
  .er-input-row{padding:8px 0}
  .er-type-panel .er-btn{min-height:var(--er-touch)}
  .er-settings{padding:12px}
  .er-setting-row{flex-wrap:wrap}
  .er-setting-label{width:auto;flex:1 1 100%}
  .er-replacements{font-size:16px}
  .er-transcript{font-size:14px}

  /* 弹窗（词频、详情、重命名、目录、设置、笔记、思维导图、播客、源文件）：
     手机上一律从底部升起、近全屏。 */
  .er-modal-mask{align-items:flex-end;padding:0}
  .er-modal{width:100%;max-width:none;max-height:92dvh;border-radius:var(--dsw-radius-lg) var(--dsw-radius-lg) 0 0;border-bottom:0;padding:12px 16px calc(16px + env(safe-area-inset-bottom))}
  .er-modal.is-wide{width:100%;max-width:none;max-height:94dvh}
  .er-modal-close,.er-modal .er-round-button{width:var(--er-touch);height:var(--er-touch)}
  .er-modal-head{margin-bottom:12px}
  .er-toc-row{min-height:var(--er-touch)}
  .er-toc{max-height:60dvh}
  .er-frequency-row{grid-template-columns:76px 1fr 36px}
  .er-details-row{flex-wrap:wrap;gap:2px 12px;font-size:14px}
  .er-details-label{width:auto;flex:0 0 100%}
  .er-rename-input,.er-note-input,.er-note-editor-input{font-size:16px;min-height:var(--er-touch)}
  .er-notes{max-height:64dvh}
  .er-note-delete,.er-note-editor-delete{width:var(--er-touch);height:var(--er-touch);justify-content:center}
  .er-source-nav{flex-wrap:wrap}
  .er-source-picker{min-height:var(--er-touch);font-size:16px;flex:1 1 100%}

  /* 生词本：抽屉变全屏层；页面版改成单列。 */
  .er-wordlist-panel{width:100%;max-width:none;border-right:0}
  .er-wordlist-head{padding:12px 16px;min-height:56px}
  .er-wordlist-close{width:var(--er-touch);height:var(--er-touch)}
  .er-wordlist-body{padding:16px}
  .er-wordlist-progress{flex-direction:column;align-items:stretch;gap:16px;padding:16px}
  .er-wordlist-stats{max-width:none}
  .er-wordlist-ring{align-self:center}
  .er-wordlist-review-button{min-height:var(--er-touch)}
  .er-wordlist-chip{min-height:var(--er-touch);padding:8px 14px}
  .er-wordlist-search{min-height:var(--er-touch);font-size:16px}
  .er-wordlist-row{padding:12px}
  .er-wordlist-word{min-height:var(--er-touch);display:inline-flex;align-items:center;font-size:16px}
  .er-wordlist-speak,.er-wordlist-delete{width:var(--er-touch);height:var(--er-touch);justify-content:center}
  .er-wordlist-delete{flex:none}
  .er-wordlist-actions{gap:6px}
  .er-wordlist.is-page .er-wordlist-head{padding:0 16px 8px}
  .er-wordlist.is-page .er-wordlist-body{padding:0 16px 32px}
  .er-wordlist.is-page .er-wordlist-progress{padding:16px;flex-direction:column;align-items:stretch;gap:14px}
  .er-wordlist.is-page .er-wordlist-added{align-self:center;text-align:center}
  .er-wordlist.is-page .er-wordlist-review-button{width:100%}
  .er-wordlist.is-page .er-wordlist-list{max-width:none}

  /* 空态/错误/骨架的密度 */
  .er-state{padding:24px 16px}
  .er-empty-hint{font-size:12px}
  .er-crash{padding:24px 16px}
  .er-crash-actions{flex-direction:column;width:100%}
  .er-crash-actions .er-btn{min-height:var(--er-touch);justify-content:center}

  /* 键盘弹起时，阅读区让出被遮住的高度（--er-keyboard-inset 由
     responsive.js 按 visualViewport 写入），打字面板就不会被压在键盘后面。 */
  .er-reader{height:calc(100% - var(--er-keyboard-inset, 0px))}
  .er-page{--er-keyboard-inset:0px}
}

/* ---- 浮层：词卡 / 学习模式 / 笔记 / 播放设置 ----
   它们渲染在 body 上（避开面板的滚动容器与层叠上下文），所以只能按视口判断。
   手机上变成底部 sheet：可关闭、有拖动把手、最大 70–80dvh。 */
@media (max-width: 600px){
  .er-wordcard.is-sheet,
  .er-modes-panel.is-sheet,
  .er-note-editor.is-sheet,
  .er-play-pop.is-sheet{
    position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;max-width:none;
    max-height:min(80dvh,640px);border-radius:var(--dsw-radius-lg) var(--dsw-radius-lg) 0 0;border-bottom:0;
    padding:8px 16px calc(16px + env(safe-area-inset-bottom));
    overflow:auto;overscroll-behavior:contain;z-index:1300;
    animation:er-sheet-in 220ms var(--er-ease);
  }
  .er-wordcard.is-sheet{max-height:70dvh;font-size:14px;display:flex;flex-direction:column}
  .er-modes-panel.is-sheet{max-height:76dvh}
  .er-note-editor.is-sheet{max-height:80dvh}
  .er-play-pop.is-sheet{padding:0;overflow:visible;animation:none}
  .er-play-pop.is-sheet::after{display:none}
  .er-play-pop.is-sheet .er-play-panel{width:100%;max-height:76dvh;border-radius:var(--dsw-radius-lg) var(--dsw-radius-lg) 0 0;border-bottom:0;padding:12px 16px calc(16px + env(safe-area-inset-bottom))}
  .er-sheet-head{display:flex;align-items:center;gap:12px;margin:-4px 0 4px}
  .er-sheet-title{flex:1;min-width:0;font-size:16px;font-weight:600;color:var(--er-ink-1)}
  .er-sheet-close{width:44px;height:44px;flex:none}
  .er-sheet-handle{display:flex;align-items:center;justify-content:center;height:24px;margin:-4px -16px 2px;touch-action:none;cursor:grab;flex:none}
  .er-sheet-handle-bar{display:block;width:40px;height:4px;border-radius:999px;background:var(--er-line-strong)}
  .er-wordcard.is-sheet .er-wordcard-head{position:sticky;top:-8px;z-index:1;background:var(--er-overlay);padding:4px 0;gap:8px}
  .er-wordcard.is-sheet .er-wordcard-icon{width:var(--er-touch,44px);height:var(--er-touch,44px);justify-content:center}
  .er-wordcard.is-sheet .er-wordcard-word{font-size:20px}
  .er-wordcard.is-sheet .er-wordcard-definition{font-size:15px;line-height:1.6}
  .er-wordcard.is-sheet .er-wordcard-foot .er-btn{min-height:44px;flex:1;justify-content:center}
  .er-wordcard.is-sheet.is-dragging{transition:none}
  .er-modes-panel.is-sheet .er-mode-row{min-height:52px;padding:10px 0}
  .er-modes-panel.is-sheet .er-switch,
  .er-play-pop.is-sheet .er-switch{width:48px;height:44px}
  .er-modes-panel.is-sheet .er-switch::after,
  .er-play-pop.is-sheet .er-switch::after{width:22px;height:22px;margin-top:-11px}
  .er-note-editor.is-sheet .er-note-editor-close{width:44px;height:44px;justify-content:center}
  .er-play-panel-head button{min-width:44px;min-height:44px;justify-content:center}
  .er-play-pop.is-sheet .er-play-segment-item,
  .er-play-pop.is-sheet .er-play-select{min-height:44px}
  .er-play-pop.is-sheet .er-play-row{min-height:48px}
  .er-modal .er-btn{min-height:44px}
  .er-mm .er-btn,.er-mm-switch-item{min-height:44px}
  .er-mm-head{flex-wrap:wrap}
  .er-pod-head .er-select,.er-pod-voice-select,.er-pod-rate-select{min-height:44px}
  .er-pod-talk-send{min-height:44px;min-width:44px}
  .er-mode-row input{width:20px;height:20px}
  .er-cover-listen{width:44px;height:44px}
  .er-cover-menu{width:44px;height:44px}
}
@keyframes er-sheet-in{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}

/* 浮层的宽变体（思维导图、播客、源文件）在手机上竖着排：两栏 221px 的
   网格在 390px 的屏上读不了。 */
@media (max-width: 600px){
  .er-page .er-pod-body{grid-template-columns:1fr}
  .er-page .er-pod-list{max-height:none}
  .er-page .er-pod-head-actions{flex:1 0 100%}
  .er-page .er-pod-head-actions .er-pod-generate{flex:1;justify-content:center;min-height:44px}
  .er-page .er-pod-talk-row{flex-wrap:wrap}
  .er-page .er-pod-talk-input{min-height:44px;font-size:16px}
  .er-page .er-pod-player{flex-wrap:wrap;gap:8px}
  .er-page .er-pod-btn{min-width:44px;min-height:44px}
  .er-page .er-mm-head{gap:8px}
  .er-page .er-mm-switch-item{min-height:44px;padding:8px 12px}
  .er-page .er-mm-canvas{max-height:52dvh}
  .er-page .er-mm-bar{flex-wrap:wrap}
  .er-page .er-mm-bar-label{max-width:100%}
  .er-page .er-mm-bar .er-btn{min-height:44px}
  .er-page .er-source-body{max-height:60dvh}
  .er-page .er-source-foot .er-btn{min-height:44px}
}

/* The reduced-motion block: the durations go to zero, so nothing moves. */
@media (prefers-reduced-motion:reduce){
  .er-page,.er-page *,
  .er-wordcard,.er-wordcard *,
  .er-note-editor,.er-note-editor *,
  .er-modes-panel,.er-modes-panel *,
  .er-play-panel,.er-play-panel *,
  .er-sheet-handle,.er-sheet-handle *{
    animation-duration:0s!important;
    animation-iteration-count:1!important;
    transition-duration:0s!important;
    transition-delay:0s!important;
    scroll-behavior:auto!important;
  }
}

/* The compact read-aloud verdict: three dimensions and one suggestion, above
   the bar. It is the same data as the panel, only readable at a glance. */
.er-speak-summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;box-sizing:border-box;padding:7px 12px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-lg);background:var(--er-surface-1);color:var(--er-ink-2);font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:background-color var(--er-dur-hover) ease}
.er-speak-summary:hover{background:var(--er-hover)}
.er-speak-summary-item{display:inline-flex;align-items:baseline;gap:5px;flex:none}
.er-speak-summary-label{color:var(--er-ink-3);font-size:11px}
.er-speak-summary-value{font-size:12px}
.er-speak-summary-item.is-good .er-speak-summary-value{color:var(--er-ok-ink)}
.er-speak-summary-item.is-warn .er-speak-summary-value{color:var(--er-warn-ink)}
.er-speak-summary-item.is-bad .er-speak-summary-value{color:var(--er-warn-ink)}
.er-speak-summary-item.is-live .er-speak-summary-value{color:var(--er-accent-ink)}
.er-speak-summary-tip{min-width:0;flex:1 1 120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--er-ink-3)}
.er-speak-summary-more{flex:none;color:var(--er-ink-3)}

/* The modes panel is a decision, not a settings screen: two segmented rows for
   the practice (mode, then unit) and a grid of compact aid toggles under them. */
.er-modes-group{display:flex;flex-direction:column;gap:8px;padding:10px 0}
.er-modes-group+.er-modes-group{border-top:1px solid var(--er-line)}
.er-modes-group-label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--er-ink-3)}
.er-segment{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px;border-radius:10px;background:var(--er-surface-2);border:1px solid var(--er-line)}
.er-segment.is-quiet{background:transparent;border-color:transparent;padding:0;margin-top:2px}
.er-segment-item{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 6px;border:0;border-radius:7px;background:transparent;font:inherit;font-size:12.5px;color:var(--er-ink-2);cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-segment-item:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-segment-item[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink);font-weight:600}
.er-segment.is-quiet .er-segment-item[aria-pressed="true"]{background:var(--er-surface-2);font-weight:500}
.er-segment-item:disabled{opacity:.4;cursor:default}
.er-segment-text{white-space:nowrap}
.er-aid-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.er-aid-chip{display:flex;align-items:center;gap:7px;height:30px;padding:0 9px;border:1px solid var(--er-line);border-radius:8px;background:transparent;font:inherit;font-size:12px;color:var(--er-ink-2);cursor:pointer;text-align:left;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-aid-chip:hover{background:var(--er-hover)}
.er-aid-chip[aria-pressed="true"]{border-color:color-mix(in srgb,var(--er-accent) 55%,var(--er-line));background:var(--er-accent-soft);color:var(--er-accent-ink)}
.er-aid-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--er-ink-3);opacity:.35}
.er-aid-chip[aria-pressed="true"] .er-aid-dot{background:var(--er-accent);opacity:1}
.er-aid-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}


/* The read-aloud bar: one standalone button on the left, the how-to behind an
   info icon, and only real state in the middle. */
.er-speak-bar{display:flex;align-items:center;gap:10px}
.er-speak-primary{flex:none;display:flex;align-items:center}
.er-speak-start{height:36px;padding:0 18px;border-radius:999px;gap:8px;font-weight:600;box-shadow:0 2px 6px color-mix(in srgb,var(--er-accent) 28%,transparent)}
.er-speak-start:hover{transform:translateY(-1px)}
.er-speak-info{flex:none;color:var(--er-ink-3)}
.er-speak-info:hover{color:var(--er-ink-1)}
.er-speak-bar .er-speak-line{flex:1 1 auto;justify-content:center;min-width:0}
.er-speak-bar .er-speak-status-text:empty{display:none}
@media (max-width: 560px){
  .er-speak-start{padding:0 12px}
}


/* The auto-next switch reads as "on" when the drill will continue by itself. */
.er-speak-auto[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink);border-color:color-mix(in srgb,var(--er-accent) 45%,transparent)}
.er-speak-auto[aria-pressed="true"]:hover{background:var(--er-accent-hover);color:var(--er-accent-ink)}


/* The drill switch is a small pill: its state matters, so it says its name. */
.er-speak-bar .er-speak-auto{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--er-line);background:transparent;color:var(--er-ink-2);font-size:12px;flex:none}
.er-speak-bar .er-speak-auto:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-speak-bar .er-speak-auto[aria-pressed="true"]{border-color:color-mix(in srgb,var(--er-accent) 45%,transparent);background:var(--er-accent-soft);color:var(--er-accent-ink)}
.er-speak-auto-label{white-space:nowrap}


/* The bar: one segmented control for the practice mode, then single tools, then
   one menu. Nothing in it is allowed to wrap into a second line. */
.er-read-actions{flex-wrap:nowrap;gap:4px}
.er-mode-segment{display:inline-flex;align-items:center;gap:2px;padding:2px;margin-right:4px;border-radius:999px;background:var(--er-surface-2);border:1px solid var(--er-line);flex:none}
.er-mode-segment .er-mode-button{width:28px;height:28px;border-radius:999px}
.er-mode-segment .er-mode-button[aria-pressed="true"]{background:var(--er-accent-soft);color:var(--er-accent-ink)}
.er-mode-segment .er-mode-button[aria-pressed="true"]:hover{background:var(--er-accent-hover)}
.er-more-pop{position:fixed;z-index:1300;box-sizing:border-box;padding:6px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);display:flex;flex-direction:column;gap:2px}
.er-more-row{display:flex;align-items:center;gap:10px;height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;font:inherit;font-size:12.5px;color:var(--er-ink-2);cursor:pointer;text-align:left}
.er-more-row:hover{background:var(--er-hover);color:var(--er-ink-1)}
.er-more-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-more-badge{flex:none;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--er-accent);color:var(--er-on-semantic);font-size:11px;line-height:18px;text-align:center}


/* A floating panel is portalled into the body; this scope carries the reader's
   own tokens so the panel's surface is not transparent. */
.er-float-scope{position:static;display:contents}

`;
