import type { Style } from './types';

/** How Snitch talks to you (VIS-7), chosen at sign-up and changed in Profile. The style changes
 *  the tone only: witnesses hear about a missed week at every setting, and no style ever
 *  comments on your body, your weight or what you eat. */
export const STYLES: { key: Style; label: string; sample: string }[] = [
  { key: 'gentle', label: 'Gentle', sample: '“Morning. Step on the scale when you’re up. Two more this week.”' },
  { key: 'balanced', label: 'Balanced', sample: '“Morning. Step on the scale. Two more this week, four days to do it.”' },
  { key: 'tough', label: 'Tough love', sample: '“Up. Scale. Two more this week and you’re out of spare days.”' },
  { key: 'drill', label: 'Drill Sergeant', sample: '“On your feet. Scale. Now. Two more this week, and I’m counting.”' },
];

export const styleLabel = (key: Style) => STYLES.find((s) => s.key === key)?.label ?? 'Balanced';
