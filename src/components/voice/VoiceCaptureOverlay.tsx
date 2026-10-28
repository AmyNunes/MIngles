import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button, Icon, Text } from '@/components/ui';
import { cancelVoiceCapture, finishVoiceCapture, useVoiceCapture } from '@/features/voice/voiceCapture';
import { strings } from '@/i18n/strings';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

const v = strings.voice;

/**
 * Enquanto seguro o +: "Fale. Solte para enviar. ↑ trava · ← cancela".
 * Não intercepta o dedo (o gesto continua no +), exceto quando a gravação está travada.
 */
export function VoiceCaptureOverlay() {
  const theme = useTheme();
  const styles = useStyles();
  const { phase, text } = useVoiceCapture();
  if (phase === 'idle') return null;
  const locked = phase === 'locked';
  const cancelling = phase === 'cancelling';

  return (
    <Animated.View
      entering={FadeIn.duration(theme.durations.micro)}
      exiting={FadeOut.duration(theme.durations.micro)}
      style={styles.backdrop}
      pointerEvents={locked ? 'auto' : 'none'}
      accessibilityViewIsModal={locked}
    >
      <View style={styles.panel} accessibilityLiveRegion="polite">
        <View style={[styles.mic, { backgroundColor: withAlpha(theme.colors[cancelling ? 'rateAgain' : 'primary'], TINT * 2) }]}>
          <Icon name={cancelling ? 'x' : 'mic'} color={cancelling ? 'rateAgain' : 'primary'} size={theme.sizes.badgeIcon.lg} />
        </View>
        <Text variant="label" color="textMuted">
          {cancelling ? v.cancelHint : locked ? v.locked : v.listening}
        </Text>
        <Text variant="heading" align="center" numberOfLines={4}>
          {text || ' '}
        </Text>
        {!locked && !cancelling && (
          <Text variant="caption" color="textMuted" align="center">
            {`${v.holdHint} ${v.lockHint}`}
          </Text>
        )}
        {locked && (
          <View style={styles.buttons}>
            <Button label={v.cancel} variant="ghost" icon="x" onPress={cancelVoiceCapture} />
            <Button label={v.send} icon="send" onPress={finishVoiceCapture} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: t.spacing.xxl,
    backgroundColor: withAlpha(t.colors.scrim, 0.5),
  },
  panel: {
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.xxl,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
  },
  mic: {
    width: t.sizes.badge.lg * 1.4,
    height: t.sizes.badge.lg * 1.4,
    borderRadius: t.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: { flexDirection: 'row', gap: t.spacing.md },
}));
