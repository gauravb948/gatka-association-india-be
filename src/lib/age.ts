/**
 * Age on a given calendar date (birthday not yet reached => age-1 on that day in common sports rules;
 * we use simple year diff for consistency with "as of date" cutoffs).
 */
export function ageOnDate(dateOfBirth: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const m = asOf.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (m < 0 || (m === 0 && asOf.getUTCDate() < dateOfBirth.getUTCDate())) {
    age--;
  }
  return age;
}

export function fitsAgeCategory(
  dateOfBirth: Date,
  asOf: Date,
  ageFrom: number | null | undefined,
  ageTo: number | null | undefined
): boolean {
  const age = ageOnDate(dateOfBirth, asOf);
  if (ageFrom != null && age < ageFrom) return false;
  if (ageTo != null && age > ageTo) return false;
  return true;
}

/** Inclusive age bands: null bounds mean unbounded in that direction. */
export function ageBandsOverlap(
  a: { ageFrom: number | null; ageTo: number | null },
  b: { ageFrom: number | null; ageTo: number | null }
): boolean {
  const aLo = a.ageFrom ?? Number.NEGATIVE_INFINITY;
  const aHi = a.ageTo ?? Number.POSITIVE_INFINITY;
  const bLo = b.ageFrom ?? Number.NEGATIVE_INFINITY;
  const bHi = b.ageTo ?? Number.POSITIVE_INFINITY;
  return Math.max(aLo, bLo) <= Math.min(aHi, bHi);
}
