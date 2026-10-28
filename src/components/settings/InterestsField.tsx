import { useState } from 'react';
import { View } from 'react-native';

import { Chip, IconButton, Text, TextField } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.settings.profile;

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
};

/** Interesses como chips editáveis: digite e toque em + ; toque num chip para remover. */
export function InterestsField({ value, onChange }: Props) {
  const styles = useStyles();
  const [draft, setDraft] = useState('');

  const add = () => {
    const item = draft.trim();
    if (item && !value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      onChange([...value, item]);
    }
    setDraft('');
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="label">{p.interests}</Text>
      {value.length > 0 && (
        <View style={styles.chips}>
          {value.map((item) => (
            <Chip
              key={item}
              label={item}
              trailingIcon="x"
              accessibilityLabel={p.removeInterest(item)}
              onPress={() => onChange(value.filter((v) => v !== item))}
            />
          ))}
        </View>
      )}
      <View style={styles.addRow}>
        <View style={styles.flex}>
          <TextField
            label={p.addInterest}
            value={draft}
            onChangeText={setDraft}
            placeholder={p.interestPlaceholder}
            onSubmitEditing={add}
            returnKeyType="done"
            submitBehavior="submit"
          />
        </View>
        <IconButton icon="plus" accessibilityLabel={p.addInterest} onPress={add} color="primary" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.xs },
  flex: { flex: 1 },
}));
