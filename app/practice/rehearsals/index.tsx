import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, DateTimeField, EmptyState, ErrorState, IconButton, ListRow, Screen, Sheet, Skeleton, SwipeRow, TextField } from '@/components/ui';
import { createRehearsal, deleteRehearsal, listRehearsals, restoreRehearsal } from '@/db/rehearsalsRepo';
import { emitAppEvent } from '@/features/app/events';
import { strings } from '@/i18n/strings';
import { formatTime, formatWeekdayDayMonth } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import { openActionSheet } from '@/stores/actionSheetStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const r = strings.rehearsals;

/** Lista com "já passou" calculado na carga (render precisa ser puro). */
async function loadRehearsals() {
  const now = Date.now();
  return (await listRehearsals()).map((item) => ({ ...item, past: new Date(item.eventAt).getTime() < now }));
}

function tomorrowAt9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function RehearsalsScreen() {
  const styles = useStyles();
  const { state, reload, refresh } = useLoader(loadRehearsals);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState(tomorrowAt9);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const id = await createRehearsal({ title: title.trim(), description: description.trim(), eventAt: when.toISOString() });
      emitAppEvent('rehearsalsChanged');
      setOpen(false);
      setTitle('');
      setDescription('');
      router.push(`/practice/rehearsals/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const removed = await deleteRehearsal(id);
    emitAppEvent('rehearsalsChanged');
    refresh();
    showSnackbar(r.deleted, {
      label: strings.common.undo,
      onPress: async () => {
        if (removed) await restoreRehearsal(removed);
        emitAppEvent('rehearsalsChanged');
        refresh();
      },
    });
  };

  return (
    <Screen edges={['bottom']} footer={<Button label={r.new} icon="plus" size="main" onPress={() => setOpen(true)} />} contentStyle={styles.content}>
      <Stack.Screen options={{ title: r.title }} />
      {state.status === 'loading' && <Skeleton height={120} radius="lg" />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && state.data.length === 0 && <EmptyState icon="users" message={r.empty} />}
      {state.status === 'success' && state.data.length > 0 && (
        <View style={styles.list}>
          {state.data.map((item) => {
            const at = new Date(item.eventAt);
            return (
              <SwipeRow
                key={item.id}
                onSwipeLeft={{ label: strings.common.delete, icon: 'trash-2', color: 'rateAgain', onTrigger: () => void remove(item.id) }}
              >
                <ListRow
                  icon={item.rehearsedAt ? 'check-circle' : 'users'}
                  iconColor={item.rehearsedAt ? 'rateGood' : 'typeError'}
                  title={item.title}
                  subtitle={`${formatWeekdayDayMonth(at)} · ${formatTime(at)}${item.past ? ` · ${r.past}` : ''}`}
                  onPress={() => router.push(`/practice/rehearsals/${item.id}`)}
                  right={
                    <IconButton
                      icon="more-vertical"
                      color="textMuted"
                      accessibilityLabel={strings.common.more}
                      onPress={() =>
                        openActionSheet([{ label: strings.common.delete, icon: 'trash-2', destructive: true, onPress: () => void remove(item.id) }], item.title)
                      }
                    />
                  }
                />
              </SwipeRow>
            );
          })}
        </View>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={r.new} snapPoints={['85%']}>
        <TextField label={r.titleLabel} value={title} onChangeText={setTitle} placeholder={r.titlePlaceholder} />
        <DateTimeField label={r.when} value={when} onChange={setWhen} />
        <TextField label={r.description} value={description} onChangeText={setDescription} placeholder={r.descriptionPlaceholder} multiline />
        <Button label={r.create} icon="zap" size="main" disabled={!title.trim()} loading={saving} onPress={() => void create()} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingHorizontal: 0 },
  list: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
}));
