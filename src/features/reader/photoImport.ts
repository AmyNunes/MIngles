import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';

import { toAIError } from '@/ai/client';
import { photoToText } from '@/ai/functions/extras';
import { strings } from '@/i18n/strings';
import { useSourceDraft } from '@/stores/draftStore';
import { showSnackbar } from '@/stores/snackbarStore';

/** Limite para caber no pedido à IA (a imagem vai em base64). */
const MAX_BYTES = 7 * 1024 * 1024;

/** Escolhe a imagem (`null` = cancelou ou grande demais). */
export async function pickPagePhoto(): Promise<{ uri: string; mimeType: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  if ((asset.size ?? 0) > MAX_BYTES) {
    showSnackbar(strings.photo.tooBig);
    return null;
  }
  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
}

/** "Foto de página": a IA (com visão) transcreve a página e abre "Novo texto" já preenchido. */
export async function importPagePhoto(photo: { uri: string; mimeType: string }): Promise<void> {
  try {
    const base64 = await new File(photo.uri).base64();
    const { title, text } = await photoToText(`data:${photo.mimeType};base64,${base64}`);
    if (!text.trim()) {
      showSnackbar(strings.photo.noText);
      return;
    }
    useSourceDraft.getState().set({ text: text.trim(), kind: 'photo', title });
    router.push('/library/new');
  } catch (e) {
    const error = toAIError(e);
    showSnackbar(error.kind === 'badRequest' ? strings.photo.noVision : error.messagePt);
  }
}
