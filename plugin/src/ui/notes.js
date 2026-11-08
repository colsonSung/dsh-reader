/**
 * The notes panel: write a note on the sentence being read, and read back the
 * notes already taken.
 */
import { createElement as h, useCallback, useEffect, useState } from 'react';
import { addNote, listNotes, removeNote } from '../lib/notes.js';
import { Modal, label } from './library.js';
import { NoteIcon, TrashIcon } from './icons.js';

/**
 * Format a timestamp as a short local date and time.
 *
 * @param {number} timestamp - the milliseconds.
 * @returns {string} the formatted date.
 */
function formatTime(timestamp) {
  const date = new Date(timestamp ?? 0);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The notes panel.
 *
 * @param {object} props
 * @param {Function} props.t - translator
 * @param {string} props.bookId - the book being read
 * @param {string} props.quote - the sentence the learner is on
 * @param {number} props.unitIndex - the position of that sentence
 * @param {Function} props.onClose
 * @param {Function} props.onJump - called with a unit index
 * @param {Function} [props.onChanged] - called when a note was written or removed
 * @returns {any} the element tree
 */
export function NotesPanel({ t, bookId, quote, unitIndex, onClose, onJump, onChanged }) {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // The panel is drawn before the notes have been read, so the first render
  // has to be the loading state — an empty list would claim there are no
  // notes before anybody looked.
  const [loading, setLoading] = useState(true);
  // Which operation failed, so the panel can say what happened and what to
  // do next instead of dropping the failure on the floor.
  const [failed, setFailed] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listNotes(bookId);
      setNotes(list);
      setFailed(null);
    } catch {
      setFailed('load');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async () => {
    const text = draft.trim();
    if (text === '') return;
    setSaving(true);
    setFailed(null);
    // The list is read again right after the write, so the panel is busy
    // for the whole round trip — otherwise the empty state would claim
    // there are no notes while the first one is being written.
    setLoading(true);
    try {
      await addNote({ bookId, unitIndex, quote, text });
      setDraft('');
      await refresh();
      onChanged?.();
    } catch {
      // The draft stays in the textarea: a note that was not saved must not
      // take the learner's words with it.
      setFailed('save');
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }, [bookId, draft, quote, refresh, unitIndex]);

  const drop = useCallback(async (id) => {
    try {
      await removeNote(id);
      await refresh();
      onChanged?.();
    } catch {
      setFailed('delete');
    }
  }, [onChanged, refresh]);

  // The text of the failure: what happened, and what to do next.
  const failure = {
    load: {
      title: label(t, 'notes.loadFailed', '无法读取笔记。'),
      hint: label(t, 'notes.loadFailedHint', '笔记没能读取。请关闭这个面板后重新打开。'),
    },
    save: {
      title: label(t, 'notes.saveFailed', '这条笔记没能保存。'),
      hint: label(t, 'notes.saveFailedHint', '你写的文字还在这里，请再试一次。'),
    },
    delete: {
      title: label(t, 'notes.deleteFailed', '无法删除这条笔记。'),
      hint: label(t, 'notes.deleteFailedHint', '这条笔记仍然保留，请再试一次。'),
    },
  }[failed];

  // The placeholder for the notes that are still being read.
  const loadingState = h(
    'div',
    {
      className: 'er-state',
      role: 'status',
      'aria-label': label(t, 'notes.loading', '正在读取笔记…'),
    },
    h(
      'div',
      { className: 'er-skeleton' },
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '82%' } }),
      h('div', { className: 'er-skeleton-line', style: { '--er-skeleton-width': '56%' } }),
    ),
  );

  // The failure sits above the notes rather than in their place: a note that
  // could not be saved or deleted does not make the other notes disappear.
  const errorState = failed === null
    ? null
    : h(
      'div',
      { className: 'er-notes-error' },
      h(
        'div',
        { className: 'er-state' },
        h('div', { className: 'er-state-title' }, failure.title),
        h('div', { className: 'er-state-hint' }, failure.hint),
      ),
    );

  const listState = notes.length === 0
    ? null
    : h(
      'div',
      { className: 'er-notes-list' },
      notes.map((note) => h(
        'div',
        { key: note.id, className: 'er-note' },
        h('div', { className: 'er-note-quote' }, note.quote === '' ? '' : `“${note.quote}”`),
        h('div', { className: 'er-note-text' }, note.text),
        h(
          'div',
          { className: 'er-note-meta' },
          h('span', {}, formatTime(note.updatedAt ?? note.createdAt)),
          h(
            'button',
            {
              type: 'button',
              className: 'er-note-link',
              onClick: () => { onClose?.(); onJump?.(note.unitIndex); },
            },
            t('notes.jump'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'er-note-delete',
              title: t('notes.delete'),
              'aria-label': t('notes.delete'),
              onClick: () => { void drop(note.id); },
            },
            h(TrashIcon, { size: 13 }),
          ),
        ),
      )),
    );

  return h(
    Modal,
    { title: t('notes.title'), closeLabel: label(t, 'notes.close', '关闭'), onClose },
    h(
      'div',
      { className: 'er-notes' },
      h(
        'div',
        { className: 'er-note-new' },
        h('div', { className: 'er-note-quote' }, quote === '' ? t('notes.noQuote') : `“${quote}”`),
        h('textarea', {
          className: 'er-note-input',
          value: draft,
          rows: 3,
          placeholder: t('notes.placeholder'),
          onChange: (event) => { setDraft(event.target.value); },
        }),
        h(
          'div',
          { className: 'er-note-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'er-btn er-btn-primary',
              disabled: saving || draft.trim() === '',
              onClick: () => { void save(); },
            },
            h(NoteIcon, { size: 14 }),
            t('notes.save'),
          ),
        ),
      ),
      errorState,
      loading && notes.length === 0 ? loadingState : null,
      // The empty state is only true when the notes were read and there were
      // none; a list that could not be read says so above.
      !loading && failed === null && notes.length === 0
        ? h('div', { className: 'er-notes-empty' }, t('notes.empty'))
        : null,
      listState,
    ),
  );
}
