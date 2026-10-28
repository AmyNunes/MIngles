import { router } from 'expo-router';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Icon } from '@/components/ui';
import { isDictationAvailable } from '@/features/voice/dictation';
import {
  finishVoiceCapture,
  lockVoiceCapture,
  setVoiceCancelling,
  startVoiceCapture,
  useVoiceCapture,
} from '@/features/voice/voiceCapture';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const LOCK_DISTANCE = 60;
const CANCEL_DISTANCE = 80;
const HOLD_MS = 300;

const openCapture = () => router.push('/capture');

/**
 * O + da tab bar: círculo de 56 dp em `primary`, levemente elevado (seção 5.1).
 * Toque → Captura rápida. Segurar → captura por voz (solte para enviar,
 * ↑ trava, ← cancela). A alternativa visível é o microfone dentro da Captura.
 */
export function CaptureButton() {
  const theme = useTheme();
  const styles = useStyles();
  const voice = isDictationAvailable();

  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(HOLD_MS)
    .onEnd((_e, success) => {
      if (success) openCapture();
    });

  const hold = Gesture.Pan()
    .runOnJS(true)
    .enabled(voice)
    .activateAfterLongPress(HOLD_MS)
    .onStart(() => void startVoiceCapture())
    .onUpdate((e) => {
      if (e.translationY < -LOCK_DISTANCE) lockVoiceCapture();
      setVoiceCancelling(e.translationX < -CANCEL_DISTANCE);
    })
    .onEnd(() => {
      if (useVoiceCapture.getState().phase !== 'locked') finishVoiceCapture();
    });

  return (
    <GestureDetector gesture={Gesture.Exclusive(hold, tap)}>
      <View
        style={styles.fab}
        accessible
        accessibilityRole="button"
        accessibilityLabel={strings.tabs.capture}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && openCapture()}
      >
        <Icon name="plus" color="onPrimary" size={theme.sizes.badgeIcon.lg} />
      </View>
    </GestureDetector>
  );
}

const useStyles = makeStyles((t) => ({
  fab: {
    width: t.sizes.fab,
    height: t.sizes.fab,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -t.spacing.xl,
    elevation: t.elevation.fab,
    shadowColor: t.colors.scrim,
    borderWidth: t.spacing.xs,
    borderColor: t.colors.bg,
  },
}));
