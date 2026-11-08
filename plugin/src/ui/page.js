/**
 * The main panel page.
 *
 * The top bar carries the import button, the section switch and the shelf
 * menu; the body shows the shelf, the reader or the vocabulary list.
 */
import { Component, createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseBook } from '../lib/parsers/index.js';
import { coverToDataUrl, dataUrlToCover, generateCover as drawPlaceholderCover, isOversizedCover, COVER_INLINE_MAX } from '../lib/cover.js';
import { coverSizeOf, fetchCoverBytes } from '../lib/cover-file.js';
import { buildUnits } from '../shared/segment.js';
import { askAi } from '../lib/ai.js';
import { deleteBook, getBook, listBookSummaries, newBookId, saveBook, saveBookCover, updateProgress } from '../lib/store.js';
import { downloadSourceFile, uploadSourceFile } from '../lib/source-file.js';
import { LibraryView } from './library.js';
import { ImportCard } from './import-card.js';
import { GlobeIcon, ImportIcon, MoreIcon } from './icons.js';
import { OnlineLibrary } from './online-library.js';
import { ReaderView } from './reader.js';
import { SourcePreview } from './source-preview.js';
import { WordList } from './wordlist.js';
import { loadSession, saveSession } from '../lib/session.js';


/**
 * A render error must not take the whole panel down.
 *
 * The boundary wraps the tab body only, so the top bar stays usable and the
 * learner can switch to another section. It also shows what went wrong, which
 * is the only way to diagnose a crash in the desktop app.
 */
class SectionBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.warn('[reader] section failed: ' + (error instanceof Error ? error.message : String(error)));
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    // The translator comes in as a prop: this class has no `t` of its own, and
    // reaching for one would throw a second error that hides the first.
    const { t } = this.props;
    const detail = error instanceof Error ? error.message : String(error);
    const frame = typeof error?.stack === 'string'
      ? error.stack.split('\n').find((line) => line.includes('/reader/')) ?? ''
      : '';
    return h(
      'div',
      { className: 'er-crash' },
      h('div', { className: 'er-crash-title' }, t('app.crashed')),
      h('div', { className: 'er-crash-hint' }, t('app.crashHint')),
      detail === '' ? null : h('div', { className: 'er-crash-detail' }, detail),
      frame === '' ? null : h('div', { className: 'er-crash-frame' }, frame.trim()),
      h(
        'button',
        {
          type: 'button',
          className: 'er-btn er-btn-primary',
          onClick: () => { globalThis.location?.reload?.(); },
        },
        t('app.reload'),
      ),
    );
  }
}

const VIEW_KEY = 'reader:library-view';

/**
 * How long the import card stays on screen at least.
 *
 * A fast TXT import finishes in a few dozen milliseconds; without a floor the
 * card would flash and vanish, which reads as a glitch rather than as progress.
 */
const MIN_IMPORT_VISIBLE_MS = 700;

/**
 * How long the card keeps the outcome of a failed import.
 *
 * The card is a toast over the shelf: it must not stay there long, but the
 * counts of a failed import have to be readable. The per-file report stays
 * in the shelf, so the card only needs to be seen once.
 */
const IMPORT_RESULT_VISIBLE_MS = 5000;

/**
 * Read the stored shelf view mode.
 * @returns {'grid'|'list'}
 */
function loadView() {
  try {
    return globalThis.localStorage?.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

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
 * The plugin's page.
 * @param {object} props
 * @param {Function} props.t - translator
 * @returns {any} the element tree
 */
export function EnglishReaderPage({ t, build }) {
  const [tab, setTab] = useState('library');
  const [books, setBooks] = useState([]);
  const [activeBookId, setActiveBookId] = useState(null);
  const [units, setUnits] = useState([]);
  const [index, setIndex] = useState(0);
  const [importProgress, setImportProgress] = useState(null);
  // The outcome of an import that did not go through. The card carries it
  // for a moment; the shelf carries the per-file report.
  const [importCardResult, setImportCardResult] = useState(null);
  // The per-file report of a failed import. It stays in the shelf until the
  // next import or until the learner opens a book.
  const [importReport, setImportReport] = useState(null);
  // The book that is being opened. Its text is fetched when the learner
  // opens it, and the panel has to say what is going on while it travels.
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [wordListOpen, setWordListOpen] = useState(false);
  const [cardRequest, setCardRequest] = useState(null);
  const [view, setView] = useState(loadView);
  const [sort, setSort] = useState('recent');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  // The book whose source file is being looked at.
  const [previewBookId, setPreviewBookId] = useState(null);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);
  const importStartedAt = useRef(0);
  const importHideTimer = useRef(null);
  const importResultTimer = useRef(null);
  // The covers that still have to be shrunk, and the ones that are being
  // shrunk right now.
  const coverQueue = useRef([]);
  const coverWorker = useRef(false);
  const coverDone = useRef(new Set());
  const coverTimer = useRef(null);
  // The shelf is read again after a cover was shrunk. It is reached through
  // a ref, because the shelf read is what fills the queue in the first
  // place: the two must not depend on each other.
  const refreshRef = useRef(null);
  // The book that is being read: its record is not written back by the
  // background worker.
  const activeBookRef = useRef(null);

  // The books as they are right now: the shelf list is patched in place
  // (a book that was read on gets its progress changed), so the newest
  // progress has to be readable from here and not from a stale copy.
  const booksRef = useRef(books);
  useEffect(() => { booksRef.current = books; }, [books]);

  // Shrink one cover and write the small one back.
  //
  // The cover is shrunk in the browser — the Host has no canvas and cannot
  // do it. Only the picture travels: the Host merges the new cover into the
  // record, so the text, the progress and the source file stay as they are
  // and the reading position of a book that is being read is never lost to
  // a picture.
  //
  // @param {string} id - the book.
  // @param {{ mime: string, bytes: Uint8Array }|null} picture - the picture.
  // @returns {Promise<boolean>} true when the cover was shrunk.
  const shrinkCoverOf = useCallback(async (id, picture) => {
    if (picture === null || picture === undefined) return false;
    if (coverDone.current.has(id)) return false;
    coverDone.current.add(id);
    try {
      const small = await coverToDataUrl(picture);
      if (typeof small !== 'string' || small === '') return false;
      await saveBookCover(id, small);
      return true;
    } catch (error) {
      console.warn('[reader] 封面缩小失败：' + (error?.message ?? String(error)));
      return false;
    }
  }, []);

  // The worker: one book at a time, in the background.
  const runCoverWorker = useCallback(async () => {
    if (coverWorker.current) return;
    coverWorker.current = true;
    try {
      while (coverQueue.current.length > 0) {
        const book = coverQueue.current.shift();
        if (book === undefined) break;
        // The book that is being read is left to the reader: writing its
        // record back while the learner reads on would race with the
        // progress writes.
        if (book.id === activeBookRef.current) continue;
        try {
          // The bytes of the picture come from the picture's own route: the
          // record of the book does not have to travel at all.
          const { bytes, mime } = await fetchCoverBytes(book.cover);
          const shrunk = await shrinkCoverOf(book.id, { mime, bytes });
          // The shelf points at the old picture: the new address has to come
          // from the Host, or the grid keeps showing the old one.
          if (shrunk) await refreshRef.current?.();
        } catch (error) {
          console.warn('[reader] 封面缩小失败：' + (error?.message ?? String(error)));
        }
      }
    } finally {
      coverWorker.current = false;
    }
  }, [shrinkCoverOf]);

  // The covers that are still the full size of the model's drawing are
  // shrunk once, in the background.
  //
  // A learner who only looks at the shelf never opens a book, so the big
  // picture would be downloaded on every visit — forever. The shelf must
  // not wait for this: the work starts once the panel is interactive, and
  // one book at a time.
  const scheduleCoverShrink = useCallback((summaries) => {
    const waiting = [];
    for (const book of summaries ?? []) {
      const cover = typeof book?.cover === 'string' ? book.cover : '';
      if (cover === '') continue;
      // The size of the stored cover: the address says it for a picture
      // that travels on its own route, and a picture that is already inline
      // says it itself.
      const size = cover.startsWith('data:') ? cover.length : coverSizeOf(cover);
      if (size <= COVER_INLINE_MAX) continue;
      if (coverDone.current.has(book.id)) continue;
      waiting.push(book);
    }
    if (waiting.length === 0) return;
    coverQueue.current.push(...waiting);
    if (coverTimer.current !== null) return;
    coverTimer.current = window.setTimeout(() => {
      coverTimer.current = null;
      void runCoverWorker();
    }, 600);
  }, [runCoverWorker]);

  const refresh = useCallback(async () => {
    try {
      // The shelf shows the books, not their text: the summaries are a few
      // kilobytes where the whole shelf is megabytes.
      const stored = await listBookSummaries();
      setBooks(stored);
      scheduleCoverShrink(stored);
    } catch (loadError) {
      setError(loadError?.message ?? t('library.loadFailed'));
    }
  }, [scheduleCoverShrink, t]);

  // The worker needs the newest shelf read, but the shelf read fills the
  // worker's queue — so the two meet here, and not through each other.
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => { activeBookRef.current = activeBookId; }, [activeBookId]);

  useEffect(() => {
    refresh().finally(() => { setLoaded(true); });
  }, [refresh]);

  // Leaving the panel stops the background work.
  useEffect(() => () => {
    if (coverTimer.current !== null) window.clearTimeout(coverTimer.current);
    coverTimer.current = null;
    coverQueue.current = [];
  }, []);

  // The reading position is written once the learner stops moving.
  useEffect(() => {
    if (activeBookId === null || units.length === 0) return undefined;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const unit = units[index];
      void updateProgress(activeBookId, {
        unitIndex: index,
        chapterIndex: unit?.chapterIndex ?? 0,
        percent: units.length > 0 ? index / (units.length - 1 || 1) : 0,
      });
    }, 800);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [activeBookId, index, units]);

  // Ask the model for a cover; the shelf keeps working while it is drawn.
  const generateAiCover = useCallback(async (book) => {
    try {
      const result = await askAi('cover', { title: book.title });
      if (typeof result?.url !== 'string' || result.url === '') return false;
      // The picture the model draws is 832×1248 — nearly 400 KB of base64.
      // The shelf draws a cover at 168 px, so the picture is shrunk to a
      // thumbnail first, exactly like an imported cover.
      const small = await coverToDataUrl(dataUrlToCover(result.url)) ?? result.url;
      // The book may have been renamed or deleted while the cover was drawn,
      // so the stored copy is read again instead of the one we started with.
      const stored = await getBook(book.id);
      if (stored === undefined) return false;
      await saveBook({ ...stored, cover: small });
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  // The import card is cleared at the end of an import, but not before it has
  // been on screen long enough to be read.
  const clearImportProgress = useCallback(() => {
    if (importHideTimer.current !== null) {
      window.clearTimeout(importHideTimer.current);
      importHideTimer.current = null;
    }
    const elapsed = Date.now() - importStartedAt.current;
    const wait = Math.max(0, MIN_IMPORT_VISIBLE_MS - elapsed);
    if (wait === 0) {
      setImportProgress(null);
      return;
    }
    importHideTimer.current = window.setTimeout(() => {
      importHideTimer.current = null;
      setImportProgress(null);
    }, wait);
  }, []);

  useEffect(() => () => {
    if (importHideTimer.current !== null) window.clearTimeout(importHideTimer.current);
    if (importResultTimer.current !== null) window.clearTimeout(importResultTimer.current);
  }, []);

  // The progress of one file. The stages are reported as they happen, and the
  // ratio inside a stage moves the bar. Reports that say the same thing twice
  // are dropped: a 300 page PDF would otherwise re-render the page 300 times.
  const makeReporter = useCallback((file, index, total) => {
    let lastKey = '';
    return (patch) => {
      const key = `${patch.stage}:${Math.round((patch.ratio ?? 0) * 100)}`;
      if (key === lastKey) return;
      lastKey = key;
      setImportProgress((previous) => {
        if (previous === null) return previous;
        return {
          ...previous,
          ...patch,
          name: file?.name ?? '',
          index,
          total,
          detail: patch.detail ?? null,
        };
      });
    };
  }, []);

  const importOne = useCallback(async (file, fallback, report) => {
    report({ stage: 'read', ratio: 0 });
    const parsed = await parseBook(file, (info) => {
      report({ stage: 'parse', ratio: info.ratio, detail: info });
    });
    // A book that carries its own picture keeps it; the others get a drawn
    // placeholder first and an AI cover afterwards.
    const hasRealCover = parsed.cover !== null && parsed.cover !== undefined;
    report({ stage: 'cover', ratio: 0 });
    let cover = null;
    try {
      cover = await coverToDataUrl(parsed.cover ?? null) ?? await drawPlaceholderCover(parsed.title, parsed.author);
    } catch {
      cover = null;
    }
    report({ stage: 'cover', ratio: 1 });
    const book = {
      id: newBookId(),
      title: parsed.title || fallback?.title || '',
      author: parsed.author || fallback?.author || '',
      format: parsed.format,
      chapters: parsed.chapters,
      cover,
      addedAt: Date.now(),
      progress: { unitIndex: 0, chapterIndex: 0, percent: 0 },
    };
    report({ stage: 'save', ratio: 0 });
    await saveBook(book);
    // 原始文件也交给宿主存着：书要能看原样，也要能下载走。
    // 存不住不影响导入——书照样入库，只是这本书没有源文件。
    try {
      await uploadSourceFile(book.id, file, { format: parsed.format, contentType: file?.type });
    } catch (error) {
      console.warn('[reader] 源文件没有存住：' + (error?.message ?? String(error)));
    }
    report({ stage: 'save', ratio: 1 });
    return { book, hasRealCover };
  }, []);

  const onFiles = useCallback(async (files) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    setError('');
    // A new import replaces the old report: the old one talks about files
    // that are not in front of the learner any more.
    setImportReport(null);
    setImportCardResult(null);
    importStartedAt.current = Date.now();
    setImportProgress({ name: list[0]?.name ?? '', index: 0, total: list.length, stage: 'read', ratio: 0, detail: null });
    try {
      // One file that fails must not stop the others: the books that got in
      // are already stored, so the learner has to see them.
      const outcomes = [];
      for (let index = 0; index < list.length; index += 1) {
        const file = list[index];
        const report = makeReporter(file, index, list.length);
        try {
          const entry = await importOne(file, null, report);
          outcomes.push({ name: String(file?.name ?? ''), ok: true, entry });
        } catch (fileError) {
          outcomes.push({ name: String(file?.name ?? ''), ok: false, reason: fileError?.message ?? '' });
        }
      }
      // The shelf is read again either way: the books that were imported
      // have to show up even when other files failed.
      await refresh();
      const imported = outcomes.filter((outcome) => outcome.ok).map((outcome) => outcome.entry);
      const failed = outcomes.filter((outcome) => !outcome.ok);
      if (failed.length > 0) {
        const report = {
          okCount: imported.length,
          failCount: failed.length,
          allFailed: imported.length === 0,
          failures: failed.map((outcome) => ({ name: outcome.name, reason: outcome.reason })),
        };
        setImportReport(report);
        // The card carries the counts for a moment — but only when some books
        // did get in. When nothing was imported the whole view becomes the
        // error state, and a toast on top of it would say the same thing
        // twice while covering the last row of the shelf.
        if (!report.allFailed) {
          setImportCardResult({ okCount: report.okCount, failCount: report.failCount, allFailed: report.allFailed });
          if (importResultTimer.current !== null) window.clearTimeout(importResultTimer.current);
          importResultTimer.current = window.setTimeout(() => {
            importResultTimer.current = null;
            setImportCardResult(null);
          }, IMPORT_RESULT_VISIBLE_MS);
        }
      }
      // 书里没有自带封面的，让模型画一张；书先入库，封面随后补上
      for (const entry of imported) {
        if (entry === null || entry.hasRealCover) continue;
        void generateAiCover(entry.book);
      }
    } catch (importError) {
      setError(importError?.message ?? t('library.importFailed'));
    } finally {
      clearImportProgress();
    }
  }, [clearImportProgress, generateAiCover, importOne, makeReporter, refresh, t]);

  // A book that came from the online source arrives with its catalogue entry.
  const onImported = useCallback(async (file, hit) => {
    setError('');
    // The card carries the outcome of the last import; this one replaces it.
    setImportCardResult(null);
    importStartedAt.current = Date.now();
    setImportProgress({ name: file?.name ?? hit?.title ?? '', index: 0, total: 1, stage: 'read', ratio: 0, detail: null });
    try {
      const report = makeReporter(file, 0, 1);
      const entry = await importOne(file, hit, report);
      await refresh();
      setSourceOpen(false);
      if (entry !== null && !entry.hasRealCover) void generateAiCover(entry.book);
    } catch (importError) {
      setError(importError?.message ?? t('library.importFailed'));
    } finally {
      clearImportProgress();
    }
  }, [clearImportProgress, generateAiCover, importOne, makeReporter, refresh, t]);

  // The shelf asks the reader to start reading aloud.
  const [autoPlayToken, setAutoPlayToken] = useState(0);

  const openBook = useCallback(async (id) => {
    // The shelf list carries the metadata, not the text: the text of this one
    // book is fetched here, when the learner opens it.
    //
    // The read can fail — the Host does not answer, the record is gone, the
    // file is damaged. Until the book is there the panel says so, and if it
    // never comes the learner gets the reason and a way to try again.
    setOpening({ id, phase: 'pending', reason: '' });
    let stored = null;
    try {
      stored = await getBook(id);
    } catch (openError) {
      setOpening({ id, phase: 'error', reason: openError?.message ?? '' });
      return;
    }
    if (stored === undefined) {
      // The record is not there any more: the book cannot be opened at all.
      setOpening({ id, phase: 'error', reason: '' });
      return;
    }
    const nextUnits = buildUnits(stored.chapters ?? []);
    const local = booksRef.current.find((entry) => entry.id === id);
    const progress = local?.progress ?? stored.progress;
    setUnits(nextUnits);
    setActiveBookId(id);
    setIndex(Math.min(Math.max(0, progress?.unitIndex ?? 0), Math.max(0, nextUnits.length - 1)));
    setOpening(null);
    // The report of the last import talks about files that are not in front
    // of the learner any more.
    setImportReport(null);
    setTab('reader');
    // The cover of this book may still be the full size of the model's
    // picture. It is shrunk in the background — the book opens right away,
    // and the picture is in the record that was read just now, so nothing is
    // fetched twice.
    if (isOversizedCover(stored?.cover)) {
      void shrinkCoverOf(id, dataUrlToCover(stored.cover)).then((shrunk) => {
        // The shelf points at the old picture: the new address has to come
        // from the Host, or the grid keeps showing the old one.
        if (shrunk) void refresh();
      });
    }
  }, [refresh, shrinkCoverOf]);

  // Open a book and let it read itself out loud.
  const listenBook = useCallback(async (id) => {
    await openBook(id);
    setAutoPlayToken((value) => value + 1);
  }, [openBook]);

  // Leaving the book: the reading time is flushed by the reader on unmount.
  // Coming back from another plugin: the shell has unmounted this panel, so
  // the book and the section are restored from the last screen record. The
  // reading position comes from the book's own progress, so it lands where
  // the learner stopped.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const session = loadSession();
    if (session.bookId !== null) {
      void openBook(session.bookId).catch(() => {});
      return;
    }
    if (session.tab !== 'library') setTab(session.tab);
  }, [openBook]);

  useEffect(() => {
    saveSession({ tab, bookId: activeBookId });
  }, [tab, activeBookId]);

  const closeBook = useCallback(() => {
    setActiveBookId(null);
    setUnits([]);
    setIndex(0);
    setCardRequest(null);
    setTab('library');
  }, []);

  const onDelete = useCallback(async (id) => {
    await deleteBook(id);
    if (id === activeBookId) {
      setActiveBookId(null);
      setUnits([]);
      setIndex(0);
      setTab('library');
    }
    await refresh();
  }, [activeBookId, refresh]);

  const onRename = useCallback(async (id, title) => {
    // The shelf holds summaries, not whole records: the record is read
    // first, so the book keeps its text.
    const stored = await getBook(id);
    if (stored === undefined) return;
    await saveBook({ ...stored, title });
    await refresh();
  }, [refresh]);

  // The source file of a book: the EPUB or PDF the learner imported.
  const openSource = useCallback((id) => {
    setPreviewBookId(id);
  }, []);

  const downloadSource = useCallback(async (id) => {
    return downloadSourceFile(id);
  }, []);

  // The reader reports how long and how much was read; it lands on the book.
  const onActivity = useCallback(async (activity, playedMs) => {
    if (activeBookId === null) return;
    await updateProgress(activeBookId, { activity, playedMs });
    // The shelf shows the reading situation, so it has to see the new numbers.
    // Asking for the whole shelf again would move three megabytes on every
    // sentence the learner turns, so the one book that changed is patched
    // here instead — the reader reads its numbers from this same list.
    setBooks((previous) => previous.map((book) => (
      book.id === activeBookId
        ? { ...book, progress: { ...book.progress, activity, playedMs, updatedAt: Date.now() } }
        : book
    )));
  }, [activeBookId]);

  const activeBook = useMemo(
    () => books.find((entry) => entry.id === activeBookId) ?? null,
    [books, activeBookId],
  );

  // The book whose source file is being looked at.
  const previewBook = useMemo(
    () => books.find((entry) => entry.id === previewBookId) ?? null,
    [books, previewBookId],
  );

  // The shelf can be sorted the way a learner expects.
  const sorted = useMemo(() => {
    const copy = [...books];
    const stamp = (book) => book.progress?.activity?.lastReadAt ?? book.progress?.updatedAt ?? book.addedAt ?? 0;
    if (sort === 'title') copy.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')));
    else if (sort === 'added') copy.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    else if (sort === 'progress') copy.sort((a, b) => (b.progress?.percent ?? 0) - (a.progress?.percent ?? 0));
    else copy.sort((a, b) => stamp(b) - stamp(a));
    return copy;
  }, [books, sort]);

  const changeView = useCallback((next) => {
    setView(next);
    try {
      globalThis.localStorage?.setItem(VIEW_KEY, next);
    } catch {
      // A browser without localStorage simply keeps the current mode.
    }
  }, []);

  const pickFile = useCallback(() => { fileRef.current?.click(); }, []);

  // One line of a failed import: the file, and what happened to it.
  const failureLine = (failure) => (
    failure.reason === '' ? failure.name : `${failure.name} — ${failure.reason}`
  );

  // The book that is opening.
  //
  // The shelf is replaced by the shape of the reader that is coming, and by
  // the reason the book did not open. The learner is never left with an
  // empty panel and no explanation.
  const renderOpening = (state) => {
    if (state.phase === 'error') {
      // What happened — the file behind the book could not be read — and
      // what to do next: the button is the same open, once more.
      const why = state.reason === '' ? t('library.importFailed') : state.reason;
      return h(
        'div',
        { className: 'er-state' },
        h('div', { className: 'er-state-title' }, t('reader.bookFailed')),
        h('div', { className: 'er-state-hint' }, `${why} ${t('reader.retry')}`),
        h(
          'button',
          {
            type: 'button',
            className: 'er-state-action',
            onClick: () => { void openBook(state.id); },
          },
          t('reader.retry'),
        ),
      );
    }
    return h(
      'div',
      { className: 'er-skeleton', role: 'status', 'aria-label': t('reader.loadingBook') },
      // The cover of the book that is opening.
      h('div', { className: 'er-skeleton-block' }),
      // The read bar.
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '32%' } }),
      // The first paragraph.
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '94%' } }),
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '86%' } }),
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '91%' } }),
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '58%' } }),
    );
  };

  // The report of an import where some files made it and some did not.
  //
  // The report is a panel in the shelf and not a state of the whole panel:
  // the books that were imported are right below it.
  const renderImportPartial = (report) => h(
    'div',
    { className: 'er-partial' },
    h('div', { className: 'er-partial-title' }, t('import.partialTitle')),
    h(
      'div',
      { className: 'er-partial-list' },
      report.failures.map((failure, index) => h(
        'div',
        { key: `${failure.name}-${index}`, className: 'er-partial-item is-fail' },
        failureLine(failure),
      )),
    ),
    h(
      'div',
      { className: 'er-partial-hint' },
      `${format(t('import.partialOk'), { count: report.okCount })} · ${format(t('import.partialFail'), { count: report.failCount })}`,
    ),
  );

  // Every file failed: there is no partial result to report, so the panel
  // shows the error instead. The way forward is the same import again.
  const renderImportFailed = (report) => h(
    'div',
    { className: 'er-state' },
    h('div', { className: 'er-state-title' }, t('import.allFailed')),
    h(
      'div',
      { className: 'er-state-hint' },
      report.failures.map(failureLine).join(' · '),
    ),
    h(
      'button',
      { type: 'button', className: 'er-state-action', onClick: () => { pickFile(); } },
      t('library.import'),
    ),
  );

  // The two faces of a failed import: one that still brought books is a
  // panel in the shelf, one that brought nothing takes over the view.
  const partialReport = importReport !== null && importReport.allFailed === false ? importReport : null;
  const failedReport = importReport !== null && importReport.allFailed === true ? importReport : null;

  if (!loaded) {
    return h('div', { className: 'er-page' }, h('div', { className: 'er-empty' }, t('library.loading')));
  }

  const sections = [
    { id: 'library', label: t('tab.library') },
    { id: 'reader', label: t('tab.reader') },
    { id: 'vocab', label: t('tab.vocab') },
  ];

  // While a book is being read the page belongs to the text: the tab bar is
  // only a way in and out, and the reading bar already carries the way back.
  const readingBook = tab === 'reader' && activeBook !== null;
  const pageClasses = [
    'er-page',
    importProgress === null && importCardResult === null ? null : 'is-importing',
    readingBook ? 'is-reading' : null,
  ].filter(Boolean).join(' ');

  return h(
    'div',
    {
      // The import card floats over the body, so the body gets room for it.
      className: pageClasses,
      onDragOver: (event) => { event.preventDefault(); },
      onDrop: (event) => {
        event.preventDefault();
        const dropped = Array.from(event.dataTransfer?.files ?? []);
        if (dropped.length > 0) void onFiles(dropped);
      },
    },
    readingBook ? null : h(
      'div',
      { className: 'er-appbar' },
      h(
        'div',
        { className: 'er-appbar-left' },
        h('button', {
          type: 'button',
          className: 'er-round-button',
          title: t('library.import'),
          'aria-label': t('library.import'),
          onClick: pickFile,
        }, h(ImportIcon, { size: 16 })),
        h(
          'button',
          {
            type: 'button',
            className: 'er-round-button',
            title: t('source.title'),
            'aria-label': t('source.title'),
            onClick: () => { setSourceOpen(true); },
          },
          h(GlobeIcon, { size: 16 }),
        ),
      ),
      h(
        'div',
        { className: 'er-segmented', role: 'tablist' },
        sections.map((section) => h(
          'button',
          {
            key: section.id,
            type: 'button',
            role: 'tab',
            className: 'er-segmented-item',
            'aria-selected': tab === section.id,
            onClick: () => {
              setTab(section.id);
              // A state that took over the view is left behind by leaving
              // the view: nobody is stuck on a book that did not open.
              setOpening(null);
              if (failedReport !== null) setImportReport(null);
            },
          },
          section.label,
        )),
      ),
      h(
        'div',
        { className: 'er-appbar-right' },
        h(
          'button',
          {
            type: 'button',
            className: 'er-round-button',
            title: t('library.shelfMenu'),
            'aria-label': t('library.shelfMenu'),
            'aria-haspopup': 'menu',
            'aria-expanded': menuOpen,
            onClick: () => { setMenuOpen((value) => !value); },
          },
          h(MoreIcon, { size: 16 }),
        ),
        menuOpen
          ? h(
            'div',
            { className: 'er-book-menu er-book-menu-top', onClick: (event) => { event.stopPropagation(); } },
            h('div', { className: 'er-book-menu-label' }, t('library.sortBy')),
            [
              ['recent', t('library.sortRecent')],
              ['added', t('library.sortAdded')],
              ['title', t('library.sortTitle')],
              ['progress', t('library.sortProgress')],
            ].map(([key, label]) => h(
              'button',
              {
                key,
                type: 'button',
                className: `er-book-menu-item${sort === key ? ' is-active' : ''}`,
                onClick: () => { setSort(key); setMenuOpen(false); },
              },
              label,
            )),
            // The build stamp lives here now. It used to sit next to the
            // library title, but that title repeated the tab bar; the stamp
            // is the only way to tell a fresh window from a stale one, so it
            // goes where it is asked for instead of where it was displayed.
            build === undefined
              ? null
              : h(
                'div',
                { className: 'er-book-menu-build', title: t('library.build') },
                `${t('library.build')} ${build}`,
              ),
          )
          : null,
      ),
    ),
    h(
      'div',
      { className: 'er-body' },
      // The report of an import where some files made it and some did not.
      // It sits at the top of the shelf, where the books that were imported
      // are, and not in the card that floats over them. A book that is being
      // opened takes the view over, so the report waits for it.
      partialReport !== null && opening === null
        ? renderImportPartial(partialReport)
        : null,
      h(SectionBoundary, { t },
        opening !== null
        ? renderOpening(opening)
        : failedReport !== null
        ? renderImportFailed(failedReport)
        : tab === 'library'
        ? h(LibraryView, {
          t,
          books: sorted,
          error,
          view,
          onViewChange: changeView,
          onFiles,
          onOpen: openBook,
          onDelete,
          onRename,
          onListen: listenBook,
          onOpenSource: openSource,
          onDownloadSource: downloadSource,
          onGenerateCover: (id) => {
            const book = books.find((entry) => entry.id === id);
            if (book === undefined) return Promise.resolve(false);
            return generateAiCover(book);
          },
        })
        : tab === 'reader'
          ? h(ReaderView, {
            t,
            book: activeBook,
            units,
            index,
            onIndexChange: setIndex,
            onOpenWordList: () => { setWordListOpen(true); },
            cardRequest,
            onActivity,
            onExit: closeBook,
            autoPlayToken,
          })
          : h(WordList, {
            t,
            variant: 'page',
            open: true,
            onClose: () => { setTab('library'); },
            onOpenEntry: (entry) => {
              setTab('reader');
              setCardRequest({ word: entry.word, sentence: entry.sentence ?? '' });
            },
            onReview: (entry) => {
              setTab('reader');
              setCardRequest({ word: entry.word, sentence: entry.sentence ?? '' });
            },
          })),
    ),
    sourceOpen
      ? h(OnlineLibrary, {
        t,
        onClose: () => { setSourceOpen(false); },
        onImported,
      })
      : null,
    // The source file of a book: the EPUB or PDF the learner imported.
    previewBook !== null
      ? h(SourcePreview, {
        t,
        book: previewBook,
        onClose: () => { setPreviewBookId(null); },
        onDownload: async () => {
          try {
            await downloadSource(previewBook.id);
          } catch (error) {
            console.warn('[reader] 源文件下载失败：' + (error?.message ?? String(error)));
          }
        },
      })
      : null,
    h('input', {
      ref: fileRef,
      type: 'file',
      multiple: true,
      accept: '.epub,.txt,.md,.markdown,.html,.htm,.pdf',
      style: { display: 'none' },
      onChange: (event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (files.length > 0) void onFiles(files);
      },
    }),
    // The import card: what is being imported, how far it has come, and what
    // came of an import that did not go through.
    h(ImportCard, { t, progress: importProgress, result: importCardResult }),
    wordListOpen
      ? h(WordList, {
        t,
        variant: 'drawer',
        open: true,
        onClose: () => { setWordListOpen(false); },
      onOpenEntry: (entry) => {
        setWordListOpen(false);
        setTab('reader');
        setCardRequest({ word: entry.word, sentence: entry.sentence ?? '' });
      },
        onReview: (entry) => {
          setWordListOpen(false);
          setTab('reader');
          setCardRequest({ word: entry.word, sentence: entry.sentence ?? '' });
        },
      })
      : null,
  );
}
