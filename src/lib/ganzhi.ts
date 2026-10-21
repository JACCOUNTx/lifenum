import type { Element } from './wuxing';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_PINYIN = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
const BRANCH_PINYIN = [
  'Zi',
  'Chou',
  'Yin',
  'Mao',
  'Chen',
  'Si',
  'Wu',
  'Wei',
  'Shen',
  'You',
  'Xu',
  'Hai',
];

const STEM_ELEMENTS: Element[] = [
  'wood',
  'wood',
  'fire',
  'fire',
  'earth',
  'earth',
  'metal',
  'metal',
  'water',
  'water',
];

const BRANCH_ELEMENTS: Element[] = [
  'water',
  'earth',
  'wood',
  'wood',
  'earth',
  'fire',
  'fire',
  'earth',
  'metal',
  'metal',
  'earth',
  'water',
];

/** Julian Day Number for a Gregorian calendar date (integer, noon-based). */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export interface GanzhiInfo {
  index: number;
  stemIndex: number;
  branchIndex: number;
  stem: string;
  branch: string;
  label: string;
  pinyin: string;
  stemElement: Element;
  branchElement: Element;
}

export function dayGanzhi(iso: string): GanzhiInfo {
  const [year, month, day] = iso.split('-').map(Number);
  const index = (((julianDayNumber(year, month, day) + 49) % 60) + 60) % 60;
  const stemIndex = index % 10;
  const branchIndex = index % 12;
  return {
    index,
    stemIndex,
    branchIndex,
    stem: STEMS[stemIndex],
    branch: BRANCHES[branchIndex],
    label: `${STEMS[stemIndex]}${BRANCHES[branchIndex]}`,
    pinyin: `${STEM_PINYIN[stemIndex]} ${BRANCH_PINYIN[branchIndex]}`,
    stemElement: STEM_ELEMENTS[stemIndex],
    branchElement: BRANCH_ELEMENTS[branchIndex],
  };
}

/** The day master element, taken from the heavenly stem of the day pillar. */
export function dayElement(iso: string): Element {
  return dayGanzhi(iso).stemElement;
}
