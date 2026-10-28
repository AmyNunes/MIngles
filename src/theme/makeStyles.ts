import { StyleSheet } from 'react-native';

import type { Theme } from './theme';
import { useTheme } from './ThemeProvider';

/**
 * Cria um hook de estilos que dependem do tema.
 * Os estilos são calculados uma vez por tema (claro/escuro) e reaproveitados.
 *
 * Uso:
 *   const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.bg } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();

  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
