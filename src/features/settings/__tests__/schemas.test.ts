import { aiSettingsSchema, appearanceSchema, gesturesSchema, studySchema } from '../schemas';

describe('schemas de configurações', () => {
  it('objeto vazio vira os padrões', () => {
    expect(appearanceSchema.parse({}).themePreference).toBe('system');
    expect(aiSettingsSchema.parse({}).provider).toBe('gemini');
    expect(studySchema.parse({})).toMatchObject({ newPerDay: 20, maxReviewsPerDay: 200, retention: 0.9, rolloverHour: 4 });
    expect(gesturesSchema.parse({})).toMatchObject({ enabled: true, sensitivity: 'medium', leftHanded: false });
  });

  it('um campo inválido volta ao padrão sem perder os outros', () => {
    const parsed = aiSettingsSchema.parse({ provider: 'nao-existe', model: 'meu-modelo' });
    expect(parsed.provider).toBe('gemini');
    expect(parsed.model).toBe('meu-modelo');
  });

  it('retenção fora de 0,80–0,97 volta ao padrão', () => {
    expect(studySchema.parse({ retention: 0.99 }).retention).toBe(0.9);
  });

  it('lixo no lugar do objeto vira os padrões', () => {
    expect(appearanceSchema.parse('lixo').themePreference).toBe('system');
  });
});
