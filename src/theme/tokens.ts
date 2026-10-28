/**
 * Tokens do design system (seção 4 da spec).
 * Nenhuma tela usa cor, tamanho ou duração "solta": tudo vem daqui.
 */

export type ColorScheme = 'light' | 'dark';

export type ColorTokens = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  rateAgain: string;
  rateHard: string;
  rateGood: string;
  rateEasy: string;
  typeContext: string;
  typeProduction: string;
  typeCloze: string;
  typeError: string;
  diffAdd: string;
  diffRemove: string;
  /** Fundo escurecido atrás de sobreposições. */
  scrim: string;
};

export const palette: Record<ColorScheme, ColorTokens> = {
  light: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE8',
    border: '#E3E0DA',
    text: '#1C1B19',
    textMuted: '#6B6862',
    primary: '#3E63DD',
    onPrimary: '#FFFFFF',
    rateAgain: '#E5484D',
    rateHard: '#F59E0B',
    rateGood: '#30A46C',
    rateEasy: '#8E4EC6',
    typeContext: '#3E63DD',
    typeProduction: '#12A594',
    typeCloze: '#D97706',
    typeError: '#D6409F',
    diffAdd: '#30A46C',
    diffRemove: '#E5484D',
    scrim: '#000000',
  },
  dark: {
    bg: '#111113',
    surface: '#1A1A1D',
    surfaceAlt: '#232326',
    border: '#2E2E33',
    text: '#EDEDEF',
    textMuted: '#A1A1A8',
    primary: '#6E8BFF',
    onPrimary: '#0B0B0C',
    rateAgain: '#F2555A',
    rateHard: '#FFB224',
    rateGood: '#3DD68C',
    rateEasy: '#B07EE8',
    typeContext: '#6E8BFF',
    typeProduction: '#2EC8B5',
    typeCloze: '#F5A524',
    typeError: '#E66AB8',
    diffAdd: '#3DD68C',
    diffRemove: '#F2555A',
    scrim: '#000000',
  },
};

export type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
};

/** Fonte do sistema (Roboto no Android), por isso não há `fontFamily`. */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '600' },
  cardMain: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  /** Card com mais de 3 linhas reduz para 20/28 (seção 7.3). */
  cardMainSmall: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  reading: { fontSize: 19, lineHeight: 30, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** Margem lateral das telas. */
  screen: 16,
} as const;

export const radii = {
  /** Chips e campos. */
  sm: 8,
  /** Botões e linhas de lista. */
  md: 14,
  /** Flashcard e sheets. */
  lg: 24,
  /** Círculos (ex.: botão +). */
  full: 999,
} as const;

/** Sombra só no flashcard e no botão + (Android usa `elevation`). */
export const elevation = {
  card: 3,
  fab: 4,
} as const;

export const durations = {
  micro: 150,
  transition: 220,
  flip: 280,
  /** Meio ciclo do "pulsar" do Skeleton (não está na spec; valor calmo). */
  pulse: 900,
} as const;

export const opacity = {
  pressed: 0.7,
  disabled: 0.4,
  skeletonDim: 0.5,
} as const;

export const springs = {
  drag: { damping: 18, stiffness: 180 },
} as const;

export const sizes = {
  /** Alvo de toque mínimo (dp). */
  touchTarget: 48,
  buttonHeight: 48,
  buttonHeightMain: 56,
  tabBarHeight: 64,
  fab: 56,
  icon: 24,
  iconSmall: 18,
  iconLarge: 40,
  chipHeight: 36,
  listRowHeight: 56,
  multilineHeight: 112,
  /** Círculo colorido atrás de ícones (IconBadge). */
  badge: { sm: 32, md: 40, lg: 56 },
  badgeIcon: { sm: 18, md: 22, lg: 28 },
  /** Gráfico de colunas: altura da área e largura máxima da barra. */
  chartHeight: 140,
  barMaxWidth: 24,
} as const;

/** Espaçamento entre letras de títulos em maiúsculas. */
export const tracking = {
  caps: 0.6,
} as const;

/** A escala de fonte do sistema é respeitada até 130%. */
export const maxFontScale = 1.3;
