import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { strings } from '@/i18n/strings';
import { TINT, withAlpha } from '@/theme/color';
import { palette, radii, sizes, spacing, typography, type ColorTokens } from '@/theme/tokens';

import type { WidgetView } from './widgetModel';

/**
 * Widget "Revisão rápida" (seção 14, Fase 7). Só pode ser importado depois de
 * `isWidgetAvailable()`: a biblioteca exige o módulo nativo, que o Expo Go não tem.
 */

const w = strings.widget;
const HOW_DO_I_SAY_URI = 'meuingles://capture?mode=howDoISay';

const color = (c: string) => c as ColorProp;

function WidgetButton({ label, tone, colors, clickAction, clickActionData }: {
  label: string;
  tone: keyof ColorTokens;
  colors: ColorTokens;
  clickAction: string;
  clickActionData?: Record<string, unknown>;
}) {
  return (
    <FlexWidget
      clickAction={clickAction}
      clickActionData={clickActionData}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: sizes.touchTarget,
        borderRadius: radii.md,
        backgroundColor: color(withAlpha(colors[tone], TINT)),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={label}
        style={{ fontSize: typography.label.fontSize, fontWeight: typography.heading.fontWeight, color: color(colors.text) }}
      />
    </FlexWidget>
  );
}

function Body({ view, colors }: { view: WidgetView; colors: ColorTokens }) {
  if (view.kind === 'empty') {
    return (
      <FlexWidget style={{ flex: 1, justifyContent: 'center' }} clickAction="OPEN_APP">
        <TextWidget text={w.empty} style={{ fontSize: typography.body.fontSize, color: color(colors.text) }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      style={{ flex: 1, width: 'match_parent', justifyContent: 'center', flexGap: spacing.xs }}
      clickAction={view.flipped ? 'OPEN_APP' : 'FLIP'}
      clickActionData={{ cardId: view.cardId }}
      accessibilityLabel={view.flipped ? view.back : `${view.front}. ${w.tapToFlip}`}
    >
      {view.prompt && !view.flipped ? (
        <TextWidget text={view.prompt} style={{ fontSize: typography.caption.fontSize, color: color(colors.textMuted) }} />
      ) : null}
      <TextWidget
        text={view.front}
        maxLines={view.flipped ? 2 : 4}
        truncate="END"
        style={{
          fontSize: view.flipped ? typography.label.fontSize : typography.heading.fontSize,
          fontWeight: view.flipped ? typography.body.fontWeight : typography.heading.fontWeight,
          color: color(view.flipped ? colors.textMuted : colors.text),
        }}
      />
      {view.flipped ? (
        <TextWidget
          text={view.back}
          maxLines={3}
          truncate="END"
          style={{ fontSize: typography.heading.fontSize, fontWeight: typography.heading.fontWeight, color: color(colors.text) }}
        />
      ) : (
        <TextWidget text={w.tapToFlip} style={{ fontSize: typography.caption.fontSize, color: color(colors.primary) }} />
      )}
      {view.flipped && view.detail ? (
        <TextWidget
          text={view.detail}
          maxLines={2}
          truncate="END"
          style={{ fontSize: typography.caption.fontSize, color: color(colors.textMuted) }}
        />
      ) : null}
    </FlexWidget>
  );
}

function Footer({ view, colors }: { view: WidgetView; colors: ColorTokens }) {
  if (view.kind === 'card' && view.flipped) {
    return (
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: spacing.sm }}>
        <WidgetButton
          label={w.again}
          tone="rateAgain"
          colors={colors}
          clickAction="RATE"
          clickActionData={{ cardId: view.cardId, rating: 'again' }}
        />
        <WidgetButton
          label={w.good}
          tone="rateGood"
          colors={colors}
          clickAction="RATE"
          clickActionData={{ cardId: view.cardId, rating: 'good' }}
        />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
      <WidgetButton
        label={w.howDoISay}
        tone="primary"
        colors={colors}
        clickAction="OPEN_URI"
        clickActionData={{ uri: HOW_DO_I_SAY_URI }}
      />
    </FlexWidget>
  );
}

function ReviewWidgetFor({ view, colors }: { view: WidgetView; colors: ColorTokens }) {
  const header = view.kind === 'card' ? `${w.review} · ${w.remaining(view.remaining)}` : w.title;
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: color(colors.surface),
        flexGap: spacing.sm,
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel={w.open}
        style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center', flexGap: spacing.sm }}
      >
        {view.kind === 'card' ? (
          <FlexWidget style={{ width: spacing.sm, height: spacing.sm, borderRadius: spacing.xs, backgroundColor: color(colors[view.typeColor]) }} />
        ) : null}
        <TextWidget
          text={view.kind === 'card' ? `${view.typeLabel} · ${header}` : header}
          maxLines={1}
          truncate="END"
          style={{ fontSize: typography.caption.fontSize, fontWeight: typography.label.fontWeight, color: color(colors.textMuted) }}
        />
      </FlexWidget>
      <Body view={view} colors={colors} />
      <Footer view={view} colors={colors} />
    </FlexWidget>
  );
}

/** Claro e escuro (o Android escolhe pelo tema do sistema). */
export function renderReviewWidget(view: WidgetView) {
  return {
    light: <ReviewWidgetFor view={view} colors={palette.light} />,
    dark: <ReviewWidgetFor view={view} colors={palette.dark} />,
  };
}
