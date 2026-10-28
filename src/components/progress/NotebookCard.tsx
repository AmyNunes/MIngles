import { router } from 'expo-router';

import { Icon, ListGroup, ListRow, type IconName } from '@/components/ui';
import { categoryLabel } from '@/features/errors/taxonomy';
import type { Trend } from '@/features/progress/stats';
import { strings } from '@/i18n/strings';

const p = strings.progress;
const TREND_ICON: Record<Trend, IconName> = { up: 'trending-up', down: 'trending-down', flat: 'minus' };

type Props = { items: { category: string; total: number; trend: Trend }[] };

/** Caderno de erros com contagem e tendência (↑ ↓ →) nas últimas 4 semanas. */
export function NotebookCard({ items }: Props) {
  return (
    <ListGroup title={p.notebook}>
      {items.length === 0 ? (
        <ListRow icon="check-circle" iconColor="rateGood" title={p.notebookEmpty} />
      ) : (
        items.slice(0, 8).map((item) => (
          <ListRow
            key={item.category}
            icon="alert-circle"
            iconColor="rateAgain"
            title={categoryLabel(item.category)}
            subtitle={p.trend[item.trend]}
            value={strings.practice.times(item.total)}
            right={<Icon name={TREND_ICON[item.trend]} color="textMuted" />}
            onPress={() => router.push(`/errors/${item.category}`)}
          />
        ))
      )}
    </ListGroup>
  );
}
