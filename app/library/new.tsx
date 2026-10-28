import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Screen, TextField } from '@/components/ui';
import { createSource } from '@/db/sourcesRepo';
import { titleFromText } from '@/features/reader/libraryService';
import { strings } from '@/i18n/strings';
import { useSourceDraft } from '@/stores/draftStore';
import { showSnackbar } from '@/stores/snackbarStore';

const n = strings.read.newText;

/** "Novo texto": título e prévia do texto colado/escrito antes de salvar (seção 8.4). */
export default function NewSourceScreen() {
  const draft = useSourceDraft();
  const [text, setText] = useState(draft.text);
  const [title, setTitle] = useState(draft.title || titleFromText(draft.text));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const content = text.trim();
    if (!content) {
      showSnackbar(n.empty);
      return;
    }
    setSaving(true);
    try {
      const id = await createSource({ title: title.trim() || titleFromText(content), kind: draft.kind, content, url: draft.url });
      draft.clear();
      router.replace(`/reader/${id}`);
    } catch {
      showSnackbar(strings.common.genericError);
      setSaving(false);
    }
  };

  return (
    <Screen
      edges={['bottom']}
      footer={<Button label={n.save} icon="book-open" size="main" loading={saving} onPress={() => void save()} />}
    >
      <Stack.Screen options={{ title: n.title }} />
      <Card>
        <TextField label={n.titleLabel} value={title} onChangeText={setTitle} />
        <TextField
          label={n.textLabel}
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (!title.trim()) setTitle(titleFromText(v));
          }}
          multiline
          autoCapitalize="sentences"
        />
      </Card>
    </Screen>
  );
}
