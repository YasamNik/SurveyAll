// Survey theme registry — presentation layer, NOT domain logic (lib/domain
// stays pure over surveys/questions/answers; themes only style the public
// respond/done pages and the editor's theme picker).
//
// Each accent overrides `--stamp` on the theme's `.theme-<id>` wrapper class
// (see app/themes.css) and is verified >=4.5:1 contrast against #FFFFFF and
// #FAFAF7 (see docs — task-c-report.md has the numbers).

export const THEME_IDS = [
  'classic',
  'food',
  'business',
  'leisure',
  'celebration',
  'education',
  'health',
  'tech',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES: { id: ThemeId; label: string; accent: string }[] = [
  { id: 'classic', label: 'Classic paper', accent: '#3D46B2' },
  { id: 'food', label: 'Food & dining', accent: '#B23A2E' },
  { id: 'business', label: 'Business', accent: '#2B3A55' },
  { id: 'leisure', label: 'Leisure & travel', accent: '#12746B' },
  { id: 'celebration', label: 'Celebration', accent: '#7A2F6B' },
  { id: 'education', label: 'Education', accent: '#1F5C3C' },
  { id: 'health', label: 'Health & wellness', accent: '#0F6B5C' },
  { id: 'tech', label: 'Technology', accent: '#5B3FA0' },
];

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}
