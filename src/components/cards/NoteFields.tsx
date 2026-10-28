import { Segmented, TextField } from '@/components/ui';
import { REGISTERS, type NoteKind, type Register } from '@/features/cards/model';
import type { EditorFields } from '@/features/cards/useNoteEditor';
import { strings } from '@/i18n/strings';

const e = strings.editor;

type Props = {
  kind: NoteKind;
  fields: EditorFields;
  onChange: (key: string, value: string) => void;
  register: Register;
  onRegisterChange: (r: Register) => void;
};

const REGISTER_OPTIONS = REGISTERS.map((r) => ({ value: r, label: strings.cards.register[r] }));

/** Campos do editor conforme o tipo da nota. */
export function NoteFields({ kind, fields, onChange, register, onRegisterChange }: Props) {
  const field = (key: string, label: string, opts: { multiline?: boolean; english?: boolean } = {}) => (
    <TextField
      key={key}
      label={label}
      value={fields[key] ?? ''}
      onChangeText={(v) => onChange(key, v)}
      multiline={opts.multiline}
      autoCapitalize={opts.english ? 'none' : 'sentences'}
    />
  );

  if (kind === 'term') {
    return (
      <>
        {field('term', e.term, { english: true })}
        {field('sentence', e.sentence, { multiline: true })}
        {field('meaningPt', e.meaning)}
        {field('explanationPt', e.explanation, { multiline: true })}
        {field('ipa', e.ipa, { english: true })}
        {field('exampleEn', e.example, { multiline: true })}
        {field('examplePt', e.examplePt, { multiline: true })}
      </>
    );
  }

  if (kind === 'production') {
    return (
      <>
        {field('pt', e.pt, { multiline: true })}
        {field('en', e.en, { multiline: true })}
        <Segmented accessibilityLabel={e.register} options={REGISTER_OPTIONS} value={register} onChange={onRegisterChange} />
        {field('notePt', e.notePt, { multiline: true })}
      </>
    );
  }

  return (
    <>
      {field('original', e.original, { multiline: true })}
      {field('corrected', e.corrected, { multiline: true })}
      {field('explanationPt', e.explanation, { multiline: true })}
      {field('exampleEn', e.example, { multiline: true })}
    </>
  );
}
