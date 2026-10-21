import type { ColorKey } from './wuxing';

export interface Profile {
  birthDate: string;
  name: string;
}

export interface Entry {
  id: string;
  date: string;
  colors: ColorKey[];
  mood: number;
  note: string;
  createdAt: number;
}
