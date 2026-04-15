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
