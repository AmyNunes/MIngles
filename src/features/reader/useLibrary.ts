import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';

import { deleteSources, restoreSources, updateSource } from '@/db/sourcesRepo';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { useSourceDraft } from '@/stores/draftStore';
import { showSnackbar } from '@/stores/snackbarStore';

import { findUrl } from './articleExtract';
import { countAiQueue } from './offlineQueue';
import { loadLibrary, type LibraryItem } from './libraryService';
import { importPagePhoto, pickPagePhoto } from './photoImport';
import { openSharedContent } from './shareService';

const r = strings.read;

/** Estado da biblioteca (aba Ler). */
export function useLibrary() {
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [photoBusy, setPhotoBusy] = useState(false);
  const loader = useLoader(async () => ({ items: await loadLibrary(archived), queued: await countAiQueue() }), archived ? 1 : 0);

  const after = () => {
    setSelected(new Set());
    loader.refresh();
  };

  /** "Colar texto": lê a área de transferência e abre a tela de título/prévia. */
  const paste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) {
      showSnackbar(r.clipboardEmpty);
      return;
    }
    useSourceDraft.getState().set({ text, kind: 'paste' });
    router.push('/library/new');
  };

  /** "Ler de um link copiado": baixa a página do link e extrai o artigo. */
  const pasteLink = async () => {
    const url = findUrl(await Clipboard.getStringAsync());
    if (!url) {
      showSnackbar(r.noLink);
      return;
    }
    await openSharedContent({ webUrl: url });
  };

  /** "Foto de página": escolhe a foto e a IA transcreve o texto. */
  const fromPhoto = async () => {
    const photo = await pickPagePhoto();
    if (!photo) return;
    setPhotoBusy(true);
    try {
      await importPagePhoto(photo);
    } finally {
      setPhotoBusy(false);
    }
  };

  const writeManually = () => {
    useSourceDraft.getState().set({ text: '', kind: 'manual' });
    router.push('/library/new');
  };

  const setArchivedFor = async (items: LibraryItem[], value: boolean) => {
    for (const item of items) await updateSource(item.id, { archived: value });
    after();
    showSnackbar(value ? r.archived : r.unarchived, {
      label: strings.common.undo,
      onPress: async () => {
        for (const item of items) await updateSource(item.id, { archived: !value });
        after();
      },
    });
  };

  const remove = async (items: LibraryItem[]) => {
    const removed = await deleteSources(items.map((i) => i.id));
    after();
    showSnackbar(r.deleted(items.length), {
      label: strings.common.undo,
      onPress: async () => {
        await restoreSources(removed);
        after();
      },
    });
  };

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const data = loader.state.status === 'success' ? loader.state.data : null;

  return {
    loader,
    items: data?.items ?? [],
    queued: data?.queued ?? 0,
    archived,
    setArchived: (value: boolean) => {
      setSelected(new Set());
      setArchived(value);
    },
    selected,
    selecting: selected.size > 0,
    toggleSelected,
    clearSelection: () => setSelected(new Set()),
    selectedItems: (data?.items ?? []).filter((i) => selected.has(i.id)),
    paste,
    pasteLink,
    fromPhoto,
    photoBusy,
    writeManually,
    setArchivedFor,
    remove,
  };
}
