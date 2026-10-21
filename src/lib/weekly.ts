import { fromISO, shiftISO } from './date';
import { dayGanzhi } from './ganzhi';
import { buildRecommendation, type Recommendation } from './recommend';
import { BASE_SCORE, ELEMENTS, relationOf, type Element, type Relation } from './wuxing';

export interface DayForecast {
  date: string;
  element: Element;
  relation: Relation;
  score: number;
  recommendation: Recommendation;
}

export interface WeeklyForecast {
  start: string;
  end: string;
  days: DayForecast[];
  average: number;
  best: DayForecast;
  watch: DayForecast;
  element: Element;
  relation: Relation;
  luckyElements: Element[];
}

/** 0 = Monday … 6 = Sunday, matching the calendar's weekday order. */
export function weekdayIndex(iso: string): number {
  return (fromISO(iso).getDay() + 6) % 7;
}

/** Monday of the week containing the given date. */
export function weekStartISO(iso: string): string {
  return shiftISO(iso, -weekdayIndex(iso));
}

export function buildWeeklyForecast(startISO: string, personalElement: Element): WeeklyForecast {
  const days: DayForecast[] = Array.from({ length: 7 }, (_, index) => {
    const date = shiftISO(startISO, index);
    const info = dayGanzhi(date);
    const relation = relationOf(info.stemElement, personalElement);
    const branchRelation = relationOf(info.branchElement, personalElement);
    return {
      date,
      element: info.stemElement,
      relation,
      score: Math.round(BASE_SCORE[relation] * 0.6 + BASE_SCORE[branchRelation] * 0.4),
      recommendation: buildRecommendation(
        info.stemElement,
        personalElement,
        info.branchElement,
        info.stemIndex % 2 === 0,
      ),
    };
  });

  const total = days.reduce((sum, day) => sum + day.score, 0);
  const best = days.reduce((top, day) => (day.score > top.score ? day : top), days[0]);
  const watch = days.reduce((low, day) => (day.score < low.score ? day : low), days[0]);

  const elementCounts = new Map<Element, number>();
  const luckyCounts = new Map<Element, number>();
  for (const day of days) {
    elementCounts.set(day.element, (elementCounts.get(day.element) ?? 0) + 1);
    for (const element of day.recommendation.best) {
      luckyCounts.set(element, (luckyCounts.get(element) ?? 0) + 1);
    }
  }

  const element = ELEMENTS.reduce((top, candidate) =>
    (elementCounts.get(candidate) ?? 0) > (elementCounts.get(top) ?? 0) ? candidate : top,
  );

  const luckyElements = ELEMENTS.filter((candidate) => luckyCounts.has(candidate))
    .sort((a, b) => (luckyCounts.get(b) ?? 0) - (luckyCounts.get(a) ?? 0))
    .slice(0, 2);

  return {
    start: days[0].date,
    end: days[6].date,
    days,
    average: Math.round(total / days.length),
    best,
    watch,
    element,
    relation: relationOf(element, personalElement),
    luckyElements,
  };
}
