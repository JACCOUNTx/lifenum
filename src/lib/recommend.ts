import {
  BASE_SCORE,
  COLORS_BY_ELEMENT,
  ELEMENTS,
  relationOf,
  type ColorDef,
  type Element,
  type Relation,
  type Role,
  type Scene,
} from './wuxing';
import { dayGanzhi } from './ganzhi';

export interface ElementScore {
  element: Element;
  relation: Relation;
  score: number;
}

export interface CombinedScore {
  element: Element;
  dayRelation: Relation;
  branchRelation: Relation;
  selfRelation: Relation;
  score: number;
}

export interface Recommendation {
  dayElement: Element;
  branchElement: Element;
  personalElement: Element;
  dayLayer: ElementScore[];
  branchLayer: ElementScore[];
  selfLayer: ElementScore[];
  combined: CombinedScore[];
  best: Element[];
  primary: Element;
  avoid: Element[];
}

export const WEIGHT_STEM = 0.35;
export const WEIGHT_BRANCH = 0.25;
export const WEIGHT_SELF = 0.4;

function layerFor(base: Element): ElementScore[] {
  return ELEMENTS.map((element) => {
    const relation = relationOf(element, base);
    return { element, relation, score: BASE_SCORE[relation] };
  });
}

export function buildRecommendation(
  dayElement: Element,
  personalElement: Element,
  branchElement: Element,
  yang: boolean,
): Recommendation {
  const dayLayer = layerFor(dayElement);
  const branchLayer = layerFor(branchElement);
  const selfLayer = layerFor(personalElement);
  const dayMap = new Map(dayLayer.map((row) => [row.element, row]));
  const branchMap = new Map(branchLayer.map((row) => [row.element, row]));
  const selfMap = new Map(selfLayer.map((row) => [row.element, row]));

  const combined: CombinedScore[] = ELEMENTS.map((element) => {
    const dayRow = dayMap.get(element)!;
    const branchRow = branchMap.get(element)!;
    const selfRow = selfMap.get(element)!;
    return {
      element,
      dayRelation: dayRow.relation,
      branchRelation: branchRow.relation,
      selfRelation: selfRow.relation,
      score: Math.round(
        dayRow.score * WEIGHT_STEM + branchRow.score * WEIGHT_BRANCH + selfRow.score * WEIGHT_SELF,
      ),
    };
  }).sort((a, b) => b.score - a.score);

  const best = combined.slice(0, 2).map((row) => row.element);
  const primary = yang ? best[0] : best[1];
  const avoid = combined
    .filter((row) => row.score <= 52)
    .slice(-2)
    .map((row) => row.element);

  return {
    dayElement,
    branchElement,
    personalElement,
    dayLayer,
    branchLayer,
    selfLayer,
    combined,
    best,
    primary,
    avoid,
  };
}

/** Keep the daily main color inside the top two while avoiding yesterday's color. */
export function pickPrimary(recommendation: Recommendation, previous: Element | null): Element {
  if (recommendation.primary !== previous) return recommendation.primary;
  return recommendation.best.find((element) => element !== previous) ?? recommendation.primary;
}

/** Resolve the same rolling main color used by the calendar and Today view. */
export function primaryForDate(iso: string, personalElement: Element): Element {
  const [year, month] = iso.split('-').map(Number);
  const lastDay = Number(iso.slice(8));
  let previous: Element | null = null;
  let current: Element = 'earth';

  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const info = dayGanzhi(date);
    const recommendation = buildRecommendation(
      info.stemElement,
      personalElement,
      info.branchElement,
      info.stemIndex % 2 === 0,
    );
    current = pickPrimary(recommendation, previous);
    previous = current;
  }

  return current;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function takeColor(element: Element, seed: string, used: Set<string>): ColorDef {
  const pool = COLORS_BY_ELEMENT[element];
  const start = hashString(seed) % pool.length;
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(start + i) % pool.length];
    if (!used.has(candidate.key)) {
      used.add(candidate.key);
      return candidate;
    }
  }
  return pool[start];
}

/** Three concrete colors for a day: main, support, accent. */
export function pickDailyColors(
  recommendation: Recommendation,
  dateISO: string,
  primary: Element,
): ColorDef[] {
  const order = [
    primary,
    ...recommendation.combined
      .map((row) => row.element)
      .filter((element) => element !== primary),
  ].slice(0, 3);

  const used = new Set<string>();
  return order.map((element, index) =>
    takeColor(element, `${dateISO}:daily:${index}:${element}`, used),
  );
}

export interface OutfitPick {
  role: Role;
  color: ColorDef;
}

export interface Outfit {
  scene: Scene;
  picks: OutfitPick[];
  materialElement: Element;
}

interface ScenePlan {
  scene: Scene;
  slots: { role: Role; rank: number }[];
}

const SCENE_PLANS: ScenePlan[] = [
  {
    scene: 'work',
    slots: [
      { role: 'top', rank: 0 },
      { role: 'bottom', rank: 1 },
      { role: 'shoes', rank: 1 },
      { role: 'accessory', rank: 2 },
    ],
  },
  {
    scene: 'casual',
    slots: [
      { role: 'top', rank: 1 },
      { role: 'bottom', rank: 0 },
      { role: 'shoes', rank: 0 },
      { role: 'accessory', rank: 2 },
    ],
  },
  {
    scene: 'date',
    slots: [
      { role: 'top', rank: 0 },
      { role: 'bottom', rank: 2 },
      { role: 'shoes', rank: 1 },
      { role: 'accessory', rank: 1 },
    ],
  },
];

export function buildOutfits(recommendation: Recommendation, dateISO: string): Outfit[] {
  const ranked = recommendation.combined.map((row) => row.element);
  return SCENE_PLANS.map((plan) => {
    const used = new Set<string>();
    const picks = plan.slots.map((slot) => {
      const element = ranked[slot.rank] ?? ranked[0];
      return {
        role: slot.role,
        color: takeColor(element, `${dateISO}:${plan.scene}:${slot.role}:${element}`, used),
      };
    });
    const topPick = picks.find((pick) => pick.role === 'top') ?? picks[0];
    return {
      scene: plan.scene,
      picks,
      materialElement: topPick.color.element,
    };
  });
}
