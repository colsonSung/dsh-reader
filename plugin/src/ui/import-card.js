/**
 * The import progress card.
 *
 * A toast at the bottom of the panel that says what the import is doing
 * right now: which file, which stage, and how far the bar has come. It never
 * blocks the shelf — the learner can keep browsing while a book is parsed.
 */
import { createElement as h } from 'react';
import { progressPercent } from '../lib/import-progress.js';

/**
 * Fill `{name}` placeholders in a locale string. The locale service has no
 * interpolation of its own, so the plugin does it here.
 * @param {string} template
 * @param {Record<string, number|string>} values
 * @returns {string}
 */
function format(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

/**
 * The line under the bar: where the import is right now.
 *
 * A parser that can count its own work (PDF pages, EPUB chapters) says so;
 * the others just name the stage.
 *
 * @param {Function} t - translator
 * @param {string} stage - the stage id.
 * @param {{ current?: number, total?: number, unit?: string } | null} detail
 * @returns {string}
 */
function stageLabel(t, stage, detail) {
  if (detail && detail.total > 0) {
    if (detail.unit === 'page') {
      return format(t('library.importPages'), { current: detail.current, total: detail.total });
    }
    if (detail.unit === 'chapter') {
      return format(t('library.importChapters'), { current: detail.current, total: detail.total });
    }
  }
  return t(`library.importStage.${stage}`);
}

/**
 * The import progress card.
 *
 * @param {object} props
 * @param {Function} props.t - translator
 * @param {{ name?: string, index?: number, total?: number, stage?: string,
 *   ratio?: number, detail?: object | null } | null} props.progress
 * @param {{ okCount?: number, failCount?: number, allFailed?: boolean } | null} props.result
 *   - the outcome of an import that did not go through. The card carries only
 *   the counts: the per-file report is too long for a toast that floats over
 *   the shelf, so it lives in the shelf itself.
 * @returns {any} the element tree
 */
export function ImportCard({ t, progress, result }) {
  const failCount = Math.max(0, Number(result?.failCount ?? 0));
  const okCount = Math.max(0, Number(result?.okCount ?? 0));
  const failed = failCount > 0;
  if ((progress === null || progress === undefined) && !failed) return null;

  // The outcome of an import that did not go through.
  //
  // The card is a toast over the shelf: it stays small and it never lists
  // the files. The learner gets the counts here and the per-file report in
  // the shelf, where the books are.
  if (failed) {
    const allFailed = result?.allFailed === true;
    const counts = allFailed
      ? format(t('import.partialFail'), { count: failCount })
      : `${format(t('import.partialOk'), { count: okCount })} · ${format(t('import.partialFail'), { count: failCount })}`;
    return h(
      'div',
      { className: 'er-import', role: 'status', 'aria-live': 'polite' },
      h(
        'div',
        { className: 'er-import-body' },
        h(
          'div',
          { className: 'er-import-head' },
          h('span', { className: 'er-import-label' }, allFailed ? t('import.allFailed') : t('import.partialTitle')),
          h('span', { className: 'er-import-count' }, `${okCount} / ${okCount + failCount}`),
        ),
        h('div', { className: 'er-import-stage' }, counts),
      ),
    );
  }

  const percent = progressPercent(progress);
  const total = Math.max(1, progress.total ?? 1);
  const index = Math.min(Math.max(0, progress.index ?? 0), total - 1);
  const name = String(progress.name ?? '');
  return h(
    'div',
    { className: 'er-import', role: 'status', 'aria-live': 'polite' },
    h('span', { className: 'er-import-spinner' }),
    h(
      'div',
      { className: 'er-import-body' },
      h(
        'div',
        { className: 'er-import-head' },
        h('span', { className: 'er-import-label' }, t('library.importing')),
        h('span', { className: 'er-import-count' }, `${index + 1} / ${total}`),
      ),
      h('div', { className: 'er-import-file', title: name }, name),
      h(
        'div',
        { className: 'er-import-track' },
        h('span', { className: 'er-import-bar', style: { width: `${percent}%` } }),
      ),
      h('div', { className: 'er-import-stage' }, stageLabel(t, progress.stage ?? 'read', progress.detail ?? null)),
    ),
  );
}
