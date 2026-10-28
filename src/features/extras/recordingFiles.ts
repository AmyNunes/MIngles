import { Directory, File, Paths } from 'expo-file-system';

import { newId } from '@/lib/ids';

/** Áudios da Gravação mensal: ficam na pasta do app (fora do backup, que é só texto). */
const recordingsDir = () => new Directory(Paths.document, 'recordings');

/** Move a gravação do cache para a pasta permanente. Devolve o novo caminho. */
export async function keepRecording(uri: string): Promise<string> {
  const dir = recordingsDir();
  dir.create({ idempotent: true, intermediates: true });
  const ext = uri.match(/\.(\w+)$/)?.[1] ?? 'm4a';
  const dest = new File(dir, `${newId()}.${ext}`);
  await new File(uri).move(dest);
  return dest.uri;
}

export function recordingExists(path: string | null): boolean {
  if (!path) return false;
  try {
    return new File(path).exists;
  } catch {
    return false;
  }
}

/** Apaga os arquivos que nenhuma gravação usa mais (ex.: depois de excluir). */
export function cleanupOrphanRecordings(inUse: Set<string>): void {
  const dir = recordingsDir();
  if (!dir.exists) return;
  for (const item of dir.list()) {
    if (item instanceof File && !inUse.has(item.uri)) item.delete();
  }
}

/** "Apagar tudo". */
export function deleteAllRecordings(): void {
  const dir = recordingsDir();
  if (dir.exists) dir.delete();
}
