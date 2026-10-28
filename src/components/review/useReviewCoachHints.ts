import type { CoachHint } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';

/** Frases do guia de gestos da revisão (respeita o modo canhoto). */
export function useReviewCoachHints(): CoachHint[] {
  const leftHanded = useSettings((s) => s.gestures.leftHanded);
  const c = strings.review.coach;
  return [
    { icon: 'refresh-cw', text: c.tap },
    { icon: 'arrow-right', text: leftHanded ? c.rightLeft : c.right },
    { icon: 'arrow-left', text: leftHanded ? c.leftLeft : c.left },
    { icon: 'arrow-up', text: c.up },
    { icon: 'more-horizontal', text: c.hold },
    { icon: 'grid', text: c.buttons },
  ];
}
