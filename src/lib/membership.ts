import * as globalSettingsRepository from "../repositories/globalSettings.repository.js";

/** Membership year per PDF: validity from 1 Jan of the calendar year. */
export function calendarYearBounds(year: number): {
  validFrom: Date;
  validUntil: Date;
} {
  const validFrom = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const validUntil = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { validFrom, validUntil };
}

export function currentMembershipYear(): number {
  return new Date().getUTCFullYear();
}

/**
 * Returns membership validity bounds based on the admin-configured expiry date.
 * If an admin has set a `membershipExpiryDate`, membership runs from today
 * until that date. Otherwise falls back to calendar-year bounds.
 */
export async function getMembershipBounds(): Promise<{
  validFrom: Date;
  validUntil: Date;
}> {
  const settings = await globalSettingsRepository.findSingleton();
  if (settings?.membershipExpiryDate) {
    return {
      validFrom: new Date(),
      validUntil: settings.membershipExpiryDate,
    };
  }
  const year = currentMembershipYear();
  return calendarYearBounds(year);
}
