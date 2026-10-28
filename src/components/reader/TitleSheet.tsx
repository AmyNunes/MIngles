import { useState } from 'react';

import { Button, Sheet, TextField } from '@/components/ui';
import { strings } from '@/i18n/strings';

type Props = { visible: boolean; title: string; onClose: () => void; onSave: (title: string) => void };

/** "Editar título" (menu ⋯ do Leitor). */
export function TitleSheet({ visible, title, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(title);
  return (
    <Sheet visible={visible} onClose={onClose} title={strings.reader.menu.editTitle} snapPoints={['50%']}>
      <TextField key={String(visible)} label={strings.read.newText.titleLabel} defaultValue={title} onChangeText={setDraft} autoFocus />
      <Button
        label={strings.common.save}
        icon="check"
        size="main"
        onPress={() => {
          onSave(draft);
          onClose();
        }}
      />
    </Sheet>
  );
}
