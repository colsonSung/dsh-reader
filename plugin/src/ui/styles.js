/**
 * The plugin's stylesheet.
 *
 * The shell owns the theme (`--dsw-alias-*`), so every colour here is mixed
 * from the host's own tokens and follows a host theme change.
 *
 * The reader declares one surface ramp and one accent of its own, because the
 * host's four surface tokens are all white in light mode: a card built from
 * them is white on white. The accent is brass, the colour of a book, and it
 * appears in three places only: the primary action, the active state, and the
 * brass rail on the left edge of the reading column.
 *
 * The word card, the note editor, the modes panel and the playback options
 * float over the panel, so they live outside the page root and carry the same
 * token block with them.
 */
export const STYLE = `
/* The reader's own surfaces and its one hue.
   The ramp mixes the host's base and label colours, so the four steps
   separate in both themes and still follow a host theme change. */
.er-page,.er-wordcard,.er-note-editor,.er-modes-panel,.er-play-pop,.er-play-panel{
  --er-surface-0:var(--dsw-alias-bg-base);
  --er-surface-1:color-mix(in oklab,var(--dsw-alias-bg-base) 94%,var(--dsw-alias-label-primary) 6%);
  --er-surface-2:color-mix(in oklab,var(--dsw-alias-bg-base) 89%,var(--dsw-alias-label-primary) 11%);
  --er-surface-3:color-mix(in oklab,var(--dsw-alias-bg-base) 84%,var(--dsw-alias-label-primary) 16%);
  --er-overlay:var(--dsw-alias-bg-overlay);
  /* One hairline per edge, never two stacked. */
  --er-line:color-mix(in oklab,var(--dsw-alias-label-primary) 11%,transparent);
  --er-line-strong:color-mix(in oklab,var(--dsw-alias-label-primary) 18%,transparent);
  /* A surface gets depth from being lighter in the dark theme and from a
     shadow in the light one. Both cues are needed; neither alone is enough. */
  --er-shadow-card:0 1px 2px color-mix(in oklab,var(--dsw-alias-label-primary) 7%,transparent),
                     0 4px 14px -6px color-mix(in oklab,var(--dsw-alias-label-primary) 10%,transparent);
  --er-shadow-float:0 2px 6px color-mix(in oklab,var(--dsw-alias-label-primary) 10%,transparent),
                      0 16px 36px -12px color-mix(in oklab,var(--dsw-alias-label-primary) 22%,transparent);
  /* The lit-from-above cue: a 1px inset highlight on the top edge. On a
     near-black surface this is the only thing that says raised. */
  --er-edge:inset 0 1px 0 color-mix(in oklab,var(--dsw-alias-label-primary) 7%,transparent);
  /* The page: the one surface the reader owns, so it gets a foot shadow too. */
  --er-shadow-page:var(--er-shadow-card),var(--er-edge),
                      0 14px 30px -20px color-mix(in oklab,var(--dsw-alias-label-primary) 34%,transparent);
  --er-shadow-lift:var(--er-shadow-card),var(--er-edge),
                      0 10px 24px -14px color-mix(in oklab,var(--dsw-alias-label-primary) 26%,transparent);
  /* The accent: brass, the colour of a book rather than of a tool. */
  --er-accent:var(--er-accent-base);
  --er-accent-soft:color-mix(in oklab,var(--er-accent-base) 14%,transparent);
  --er-accent-hover:color-mix(in oklab,var(--er-accent-base) 24%,transparent);
  --er-accent-line:color-mix(in oklab,var(--er-accent-base) 42%,transparent);
  --er-accent-ink:var(--er-accent-base);
  --er-accent-base:#9a6d1f;
  /* The neutral that sits on an accent fill: white on brass in the light
     theme, near black on gold in the dark one. */
  --er-on-accent:var(--dsw-alias-bg-base);
  /* The page itself: warm paper and sepia ink. */
  --er-paper:color-mix(in oklab,var(--dsw-alias-bg-base) 96%,var(--er-accent-base) 4%);
  --er-ink:#2a2620;
  --er-ink-wash:color-mix(in oklab,var(--er-ink) 14%,transparent);
  /* Motion: short for a hover, eased out for a state change. */
  --er-dur-hover:100ms;
  --er-dur-state:200ms;
  --er-dur-pop:180ms;
  --er-dur-modal:240ms;
  --er-ease:cubic-bezier(.23,1,.32,1);
  --er-focus:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--er-accent));
}
body[data-ds-dark-theme] .er-page,
body[data-ds-dark-theme] .er-wordcard,
body[data-ds-dark-theme] .er-note-editor,
body[data-ds-dark-theme] .er-modes-panel,
body[data-ds-dark-theme] .er-play-pop,
body[data-ds-dark-theme] .er-play-panel{
  --er-accent-base:#e0b558;
  --er-ink:#e6dfd0;
}
.er-page{display:flex;flex-direction:column;height:100%;min-height:0;position:relative;background:var(--er-surface-0);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font,inherit);font-size:13px}
.er-toolbar{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--er-line);flex:none}
.er-tabs{display:flex;gap:2px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2)}
.er-tab{appearance:none;border:0;border-radius:var(--dsw-radius-xs);padding:5px 14px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-tab[aria-selected="true"]{background:var(--er-surface-1);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--er-shadow-card)}
.er-tab:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-toolbar-meta{margin-left:auto;display:flex;align-items:center;gap:10px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.er-body{flex:1;min-height:0;overflow:auto;padding:24px 24px 48px}
.er-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;min-height:220px;color:var(--dsw-alias-label-tertiary);text-align:center}
.er-empty-title{font-size:16px;color:var(--dsw-alias-label-secondary);font-weight:500}
.er-empty-hint{font-size:12px;max-width:420px;line-height:1.7}
.er-drop{display:flex;flex-direction:column;align-items:center;gap:8px;padding:32px 24px;border:1px dashed var(--er-line-strong);border-radius:var(--dsw-radius-lg);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-secondary);cursor:pointer;text-align:center;transition:border-color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
.er-drop:hover,.er-drop.is-over{border-color:var(--er-accent);background:var(--er-surface-2)}
.er-drop:focus-visible{outline:var(--er-focus);outline-offset:2px}
.er-drop-title{font-size:14px;color:var(--dsw-alias-label-primary)}
.er-drop-hint{font-size:12px;color:var(--dsw-alias-label-tertiary)}
/* A notice, not a banner: the reading surface must not be interrupted by a
   full width red box. */
.er-error{display:inline-flex;align-self:flex-start;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:999px;background:var(--er-surface-2);border:1px solid var(--er-line);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.4}
.er-error::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.er-note{margin-top:12px;padding:12px 16px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card);color:var(--dsw-alias-label-secondary);font-size:12px}
.er-books{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.er-book{display:flex;align-items:center;gap:16px;padding:12px 16px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-book-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.er-book-title{font-size:14px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-book-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-book-progress{height:4px;border-radius:999px;background:var(--er-surface-3);overflow:hidden}
.er-book-progress>span{display:block;height:100%;background:var(--er-accent)}
.er-book-actions{display:flex;gap:8px;flex:none}
/* Filled buttons keep their fill on hover: washing them out made the light
   label unreadable. The reference app dims the fill instead. */
.er-btn{appearance:none;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease,filter var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
.er-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.er-btn:disabled{cursor:default}
.er-btn:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-btn-primary{background:var(--er-accent);border-color:var(--er-accent);color:var(--er-on-accent)}
.er-btn-primary:hover:not(:disabled){background:var(--er-accent);filter:brightness(.94)}
.er-btn-primary:disabled{background:var(--er-surface-3);border-color:var(--er-line);color:var(--dsw-alias-label-tertiary);filter:none}
.er-btn-danger:hover:not(:disabled){border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.er-btn-icon{padding:6px 8px}
.er-reader{display:flex;flex-direction:column;gap:16px;min-width:0;height:100%;min-height:0}
.er-reader-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
/* A select without an arrow does not read as a dropdown: the chevron is
   drawn with the text colour, so it follows the theme. */
.er-select{appearance:none;-webkit-appearance:none;padding:6px 26px 6px 10px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background-color:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 14px) 52%,calc(100% - 9px) 52%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;max-width:200px;text-overflow:ellipsis;cursor:pointer;transition:border-color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
.er-select:hover{border-color:var(--er-line-strong);background-color:var(--dsw-alias-interactive-bg-hover)}
.er-select:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-select option{background:var(--er-surface-1);color:var(--dsw-alias-label-primary)}
.er-counter{font-size:12px;color:var(--dsw-alias-label-tertiary)}
/* The page. It is the one surface the reader owns: warm paper, sepia ink,
   an inset top highlight and a soft foot shadow. The brass rail that runs
   down its left edge is the plugin's signature device. */
.er-paragraph{position:relative;font-family:Georgia,'Songti SC','Times New Roman',serif;font-size:18px;line-height:1.95;color:var(--er-ink);padding:24px 26px 24px 30px;border-radius:var(--dsw-radius-md);background:var(--er-paper);border:1px solid var(--er-line);box-shadow:var(--er-shadow-page);word-break:break-word}
.er-word{display:inline-block;padding:1px 3px;border-radius:var(--dsw-radius-xs);cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
/* A Chinese character is a word of its own: the padding that spaces out an
   English word would leave a gap between every character. */
.er-word.is-cjk{padding:1px 0}
.er-word:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-word.is-spoken{background:var(--er-ink-wash)}
.er-word.is-current{color:var(--er-accent)}
.er-word.is-ok{color:var(--dsw-alias-state-success-primary)}
.er-word.is-bad{color:var(--dsw-alias-state-error-primary);text-decoration:underline wavy var(--dsw-alias-state-error-primary)}
.er-word.is-missing{color:var(--dsw-alias-state-warn-primary);text-decoration:underline dotted var(--dsw-alias-state-warn-primary)}
.er-word.is-extra{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
.er-char.is-bad-char{color:var(--dsw-alias-state-error-primary)}
.er-char.is-pending-char{color:var(--dsw-alias-label-tertiary)}
.er-type-bar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:16px;font-size:13px;padding:6px 0;background:var(--er-surface-0)}
.er-type-panel{position:sticky;bottom:0;z-index:3;background:var(--er-surface-0);padding:12px 0 8px;border-top:1px solid var(--er-line)}
.er-type-metric{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.er-type-icon{appearance:none;border:0;font:inherit;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px 6px;border-radius:var(--dsw-radius-xs);font-size:14px;line-height:1;display:inline-flex;align-items:center}
.er-type-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-type-icon[aria-pressed="true"]{opacity:.55}
.er-settings{display:flex;flex-direction:column;gap:12px;padding:12px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-setting-row{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.er-setting-label{width:88px;flex:none;color:var(--dsw-alias-label-secondary)}
.er-setting-value{width:58px;flex:none;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.er-setting-hint{color:var(--dsw-alias-label-tertiary);font-size:12px}
.er-input-row{display:flex;justify-content:center;padding:12px 0}
.er-input-row.is-hidden{opacity:0;height:0;padding:0;overflow:hidden;pointer-events:none}
.er-word-input{width:min(560px,100%);box-sizing:border-box;padding:10px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line-strong);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;text-align:center}
.er-word-input:focus{outline:none;border-color:var(--er-accent)}
.er-word-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-word-input::placeholder{color:var(--dsw-alias-label-tertiary);opacity:.55}
.er-word.is-muted{color:var(--dsw-alias-label-tertiary)}
.er-scope-label{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-left:8px;align-self:center}
.er-scope{display:inline-flex;gap:2px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);align-self:center}
.er-scope-item{appearance:none;border:0;border-radius:var(--dsw-radius-xs);padding:5px 12px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.er-scope-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-scope-item[aria-pressed="true"]{background:var(--er-surface-1);color:var(--dsw-alias-label-primary);box-shadow:var(--er-shadow-card)}
/* The mode row stays put while the text scrolls: the controls are always
   within reach. */
.er-modes{display:flex;gap:8px;flex-wrap:wrap;position:sticky;top:0;z-index:6;padding:8px 0;margin:-8px 0 8px;background:var(--er-surface-0);backdrop-filter:blur(6px)}
.er-mode{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
/* The active mode is marked three ways: fill, edge and weight. Colour on
   its own would not carry the state. */
.er-mode:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-mode[aria-pressed="true"]:hover{background:var(--er-surface-1)}
.er-mode[aria-pressed="true"]{border-color:var(--er-accent);background:var(--er-accent-soft);color:var(--dsw-alias-label-primary);font-weight:500}
.er-mode:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-panel{display:flex;flex-direction:column;gap:12px}
.er-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.er-typing{width:100%;box-sizing:border-box;min-height:92px;padding:12px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;line-height:1.7;resize:vertical}
.er-typing:focus{outline:none;border-color:var(--er-accent)}
.er-typing:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-stats{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-stat{display:flex;align-items:baseline;gap:5px}
.er-stat-value{font-size:14px;color:var(--dsw-alias-label-primary)}
.er-transcript{min-height:40px;padding:12px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge);font-size:14px;line-height:1.7;color:var(--dsw-alias-label-secondary)}
.er-chips{display:flex;flex-wrap:wrap;gap:8px}
.er-chip{padding:4px 8px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);box-shadow:var(--er-shadow-card),var(--er-edge);font-size:13px;color:var(--dsw-alias-label-secondary)}
.er-chip.is-ok{color:var(--dsw-alias-state-success-primary)}
.er-chip.is-bad{color:var(--dsw-alias-state-error-primary);background:transparent;border:1px solid var(--dsw-alias-state-error-primary)}
.er-chip.is-missing{color:var(--dsw-alias-state-warn-primary)}
.er-chip.is-extra{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
.er-toggle{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.er-toggle input{accent-color:var(--er-accent)}
.er-label{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-wordlist-button{display:inline-flex;align-items:center;gap:6px;flex:none;appearance:none;border:1px solid var(--er-line);border-radius:var(--dsw-radius-sm);padding:6px 10px 6px 8px;background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.4;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease}
.er-wordlist-button:hover{border-color:var(--er-line-strong);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-wordlist-label{white-space:nowrap}
/* The mind map and the podcast sit next to the vocabulary button. They are
   icon only: the bar is one line, and a label each would push the reading
   figures off the edge. */
.er-read-extra{width:28px;height:28px;flex:none;color:var(--dsw-alias-label-secondary)}
.er-read-extra:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-wordlist-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--er-accent);color:var(--er-on-accent);font-size:11px;line-height:1}
.er-wordcard{position:fixed;z-index:1100;box-sizing:border-box;padding:16px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);font-size:13px;color:var(--dsw-alias-label-primary)}
.er-wordcard-head{display:flex;align-items:flex-start;gap:12px}
.er-wordcard-word{flex:1;min-width:0;font-size:18px;font-weight:600;word-break:break-word}
.er-wordcard-actions{display:flex;gap:2px;flex:none}
.er-wordcard-icon{appearance:none;border:0;font:inherit;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px 6px;border-radius:var(--dsw-radius-xs);font-size:14px;line-height:1;display:inline-flex;align-items:center}
.er-wordcard-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-wordcard-icon.is-saved{color:var(--er-accent)}
.er-wordcard-phonetic{margin-top:8px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.er-wordcard-pos{margin-top:2px;font-size:12px;color:var(--dsw-alias-label-tertiary);font-style:italic}
.er-wordcard-definition{margin-top:8px;font-size:14px;line-height:1.6}
.er-wordcard-error{margin-top:8px;font-size:12px;color:var(--dsw-alias-state-error-primary)}
.er-wordcard-loading{margin-top:8px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-wordcard-examples{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.er-wordcard-example{padding-left:8px;border-left:2px solid var(--er-line-strong)}
.er-wordcard-example-en{font-size:13px;line-height:1.5}
.er-wordcard-example-zh{margin-top:2px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.er-wordcard-note{margin-top:12px;padding-top:8px;border-top:1px solid var(--er-line);font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.er-wordcard-foot{margin-top:12px;display:flex;gap:8px}
.er-setting-column{align-items:flex-start;flex-direction:column;gap:8px}
.er-replacements{width:100%;box-sizing:border-box;min-height:64px;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-2);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6;resize:vertical}
.er-replacements:focus{outline:none;border-color:var(--er-accent)}
.er-replacements:focus-visible{outline:var(--er-focus);outline-offset:1px}
/* The drawer belongs to the plugin area: it never covers the host chrome. */
.er-wordlist{position:absolute;inset:0;z-index:1050}
.er-wordlist.is-closed{pointer-events:none}
.er-wordlist-mask{position:absolute;inset:0;background:rgba(0,0,0,.22);opacity:1;transition:opacity var(--er-dur-modal) var(--er-ease)}
.er-wordlist.is-closed .er-wordlist-mask{opacity:0}
.er-wordlist-panel{transform:translateX(-100%);transition:transform var(--er-dur-modal) var(--er-ease)}
.er-wordlist.is-open .er-wordlist-panel{transform:none}
.er-wordlist-panel{position:absolute;top:0;left:0;bottom:0;width:min(320px,88%);display:flex;flex-direction:column;background:var(--er-surface-1);border-right:1px solid var(--er-line);box-shadow:var(--er-shadow-float);color:var(--dsw-alias-label-primary)}
.er-wordlist-head{display:flex;align-items:center;gap:12px;padding:16px 16px;border-bottom:1px solid var(--er-line);flex:none}
.er-wordlist-title{flex:1;font-size:16px;font-weight:600;letter-spacing:.01em}
.er-wordlist-close{appearance:none;border:0;background:var(--er-surface-2);color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.er-wordlist-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-wordlist-body{flex:1;min-height:0;overflow:auto;padding:16px}
.er-wordlist-progress{display:flex;flex-direction:column;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--er-line)}
.er-wordlist-ring{flex:none}
.er-wordlist-ring-track{fill:none;stroke:var(--er-line-strong);stroke-width:7}
.er-wordlist-ring-value{fill:none;stroke:var(--er-accent);stroke-width:7;transition:stroke-dasharray var(--er-dur-state) var(--er-ease)}
.er-wordlist-ring-text{fill:var(--dsw-alias-label-primary);font-size:18px;font-weight:600}
.er-wordlist-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;text-align:center}
.er-wordlist-stat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 4px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2)}
.er-wordlist-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}
.er-wordlist-dot.is-known{background:var(--dsw-alias-state-success-primary)}
.er-wordlist-dot.is-learning{background:var(--er-accent)}
.er-wordlist-dot.is-tolearn{background:var(--dsw-alias-label-tertiary)}
.er-wordlist-stat-label{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.er-wordlist-stat-value{font-size:18px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;line-height:1.1}
.er-wordlist-added{color:var(--dsw-alias-label-tertiary);font-size:12px;text-align:center;margin-top:4px}
.er-wordlist-review{display:flex;align-items:center;gap:12px;padding:16px 0}
.er-wordlist-review-button{flex:1;appearance:none;border:1px solid var(--er-accent);background:var(--er-accent);box-shadow:var(--er-shadow-card);color:var(--er-on-accent);border-radius:var(--dsw-radius-sm);padding:10px 12px;font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.er-wordlist-review-button:hover:not(:disabled){filter:brightness(.94)}
.er-wordlist-review-button:disabled{background:var(--er-surface-2);border-color:var(--er-line);color:var(--dsw-alias-label-tertiary);box-shadow:none}
.er-wordlist-filters{display:flex;flex-direction:column;gap:8px;padding:4px 0 16px;border-bottom:1px solid var(--er-line)}
.er-wordlist-chips{display:flex;gap:8px;flex-wrap:wrap}
.er-wordlist-chip{appearance:none;border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease}
.er-wordlist-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-wordlist-chip.is-active{background:var(--er-accent);border-color:var(--er-accent);color:var(--er-on-accent);font-weight:500}
.er-wordlist-searchwrap{position:relative;display:flex;align-items:center}
.er-wordlist-search-icon{position:absolute;left:9px;color:var(--dsw-alias-label-tertiary);pointer-events:none}
.er-wordlist-search{width:100%;box-sizing:border-box;padding:8px 12px 8px 32px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-2);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.er-wordlist-search:focus{outline:none;border-color:var(--er-accent);background:var(--er-surface-1)}
.er-wordlist-search:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-wordlist-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.er-wordlist-row{display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-wordlist-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.er-wordlist-row-head{display:flex;align-items:baseline;gap:8px}
.er-wordlist-word{appearance:none;border:0;background:transparent;padding:0;font:inherit;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left}
.er-wordlist-word:hover{color:var(--er-accent)}
.er-wordlist-phonetic{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-wordlist-definition{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-wordlist-row.is-known{border-color:var(--dsw-alias-state-success-primary)}
.er-wordlist-meta{display:flex;gap:12px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-wordlist-time,.er-wordlist-book{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-wordlist-actions{display:flex;align-items:center;gap:4px;flex:none}
.er-wordlist-speak{display:inline-flex;align-items:center;gap:4px;appearance:none;border:1px solid var(--er-line);background:var(--er-surface-1);color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-xs);padding:4px 6px;font:inherit;font-size:12px;cursor:pointer}
.er-wordlist-speak:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-wordlist-speak-text{display:none}
.er-wordlist-delete{appearance:none;border:0;font:inherit;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);display:inline-flex;align-items:center}
.er-wordlist-delete:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.er-wordlist-empty{padding:32px 16px;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary);line-height:1.8}
.er-wordlist-note{margin-top:12px;padding:8px 12px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-3);font-size:12px;color:var(--dsw-alias-label-secondary)}
.er-library{display:flex;flex-direction:column;gap:16px;margin-top:16px}
.er-library-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
.er-library-stat{display:flex;flex-direction:column;gap:4px;padding:12px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-library-stat-value{font-size:18px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.er-library-stat-label{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-library-toolbar{display:flex;align-items:center;gap:12px}
.er-library-search{flex:1;min-width:0}
.er-library-search input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.er-library-search input:focus{outline:none;border-color:var(--er-accent)}
.er-library-search input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-view-switch{display:flex;gap:2px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2)}
.er-view-switch-item{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:6px 10px;border-radius:var(--dsw-radius-xs);font-size:13px;line-height:1;display:inline-flex;align-items:center}
.er-view-switch-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-view-switch-item[aria-pressed="true"]:hover{background:var(--er-surface-1)}
.er-view-switch-item[aria-pressed="true"]{background:var(--er-surface-1);color:var(--dsw-alias-label-primary);box-shadow:var(--er-shadow-card)}
.er-book-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:24px 16px}
.er-book-card{display:flex;flex-direction:column;gap:8px}
.er-book-cover-button{appearance:none;border:0;background:transparent;padding:0;cursor:pointer;border-radius:var(--dsw-radius-sm);overflow:hidden;display:block;width:100%}
.er-cover{position:relative;width:100%;aspect-ratio:2/3;border-radius:var(--dsw-radius-sm);overflow:hidden;background:var(--er-surface-2);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-cover-image{width:100%;height:100%;object-fit:cover;display:block}
/* A book without a cover still looks like a book: a calm gradient with the
   initials, not an empty white rectangle. */
.er-cover-fallback{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;font-size:18px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-secondary);background:linear-gradient(150deg,var(--er-surface-3) 0%,var(--er-surface-2) 55%,var(--er-accent) 190%)}
.er-cover-fallback::after{content:'';width:28px;height:2px;border-radius:999px;background:var(--er-line-strong)}
.er-cover-progress{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(0,0,0,.18)}
.er-cover-progress>span{display:block;height:100%;background:var(--er-accent);box-shadow:0 0 6px rgba(0,0,0,.25)}
.er-book-cover-small{width:44px;flex:none}
.er-book-card-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.er-book-card-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-book-card-stats{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-book-card-actions{display:flex;gap:8px;margin-top:4px}
.er-book-card-actions .er-btn-primary{flex:1;justify-content:center}
.er-book-list{display:flex;flex-direction:column;gap:8px}
.er-book-stats{font-size:12px;color:var(--dsw-alias-label-tertiary)}

.er-appbar{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--er-line);flex:none}
.er-appbar-left,.er-appbar-right{display:flex;align-items:center;gap:8px;min-width:96px}
.er-appbar-right{justify-content:flex-end}
.er-segmented{display:flex;gap:2px;margin:0 auto;padding:3px;border-radius:999px;background:var(--er-surface-2)}
.er-segmented-item{appearance:none;border:0;border-radius:999px;padding:8px 18px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-segmented-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-segmented-item[aria-selected="true"]:hover{background:var(--er-surface-1)}
.er-segmented-item[aria-selected="true"]{background:var(--er-surface-1);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--er-shadow-card)}
.er-round-button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card);color:var(--dsw-alias-label-secondary);font:inherit;font-size:16px;line-height:1;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
.er-round-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-library-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px}
.er-library-card{padding:16px 16px;border-radius:var(--dsw-radius-md);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-library-card-label{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin-bottom:8px}
.er-library-card-value{display:flex;align-items:baseline;gap:4px}
.er-library-card-number{font-size:18px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums}
.er-library-card-number.is-read{color:var(--dsw-alias-state-warn-primary)}
.er-library-card-number.is-played{color:var(--er-accent)}
.er-library-card-number.is-speed{color:var(--dsw-alias-state-success-primary)}
.er-library-card-unit{font-size:12px;color:var(--dsw-alias-label-secondary)}
.er-book-grid{grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:24px 16px}
.er-shelf-card{position:relative;display:flex;flex-direction:column;gap:4px}
.er-shelf-cover-button{appearance:none;border:0;background:transparent;padding:0;cursor:pointer;display:block;width:100%}
.er-shelf-cover{position:relative;width:100%;aspect-ratio:2/3;transition:transform var(--er-dur-state) var(--er-ease),box-shadow var(--er-dur-state) var(--er-ease);border-radius:var(--dsw-radius-sm);overflow:hidden;background:var(--er-surface-2);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge)}
/* The two round buttons are the whole point of a cover: a learner starts the
   book from them, so they are drawn on the cover at all times instead of
   waiting for a hover. Both are discs of the panel's own surface colour, with
   the label colour for the glyph, so they follow the light and the dark
   theme; the drop shadow is what lifts them off a pale cover. The native
   button chrome is switched off, or the browser rounds the box instead of
   drawing a circle, and the corner shape is pinned to a plain circle, because
   the shell draws every box with a soft superellipse and a disc must be a
   disc. */
.er-cover-action{position:absolute;bottom:8px;display:inline-flex;font:inherit;align-items:center;justify-content:center;box-sizing:border-box;appearance:none;-webkit-appearance:none;padding:0;border:0;border-radius:50%;corner-shape:round;background:var(--er-surface-1,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.30),0 0 0 1px var(--er-line-strong);transition:transform var(--er-dur-hover) ease,box-shadow var(--er-dur-hover) ease}
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
.er-shelf-title{font-size:13px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-shelf-percent{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-book-menu{position:absolute;z-index:20;top:100%;right:0;margin-top:4px;min-width:168px;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);display:flex;flex-direction:column}
.er-book-menu-top{position:absolute;top:46px;right:16px}
.er-book-menu-label{padding:8px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-book-menu-item{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;text-align:left;padding:8px 12px;border-radius:var(--dsw-radius-xs);cursor:pointer}
.er-book-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-book-menu-item.is-danger{color:var(--dsw-alias-state-error-primary)}
.er-book-menu-item.is-active{font-weight:600;color:var(--er-accent)}
.er-modal-mask{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
.er-modal{display:flex;flex-direction:column;width:min(460px,92vw);max-height:80vh;overflow:auto;padding:16px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);color:var(--dsw-alias-label-primary)}
/* The body is written before the head, so the head is put back on top with
   the order. Nothing of the panel shrinks to fit: the modal still scrolls. */
.er-modal>*{flex:0 0 auto}
/* The mind map and the podcast player need more room than a form. */
.er-modal.is-wide{width:min(980px,94vw);max-height:86vh}
.er-modal-head{order:-1;display:flex;align-items:center;gap:12px;margin-bottom:16px}
.er-modal-title{flex:1;font-size:16px;font-weight:600}
.er-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.er-rename-input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-2);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.er-rename-input:focus{outline:none;border-color:var(--er-accent)}
.er-rename-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-frequency{display:flex;flex-direction:column;gap:4px}
.er-frequency-row{display:grid;grid-template-columns:96px 1fr 40px;align-items:center;gap:8px;font-size:12px}
.er-frequency-word{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.er-frequency-bar{height:8px;border-radius:999px;background:var(--er-surface-3);overflow:hidden}
.er-frequency-bar>span{display:block;height:100%;background:var(--er-accent)}
.er-frequency-count{text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.er-details{display:flex;flex-direction:column;gap:8px}
.er-details-row{display:flex;gap:12px;font-size:13px}
.er-details-label{flex:none;width:110px;color:var(--dsw-alias-label-tertiary)}
.er-details-value{flex:1;color:var(--dsw-alias-label-primary)}
.er-wordlist.is-page{position:static;inset:auto;display:block}
.er-wordlist.is-page .er-wordlist-mask{display:none}
.er-wordlist.is-page .er-wordlist-panel{position:static;width:auto;height:auto;box-shadow:none;border-right:0;border-radius:0;background:transparent}
.er-wordlist.is-page .er-wordlist-head{padding:4px 24px 8px;border-bottom:0}
/* The page variant has no title, so the close button keeps the right margin
   the title's flex spacer used to give it. */
.er-wordlist.is-page .er-wordlist-close{margin-left:auto}
.er-wordlist.is-page .er-wordlist-body{overflow:visible;padding:0 24px 32px;max-width:720px;margin:0 auto;width:100%}
.er-wordlist.is-page .er-wordlist-progress{flex-direction:row;align-items:center;gap:28px;padding:20px 24px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge)}
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
.er-read-bar{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;padding:9px 16px;border-bottom:1px solid var(--er-line);flex:none;white-space:nowrap;overflow:hidden;container-type:inline-size}
.er-read-head{display:flex;align-items:center;gap:10px;min-width:0;flex:1 1 auto}
.er-read-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:550;color:var(--dsw-alias-label-primary);letter-spacing:.01em}
.er-read-place{display:flex;align-items:center;gap:10px;min-width:0;flex:0 1 auto;padding-left:12px;border-left:1px solid var(--er-line)}
.er-read-counter{font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* The chapter picker is a chip, not a form field: it is a place in the book,
   not a setting. */
.er-read-chapter{appearance:none;-webkit-appearance:none;max-width:18ch;flex:none;padding:6px 26px 6px 10px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background-color:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 14px) 55%,calc(100% - 10px) 55%;background-size:4px 4px,4px 4px;background-repeat:no-repeat;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.4;text-overflow:ellipsis;cursor:pointer;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,border-color var(--er-dur-hover) ease}
.er-read-chapter:hover{border-color:var(--er-line-strong);background-color:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-read-chapter:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-read-chapter option{background:var(--er-surface-1);color:var(--dsw-alias-label-primary)}
/* The actions: one row of round buttons, then the word list. */
.er-read-actions{display:flex;align-items:center;gap:4px;flex:none;margin-left:auto;padding-left:12px;border-left:1px solid var(--er-line)}
.er-read-actions .er-round-icon{width:28px;height:28px}
.er-read-stats{display:flex;align-items:center;gap:12px;flex:none;padding-left:14px;border-left:1px solid var(--er-line)}
/* The bar answers to the width of the panel, not of the window: a narrow
   sidebar must not squeeze the title into nothing. The numbers go first, then
   the position. */
@container (max-width: 1000px){.er-read-stats{display:none}}
@container (max-width: 760px){.er-read-counter{display:none}}
@container (max-width: 620px){.er-read-chapter{display:none}}
.er-read-stat{font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.er-read-stat.is-learn{color:var(--dsw-alias-state-warn-primary)}
.er-read-stat.is-known{color:var(--dsw-alias-state-success-primary)}
.er-read-main{display:flex;align-items:stretch;gap:16px;flex:1;min-height:0}
.er-read-body{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:16px;overflow:auto;padding-right:4px}
/* The reading tools float as a slim card of round tiles, the way the
   reference reader does it. */
.er-read-tools{flex:none;display:flex;flex-direction:column;gap:4px;align-items:center;align-self:flex-start;position:sticky;top:4px;padding:8px 8px;border-radius:var(--dsw-radius-xl);background:var(--er-surface-1);border:1px solid var(--er-line);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-read-tool{display:flex;flex-direction:column;align-items:center;gap:4px;width:60px;padding:6px 2px 4px;border-radius:var(--dsw-radius-lg);border:0;background:transparent;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-read-tool:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-read-tool[aria-pressed="true"]{color:var(--er-accent);background:var(--er-surface-2)}
.er-read-tool:disabled{opacity:.4;cursor:default}
/* The icon sits in a soft round tile; the active one is filled. */
/* Each tool gets a soft tinted tile with a coloured glyph, the way the
   reference app draws them; the active one is the solid accent colour. */
.er-read-tool-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--er-accent-soft);color:var(--er-accent);transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease,transform var(--er-dur-hover) ease}
.er-read-tool:hover .er-read-tool-icon{background:var(--er-accent-hover);transform:translateY(-1px)}
.er-read-tool[aria-pressed="true"] .er-read-tool-icon{background:var(--er-accent);color:var(--er-on-accent)}
.er-read-tool:disabled{opacity:.45;cursor:default}
.er-read-tool:disabled:hover .er-read-tool-icon{background:var(--er-accent-soft);color:var(--er-accent)}
.er-read-tool-label{font-size:12px;line-height:1.2;text-align:center;color:var(--dsw-alias-label-tertiary)}
.er-read-tool[aria-pressed="true"] .er-read-tool-label{color:var(--er-accent);font-weight:500}
.er-read-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;padding:12px 16px;border-top:1px solid var(--er-line);border-radius:var(--dsw-radius-md);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);flex:none}
/* The player uses round buttons, like the reference app. */
.er-read-foot .er-btn-icon,.er-round-icon{display:inline-flex;font:inherit;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border-radius:50%;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.er-read-foot .er-btn-icon:hover,.er-round-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-round-icon[aria-pressed="true"]{background:var(--er-accent);color:var(--er-on-accent)}
.er-round-icon[aria-pressed="true"]:hover{background:var(--er-accent);filter:brightness(.94);color:var(--er-on-accent)}
.er-read-foot .er-btn-primary{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 16px 8px 13px}
.er-read-position{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-left:8px}
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
.er-play-panel{position:relative;box-sizing:border-box;width:100%;max-height:min(70vh,420px);overflow:auto;padding:14px 16px 12px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);color:var(--dsw-alias-label-primary)}
/* The panel fades in on its own: the script places it with an inline
   transform, so the entrance must not move the panel itself. */
@keyframes er-play-panel-in{from{opacity:0}to{opacity:1}}
/* The head: the panel's own name, and the way out of it. */
.er-play-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}
.er-play-title{flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.er-play-panel-head button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px 6px;border-radius:var(--dsw-radius-xs);font:inherit;font-size:13px;line-height:1;display:inline-flex;align-items:center}
.er-play-panel-head button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
/* A group caption: the name of the group on the left, a quiet note on the
   right. */
.er-play-caption{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px}
.er-play-caption-label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.er-play-caption-note{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
/* The range: three choices, each one third of the width. The control sits on
   a line of its own, so it can never crowd the caption out. */
.er-play-segment{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);border:1px solid var(--er-line)}
.er-play-segment-item{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.2;padding:6px 4px;border-radius:calc(var(--dsw-radius-sm) - 2px);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color var(--er-dur-hover) ease,color var(--er-dur-hover) ease}
.er-play-segment-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-play-segment-item[aria-pressed="true"]{background:var(--er-accent);color:var(--er-on-accent);font-weight:500}
.er-play-segment-item[aria-pressed="true"]:hover{background:var(--er-accent);filter:brightness(.94)}
/* The rows of the settings: a fixed label column, so every control lines up on
   the right edge whatever its own width. */
.er-play-rows{display:flex;flex-direction:column;margin-top:12px}
.er-play-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:30px}
.er-play-label{flex:none;width:84px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.er-play-row.is-disabled .er-play-label{color:var(--dsw-alias-label-tertiary)}
/* The selects are the selects of the toolbar, a size smaller: the panel is
   narrow and the two of them share its rows. */
.er-play-select{appearance:none;-webkit-appearance:none;flex:none;padding:5px 24px 5px 9px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background-color:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 12px) 52%,calc(100% - 7px) 52%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;width:124px;text-overflow:ellipsis;cursor:pointer;transition:border-color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
.er-play-select:hover{border-color:var(--er-line-strong);background-color:var(--dsw-alias-interactive-bg-hover)}
.er-play-select:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-play-select:disabled{opacity:.45;cursor:default}
.er-play-select:disabled:hover{border-color:var(--er-line);background-color:var(--er-surface-1)}
.er-play-select option{background:var(--er-surface-1);color:var(--dsw-alias-label-primary)}
/* The one line that says what the settings mean. */
.er-play-hint{margin-top:12px;padding-top:10px;border-top:1px solid var(--er-line);font-size:12px;line-height:1.45;color:var(--dsw-alias-label-tertiary)}
/* The badge sits inside the trigger, next to the glyph: it says what the
   playback is doing without opening anything. */
.er-play-badge{flex:none;font-size:10px;line-height:1;padding:2px 6px;border-radius:999px;background:var(--er-surface-2);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.er-word.is-hard{background:var(--er-accent-soft);border-radius:var(--dsw-radius-xs);padding:1px 2px}
.er-hard-wrap{display:inline-flex;flex-direction:column;align-items:center;vertical-align:top}
.er-hard-gloss{margin-top:2px;max-width:180px;font-size:12px;line-height:1.35;color:var(--dsw-alias-label-tertiary);text-align:center}
.er-cloze-blank{display:inline-block;min-width:48px;border-bottom:1px dashed var(--dsw-alias-label-tertiary);color:transparent}


/* The column width follows the setting; the reading area never gets wider
   than the window. */
.er-reading-page{display:flex;flex-direction:column;gap:12px;max-width:var(--er-column-width,68ch);margin:0 auto;width:100%}
/* The brass rail: the reader's one signature device. It runs down the left
   edge of the page and fills as the book is read. */
.er-reading-page::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:999px;background:linear-gradient(to bottom,var(--er-accent) 0 var(--er-progress,0%),var(--er-accent-soft) var(--er-progress,0%) 100%)}
/* The reading surface leans on size and colour, not on boxes: the paragraph
   being read is large and dark, the ones around it are smaller and quiet. */
.er-page-paragraph{margin:0}
/* The context paragraphs follow the size the learner picked, a little smaller. */
.er-page-paragraph.is-context{font-size:calc(var(--er-text-size, 18px) * .82);line-height:1.85;color:color-mix(in oklab,var(--er-ink) 68%,transparent)}
.er-page-paragraph.is-active{font-size:var(--er-text-size, 18px);line-height:2;color:var(--er-ink)}
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
.er-paragraph-action{position:relative;flex:none;display:inline-flex;font:inherit;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:opacity var(--er-dur-hover) ease,color var(--er-dur-hover) ease,background-color var(--er-dur-hover) ease}
/* The buttons wait for the pointer: they are hidden until the paragraph is
   hovered (or the button itself is focused). A touch screen has no hover,
   so there they stay where they are. */
@media (hover: hover){
  .er-paragraph-action{opacity:0}
  .er-paragraph-row:hover .er-paragraph-action,.er-paragraph-action:focus-visible{opacity:1}
}
.er-paragraph-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-paragraph-action:focus-visible{outline:var(--er-focus);outline-offset:1px}
/* The buttons that already did something keep their mark: a note, a
   translation, a paragraph being read. */
.er-paragraph-action.is-noted{opacity:1;color:var(--dsw-alias-state-warn-primary)}
.er-paragraph-action.is-translated{opacity:1;color:var(--dsw-alias-state-success-primary)}
.er-paragraph-action.is-speaking{opacity:1;color:var(--er-accent)}
.er-paragraph-note-count{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-state-warn-primary);color:var(--er-on-accent);font-size:12px;line-height:16px;text-align:center}

/* The note editor floats next to the paragraph it belongs to. */
.er-note-editor{position:fixed;z-index:1200;box-sizing:border-box;max-height:min(62vh,460px);overflow:auto;padding:12px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);font-size:13px;color:var(--dsw-alias-label-primary)}
.er-note-editor-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.er-note-editor-title{flex:1;min-width:0;font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary)}
.er-note-editor-close{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);font-size:13px;line-height:1;display:inline-flex;align-items:center}
.er-note-editor-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.er-note-editor-quote{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-tertiary);font-style:italic;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.er-note-editor-input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line-strong);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.er-note-editor-input:focus{outline:none;border-color:var(--er-accent)}
.er-note-editor-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-note-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.er-note-editor-list{display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--er-line)}
.er-note-editor-item{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:var(--dsw-radius-xs);background:var(--er-surface-2)}
.er-note-editor-text{flex:1;min-width:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}
.er-note-editor-delete{appearance:none;border:0;font:inherit;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);display:inline-flex;flex:none;align-items:center}
.er-note-editor-delete:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.er-note-editor-error{margin-top:8px;font-size:12px;color:var(--dsw-alias-state-error-primary)}


/* The learning-modes panel floats above the page: it is anchored to the tool
   that opened it and positioned in viewport coordinates, so the sticky mode
   row can never paint over it and it can never be cut off by a scroll
   container. */
.er-modes-panel{position:fixed;z-index:1200;box-sizing:border-box;max-height:min(62vh,440px);overflow:auto;padding:12px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float)}
.er-mode-row{display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer}
.er-mode-row+.er-mode-row{border-top:1px solid var(--er-line)}
.er-mode-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.er-mode-row-label{font-size:13px;color:var(--dsw-alias-label-primary)}
.er-mode-row-hint{font-size:12px;line-height:1.4;color:var(--dsw-alias-label-tertiary)}
.er-mode-row input{accent-color:var(--er-accent)}
.er-toc{display:flex;flex-direction:column;gap:2px;max-height:56vh;overflow:auto}
.er-toc-row{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;text-align:left;display:flex;align-items:baseline;gap:12px;padding:8px;border-radius:var(--dsw-radius-xs);cursor:pointer}
.er-toc-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.er-toc-row.is-current{color:var(--er-accent);font-weight:600}
.er-toc-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-toc-meta{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-paragraph-body{margin:0}
.er-sentence{border-radius:var(--dsw-radius-xs);transition:filter var(--er-dur-state) var(--er-ease),background-color var(--er-dur-state) var(--er-ease);background:transparent;border:0;padding:0}
.er-sentence.is-blurred{cursor:pointer}
.er-sentence.is-revealed{filter:none}
.er-word.is-blurred-word{filter:blur(3.6px);transition:filter var(--er-dur-state) var(--er-ease)}
.er-sentence.is-blurred:hover .er-word.is-blurred-word{filter:blur(1.6px)}
.er-translation{margin-top:8px;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary)}
.er-word.is-known{color:var(--dsw-alias-state-success-primary)}
.er-word.is-learning{color:var(--dsw-alias-state-warn-primary)}


.er-switch{position:relative;flex:none;width:34px;height:20px;border-radius:999px;border:1px solid var(--er-line-strong);background:var(--er-surface-3);cursor:pointer;padding:0}
.er-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform var(--er-dur-state) var(--er-ease),background-color var(--er-dur-state) var(--er-ease)}
.er-switch[aria-checked="true"]{background:var(--er-accent);border-color:var(--er-accent)}
.er-switch[aria-checked="true"]::after{transform:translateX(14px);background:var(--er-on-accent)}


.er-translate-toggle{margin-left:8px}
.er-toc-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.er-toc-hint{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}


.er-source{display:flex;flex-direction:column;gap:12px}
.er-source-search{display:flex;gap:8px}
.er-source-search input{flex:1;min-width:0;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.er-source-search input:focus{outline:none;border-color:var(--er-accent)}
.er-source-search input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-source-note{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.6}
.er-source-hint{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-source-list{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto}
.er-source-row{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--er-line);border-radius:var(--dsw-radius-sm);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge)}
.er-source-cover{width:44px;height:62px;flex:none;object-fit:cover;border-radius:var(--dsw-radius-xs);background:var(--er-surface-2)}
.er-source-main{flex:1;min-width:0}
.er-source-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-source-author{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-source-subjects{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}


.er-page-note{margin-top:16px;padding-top:12px;border-top:1px solid var(--er-line);font-size:12px;color:var(--dsw-alias-label-tertiary);letter-spacing:.01em}
.er-page-note.is-first{margin-top:0;margin-bottom:16px;padding:0 0 12px;border-top:0;border-bottom:1px solid var(--er-line)}
.er-page-note-keys{margin-left:12px;padding-left:12px;border-left:1px solid var(--er-line);color:var(--dsw-alias-label-tertiary);opacity:.8}


/* Feedback while the model draws a cover. */
.er-notice{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:8px 16px;border-radius:999px;font-size:13px;background:var(--er-surface-2);border:1px solid var(--er-line);color:var(--dsw-alias-label-secondary)}
.er-notice.is-ok{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent);color:var(--dsw-alias-state-success-primary)}
.er-notice.is-error{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);color:var(--dsw-alias-state-error-primary)}
.er-cover-busy{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;text-align:center;padding:12px}
.er-cover-spinner{width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:er-spin .8s linear infinite;flex:none}
@keyframes er-spin{to{transform:rotate(360deg)}}


.er-crash{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;text-align:center;padding:48px}
.er-crash-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}
.er-crash-hint{font-size:13px;color:var(--dsw-alias-label-secondary);max-width:360px;line-height:1.7}


/* The build stamp: how the reader tells a fresh window from a stale one. */
.er-book-menu-build{padding:8px 12px 4px;margin-top:4px;border-top:1px solid var(--er-line);font-size:12px;color:var(--dsw-alias-label-tertiary);opacity:.7;font-variant-numeric:tabular-nums}


.er-exit-button{width:28px;height:28px;flex:none}


.er-crash-detail{margin-top:8px;max-width:520px;padding:8px 12px;border-radius:var(--dsw-radius-sm);background:var(--er-surface-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-label-primary);word-break:break-word}
.er-crash-frame{max-width:520px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-label-tertiary);word-break:break-all}
.er-crash-actions{display:flex;gap:8px;margin-top:12px}


/* The reader's notes. */
.er-notes{display:flex;flex-direction:column;gap:16px;max-height:60vh;overflow:auto}
.er-note-new{display:flex;flex-direction:column;gap:8px}
.er-note-quote{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-tertiary);font-style:italic}
.er-note-input{width:100%;box-sizing:border-box;padding:8px 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-1);box-shadow:var(--er-shadow-card),var(--er-edge);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.er-note-input:focus{outline:none;border-color:var(--er-accent)}
.er-note-input:focus-visible{outline:var(--er-focus);outline-offset:1px}
.er-note-actions{display:flex;justify-content:flex-end}
.er-notes-list{display:flex;flex-direction:column;gap:8px}
.er-note{display:flex;flex-direction:column;gap:4px;padding:12px 16px;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-2);box-shadow:var(--er-shadow-card)}
.er-note-text{font-size:13px;line-height:1.65;color:var(--dsw-alias-label-primary);white-space:pre-wrap}
.er-note-meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.er-note-link{appearance:none;border:0;background:transparent;color:var(--er-accent);font:inherit;font-size:12px;cursor:pointer;padding:0}
.er-note-link:hover{text-decoration:underline}
.er-note-delete{appearance:none;border:0;font:inherit;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:4px;border-radius:var(--dsw-radius-xs);display:inline-flex;align-items:center}
.er-note-delete:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.er-notes-empty{padding:24px 8px;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.er-notes-button{position:relative;width:28px;height:28px;flex:none}
.er-notes-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-state-warn-primary);color:var(--er-on-accent);font-size:12px;line-height:16px;text-align:center}


/* The import card: a toast at the bottom of the panel that says what the
   import is doing. It floats over the shelf, so the body gets extra room
   while it is up — the card must never hide a book. */
.er-page.is-importing .er-body{padding-bottom:112px}
.er-import{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:1300;box-sizing:border-box;display:flex;align-items:flex-start;gap:12px;width:min(420px,calc(100% - 32px));padding:12px 16px;border-radius:var(--dsw-radius-lg);background:var(--er-overlay);border:1px solid var(--er-line);box-shadow:var(--er-shadow-float);pointer-events:none}
.er-import-spinner{width:16px;height:16px;margin-top:2px;flex:none;border-radius:50%;border:2px solid var(--er-accent);border-top-color:transparent;animation:er-spin .8s linear infinite}
.er-import-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.er-import-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.er-import-label{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.er-import-count{font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.er-import-file{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-import-track{height:4px;border-radius:999px;background:var(--er-surface-3);overflow:hidden}
.er-import-bar{display:block;height:100%;border-radius:999px;background:var(--er-accent);transition:width var(--er-dur-state) var(--er-ease)}
.er-import-stage{font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* The source file preview: the original book, seen in the panel. */
.er-source{display:flex;flex-direction:column;gap:12px;min-height:0}
.er-source-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.er-source-title{flex:1;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-source-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;white-space:nowrap}
.er-source-body{flex:1;min-height:240px;max-height:62vh;overflow:auto;border-radius:var(--dsw-radius-sm);border:1px solid var(--er-line);background:var(--er-surface-2)}
.er-source-text{margin:0;padding:16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.er-source-frame{display:block;width:100%;height:100%;min-height:240px;border:0;background:#fff}
.er-source-loading,.er-source-error{display:flex;align-items:center;justify-content:center;gap:8px;padding:32px 16px;font-size:13px;color:var(--dsw-alias-label-tertiary);text-align:center}
.er-source-error{color:var(--dsw-alias-state-error-primary)}
.er-source-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.er-source-picker{flex:1;min-width:120px;padding:6px 8px;border-radius:var(--dsw-radius-xs);border:1px solid var(--er-line);background:var(--er-surface-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.er-source-pages{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px}
.er-source-page{display:block;max-width:100%;height:auto;border-radius:var(--dsw-radius-xs);box-shadow:var(--er-shadow-float);background:#fff}
.er-source-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}


/* The focus ring. Every control that can be pressed says where the keyboard
   is: the ring is the host's own token, with the accent as its fallback. */
.er-round-button:focus-visible,
.er-segmented-item:focus-visible,
.er-scope-item:focus-visible,
.er-view-switch-item:focus-visible,
.er-book-menu-item:focus-visible,
.er-wordlist-chip:focus-visible,
.er-wordlist-button:focus-visible,
.er-wordlist-review-button:focus-visible,
.er-wordlist-close:focus-visible,
.er-wordcard-icon:focus-visible,
.er-note-editor-close:focus-visible,
.er-note-editor-delete:focus-visible,
.er-note-delete:focus-visible,
.er-note-link:focus-visible,
.er-wordlist-delete:focus-visible,
.er-wordlist-speak:focus-visible,
.er-wordlist-word:focus-visible,
.er-toc-row:focus-visible,
.er-type-icon:focus-visible,
.er-read-tool:focus-visible,
.er-read-foot .er-btn-icon:focus-visible,
.er-round-icon:focus-visible,
.er-switch:focus-visible,
.er-play-segment-item:focus-visible,
.er-play-panel-head button:focus-visible,
.er-toggle input:focus-visible,
.er-mode-row input:focus-visible{outline:var(--er-focus);outline-offset:1px}

/* Press feedback: a small step in, never a bounce. */
.er-btn:active:not(:disabled),
.er-mode:active,
.er-round-button:active,
.er-segmented-item:active,
.er-tab:active,
.er-scope-item:active,
.er-wordlist-chip:active,
.er-view-switch-item:active,
.er-read-tool:active,
.er-paragraph-action:active,
.er-wordlist-button:active,
.er-round-icon:active,
.er-play-segment-item:active{transform:scale(.97)}

/* The reduced-motion block: the durations go to zero, so nothing moves. */
@media (prefers-reduced-motion:reduce){
  .er-page,.er-page *,
  .er-wordcard,.er-wordcard *,
  .er-note-editor,.er-note-editor *,
  .er-modes-panel,.er-modes-panel *,
  .er-play-panel,.er-play-panel *{
    animation-duration:0s!important;
    animation-iteration-count:1!important;
    transition-duration:0s!important;
    transition-delay:0s!important;
    scroll-behavior:auto!important;
  }
}

`;
