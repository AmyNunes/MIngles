/**
 * Avisos simples entre partes do app (ex.: "sessão de revisão terminou" →
 * reagendar notificações e atualizar o widget), sem acoplar os módulos.
 */
export type AppEvent =
  | 'reviewSessionFinished'
  | 'cardsChanged'
  | 'journalSaved'
  | 'challengeCompleted'
  | 'settingsChanged'
  | 'rehearsalsChanged';

type Listener = (event: AppEvent) => void;

const listeners = new Set<Listener>();

export function onAppEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAppEvent(event: AppEvent): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      // um ouvinte com erro não pode derrubar quem emitiu
    }
  }
}
