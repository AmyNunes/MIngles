import { create } from 'zustand';

import type { IconName } from '@/components/ui/Icon';

export type SheetAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  /** Mostra um ✓ (para opções liga/desliga, ex.: "Ouvir automaticamente"). */
  checked?: boolean;
};

type ActionSheetState = {
  request: { id: number; title?: string; actions: SheetAction[] } | null;
  open: (actions: SheetAction[], title?: string) => void;
  close: () => void;
};

let nextId = 1;

/** Menu de ações em bottom sheet: menu ⋯ e "segurar" (seção 6). */
export const useActionSheet = create<ActionSheetState>()((set) => ({
  request: null,
  open: (actions, title) => set({ request: { id: nextId++, title, actions } }),
  close: () => set({ request: null }),
}));

export const openActionSheet = (actions: SheetAction[], title?: string) =>
  useActionSheet.getState().open(actions, title);
