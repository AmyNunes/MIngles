import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { toAIError } from '@/ai/client';
import { explainTerm, howDoISay } from '@/ai/functions/cards';
import { getCardsOfNote, getCardWithNote, restoreCards } from '@/db/cardsRepo';
import { deleteNote, updateNote } from '@/db/notesRepo';
import { emitAppEvent } from '@/features/app/events';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

import { cardTypesFor } from './cardTypes';
import { normalizeLemma } from './lemma';
import type { CardRow, CardType, Note, NoteContent, NoteKind, Register, TermData } from './model';
import { findDuplicate, saveNotes } from './noteService';

const e = strings.editor;

export type EditorFields = Record<string, string>;
export type EditableKind = Exclude<NoteKind, never>;

type Loaded = { note: Note | null; cards: CardRow[]; previewType: CardType | null };

const EMPTY: Record<NoteKind, EditorFields> = {
  term: { term: '', sentence: '', meaningPt: '', explanationPt: '', ipa: '', exampleEn: '', examplePt: '' },
  production: { pt: '', en: '', notePt: '' },
  error: { original: '', corrected: '', explanationPt: '', exampleEn: '' },
};

function fieldsOf(note: Note): EditorFields {
  if (note.kind === 'term') {
    const d = note.data;
    return { term: note.term, sentence: d.sentence, meaningPt: d.meaningPt, explanationPt: d.explanationPt, ipa: d.ipa, exampleEn: d.exampleEn, examplePt: d.examplePt };
  }
  if (note.kind === 'production') return { pt: note.data.pt, en: note.data.en, notePt: note.data.notePt };
  return { original: note.data.original, corrected: note.data.corrected, explanationPt: note.data.explanationPt, exampleEn: note.data.exampleEn };
}

/** Monta o conteúdo da nota a partir do formulário (preservando o que não aparece nele). */
export function contentFrom(kind: NoteKind, f: EditorFields, register: Register, original: Note | null): NoteContent {
  const v = (k: string) => (f[k] ?? '').trim();
  if (kind === 'term') {
    const prev = original?.kind === 'term' ? original.data : null;
    const term = v('term');
    const sentence = v('sentence') || v('exampleEn');
    const data: TermData = {
      sentence,
      termInSentence: prev && prev.sentence === sentence ? prev.termInSentence : term,
      meaningPt: v('meaningPt'),
      explanationPt: v('explanationPt'),
      ipa: v('ipa'),
      partOfSpeech: prev?.partOfSpeech ?? '',
      exampleEn: v('exampleEn'),
      examplePt: v('examplePt'),
      register: prev?.register ?? 'neutral',
      isMultiword: term.split(/\s+/).length > 1,
      contexts: prev?.contexts ?? [],
    };
    const lemma = original?.kind === 'term' && original.term === term ? original.lemma : normalizeLemma(term);
    return { kind: 'term', term, lemma, data };
  }
  if (kind === 'production') {
    const prev = original?.kind === 'production' ? original.data : null;
    return {
      kind: 'production',
      term: v('pt'),
      lemma: normalizeLemma(v('en')),
      data: { pt: v('pt'), en: v('en'), register, notePt: v('notePt'), alternatives: prev?.alternatives ?? [] },
    };
  }
  const prev = original?.kind === 'error' ? original.data : null;
  return {
    kind: 'error',
    term: v('original'),
    lemma: normalizeLemma(v('corrected')),
    data: {
      original: v('original'),
      corrected: v('corrected'),
      category: prev?.category ?? 'word_choice',
      severity: prev?.severity ?? 'error',
      explanationPt: v('explanationPt'),
      exampleEn: v('exampleEn'),
      errorId: prev?.errorId ?? null,
    },
  };
}

export function isValid(content: NoteContent): boolean {
  if (content.kind === 'term') return Boolean(content.term && content.data.sentence && content.data.meaningPt);
  if (content.kind === 'production') return Boolean(content.data.pt && content.data.en);
  return Boolean(content.data.original && content.data.corrected);
}

/** Editor de card/nota com prévia, "Completar com IA" e duplicatas (seção 7.5). */
export function useNoteEditor(id: string, initialKind: NoteKind = 'term') {
  const isNew = id === 'new';
  const study = useSettings((s) => s.study);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>(isNew ? 'ready' : 'loading');
  const [loaded, setLoaded] = useState<Loaded>({ note: null, cards: [], previewType: null });
  const [kind, setKind] = useState<NoteKind>(initialKind);
  const [fields, setFields] = useState<EditorFields>(EMPTY[initialKind]);
  const [register, setRegister] = useState<Register>('neutral');
  const [filling, setFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    (async () => {
      const card = await getCardWithNote(id);
      if (!alive) return;
      if (!card) return setStatus('notFound');
      const cards = await getCardsOfNote(card.noteId);
      if (!alive) return;
      setLoaded({ note: card.note, cards, previewType: card.type });
      setKind(card.note.kind);
      setFields(fieldsOf(card.note));
      if (card.note.kind === 'production') setRegister(card.note.data.register);
      setStatus('ready');
    })().catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [id, isNew, attempt]);

  const content = contentFrom(kind, fields, register, loaded.note);
  const previewType = loaded.previewType ?? cardTypesFor(content, study)[0];
  const valid = isValid(content);

  const setField = (key: string, value: string) => setFields((f) => ({ ...f, [key]: value }));
  const changeKind = (k: NoteKind) => {
    setKind(k);
    setFields(EMPTY[k]);
  };

  /** Preenche só os campos vazios. */
  const fillWithAi = async () => {
    setFilling(true);
    try {
      const fillEmpty = (patch: EditorFields) =>
        setFields((f) => {
          const next = { ...f };
          for (const [k, val] of Object.entries(patch)) if (!next[k]?.trim() && val) next[k] = val;
          return next;
        });
      if (kind === 'term') {
        const { data } = await explainTerm({ term: fields.term, sentence: fields.sentence || undefined });
        fillEmpty({ meaningPt: data.meaningPt, explanationPt: data.explanationPt, ipa: data.ipa, exampleEn: data.exampleEn, examplePt: data.examplePt, sentence: data.exampleEn });
      } else if (kind === 'production') {
        const data = await howDoISay({ pt: fields.pt });
        const best = data.options[data.bestIndex];
        fillEmpty({ en: best.en, notePt: best.notePt });
        if (!fields.en.trim()) setRegister(best.register);
      }
      showSnackbar(e.filled);
    } catch (error) {
      showSnackbar(toAIError(error).messagePt);
    } finally {
      setFilling(false);
    }
  };

  const save = async () => {
    if (!valid || saving) {
      if (!valid) showSnackbar(e.required);
      return;
    }
    setSaving(true);
    try {
      if (loaded.note) {
        await updateNote(loaded.note.id, { term: content.term, lemma: content.lemma, data: content.data });
        emitAppEvent('cardsChanged');
      } else {
        const note = { ...content, sourceId: null, sourceLabel: `${strings.cards.source.manual} · ${formatDayMonth(new Date())}` };
        const existing = await findDuplicate(note);
        let mergeInto: Note | undefined;
        if (existing) {
          const choice = await new Promise<'merge' | 'create' | 'cancel'>((resolve) =>
            Alert.alert(strings.capture.duplicateTitle, strings.capture.duplicateMessage(content.term), [
              { text: strings.common.cancel, style: 'cancel', onPress: () => resolve('cancel') },
              { text: strings.capture.createAnyway, onPress: () => resolve('create') },
              { text: strings.capture.merge, onPress: () => resolve('merge') },
            ]),
          );
          if (choice === 'cancel') return;
          if (choice === 'merge') mergeInto = existing;
        }
        await saveNotes([{ note, mergeInto }]);
      }
      showSnackbar(e.saved);
      router.back();
    } catch {
      showSnackbar(strings.common.genericError);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    const note = loaded.note;
    if (!note) return;
    Alert.alert(e.deleteNote, e.deleteConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          const snapshot = loaded.cards.map((card) => ({ card, note }));
          await deleteNote(note.id);
          emitAppEvent('cardsChanged');
          router.back();
          showSnackbar(strings.review.deleted, {
            label: strings.common.undo,
            onPress: async () => {
              await restoreCards(snapshot);
              emitAppEvent('cardsChanged');
            },
          });
        },
      },
    ]);
  };

  return {
    isNew,
    status,
    retry: () => {
      setStatus('loading');
      setAttempt((a) => a + 1);
    },
    kind,
    changeKind,
    fields,
    setField,
    register,
    setRegister,
    content,
    previewType,
    cardTypes: loaded.cards.map((c) => c.type),
    valid,
    filling,
    fillWithAi,
    saving,
    save,
    remove,
  };
}
