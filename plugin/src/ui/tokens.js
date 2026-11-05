/**
 * The reader's design tokens — one block for the whole plugin.
 *
 * The page, the modal, the word card, the note editor, the modes panel, the
 * playback options and the two modules that bring their own stylesheet (the
 * mind map and the podcast) all read from here, so the plugin cannot grow a
 * second skin.
 *
 * The values are the family's: brass on cold graphite, one hue family, one
 * text ramp of three steps that all clear 4.5:1 on every surface, semantic
 * colours as fill / base / ink / soft quadruples, and shadows tinted from a
 * dedicated shade token instead of the text token — in the dark theme the
 * text token is near-white, and a white shadow is no shadow at all.
 *
 * The reader adds exactly one material of its own: the paper. It is the
 * surface the book is printed on, and it is the only warm surface in the
 * plugin. Everything else stays graphite.
 */

export const TOKENS = `
.er-page,.er-modal,.er-wordcard,.er-note-editor,.er-modes-panel,.er-play-pop,.er-play-panel{
  /* ---- 表面层级：画布（沉）→ 卡片（浮）→ 浮层（再浮）。
     第四档不是"更深的灰"，而是一个内嵌槽：输入框、条纹、列表行。 ---- */
  --er-surface-0:color-mix(in oklab,var(--dsw-alias-bg-base) 95%,var(--dsw-alias-label-primary) 5%);
  --er-surface-1:var(--dsw-alias-bg-base);
  --er-surface-2:var(--dsw-alias-bg-base);
  --er-surface-3:color-mix(in oklab,var(--dsw-alias-bg-base) 90%,var(--dsw-alias-label-primary) 10%);
  --er-sunken:var(--er-surface-3);
  --er-overlay:var(--dsw-alias-bg-base);

  /* ---- 边：一条边只用一种分隔方式 ---- */
  --er-line:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);
  --er-line-strong:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);

  /* ---- 阴影：染"暗"，不染文字也不染边框。
     暗色模式下宿主的 label-primary 是近白色，拿它调阴影会得到一层白雾，
     所以阴影永远从 --er-shade 染。 ---- */
  --er-shade:var(--dsw-alias-label-primary);
  --er-shadow-card:0 1px 2px color-mix(in srgb,var(--er-shade) 6%,transparent),
                     0 10px 24px -16px color-mix(in srgb,var(--er-shade) 20%,transparent);
  --er-shadow-card-hover:0 2px 4px color-mix(in srgb,var(--er-shade) 8%,transparent),
                     0 18px 34px -18px color-mix(in srgb,var(--er-shade) 28%,transparent);
  --er-shadow-float:0 2px 6px color-mix(in srgb,var(--er-shade) 10%,transparent),
                     0 18px 40px -18px color-mix(in srgb,var(--er-shade) 34%,transparent);
  /* The page is a card with a deeper foot: the contact shadow of a sheet
     lifted off the canvas. It is written out, not stacked on the card
     shadow, so the two never double up. */
  --er-shadow-page:0 1px 2px color-mix(in srgb,var(--er-shade) 6%,transparent),
                     0 16px 34px -20px color-mix(in srgb,var(--er-shade) 26%,transparent);
  --er-shadow-lift:0 2px 4px color-mix(in srgb,var(--er-shade) 8%,transparent),
                     0 22px 44px -22px color-mix(in srgb,var(--er-shade) 32%,transparent);
  --er-edge:none;

  /* ---- 强调色：全家族只有这一个色相族（黄铜）。
     强调色本身在两种主题下、每一种表面上都 ≥4.5:1，
     所以同一个值可以同时当填充、描边和文字用。 ---- */
  --er-accent-base:#8A5E0C;
  --er-accent:var(--er-accent-base);
  --er-accent-strong:#7A5209;
  --er-accent-soft:color-mix(in oklab,var(--er-accent-base) 12%,transparent);
  --er-accent-hover:color-mix(in oklab,var(--er-accent-base) 20%,transparent);
  --er-accent-line:color-mix(in oklab,var(--er-accent-base) 38%,transparent);
  --er-accent-ink:var(--er-accent-base);
  --er-on-accent:var(--dsw-alias-bg-layer-1);
  /* The vivid step of the same hue, for graphic marks on a dark surface. */
  --er-gold:#D9A441;

  /* ---- 文字：三档，全部达标（次要文字也要 ≥4.5:1）。
     不能借宿主的 label-tertiary（亮色 3.71:1）。 ---- */
  --er-ink-1:var(--dsw-alias-label-primary);
  --er-ink-2:color-mix(in oklab,var(--dsw-alias-label-primary) 76%,var(--dsw-alias-bg-base) 24%);
  --er-ink-3:color-mix(in oklab,var(--dsw-alias-label-primary) 66%,var(--dsw-alias-bg-base) 34%);
  /* The alias the mind map and the podcast were written against. */
  --er-ink:var(--er-ink-1);
  --er-hover:color-mix(in oklab,var(--er-ink-1) 6%,transparent);
  --er-hover-strong:color-mix(in oklab,var(--er-ink-1) 11%,transparent);

  /* ---- 语义色：各自四件套（fill / base / ink / soft）。
     状态语义不可改，也绝不向品牌色靠拢。 ---- */
  --er-ok-fill:#158048; --er-ok:#1E9E5A; --er-ok-ink:#12703C;
  --er-ok-soft:color-mix(in oklab,var(--er-ok) 13%,transparent);
  --er-warn-fill:#A85F08; --er-warn:#C77A0B; --er-warn-ink:#8A560A;
  --er-warn-soft:color-mix(in oklab,var(--er-warn) 14%,transparent);
  --er-err-fill:#C4362E; --er-err:#D64A42; --er-err-ink:#A92C25;
  --er-err-soft:color-mix(in oklab,var(--er-err) 12%,transparent);
  --er-info-fill:#235FBE; --er-info:#2E72D9; --er-info-ink:#1D559E;
  --er-info-soft:color-mix(in oklab,var(--er-info) 12%,transparent);
  --er-idle:color-mix(in oklab,var(--dsw-alias-label-primary) 55%,var(--dsw-alias-bg-base) 45%);

  /* ---- 签名装置：纸与棕墨，只属于阅读栏。
     纸由宿主的画布底色掺一点黄铜而来，所以宿主换主题它跟着换；
     墨是材质，不跟宿主走。 ---- */
  --er-paper:color-mix(in oklab,var(--dsw-alias-bg-base) 94%,var(--er-accent-base) 6%);
  --er-paper-ink:#2A2620;
  --er-paper-ink-2:#57504A;
  --er-paper-line:rgba(42,38,32,.12);
  --er-paper-line-strong:rgba(42,38,32,.20);
  --er-paper-ink-wash:color-mix(in oklab,var(--er-paper-ink) 12%,transparent);

  /* ---- 动效：短反馈，缓出 ---- */
  --er-dur-hover:100ms;
  --er-dur-state:200ms;
  --er-dur-pop:180ms;
  --er-dur-modal:240ms;
  --er-ease:cubic-bezier(.23,1,.32,1);

  /* ---- 圆角：沿用宿主那套标尺，插件不另立 ---- */
  --er-r-ctl:var(--dsw-radius-xs,4px);
  --er-r-inp:var(--dsw-radius-sm,8px);
  --er-r-card:var(--dsw-radius-md,12px);
  --er-r-float:var(--dsw-radius-lg,16px);
  --er-r-pill:999px;

  --er-focus:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--er-accent));
}
body[data-ds-dark-theme] .er-page,
body[data-ds-dark-theme] .er-modal,
body[data-ds-dark-theme] .er-wordcard,
body[data-ds-dark-theme] .er-note-editor,
body[data-ds-dark-theme] .er-modes-panel,
body[data-ds-dark-theme] .er-play-pop,
body[data-ds-dark-theme] .er-play-panel{
  --er-surface-0:var(--dsw-alias-bg-base);
  --er-surface-1:var(--dsw-alias-bg-layer-1);
  --er-surface-2:var(--dsw-alias-bg-layer-2);
  --er-surface-3:var(--dsw-alias-bg-base);
  --er-overlay:var(--dsw-alias-bg-layer-2);
  --er-line:color-mix(in srgb,var(--dsw-alias-label-primary) 13%,transparent);
  --er-line-strong:color-mix(in srgb,var(--dsw-alias-label-primary) 21%,transparent);
  --er-shade:var(--dsw-alias-bg-base);
  --er-accent-base:#E3A82B;
  --er-accent-strong:#EFBB4E;
  --er-on-accent:var(--dsw-alias-bg-base);
  --er-gold:#F0C561;
  --er-ok-fill:#1E7A4D; --er-ok:#3FBF7F; --er-ok-ink:#7FD9AC;
  --er-ok-soft:color-mix(in oklab,var(--er-ok) 16%,transparent);
  --er-warn-fill:#8A5B12; --er-warn:#E0A03A; --er-warn-ink:#F0C57E;
  --er-warn-soft:color-mix(in oklab,var(--er-warn) 16%,transparent);
  --er-err-fill:#8E2B24; --er-err:#F2726A; --er-err-ink:#F5A9A3;
  --er-err-soft:color-mix(in oklab,var(--er-err) 16%,transparent);
  --er-info-fill:#24548F; --er-info:#5C9BF0; --er-info-ink:#A7C8F7;
  --er-info-soft:color-mix(in oklab,var(--er-info) 16%,transparent);
  /* In the dark theme a surface is raised by getting lighter, never darker.
     The paper is the lightest surface of the reading column: a lit page. */
  --er-paper:color-mix(in oklab,var(--dsw-alias-bg-base) 94%,var(--er-accent-base) 6%);
  --er-paper-ink:#E8E0D0;
  --er-paper-ink-2:#B9B1A2;
  --er-paper-line:rgba(255,255,255,.12);
  --er-paper-line-strong:rgba(255,255,255,.20);
}
`;
