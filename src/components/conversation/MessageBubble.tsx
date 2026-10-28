import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DiffText } from '@/components/cards/DiffText';
import { IconButton, Text } from '@/components/ui';
import type { ConversationMessage } from '@/db/productionRepo';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import { makeStyles } from '@/theme';

const c = strings.conversation;

/** Balão da conversa. Embaixo da minha mensagem: "1 correção" discreta (toque expande). */
export function MessageBubble({ message }: { message: ConversationMessage }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const mine = message.role === 'user';
  const n = message.corrections.length;

  return (
    <View style={[styles.wrap, mine ? styles.right : styles.left]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text color={mine ? 'onPrimary' : 'text'}>{message.text}</Text>
        {!mine && <IconButton icon="volume-2" color="textMuted" accessibilityLabel={c.listen} onPress={() => speak(message.text)} />}
      </View>
      {mine && n > 0 && (
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? c.hideCorrections : c.corrections(n)}
          style={styles.toggle}
        >
          <Text variant="caption" color="primary">
            {open ? c.hideCorrections : c.corrections(n)}
          </Text>
        </Pressable>
      )}
      {open &&
        message.corrections.map((edit, i) => (
          <View key={`${edit.original}-${i}`} style={styles.correction}>
            <DiffText original={edit.original} corrected={edit.corrected} />
            {edit.explanationPt ? (
              <Text variant="caption" color="textMuted">
                {edit.explanationPt}
              </Text>
            ) : null}
          </View>
        ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { maxWidth: '85%', gap: t.spacing.xs },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  left: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radii.lg,
    gap: t.spacing.xs,
  },
  mine: { backgroundColor: t.colors.primary, borderBottomRightRadius: t.radii.sm },
  theirs: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderBottomLeftRadius: t.radii.sm, paddingRight: t.spacing.xs },
  toggle: { minHeight: t.sizes.touchTarget - t.spacing.lg, justifyContent: 'center' },
  correction: {
    gap: t.spacing.xs,
    padding: t.spacing.md,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
}));
