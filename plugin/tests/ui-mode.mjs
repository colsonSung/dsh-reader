/**
 * Pick a practice mode the way the page now offers it: one button in the top
 * bar opens the panel, and the mode is a chip inside that panel.
 *
 * The floating strip that used to carry these chips is the phone's layout; on
 * the desktop the panel is the only place they exist.
 */
import { dom } from './dom-setup.mjs'

/**
 * @param {{ container: any, act: Function }} context - the mounted reader.
 * @param {string} label - the chip text (the tests run with t = key => key).
 * @returns {Promise<any>} the chip that was clicked.
 */
export async function chooseMode({ container, act }, label) {
  // The practice mode is one click in the bar: no panel in between.
  const chip = [...container.querySelectorAll('.er-mode-button')]
    .find((node) => node.getAttribute('title') === label)
  if (chip === undefined) throw new Error('no mode button for ' + label)
  await act(async () => { chip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  return chip
}
