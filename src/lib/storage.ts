import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const PREFIX = 'lifenum.';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode, quota); app stays usable in memory.
  }
}

export function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => loadJSON(key, initial));
  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);
  return [value, setValue];
}
