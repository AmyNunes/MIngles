import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { renderReviewWidget } from './ReviewWidget';
import { flipWidgetCard, loadWidgetView, rateWidgetCard } from './widgetService';

/** Responde ao widget (adicionado, atualização periódica, toques) mesmo com o app fechado. */
export async function widgetTaskHandler({ widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  const cardId = typeof clickActionData?.cardId === 'string' ? clickActionData.cardId : null;
  if (widgetAction === 'WIDGET_CLICK' && cardId) {
    if (clickAction === 'FLIP') await flipWidgetCard(cardId);
    if (clickAction === 'RATE') {
      const rating = clickActionData?.rating === 'again' ? 'again' : 'good';
      await rateWidgetCard(cardId, rating);
    }
  }
  renderWidget(renderReviewWidget(await loadWidgetView()));
}
