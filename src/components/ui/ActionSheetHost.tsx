import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActionSheet } from '@/stores/actionSheetStore';
import { makeStyles, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';
import { useModalSheet } from './useModalSheet';

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);

/** Menu de ações (⋯ e "segurar") em bottom sheet. Fica no layout raiz. */
export function ActionSheetHost() {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const request = useActionSheet((s) => s.request);
  const close = useActionSheet((s) => s.close);
  const { ref, onDismiss, dismiss } = useModalSheet(request != null, close);
  const [open, setOpen] = useState(false);

  // Voltar do Android fecha o menu aberto.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [open, dismiss]);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      onChange={(index) => setOpen(index >= 0)}
      onDismiss={onDismiss}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
        {request?.title && (
          <Text variant="label" color="textMuted" style={styles.title} numberOfLines={2}>
            {request.title}
          </Text>
        )}
        {request?.actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={action.checked !== undefined ? { checked: action.checked } : undefined}
            onPress={() => {
              dismiss();
              action.onPress();
            }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Icon name={action.icon} color={action.destructive ? 'rateAgain' : 'text'} />
            <Text style={styles.label}>{action.label}</Text>
            {action.checked && <Icon name="check" color="primary" />}
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const useStyles = makeStyles((t) => ({
  background: { backgroundColor: t.colors.surface, borderRadius: t.radii.lg },
  handle: { backgroundColor: t.colors.border, width: t.sizes.badge.md },
  content: { paddingHorizontal: t.spacing.sm },
  title: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.lg,
    minHeight: t.sizes.listRowHeight,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.md,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  label: { flex: 1 },
}));
