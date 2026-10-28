import { isWidgetAvailable, loadWidgetView, WIDGET_NAME } from './widgetService';

/** Redesenha o widget com a fila atual (depois de revisar, criar ou editar cards). */
export async function updateReviewWidget(): Promise<void> {
  if (!isWidgetAvailable()) return;
  // Carregado só aqui: a biblioteca quebra se o módulo nativo não existir.
  const { requestWidgetUpdate } = await import('react-native-android-widget');
  const { renderReviewWidget } = await import('./ReviewWidget');
  await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: async () => renderReviewWidget(await loadWidgetView()) });
}
