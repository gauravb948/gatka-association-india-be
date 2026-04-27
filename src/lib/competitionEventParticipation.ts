import { randomUUID } from "crypto";
import { fitsAgeCategory } from "./age.js";
import { AppError } from "./errors.js";
import { FARI_SOTI_EVENT_IDS, SINGLE_SOTI_EVENT_IDS } from "./sotiEventCatalogIds.js";

/** Minimal event shape for participation rules (works with Prisma `include` subsets). */
export type EventLike = {
  name: string;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  eventGroupId?: string;
};

/** Team-style event: name starts with "Team" or player bounds allow more than one starter. */
export function isTeamEvent(event: EventLike): boolean {
  if (/^Team\b/i.test(event.name.trim())) return true;
  const min = event.minPlayers ?? 0;
  const max = event.maxPlayers ?? 0;
  return max > 1 || min > 1;
}

export function isFariSotiEvent(event: Pick<EventLike, "name">): boolean {
  return /\bFari\s*Soti\b/i.test(event.name);
}

export function isFariSotiCatalogEventId(id: string | null | undefined): boolean {
  return !!id && FARI_SOTI_EVENT_IDS.has(id);
}

export function isSingleSotiCatalogEventId(id: string | null | undefined): boolean {
  return !!id && SINGLE_SOTI_EVENT_IDS.has(id);
}

export function isIndividualSingleSotiEvent(event: Pick<EventLike, "name">): boolean {
  return /\bIndividual\b/i.test(event.name) && /\bSingle\s*Soti\b/i.test(event.name);
}

/** Per-event min/max from catalog `Event` (no per-competition overrides). */
export function effectiveEventBounds(event: EventLike): { min: number; max: number } {
  const min = event.minPlayers ?? 0;
  const max = event.maxPlayers ?? 0;
  return { min, max };
}

export function assertTeamSize(playerCount: number, bounds: { min: number; max: number }): void {
  if (playerCount < bounds.min) {
    throw new AppError(400, `At least ${bounds.min} players required for this event`, "TEAM_SIZE_MIN");
  }
  if (playerCount > bounds.max) {
    throw new AppError(400, `At most ${bounds.max} players allowed for this event`, "TEAM_SIZE_MAX");
  }
}

export function newParticipationTeamId(): string {
  return randomUUID();
}

export type ParticipationWithEvent = {
  eventId: string | null;
  event: (EventLike & { eventGroupId?: string; id?: string }) | null;
};

export function playerHasFariSotiParticipation(rows: ParticipationWithEvent[]): boolean {
  return rows.some(
    (r) =>
      (r.eventId && FARI_SOTI_EVENT_IDS.has(r.eventId)) ||
      (r.event && (isFariSotiCatalogEventId(r.event.id) || isFariSotiEvent(r.event)))
  );
}

export function playerHasSingleSotiParticipation(rows: ParticipationWithEvent[]): boolean {
  return rows.some(
    (r) =>
      (r.eventId && SINGLE_SOTI_EVENT_IDS.has(r.eventId)) ||
      (r.event &&
        (isSingleSotiCatalogEventId(r.event.id) || isIndividualSingleSotiEvent(r.event)))
  );
}

export function hasIndividualSingleSotiInEventGroup(
  rows: ParticipationWithEvent[],
  eventGroupId: string
): boolean {
  return rows.some(
    (r) =>
      r.event?.eventGroupId === eventGroupId &&
      (isSingleSotiCatalogEventId(r.eventId) || (r.event && isIndividualSingleSotiEvent(r.event)))
  );
}

export function playerFitsEventGroupAge(
  dateOfBirth: Date,
  ageTillDate: Date,
  eventAge: { ageFrom: number | null; ageTo: number | null }
): boolean {
  return fitsAgeCategory(dateOfBirth, ageTillDate, eventAge.ageFrom, eventAge.ageTo);
}
