import { useEffect, useRef, useState } from 'react';

import { isDictationAvailable, startDictation, type DictationSession } from './dictation';

/** Ditado num campo (Diário, Captura, Conversa). */
export function useDictation(options: { lang: string; continuous?: boolean; onFinal: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const session = useRef<DictationSession | null>(null);
  const onFinal = useRef(options.onFinal);

  useEffect(() => {
    onFinal.current = options.onFinal;
  });

  useEffect(
    () => () => {
      session.current?.abort();
    },
    [],
  );

  const start = async () => {
    if (listening) return;
    setListening(true);
    session.current = await startDictation({
      lang: options.lang,
      continuous: options.continuous,
      onInterim: setInterim,
      onFinal: (text) => onFinal.current(text),
      onEnd: () => {
        setListening(false);
        setInterim('');
        session.current = null;
      },
    });
    if (!session.current) setListening(false);
  };

  const stop = () => session.current?.stop();

  return { available: isDictationAvailable(), listening, interim, start, stop, toggle: () => (listening ? stop() : void start()) };
}
