import { BackupError, buildBackupJson, parseBackup, stripSecrets } from '../backupFormat';

const tables = { notes: [{ id: 'n1', term: 'come to terms' }], settings: [{ key: 'ai', value: '{}' }] };

describe('formato do backup', () => {
  it('ida e volta: o que exporto, importo igual', () => {
    const json = buildBackupJson(tables, 6, new Date('2026-10-20T12:00:00Z'));
    const backup = parseBackup(json, 6);
    expect(backup.tables).toEqual(tables);
    expect(backup.exportedAt).toBe('2026-10-20T12:00:00.000Z');
  });

  it('arquivo que não é do app é recusado', () => {
    expect(() => parseBackup('{"foo":1}', 6)).toThrow(BackupError);
    expect(() => parseBackup('não é json', 6)).toThrow(BackupError);
  });

  it('backup de uma versão mais nova do app é recusado', () => {
    const json = buildBackupJson(tables, 9);
    try {
      parseBackup(json, 6);
      throw new Error('deveria falhar');
    } catch (e) {
      expect(e).toBeInstanceOf(BackupError);
      expect((e as BackupError).problem).toBe('newerSchema');
    }
  });

  it('backup mais antigo é aceito', () => {
    expect(() => parseBackup(buildBackupJson(tables, 3), 6)).not.toThrow();
  });

  it('nunca leva algo com cara de chave', () => {
    const cleaned = stripSecrets({ settings: [{ key: 'ai', value: '{}' }, { key: 'apiKey', value: 'x' }] });
    expect(cleaned.settings).toEqual([{ key: 'ai', value: '{}' }]);
  });
});
