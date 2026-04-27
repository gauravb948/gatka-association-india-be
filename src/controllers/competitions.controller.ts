import type { CompetitionLevel, Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as competitionRepository from "../repositories/competition.repository.js";
import type { CatalogEventWithGroup } from "../repositories/competition.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import { AppError } from "../lib/errors.js";
import {
  assertParticipationPrerequisite,
  assertPlayerActiveForTournament,
  assertPlayerInCompetitionGeography,
  playerGenderMatchesCompetition,
  playerMatchesCompetitionGeography,
} from "../lib/eligibility.js";
import {
  assertTeamSize,
  effectiveEventBounds,
  hasIndividualSingleSotiInEventGroup,
  isFariSotiCatalogEventId,
  isFariSotiEvent,
  isIndividualSingleSotiEvent,
  isSingleSotiCatalogEventId,
  isTeamEvent,
  newParticipationTeamId,
  type ParticipationWithEvent,
  playerFitsEventGroupAge,
  playerHasFariSotiParticipation,
  playerHasSingleSotiParticipation,
} from "../lib/competitionEventParticipation.js";
import {
  actorPlayerProfileScopeWhere,
  assertRegistrarCanRecordParticipation,
  playerProfileGenderWhereFromComp,
  playerProfileWhereCompetitionEnabledScope,
} from "../lib/competitionParticipation.js";
import { fitsAgeCategory } from "../lib/age.js";
import { FARI_SOTI_EVENT_ID_LIST, SINGLE_SOTI_EVENT_ID_LIST } from "../lib/sotiEventCatalogIds.js";
import type { DbUser } from "../types/user.js";
import {
  competitionBodySchema,
  competitionParticipationBodySchema,
  competitionParticipationBulkBodySchema,
  competitionParticipationListQuerySchema,
  competitionPatchSchema,
  competitionsListQuerySchema,
  competitionsMeQuerySchema,
} from "../validators/competition.validators.js";
import * as participationRepository from "../repositories/participation.repository.js";
import { assertCanManageCompetition } from "../lib/competitionManagementScope.js";
import { prisma } from "../lib/prisma.js";

type CompForParticipation = NonNullable<
  Awaited<ReturnType<typeof competitionRepository.findByIdForPlayerEligibility>>
>;

type CompWithCatalog = NonNullable<Awaited<ReturnType<typeof competitionRepository.findByIdForParticipationContext>>>;

function playerFitsCompetitionParticipationAge(profile: { dateOfBirth: Date }, comp: CompForParticipation) {
  if (!comp.ageTillDate) return true;
  const compAgeCats = comp.ageCategories?.map((x) => x.ageCategory) ?? [];
  if (compAgeCats.length === 0) return true;
  return compAgeCats.some((cat) =>
    fitsAgeCategory(profile.dateOfBirth, comp.ageTillDate!, cat.ageFrom, cat.ageTo)
  );
}

function assertPlayerFitsCompetitionAndEventAge(
  profile: { dateOfBirth: Date },
  comp: CompWithCatalog["comp"],
  eventGroupAge: { ageFrom: number | null; ageTo: number | null }
) {
  if (!comp.ageTillDate) return;
  const compAgeCats = comp.ageCategories?.map((x) => x.ageCategory) ?? [];
  if (compAgeCats.length > 0) {
    const okComp = compAgeCats.some((cat) =>
      fitsAgeCategory(profile.dateOfBirth, comp.ageTillDate!, cat.ageFrom, cat.ageTo)
    );
    if (!okComp) {
      throw new AppError(
        400,
        "Player age does not match this competition's age categories on the age-as-of date",
        "AGE_MISMATCH"
      );
    }
  }
  if (!playerFitsEventGroupAge(profile.dateOfBirth, comp.ageTillDate, eventGroupAge)) {
    throw new AppError(
      400,
      "Player age does not match this event group's category on the age-as-of date",
      "AGE_MISMATCH_EVENT"
    );
  }
}

/** Eligible for at least one catalog event (same set for all competitions) — geo, gender, age, hierarchy. */
async function profileEligibleForSomeCompetitionEvent(
  profile: {
    userId: string;
    gender: import("@prisma/client").Gender;
    stateId: string;
    districtId: string;
    dateOfBirth: Date;
  },
  ctx: CompWithCatalog
): Promise<boolean> {
  const { comp, catalogEvents } = ctx;
  try {
    await assertParticipationPrerequisite(profile.userId, comp.createdAt, comp.level);
  } catch {
    return false;
  }
  if (!playerGenderMatchesCompetition(profile.gender, comp.genders)) return false;
  if (
    !playerMatchesCompetitionGeography(comp, {
      stateId: profile.stateId,
      districtId: profile.districtId,
    })
  ) {
    return false;
  }
  if (!comp.ageTillDate) {
    return catalogEvents.some((ev) =>
      playerGenderMatchesCompetition(profile.gender, [ev.eventGroup.gender])
    );
  }
  const compAgeCats = comp.ageCategories?.map((x) => x.ageCategory) ?? [];
  for (const ev of catalogEvents) {
    const eg = ev.eventGroup;
    if (compAgeCats.length > 0) {
      const okComp = compAgeCats.some((cat) =>
        fitsAgeCategory(profile.dateOfBirth, comp.ageTillDate!, cat.ageFrom, cat.ageTo)
      );
      if (!okComp) continue;
    }
    if (
      playerFitsEventGroupAge(profile.dateOfBirth, comp.ageTillDate, eg.ageCategory) &&
      playerGenderMatchesCompetition(profile.gender, [eg.gender])
    ) {
      return true;
    }
  }
  return false;
}

async function playerSaturatedForCompetition(playerUserId: string, ctx: CompWithCatalog): Promise<boolean> {
  const { comp, catalogEvents } = ctx;
  const existing = await participationRepository.findParticipationsWithEventsForPlayer(comp.id, playerUserId);
  for (const ev of catalogEvents) {
    if (existing.some((e) => e.eventId === ev.id)) continue;
    try {
      await validatePlayersForCompetitionEvent(comp, comp, null, ev, [playerUserId], {
        dryRun: true,
        existingByPlayer: new Map([[playerUserId, existing]]),
      });
    } catch {
      continue;
    }
    return false;
  }
  return true;
}

type ValidateParticipationOpts = {
  dryRun?: boolean;
  existingByPlayer?: Map<string, Awaited<ReturnType<typeof participationRepository.findParticipationsWithEventsForPlayer>>>;
};

async function validatePlayersForCompetitionEvent(
  compGeo: CompForParticipation,
  compFull: CompWithCatalog["comp"],
  actor: DbUser | null,
  catalogEvent: CatalogEventWithGroup,
  playerUserIds: string[],
  opts: ValidateParticipationOpts = {}
): Promise<void> {
  const ids = [...new Set(playerUserIds.map((s) => s.trim()).filter(Boolean))];
  if (ids.length !== playerUserIds.length) {
    throw new AppError(400, "Duplicate player ids in request", "DUPLICATE_PLAYER_IDS");
  }
  const bounds = effectiveEventBounds(catalogEvent);
  assertTeamSize(ids.length, bounds);
  const team = isTeamEvent(catalogEvent);
  if (!team && ids.length !== 1) {
    throw new AppError(400, "This event accepts a single player only", "SINGLE_PLAYER_EVENT");
  }

  for (const playerUserId of ids) {
    await assertParticipationPrerequisite(playerUserId, compFull.createdAt, compFull.level);
    await assertPlayerActiveForTournament(playerUserId);
    const profile = await playerRepository.findProfileByUserId(playerUserId);
    if (!profile) throw new AppError(404, "Player profile not found", "PLAYER_NOT_FOUND");
    if (!playerGenderMatchesCompetition(profile.gender, compGeo.genders)) {
      throw new AppError(400, "Gender not eligible for this competition", "GENDER_MISMATCH");
    }
    if (!playerGenderMatchesCompetition(profile.gender, [catalogEvent.eventGroup.gender])) {
      throw new AppError(400, "Gender not eligible for this event group", "GENDER_MISMATCH_EVENT");
    }
    assertPlayerInCompetitionGeography(compGeo, {
      stateId: profile.stateId,
      districtId: profile.districtId,
    });
    assertPlayerFitsCompetitionAndEventAge(profile, compFull, catalogEvent.eventGroup.ageCategory);
    if (!opts.dryRun) {
      if (!actor) throw new AppError(500, "Registrar required");
      assertRegistrarCanRecordParticipation(actor, compGeo, profile);
    }

    const existingRaw =
      opts.existingByPlayer?.get(playerUserId) ??
      (await participationRepository.findParticipationsWithEventsForPlayer(compFull.id, playerUserId));
    const existing = existingRaw as unknown as ParticipationWithEvent[];

    const dup = existing.find((r) => r.eventId === catalogEvent.id);
    if (dup) {
      throw new AppError(409, "Player already registered for this event", "ALREADY_IN_EVENT");
    }

    const signingUpSingleSoti =
      isSingleSotiCatalogEventId(catalogEvent.id) || isIndividualSingleSotiEvent(catalogEvent);
    if (signingUpSingleSoti && playerHasFariSotiParticipation(existing)) {
      throw new AppError(
        400,
        "Cannot join Single Soti after participating in Fari Soti in this competition",
        "FARI_SOTI_BLOCKS_SINGLE_SOTI"
      );
    }

    const signingUpFariSoti =
      isFariSotiCatalogEventId(catalogEvent.id) || isFariSotiEvent(catalogEvent);
    if (signingUpFariSoti && playerHasSingleSotiParticipation(existing)) {
      throw new AppError(
        400,
        "Cannot join Fari Soti after participating in Single Soti in this competition",
        "SINGLE_SOTI_BLOCKS_FARI_SOTI"
      );
    }

    if (signingUpSingleSoti) {
      if (hasIndividualSingleSotiInEventGroup(existing, catalogEvent.eventGroupId)) {
        throw new AppError(
          409,
          "Player already has an Individual Single Soti entry in this event group",
          "DUPLICATE_SINGLE_SOTI_GROUP"
        );
      }
    }

    if (existing.length + 1 > 2) {
      throw new AppError(
        400,
        "Player may participate in at most two events in this competition",
        "EVENT_CAP"
      );
    }
  }
}

function inferCompetitionLevel(user: DbUser): "DISTRICT" | "STATE" | "NATIONAL" {
  if (user.role === "NATIONAL_ADMIN") return "NATIONAL";
  if (user.role === "STATE_ADMIN") return "STATE";
  if (user.role === "DISTRICT_ADMIN") return "DISTRICT";
  throw new AppError(403, "Forbidden");
}

async function assertCompetitionScope(
  level: string,
  stateIds: string[],
  districtIds: string[],
  user: DbUser
) {
  if (user.role === "NATIONAL_ADMIN") return;
  if (user.role === "STATE_ADMIN") {
    if (level === "NATIONAL") throw new AppError(403, "Forbidden");
    if (stateIds.length && stateIds.some((id) => id !== user.stateId)) {
      throw new AppError(403, "Forbidden");
    }
    if (districtIds.length) {
      const rows = await prisma.district.findMany({
        where: { id: { in: districtIds } },
        select: { stateId: true },
      });
      if (rows.length !== districtIds.length) throw new AppError(400, "Unknown district id");
      if (rows.some((r) => r.stateId !== user.stateId)) throw new AppError(403, "Forbidden");
    }
    return;
  }
  if (user.role === "DISTRICT_ADMIN") {
    if (level !== "DISTRICT") throw new AppError(403, "District can only create district comps");
    if (districtIds.length && districtIds.some((id) => id !== user.districtId)) {
      throw new AppError(403, "Forbidden");
    }
    if (stateIds.length && user.stateId && stateIds.some((id) => id !== user.stateId)) {
      throw new AppError(403, "Forbidden");
    }
    return;
  }
  if (user.role === "TRAINING_CENTER") {
    throw new AppError(403, "TC cannot create competitions");
  }
  throw new AppError(403, "Forbidden");
}

async function validateCompetitionGeographyInput(stateIds: string[], districtIds: string[]) {
  if (stateIds.length) {
    const n = await prisma.state.count({ where: { id: { in: stateIds } } });
    if (n !== stateIds.length) throw new AppError(400, "Unknown state id");
  }
  if (districtIds.length) {
    const rows = await prisma.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, stateId: true },
    });
    if (rows.length !== districtIds.length) throw new AppError(400, "Unknown district id");
    if (stateIds.length) {
      const allowed = new Set(stateIds);
      for (const r of rows) {
        if (!allowed.has(r.stateId)) {
          throw new AppError(400, "A selected district is not in the selected states");
        }
      }
    }
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = competitionsListQuerySchema.parse(req.query);
    const rows = await competitionRepository.findMany({ nameContains: q.name });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await competitionRepository.findByIdDetail(req.params.id);
    if (!row) throw new AppError(404, "Competition not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

/** Active event groups whose age band overlaps the competition’s linked age categories. */
export async function getEventGroupsByCompetition(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rows = await competitionRepository.findEventGroupsInCompetitionAgeScope(req.params.id);
    if (rows === null) throw new AppError(404, "Competition not found");
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listForCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    const q = competitionsMeQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const u = req.dbUser!;
    const listUser =
      u.role === "TRAINING_CENTER"
        ? {
            id: u.id,
            role: u.role,
            stateId: u.stateId ?? u.trainingCenter?.district.state.id ?? null,
            districtId: u.districtId ?? u.trainingCenter?.district.id ?? null,
          }
        : {
            id: u.id,
            role: u.role,
            stateId: u.stateId,
            districtId: u.districtId,
          };
    const { items, total } = await competitionRepository.findManyForAuthenticatedUserPaginated(
      listUser,
      { skip, take: q.pageSize, nameContains: q.name }
    );
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionBodySchema.parse(req.body);
    const stateIds = [...new Set(body.stateIds)];
    const districtIds = [...new Set(body.districtIds)];

    const existing = await competitionRepository.findFirstByName(body.name.trim());
    if (existing) {
      throw new AppError(409, "A competition with this name already exists", "COMPETITION_NAME_TAKEN");
    }

    const level = inferCompetitionLevel(req.dbUser!);

    await assertCompetitionScope(level, stateIds, districtIds, req.dbUser!);
    await validateCompetitionGeographyInput(stateIds, districtIds);

    const ageCategoryIds = [...new Set(body.ageCategoryIds)];
    const ageCatCount = await prisma.ageCategory.count({
      where: { id: { in: ageCategoryIds } },
    });
    if (ageCatCount !== ageCategoryIds.length) {
      throw new AppError(400, "One or more age categories are unknown");
    }

    const genders = [...new Set(body.genders)];
    const data: Prisma.CompetitionCreateInput = {
      createdBy: { connect: { id: req.dbUser!.id } },
      level,
      name: body.name.trim(),
      venue: body.venue.trim(),
      genders,
      ageCategories: {
        create: ageCategoryIds.map((ageCategoryId) => ({
          ageCategory: { connect: { id: ageCategoryId } },
        })),
      },
      ageTillDate: new Date(body.ageTillDate.trim()),
      startDate: new Date(body.startDate.trim()),
      endDate: new Date(body.endDate.trim()),
      registrationOpensAt: new Date(body.registrationOpensAt.trim()),
      registrationClosesAt: new Date(body.registrationClosesAt.trim()),
      finalSubmitRequiresPayment: true,
    };
    if (stateIds.length) {
      data.states = {
        create: stateIds.map((stateId) => ({
          state: { connect: { id: stateId } },
        })),
      };
    }
    if (districtIds.length) {
      data.districts = {
        create: districtIds.map((districtId) => ({
          district: { connect: { id: districtId } },
        })),
      };
    }
    const comp = await competitionRepository.createCompetition(data);
    res.status(201).json(comp);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionPatchSchema.parse(req.body);
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    if (comp.isClosed) {
      throw new AppError(400, "Cannot edit a closed competition", "COMPETITION_CLOSED");
    }
    await assertCanManageCompetition(req.dbUser!, comp);

    const stateIds =
      body.stateIds !== undefined ? [...new Set(body.stateIds)] : undefined;
    const districtIds =
      body.districtIds !== undefined ? [...new Set(body.districtIds)] : undefined;

    if (stateIds !== undefined && districtIds !== undefined) {
      await assertCompetitionScope(comp.level, stateIds, districtIds, req.dbUser!);
      await validateCompetitionGeographyInput(stateIds, districtIds);
    }

    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      const clash = await competitionRepository.findFirstByNameExcludingId(trimmed, comp.id);
      if (clash) {
        throw new AppError(409, "A competition with this name already exists", "COMPETITION_NAME_TAKEN");
      }
    }

    const data: Prisma.CompetitionUpdateInput = {};
    if (!comp.createdById) {
      data.createdBy = { connect: { id: req.dbUser!.id } };
    }
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.venue !== undefined) data.venue = body.venue.trim();
    if (body.genders !== undefined) data.genders = [...new Set(body.genders)];
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate.trim());
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate.trim());
    if (body.registrationOpensAt !== undefined) {
      data.registrationOpensAt = new Date(body.registrationOpensAt.trim());
    }
    if (body.registrationClosesAt !== undefined) {
      data.registrationClosesAt = new Date(body.registrationClosesAt.trim());
    }
    if (body.ageTillDate !== undefined) {
      data.ageTillDate = new Date(body.ageTillDate.trim());
    }

    const geo =
      stateIds !== undefined && districtIds !== undefined
        ? { stateIds, districtIds }
        : undefined;

    const ageCategoryIds =
      body.ageCategoryIds !== undefined ? [...new Set(body.ageCategoryIds)] : undefined;
    if (ageCategoryIds !== undefined) {
      const n = await prisma.ageCategory.count({ where: { id: { in: ageCategoryIds } } });
      if (n !== ageCategoryIds.length) {
        throw new AppError(400, "One or more age categories are unknown");
      }
    }

    const updated = await competitionRepository.updateCompetitionAndGeo(comp.id, data, {
      geo,
      ageCategoryIds,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function close(req: Request, res: Response, next: NextFunction) {
  try {
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanManageCompetition(req.dbUser!, comp);
    const updated = await competitionRepository.updateCompetitionAndGeo(comp.id, {
      isClosed: true,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function eligiblePlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp, catalogEvents } = ctx;
    if (comp.isClosed) {
      throw new AppError(400, "Competition is closed", "COMPETITION_CLOSED");
    }

    const actor = req.dbUser!;

    if (actor.role === "TRAINING_CENTER") {
      if (comp.level !== "DISTRICT") {
        return res.json([]);
      }
      if (!actor.trainingCenterId || !actor.trainingCenter) {
        throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
      }
    }

    const eventId =
      typeof req.query.eventId === "string" && req.query.eventId.length > 0
        ? req.query.eventId
        : undefined;

    let eventForQuery: (typeof catalogEvents)[number] | undefined;
    let alreadyInThisEvent: Set<string> = new Set();
    let playerIdsWithFariSotiInComp: Set<string> = new Set();
    let playerIdsWithSingleSotiInComp: Set<string> = new Set();
    if (eventId) {
      eventForQuery = catalogEvents.find((e) => e.id === eventId);
      if (!eventForQuery) {
        return res.json([]);
      }
      alreadyInThisEvent = await participationRepository.findPlayerUserIdsParticipatedInEvent(
        comp.id,
        eventId
      );
      if (isSingleSotiCatalogEventId(eventId)) {
        playerIdsWithFariSotiInComp =
          await participationRepository.findPlayerUserIdsParticipatedInAnyOfEvents(
            comp.id,
            FARI_SOTI_EVENT_ID_LIST
          );
      }
      if (isFariSotiCatalogEventId(eventId) || isFariSotiEvent(eventForQuery)) {
        playerIdsWithSingleSotiInComp =
          await participationRepository.findPlayerUserIdsParticipatedInAnyOfEvents(
            comp.id,
            SINGLE_SOTI_EVENT_ID_LIST
          );
      }
    }

    const players = await playerRepository.findManyEligibleActive();
    const tcDistrictId =
      actor.role === "TRAINING_CENTER" && actor.trainingCenter
        ? actor.trainingCenter.district.id
        : null;

    const filtered: typeof players = [];
    for (const p of players) {
      if (tcDistrictId && p.districtId !== tcDistrictId) {
        continue;
      }
      if (eventId && eventForQuery) {
        if (alreadyInThisEvent.has(p.userId)) {
          continue;
        }
        if (playerIdsWithFariSotiInComp.has(p.userId)) {
          continue;
        }
        if (playerIdsWithSingleSotiInComp.has(p.userId)) {
          continue;
        }
        const ce = eventForQuery;
        try {
          await assertParticipationPrerequisite(p.userId, comp.createdAt, comp.level);
        } catch {
          continue;
        }
        if (!playerGenderMatchesCompetition(p.gender, comp.genders)) continue;
        if (
          !playerMatchesCompetitionGeography(comp, {
            stateId: p.stateId,
            districtId: p.districtId,
          })
        ) {
          continue;
        }
        if (!playerGenderMatchesCompetition(p.gender, [ce.eventGroup.gender])) continue;
        try {
          assertPlayerFitsCompetitionAndEventAge(p, comp, ce.eventGroup.ageCategory);
        } catch {
          continue;
        }
        filtered.push(p);
      } else if (await profileEligibleForSomeCompetitionEvent(p, ctx)) {
        filtered.push(p);
      }
    }

    res.json(
      filtered.map((p) => ({
        userId: p.userId,
        fullName: p.fullName,
        gender: p.gender,
        registrationNumber: p.registrationNumber,
        stateId: p.stateId,
        districtId: p.districtId,
        trainingCenterId: p.trainingCenterId,
        photoUrl: p.photoUrl,
        state: p.state,
        district: p.district,
        trainingCenter: p.trainingCenter,
      }))
    );
  } catch (e) {
    next(e);
  }
}

export async function createParticipation(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionParticipationBodySchema.parse(req.body);
    const actor = req.dbUser!;
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp, catalogEvents } = ctx;
    if (comp.isClosed) {
      throw new AppError(400, "Competition is closed", "COMPETITION_CLOSED");
    }

    const catalogEvent = catalogEvents.find((e) => e.id === body.eventId);
    if (!catalogEvent) {
      throw new AppError(400, "Unknown or inactive event", "UNKNOWN_EVENT");
    }

    const playerIds = [...new Set(body.playerUserIds.map((s) => s.trim()).filter(Boolean))];
    await validatePlayersForCompetitionEvent(comp, comp, actor, catalogEvent, playerIds);

    const teamId = isTeamEvent(catalogEvent) ? newParticipationTeamId() : null;
    await participationRepository.createManyParticipationRecords(
      playerIds.map((playerUserId) => ({
        competitionId: comp.id,
        playerUserId,
        level: comp.level,
        participated: true,
        eventId: catalogEvent.id,
        teamId,
      }))
    );

    const records = await prisma.participationRecord.findMany({
      where: {
        competitionId: comp.id,
        eventId: catalogEvent.id,
        playerUserId: { in: playerIds },
        participated: true,
      },
      include: {
        event: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(201).json({ teamId, count: records.length, items: records });
  } catch (e) {
    next(e);
  }
}

export async function createParticipationBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionParticipationBulkBodySchema.parse(req.body);
    const actor = req.dbUser!;
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp, catalogEvents } = ctx;
    if (comp.isClosed) {
      throw new AppError(400, "Competition is closed", "COMPETITION_CLOSED");
    }

    for (const item of body.items) {
      const ev = catalogEvents.find((e) => e.id === item.eventId);
      if (!ev) {
        throw new AppError(400, `Unknown or inactive event: ${item.eventId}`, "UNKNOWN_EVENT");
      }
      await validatePlayersForCompetitionEvent(comp, comp, actor, ev, item.playerUserIds);
    }

    const rows: Array<{
      competitionId: string;
      playerUserId: string;
      level: CompetitionLevel;
      participated: boolean;
      eventId: string;
      teamId: string | null;
    }> = [];

    for (const item of body.items) {
      const ev = catalogEvents.find((e) => e.id === item.eventId)!;
      const teamId = isTeamEvent(ev) ? newParticipationTeamId() : null;
      const ids = [...new Set(item.playerUserIds.map((s) => s.trim()).filter(Boolean))];
      for (const playerUserId of ids) {
        rows.push({
          competitionId: comp.id,
          playerUserId,
          level: comp.level,
          participated: true,
          eventId: ev.id,
          teamId,
        });
      }
    }

    await participationRepository.createManyParticipationRecords(rows);

    const allPlayerIds = [...new Set(rows.map((r) => r.playerUserId))];
    const records = await prisma.participationRecord.findMany({
      where: { competitionId: comp.id, playerUserId: { in: allPlayerIds }, participated: true },
      include: { event: true },
      orderBy: { createdAt: "asc" },
    });

    res.status(201).json({
      count: records.length,
      items: records,
    });
  } catch (e) {
    next(e);
  }
}

export async function listPlayersNotParticipated(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp } = ctx;
    if (comp.isClosed) {
      throw new AppError(400, "Competition is closed", "COMPETITION_CLOSED");
    }

    const q = competitionParticipationListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;

    const geoWhere = playerProfileWhereCompetitionEnabledScope(comp);
    const actorWhere = actorPlayerProfileScopeWhere(actor, { competitionLevel: comp.level });
    const genderWhere = playerProfileGenderWhereFromComp(comp.genders);

    const andParts: Prisma.PlayerProfileWhereInput[] = [
      {
        registrationStatus: "ACTIVE",
        isBlacklisted: false,
        tcDisabled: false,
      },
      geoWhere,
      actorWhere,
    ];
    if (genderWhere) andParts.push(genderWhere);

    const candidates = await prisma.playerProfile.findMany({
      where: { AND: andParts },
      orderBy: { fullName: "asc" },
      select: {
        userId: true,
        fullName: true,
        gender: true,
        registrationNumber: true,
        stateId: true,
        districtId: true,
        trainingCenterId: true,
        photoUrl: true,
        aadharFrontUrl: true,
        aadharBackUrl: true,
        dateOfBirth: true,
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true } },
        trainingCenter: { select: { id: true, name: true } },
      },
    });

    const filtered: typeof candidates = [];
    for (const p of candidates) {
      if (!(await profileEligibleForSomeCompetitionEvent(p, ctx))) continue;
      if (await playerSaturatedForCompetition(p.userId, ctx)) continue;
      filtered.push(p);
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + q.pageSize);
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);

    res.json({
      items: items.map(({ dateOfBirth: _d, ...rest }) => rest),
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function listParticipants(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdBasic(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");

    const scope = actorPlayerProfileScopeWhere(actor, { competitionLevel: comp.level });
    const playerProfileWhere = Object.keys(scope).length > 0 ? scope : undefined;

    const q = competitionParticipationListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const { items, total } = await participationRepository.findManyByCompetitionPaginated(
      comp.id,
      {
        skip,
        take: q.pageSize,
      },
      { playerProfileWhere }
    );
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);

    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}
