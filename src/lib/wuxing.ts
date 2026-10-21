export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type Relation = 'support' | 'same' | 'wealth' | 'pressure' | 'drain';

export type Scene = 'work' | 'casual' | 'date';

export type Role = 'top' | 'bottom' | 'shoes' | 'accessory';

export type ColorKey =
  | 'forest'
  | 'jade'
  | 'mint'
  | 'olive'
  | 'crimson'
  | 'ember'
  | 'violet'
  | 'rose'
  | 'wine'
  | 'camel'
  | 'mustard'
  | 'beige'
  | 'cocoa'
  | 'khaki'
  | 'white'
  | 'silver'
  | 'champagne'
  | 'pearl'
  | 'graphite'
  | 'ink'
  | 'navy'
  | 'cobalt'
  | 'sky'
  | 'slate';

export interface ColorDef {
  key: ColorKey;
  element: Element;
  hex: string;
  light?: boolean;
}

/** Generating cycle order: wood -> fire -> earth -> metal -> water -> wood. */
export const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export const COLORS: ColorDef[] = [
  { key: 'forest', element: 'wood', hex: '#2f6b46' },
  { key: 'jade', element: 'wood', hex: '#3f9b6d' },
  { key: 'mint', element: 'wood', hex: '#a8d5ba', light: true },
  { key: 'olive', element: 'wood', hex: '#6b7a3a' },
  { key: 'crimson', element: 'fire', hex: '#c0392b' },
  { key: 'ember', element: 'fire', hex: '#d9702a' },
  { key: 'violet', element: 'fire', hex: '#7d4b9e' },
  { key: 'rose', element: 'fire', hex: '#d98aa0', light: true },
  { key: 'wine', element: 'fire', hex: '#7c2b3a' },
  { key: 'camel', element: 'earth', hex: '#b98a52' },
  { key: 'mustard', element: 'earth', hex: '#d1a13a' },
  { key: 'beige', element: 'earth', hex: '#e8dcc3', light: true },
  { key: 'cocoa', element: 'earth', hex: '#6f4a2f' },
  { key: 'khaki', element: 'earth', hex: '#a9a06a' },
  { key: 'white', element: 'metal', hex: '#f6f3ec', light: true },
  { key: 'silver', element: 'metal', hex: '#c3c7cc', light: true },
  { key: 'champagne', element: 'metal', hex: '#d9c08a', light: true },
  { key: 'pearl', element: 'metal', hex: '#efe9df', light: true },
  { key: 'graphite', element: 'metal', hex: '#6f7378' },
  { key: 'ink', element: 'water', hex: '#1d2126' },
  { key: 'navy', element: 'water', hex: '#22385c' },
  { key: 'cobalt', element: 'water', hex: '#2f5fa8' },
  { key: 'sky', element: 'water', hex: '#8fb6d9', light: true },
  { key: 'slate', element: 'water', hex: '#5b6672' },
];

export const COLORS_BY_ELEMENT: Record<Element, ColorDef[]> = {
  wood: COLORS.filter((c) => c.element === 'wood'),
  fire: COLORS.filter((c) => c.element === 'fire'),
  earth: COLORS.filter((c) => c.element === 'earth'),
  metal: COLORS.filter((c) => c.element === 'metal'),
  water: COLORS.filter((c) => c.element === 'water'),
};

export const COLOR_BY_KEY: Record<ColorKey, ColorDef> = COLORS.reduce(
  (acc, color) => {
    acc[color.key] = color;
    return acc;
  },
  {} as Record<ColorKey, ColorDef>,
);

export const ELEMENT_COLORS: Record<Element, string> = {
  wood: '#3f7d54',
  fire: '#c0483a',
  earth: '#a8813f',
  metal: '#7f858f',
  water: '#33557d',
};

/** Darker variants that stay readable on the soft element tints. */
export const ELEMENT_TEXT_COLORS: Record<Element, string> = {
  wood: '#2f6b46',
  fire: '#8f2f24',
  earth: '#6f5220',
  metal: '#494e56',
  water: '#23415f',
};

/** rgba() string for a hex color at the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ELEMENT_SOFT: Record<Element, string> = {
  wood: '#e7f0e7',
  fire: '#f7e6e1',
  earth: '#f2e9d8',
  metal: '#ecedee',
  water: '#e5ecf3',
};

export const ELEMENT_INDEX: Record<Element, number> = {
  wood: 0,
  fire: 1,
  earth: 2,
  metal: 3,
  water: 4,
};

/** The element produced by the given element (我生). */
export function generates(element: Element): Element {
  return ELEMENTS[(ELEMENT_INDEX[element] + 1) % 5];
}

/** The element that produces the given element (生我). */
export function generatedBy(element: Element): Element {
  return ELEMENTS[(ELEMENT_INDEX[element] + 4) % 5];
}

/** The element controlled by the given element (我克). */
export function controls(element: Element): Element {
  return ELEMENTS[(ELEMENT_INDEX[element] + 2) % 5];
}

/** The element that controls the given element (克我). */
export function controlledBy(element: Element): Element {
  return ELEMENTS[(ELEMENT_INDEX[element] + 3) % 5];
}

export function relationOf(target: Element, base: Element): Relation {
  if (target === base) return 'same';
  if (target === generatedBy(base)) return 'support';
  if (target === controls(base)) return 'wealth';
  if (target === controlledBy(base)) return 'pressure';
  return 'drain';
}

export const BASE_SCORE: Record<Relation, number> = {
  support: 95,
  same: 85,
  wealth: 70,
  pressure: 50,
  drain: 40,
};

export function relationScore(relation: Relation): number {
  return BASE_SCORE[relation];
}
