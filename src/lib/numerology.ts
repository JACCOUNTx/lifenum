import type { Element } from './wuxing';

export type NumberKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '11' | '22' | '33';

export type YearKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export const NUMBER_KEYS: NumberKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22', '33'];

export function sumDigits(value: number): number {
  return String(Math.abs(value))
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
}

/** Reduces to a single digit, keeping 11/22/33 when `keepMaster` is true. */
export function reduceNumber(value: number, keepMaster = true): number {
  let current = Math.abs(value);
  while (current > 9) {
    if (keepMaster && (current === 11 || current === 22 || current === 33)) return current;
    current = sumDigits(current);
  }
  return current;
}

export function toNumberKey(value: number): NumberKey {
  const key = String(value) as NumberKey;
  return NUMBER_KEYS.includes(key) ? key : '9';
}

export function lifeNumber(iso: string): NumberKey {
  const total = iso
    .replace(/-/g, '')
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  return toNumberKey(reduceNumber(total, true));
}

export function birthdayNumber(iso: string): NumberKey {
  const day = Number(iso.split('-')[2]);
  return toNumberKey(reduceNumber(day, true));
}

/** Personal year: birth month + birth day + the digits of the target year, reduced to 1-9. */
export function personalYearNumber(iso: string, targetYear: number): YearKey {
  const [, month, day] = iso.split('-').map(Number);
  const total = sumDigits(month * 100 + day) + sumDigits(targetYear);
  return String(reduceNumber(total, false)) as YearKey;
}

const DIGIT_ELEMENT: Record<number, Element> = {
  1: 'water',
  2: 'fire',
  3: 'wood',
  4: 'metal',
  5: 'earth',
  6: 'water',
  7: 'fire',
  8: 'wood',
  9: 'metal',
};

export function numberElement(value: number): Element {
  return DIGIT_ELEMENT[reduceNumber(value, false)];
}

export function elementOfLifeNumber(iso: string): Element {
  return numberElement(Number(lifeNumber(iso)));
}
