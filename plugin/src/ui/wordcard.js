/**
 * The word card.
 *
 * Clicking a word in the reader opens this card next to the word: the word
 * itself, its pronunciation, and an AI-written dictionary entry (phonetic,
 * part of speech, Chinese definition, examples, and how the word reads in this
 * particular sentence). The word can be saved into the vocabulary list from
 * here.
 *
 * On a phone the card is a bottom sheet instead of a floating panel: 340
 * pixels of floating card over a 390 pixel screen would cover the sentence it
 * is explaining. The sheet is closed by the close button, by tapping outside,
 * by Escape, or by dragging the handle at its top edge down.
 */
import { speakWord } from '../lib/speech.js';
import { createElement as h, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { askAi } from '../lib/ai.js';
import { CloseIcon, CopyIcon, SoundIcon, StarIcon } from './icons.js';
import { useViewportKind } from './responsive.js';

/** The width of the floating card on a wide screen. */
const CARD_WIDTH = 340;
/** The gap between the card and the sentence it belongs to. */
const GAP = 12;
/** The margin the card keeps from the edges of the window. */
const MARGIN = 12;
/** How far the sheet has to be dragged down before it closes. */
const DISMISS_DISTANCE = 96;

/**
 * Speak a word: the cloud voice first, the browser's own voice as the
 * fallback.
 * @param {string} text
 */
function speak(text) {
  void speakWord(text);
}

/**
 * Whether two boxes intersect.
 * @param {{left:number,right:number,top:number,bottom:number}} a
 * @param {{left:number,right:number,top:number,bottom:number}} b
 * @returns {boolean}
 */
function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Where a floating card goes so that it explains a word without covering it.
 *
 * The card has to stay away from three things: the word that was clicked, the
 * sentence it lives in, and the sentence the learner is reading. A card that
 * lands on the text it explains is worse than no card at all. It goes under
 * the clicked sentence when there is room, above it when there is not, and
 * when both are taken it goes under or above the pair. The result is clamped
 * inside the panel (not merely the window: the sidebar is not the reader).
 *
 * @param {{left:number,right:number,top:number,bottom:number}} anchor - the word.
 * @param {{left:number,right:number,top:number,bottom:number}|null} sentence - its sentence.
 * @param {{left:number,right:number,top:number,bottom:number}|null} active - the sentence being read.
 * @param {{left:number,right:number,top:number,bottom:number}} panel - the reader panel.
 * @param {number} cardWidth
 * @param {number} cardHeight
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {{left:number, top?:number, bottom?:number, maxHeight:number, width:number}}
 */
function floatPlacement(anchor, sentence, active, panel, cardWidth, cardHeight, viewportWidth, viewportHeight) {
  const margin = MARGIN;
  // The panel is the space the card may use; the window is only a fallback.
  const frame = {
    left: Math.max(0, panel?.left ?? 0),
    right: Math.min(viewportWidth, panel?.right ?? viewportWidth),
    top: Math.max(0, panel?.top ?? 0),
    bottom: Math.min(viewportHeight, panel?.bottom ?? viewportHeight),
  };
  const width = Math.min(cardWidth, Math.max(220, frame.right - frame.left - margin * 2));
  const height = Math.min(Math.max(cardHeight, 160), frame.bottom - frame.top - margin * 2);
  const box = sentence ?? anchor;
  const centre = anchor.left + (anchor.right - anchor.left) / 2;
  let left = Math.round(centre - width / 2);
  left = Math.max(frame.left + margin, Math.min(left, frame.right - width - margin));

  const roomBelow = frame.bottom - margin - (box.bottom + GAP);
  const roomAbove = box.top - GAP - (frame.top + margin);
  const need = Math.min(height, 200);

  const makeBelow = (from) => ({
    left,
    top: Math.round(from.bottom + GAP),
    maxHeight: Math.max(140, Math.min(frame.bottom - margin - (from.bottom + GAP), frame.bottom - frame.top - margin * 2)),
    width,
  });
  const makeAbove = (from) => ({
    left,
    bottom: Math.round(frame.bottom - (from.top - GAP)),
    maxHeight: Math.max(140, Math.min(from.top - GAP - (frame.top + margin), frame.bottom - frame.top - margin * 2)),
    width,
  });
  const boxOf = (placement, from) => {
    const top = placement.top ?? (placement.bottom === undefined ? from.bottom : frame.bottom - placement.bottom);
    return { left, right: left + width, top, bottom: top + Math.min(placement.maxHeight, height) };
  };
  const clear = (placement, from) => {
    const rect = boxOf(placement, from);
    if (rect.top < frame.top + margin || rect.bottom > frame.bottom - margin) return false;
    if (overlaps(rect, anchor)) return false;
    if (sentence !== null && overlaps(rect, sentence)) return false;
    if (active !== null && overlaps(rect, active)) return false;
    return true;
  };

  // First choice: under or over the clicked sentence, whichever clears
  // everything and has room for its first screenful.
  const under = makeBelow(box);
  if (roomBelow >= need && clear(under, box)) return under;
  const over = makeAbove(box);
  if (roomAbove >= need && clear(over, box)) return over;
  // Second choice: under or over the pair (the clicked sentence and the one
  // being read), which is where a long paragraph leaves no room.
  const pair = active === null
    ? box
    : {
      left: Math.min(box.left, active.left),
      right: Math.max(box.right, active.right),
      top: Math.min(box.top, active.top),
      bottom: Math.max(box.bottom, active.bottom),
    };
  if (active !== null) {
    const roomUnderPair = frame.bottom - margin - (pair.bottom + GAP);
    const roomOverPair = pair.top - GAP - (frame.top + margin);
    if (roomUnderPair >= need) return makeBelow(pair);
    if (roomOverPair >= need) return makeAbove(pair);
  }
  // Last resort: the larger of the two sides, clamped, still scrolling.
  if (roomBelow >= roomAbove) return under;
  return over;
}

/**
 * The floating word card.
 * @param {object} props
 * @param {Function} props.t - translator
 * @param {string} props.word - the clicked word
 * @param {string} props.sentence - the sentence it appears in
 * @param {{ x: number, y: number }} props.position - the click position
 * @param {any} [props.anchorEl] - the word element that was clicked
 * @param {any} [props.sentenceEl] - the sentence element the word is in
 * @param {object|null} props.entry - the vocabulary entry, when the word is saved
 * @param {Function} props.onClose
 * @param {Function} props.onSave - called with the card data when the learner saves the word
 * @param {Function} props.onRemove - called with the word when the learner removes it
 * @param {Function} props.onOpenWordList - called when the learner opens the vocabulary list
 * @returns {any} the element tree
 */
export function WordCard({
  t, word, sentence, position, anchorEl, sentenceEl, activeEl, panelEl,
  entry, onClose, onSave, onRemove, onOpenWordList,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [placement, setPlacement] = useState(null);
  const [drag, setDrag] = useState(0);
  const cardRef = useRef(null);
  const dragStart = useRef(null);
  const viewport = useViewportKind();
  const sheet = viewport === 'phone';

  // Ask the host for the entry; every word gets its own request.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    askAi('word', { word, sentence })
      .then((result) => { if (!cancelled) setData(result ?? {}); })
      .catch((reason) => { if (!cancelled) setError(reason?.message ?? t('reader.aiFailed')); });
    return () => { cancelled = true; };
  }, [word, sentence, t]);

  // A word saved before the answer arrived keeps the phonetic and the
  // definition once the model has answered.
  useEffect(() => {
    if (data === null || entry === undefined) return;
    if ((entry.definition ?? '') === (data.definition ?? '') && (entry.phonetic ?? '') === (data.phonetic ?? '')) return;
    void onSave({ word, sentence, phonetic: data.phonetic ?? '', definition: data.definition ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, entry?.id]);

  // Clicking outside closes the card, and so does Escape.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (cardRef.current?.contains(event.target) === true) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  // The floating card keeps itself out of the sentence it explains. The
  // reader scrolls inside its own box, so the position is read again from the
  // word element whenever anything scrolls or the window changes size.
  useLayoutEffect(() => {
    if (sheet) {
      setPlacement(null);
      return undefined;
    }
    let frame = 0;
    const place = () => {
      frame = 0;
      const card = cardRef.current;
      if (card === null) return;
      const boxOf = (element) => (element?.isConnected === true
        ? element.getBoundingClientRect()
        : null);
      const liveAnchor = boxOf(anchorEl);
      const liveSentence = boxOf(sentenceEl);
      const liveActive = boxOf(activeEl);
      const livePanel = boxOf(panelEl) ?? {
        left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight,
      };
      const anchorBox = liveAnchor ?? {
        left: position.x, right: position.x, top: position.y, bottom: position.y,
      };
      const next = floatPlacement(
        anchorBox,
        liveSentence,
        liveActive,
        livePanel,
        CARD_WIDTH,
        card.offsetHeight || 260,
        window.innerWidth,
        window.innerHeight,
      );
      setPlacement(next);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [sheet, anchorEl, sentenceEl, activeEl, panelEl, position.x, position.y]);

  // Dragging the handle of the sheet down closes it.
  const startDrag = (event) => {
    dragStart.current = { y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event) => {
    if (dragStart.current === null) return;
    setDrag(Math.max(0, event.clientY - dragStart.current.y));
  };
  const endDrag = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (drag > DISMISS_DISTANCE) onClose();
    setDrag(0);
  };

  const saved = entry !== null && entry !== undefined;
  const style = sheet
    ? (drag > 0 ? { transform: `translateY(${drag}px)` } : undefined)
    : (placement ?? { visibility: 'hidden' });
  const className = `er-wordcard${sheet ? ' is-sheet' : ''}${drag > 0 ? ' is-dragging' : ''}`;

  const card = h(
    'div',
    { ref: cardRef, className, style, role: 'dialog', 'aria-label': word },
    sheet
      ? h(
        'div',
        {
          className: 'er-sheet-handle',
          onPointerDown: startDrag,
          onPointerMove: moveDrag,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
          role: 'presentation',
        },
        h('span', { className: 'er-sheet-handle-bar' }),
      )
      : null,
    h(
      'div',
      { className: 'er-wordcard-head' },
      h('div', { className: 'er-wordcard-word' }, word),
      h(
        'div',
        { className: 'er-wordcard-actions' },
        h('button', { type: 'button', className: 'er-wordcard-icon', title: t('reader.speakWord'), 'aria-label': t('reader.speakWord'), onClick: () => { speak(word); } }, h(SoundIcon, { size: 15 })),
        h(
          'button',
          {
            type: 'button',
            className: `er-wordcard-icon${saved ? ' is-saved' : ''}`,
            title: saved ? t('reader.removeFromVocab') : t('reader.addToVocab'),
            'aria-label': saved ? t('reader.removeFromVocab') : t('reader.addToVocab'),
            onClick: async () => {
              setSaving(true);
              try {
                if (saved) await onRemove(word);
                else await onSave({ word, sentence, phonetic: data?.phonetic ?? '', definition: data?.definition ?? '' });
              } finally {
                setSaving(false);
              }
            },
          },
          h(StarIcon, { size: 15, filled: saved }),
        ),
        h('button', { type: 'button', className: 'er-wordcard-icon', title: t('reader.copyWord'), 'aria-label': t('reader.copyWord'), onClick: () => { void navigator.clipboard?.writeText(word); } }, h(CopyIcon, { size: 15 })),
        h('button', { type: 'button', className: 'er-wordcard-icon', title: t('reader.close'), 'aria-label': t('reader.close'), onClick: onClose }, h(CloseIcon, { size: 14 })),
      ),
    ),
    data?.phonetic ? h('div', { className: 'er-wordcard-phonetic' }, data.phonetic) : null,
    data?.partOfSpeech ? h('div', { className: 'er-wordcard-pos' }, data.partOfSpeech) : null,
    data?.definition ? h('div', { className: 'er-wordcard-definition' }, data.definition) : null,
    error ? h('div', { className: 'er-wordcard-error' }, error) : null,
    error === '' && data === null ? h('div', { className: 'er-wordcard-loading' }, t('reader.aiLoading')) : null,
    Array.isArray(data?.examples) && data.examples.length > 0
      ? h(
        'div',
        { className: 'er-wordcard-examples' },
        data.examples.slice(0, 3).map((example, index) => h(
          'div',
          { key: index, className: 'er-wordcard-example' },
          h('div', { className: 'er-wordcard-example-en' }, example.en),
          example.zh ? h('div', { className: 'er-wordcard-example-zh' }, example.zh) : null,
        )),
      )
      : null,
    data?.contextNote ? h('div', { className: 'er-wordcard-note' }, data.contextNote) : null,
    h(
      'div',
      { className: 'er-wordcard-foot' },
      h(
        'button',
        {
          type: 'button',
          className: 'er-btn',
          disabled: saving,
          onClick: async () => {
            await onSave({ word, sentence, phonetic: data?.phonetic ?? '', definition: data?.definition ?? '' });
          },
        },
        saved ? t('reader.saved') : t('reader.saveToVocab'),
      ),
      h('button', { type: 'button', className: 'er-btn', onClick: onOpenWordList }, t('reader.openWordList')),
    ),
  );

  if (typeof document === 'undefined') return card;
  return createPortal(card, document.body);
}
