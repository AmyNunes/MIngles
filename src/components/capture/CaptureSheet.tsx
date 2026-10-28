import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Segmented, Text } from '@/components/ui';
import { useCapture } from '@/features/capture/useCapture';
import { useThink } from '@/features/capture/useThink';
import { CAPTURE_MODES, type CaptureMode } from '@/features/settings/schemas';
import { strings } from '@/i18n/strings';
import { tokenize } from '@/lib/tokenize';
import { useSettings } from '@/stores/settingsStore';
import { makeStyles, useTheme } from '@/theme';

import { CaptureBody } from './CaptureBody';
import { MicButton } from '@/components/voice/MicButton';

import { CaptureInput } from './CaptureInput';
import { ThinkPrompt } from './ThinkPrompt';

const c = strings.capture;
type TabMode = Exclude<CaptureMode, 'think'>;

const MODE_OPTIONS = [
  { value: 'howDoISay', label: c.modes.howDoISay },
  { value: 'term', label: c.modes.term },
  { value: 'sentence', label: c.modes.sentence },
] as const satisfies readonly { value: TabMode; label: string }[];

const isMode = (m: unknown): m is CaptureMode => CAPTURE_MODES.includes(m as CaptureMode);

/** Captura rápida (seção 8.2): bottom sheet 50% → 90% quando o resultado aparece. */
export function CaptureSheet() {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; text?: string; autosend?: string }>();
  const lastMode = useSettings((s) => s.capture.lastMode);
  const update = useSettings((s) => s.update);
  const [mode, setMode] = useState<CaptureMode>(isMode(params.mode) ? params.mode : lastMode);
  const [text, setText] = useState(params.text ?? '');
  const [sentence, setSentence] = useState<string | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const capture = useCapture();
  const think = useThink();
  const sheet = useRef<BottomSheet>(null);
  const input = useRef<TextInput>(null);
  const dirty = useRef(false);
  const autoSent = useRef(false);
  const voiceAccent = useSettings((s) => s.voice.accent);

  useEffect(() => {
    dirty.current = text.trim().length > 0 || capture.state.status === 'result' || think.state.status === 'result';
  });

  const close = () => router.back();
  const confirmDiscard = () =>
    Alert.alert(strings.common.discardTitle, strings.common.discardMessage, [
      { text: strings.common.keepEditing, style: 'cancel' },
      { text: strings.common.discard, style: 'destructive', onPress: close },
    ]);
  const requestClose = () => (dirty.current ? confirmDiscard() : close());

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  });

  useEffect(() => {
    if (capture.state.status === 'result' || capture.state.status === 'loading' || sentence || think.state.status !== 'idle') {
      sheet.current?.snapToIndex(1);
    }
  }, [capture.state.status, sentence, think.state.status]);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    if (mode === 'think') void think.correct(value);
    else if (mode === 'howDoISay') void capture.askHowDoISay(value);
    else if (mode === 'term') void capture.askTerm(value);
    else if (mode === 'sentence') {
      setSentence(value);
      setRange(null);
      capture.reset();
    }
  };

  // Aberta pela voz (segurar o +): envia o que foi falado.
  useEffect(() => {
    if (params.autosend === '1' && !autoSent.current && text.trim()) {
      autoSent.current = true;
      send();
    }
  });

  const appendSpoken = (spoken: string) => setText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));

  const changeMode = (next: TabMode) => {
    setMode(next);
    setSentence(null);
    capture.reset();
    void update('capture', { lastMode: next });
  };

  const onSave = async () => {
    if (await capture.save()) {
      setText('');
      setSentence(null);
      setRange(null);
      sheet.current?.snapToIndex(0);
      input.current?.focus();
    }
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="none" onPress={requestClose} />
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <BottomSheet
        ref={sheet}
        index={0}
        snapPoints={['50%', '90%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        onAnimate={(from, to) => {
          if (to === -1 && dirty.current) {
            sheet.current?.snapToIndex(Math.max(0, from));
            confirmDiscard();
          }
        }}
        onClose={close}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="heading" style={styles.title} accessibilityRole="header">
              {c.title}
            </Text>
            <IconButton icon="x" accessibilityLabel={c.close} onPress={requestClose} />
          </View>

          {mode === 'think' ? (
            <ThinkPrompt />
          ) : (
            <Segmented accessibilityLabel={c.title} options={MODE_OPTIONS} value={mode} onChange={changeMode} />
          )}

          <CaptureInput
            key={mode}
            ref={input}
            value={text}
            onChangeText={setText}
            onSubmit={send}
            placeholder={c.placeholders[mode]}
            multiline={mode !== 'term'}
            autoFocus
            autoCorrect={mode === 'howDoISay'}
            disabled={capture.state.status === 'loading' || think.state.status === 'loading'}
            accessory={<MicButton lang={mode === 'howDoISay' ? 'pt-BR' : voiceAccent} onText={appendSpoken} />}
          />

          <CaptureBody
            mode={mode}
            capture={capture}
            think={think}
            sentenceTokens={sentence ? tokenize(sentence) : null}
            sentence={sentence}
            range={range}
            onRangeChange={setRange}
            onSave={onSave}
          />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  background: { backgroundColor: t.colors.surface, borderRadius: t.radii.lg },
  handle: { backgroundColor: t.colors.border, width: t.sizes.badge.md },
  content: { paddingHorizontal: t.spacing.xl, gap: t.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginRight: -t.spacing.md },
  title: { flex: 1 },
}));
