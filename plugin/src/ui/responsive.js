/**
 * The viewport helpers of the reader.
 *
 * The plugin lives inside a panel whose width is not the window width, so the
 * layout answers to container queries (see the mobile layer of `styles.js`).
 * The overlays are a different case: the word card, the mode panel, the note
 * editor and the playback options are rendered into `document.body` — outside
 * the panel — so they can only answer to the viewport. This module is the one
 * place that knows those breakpoints, so no overlay invents a number of its
 * own.
 */
import { useEffect, useState } from 'react';

/** The viewport breakpoints, shared with the stylesheet's media queries. */
export const PHONE_QUERY = '(max-width: 600px)';
export const TABLET_QUERY = '(max-width: 900px)';

/**
 * Read a media query once, in a way a server render can survive.
 * @param {string} query
 * @returns {boolean}
 */
function matches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches === true;
  } catch {
    return false;
  }
}

/**
 * Which shape the viewport has right now: 'phone', 'tablet' or 'desktop'.
 *
 * The overlays that are portalled to the body pick their shape from here: a
 * phone gets a bottom sheet, a desktop keeps the floating panel.
 *
 * @returns {'phone'|'tablet'|'desktop'}
 */
export function useViewportKind() {
  const [kind, setKind] = useState(() => {
    if (matches(PHONE_QUERY)) return 'phone';
    if (matches(TABLET_QUERY)) return 'tablet';
    return 'desktop';
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const phone = window.matchMedia(PHONE_QUERY);
    const tablet = window.matchMedia(TABLET_QUERY);
    const update = () => {
      setKind(phone.matches ? 'phone' : tablet.matches ? 'tablet' : 'desktop');
    };
    phone.addEventListener?.('change', update);
    tablet.addEventListener?.('change', update);
    return () => {
      phone.removeEventListener?.('change', update);
      tablet.removeEventListener?.('change', update);
    };
  }, []);
  return kind;
}

/**
 * The height the on-screen keyboard takes out of the visual viewport, in
 * pixels, as a CSS custom property on the element that carries the reader.
 *
 * The phone browsers shrink the visual viewport but keep the layout viewport,
 * so a bar stuck to the bottom of the layout viewport ends up behind the
 * keyboard. The reader subtracts this inset from its own height, which lifts
 * the typing panel above the keyboard. On a desktop browser the inset is 0 and
 * nothing changes.
 *
 * @param {{current: (any|null)}} anchorRef - an element inside the reader.
 * @returns {void}
 */
export function useKeyboardInset(anchorRef) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const view = window.visualViewport;
    if (view === undefined || view === null) return undefined;
    const root = anchorRef?.current?.closest?.('.er-page') ?? null;
    if (root === null) return undefined;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const covered = Math.max(0, Math.round(window.innerHeight - view.height - view.offsetTop));
      root.style.setProperty('--er-keyboard-inset', `${covered > 80 ? covered : 0}px`);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(apply);
    };
    apply();
    view.addEventListener('resize', schedule);
    view.addEventListener('scroll', schedule);
    return () => {
      view.removeEventListener('resize', schedule);
      view.removeEventListener('scroll', schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      root.style.removeProperty('--er-keyboard-inset');
    };
  }, [anchorRef]);
}
