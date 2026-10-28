import { IconButton } from '@/components/ui';
import { useDictation } from '@/features/voice/useDictation';
import { strings } from '@/i18n/strings';

type Props = {
  /** "en-US", "pt-BR"… */
  lang: string;
  /** Texto final reconhecido. */
  onText: (text: string) => void;
  continuous?: boolean;
};

/** Microfone de ditado. Some quando o reconhecimento de voz não existe (ex.: Expo Go). */
export function MicButton({ lang, onText, continuous }: Props) {
  const dictation = useDictation({ lang, continuous, onFinal: onText });
  if (!dictation.available) return null;
  return (
    <IconButton
      icon={dictation.listening ? 'mic-off' : 'mic'}
      color={dictation.listening ? 'rateAgain' : 'primary'}
      accessibilityLabel={dictation.listening ? strings.voice.stop : strings.voice.mic}
      onPress={dictation.toggle}
    />
  );
}
