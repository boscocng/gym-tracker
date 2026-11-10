import { addDays, daysBetween } from "./days";

const COMPARE_GAP_DAYS = 28;

export function defaultBefore(after: string, photoDays: readonly string[]): string | null {
  const target = addDays(after, -COMPARE_GAP_DAYS);
  const distance = (day: string) => Math.abs(daysBetween(target, day));
  return photoDays
    .filter((day) => day < after)
    .reduce<string | null>((best, day) => (best === null || distance(day) < distance(best) ? day : best), null);
}

// When `b` is the first photo, it becomes the before photo and the latest one the after photo.
export function comparePair(
  photoDays: readonly string[],
  a: string | null,
  b: string | null,
): { before: string; after: string } | null {
  const latest = photoDays.at(-1);
  if (!latest) {
    return null;
  }
  const after = b && photoDays.includes(b) ? b : latest;
  const before = a && a !== after && photoDays.includes(a) ? a : defaultBefore(after, photoDays);
  if (before) {
    return { before, after };
  }
  return after === latest ? null : { before: after, after: latest };
}
