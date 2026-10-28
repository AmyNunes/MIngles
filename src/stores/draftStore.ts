import { create } from 'zustand';

import type { SourceKind } from '@/db/sourcesRepo';

/** Texto colado/compartilhado a caminho da tela "Novo texto" (pode ser grande demais para a URL). */
type DraftState = {
  text: string;
  kind: SourceKind;
  url: string | null;
  /** Título sugerido (ex.: o título do artigo compartilhado). */
  title: string;
  set: (draft: { text: string; kind: SourceKind; url?: string | null; title?: string }) => void;
  clear: () => void;
};

export const useSourceDraft = create<DraftState>()((set) => ({
  text: '',
  kind: 'manual',
  url: null,
  title: '',
  set: ({ text, kind, url, title }) => set({ text, kind, url: url ?? null, title: title ?? '' }),
  clear: () => set({ text: '', kind: 'manual', url: null, title: '' }),
}));
