import { useShareIntent } from 'expo-share-intent';
import { useEffect } from 'react';

import { openSharedContent } from '@/features/reader/shareService';

/**
 * Recebe o "Compartilhar" do Android (texto ou link) e manda para a biblioteca.
 * No Expo Go o módulo nativo não existe e o hook simplesmente não recebe nada.
 */
export function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;
    const { text, webUrl, meta } = shareIntent;
    resetShareIntent();
    void openSharedContent({ text, webUrl, title: meta?.title });
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}
