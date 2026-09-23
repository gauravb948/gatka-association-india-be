import { PaymentPurpose, PaymentStatus, type CompetitionLevel, type Prisma } from "@prisma/client";
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
} from "../lib/eligibility.js";
import {
  assertTeamSize,
  effectiveEventBounds,
  isFariSotiCatalogEventId,
  isFariSotiEvent,
  isSingleSotiCatalogEventId,
  isSingleSotiEvent,
  isTeamEvent,
  newParticipationTeamId,
  orgUnitKeyForIndividualEvent,
  orgUnitLabelForCompetitionLevel,
  orgUnitProfileWhereForTeam,
  type ParticipationWithEvent,
  playerFitsEventGroupAge,
  playerHasFariSotiParticipation,
  playerHasSingleSotiParticipation,
  playerHasTeamEventParticipation,
} from "../lib/competitionEventParticipation.js";
import {
  actorPlayerProfileScopeWhere,
  assertCompetitionAcceptsRosterChanges,
  assertRegistrarCanRecordParticipation,
  playerProfileGenderWhereFromComp,
  playerProfileWhereCompetitionEnabledScope,
} from "../lib/competitionParticipation.js";
import {
  assertEntryFeeForLevel,
  assertPayingUnitRosterUnlocked,
  countFeeSubmissions,
  countUniquePlayersForUnit,
  findFeeSubmission,
  listFeeSubmissions,
  payingUnitForActor,
} from "../lib/competitionFee.js";
import { fitsAgeCategory } from "../lib/age.js";
import type { DbUser } from "../types/user.js";
import {
  competitionBodySchema,
  competitionParticipationBodySchema,
  competitionParticipationBulkBodySchema,
  competitionParticipationListQuerySchema,
  competitionPatchSchema,
  competitionReplaceParticipationBodySchema,
  competitionUnregisterParticipationBodySchema,
  competitionsListQuerySchema,
  competitionsMeQuerySchema,
  competitionsForReportsQuerySchema,
} from "../validators/competition.validators.js";
import * as participationRepository from "../repositories/participation.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import { getRazorpayConfigForPayment } from "../lib/razorpayConfig.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import {
  assertCanClearCompetitionParticipants,
  assertCanManageCompetition,
  assertCanViewCompetitionScopedReport,
} from "../lib/competitionManagementScope.js";
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

async function playerSaturatedForCompetition(playerUserId: string, ctx: CompWithCatalog): Promise<boolean> {
  const { comp, catalogEvents } = ctx;
  const existing = await participationRepository.findParticipationsWithEventsForPlayer(comp.id, playerUserId);
  for (const ev of catalogEvents) {
    if (existing.some((e) => e.eventId === ev.id)) continue;
    try {
      await validatePlayersForCompetitionEvent(comp, comp, null, ev, [playerUserId], {
        dryRun: true,
        skipBatchTeamSizeAssert: true,
        existingByPlayer: new Map([
          [playerUserId, existing as ParticipationWithEvent[]],
        ]),
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
  existingByPlayer?: Map<string, ParticipationWithEvent[]>;
  /** Per catalog event: org-unit keys already claimed in this request batch (individual events only). */
  claimedOrgUnitsByEvent?: Map<string, Set<string>>;
  /** Skip batch min/max size check (e.g. single-player replace onto an existing team). */
  skipBatchTeamSizeAssert?: boolean;
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
  if (!opts.skipBatchTeamSizeAssert) {
    assertTeamSize(ids.length, bounds);
  }
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

    const existing: ParticipationWithEvent[] =
      opts.existingByPlayer?.get(playerUserId) ??
      ((await participationRepository.findParticipationsWithEventsForPlayer(
        compFull.id,
        playerUserId
      )) as ParticipationWithEvent[]);

    const dup = existing.find((r) => r.eventId === catalogEvent.id);
    if (dup) {
      throw new AppError(409, "Player already registered for this event", "ALREADY_IN_EVENT");
    }

    if (existing.length + 1 > 2) {
      throw new AppError(
        400,
        "Player may participate in at most two events in this competition",
        "EVENT_CAP"
      );
    }

    if (team && playerHasTeamEventParticipation(existing)) {
      throw new AppError(
        400,
        "Player may participate in at most one team event in this competition",
        "TEAM_EVENT_CAP"
      );
    }

    const signingUpSingleSoti =
      isSingleSotiCatalogEventId(catalogEvent.id) || isSingleSotiEvent(catalogEvent);
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

    if (!team) {
      const orgKey = orgUnitKeyForIndividualEvent(compFull.level, profile);
      const claimed = opts.claimedOrgUnitsByEvent?.get(catalogEvent.id);
      if (claimed?.has(orgKey)) {
        const unit = orgUnitLabelForCompetitionLevel(compFull.level);
        throw new AppError(
          400,
          `Only one player from a ${unit} may participate in this individual event`,
          "ORG_UNIT_INDIVIDUAL_CAP"
        );
      }
      const conflict = await participationRepository.findOrgUnitConflictForIndividualEvent(
        compFull.id,
        catalogEvent.id,
        compFull.level,
        {
          userId: profile.userId,
          trainingCenterId: profile.trainingCenterId,
          districtId: profile.districtId,
          stateId: profile.stateId,
        }
      );
      if (conflict) {
        const unit = orgUnitLabelForCompetitionLevel(compFull.level);
        throw new AppError(
          400,
          `Only one player from a ${unit} may participate in this individual event`,
          "ORG_UNIT_INDIVIDUAL_CAP"
        );
      }
      if (opts.claimedOrgUnitsByEvent) {
        const set = opts.claimedOrgUnitsByEvent.get(catalogEvent.id) ?? new Set<string>();
        set.add(orgKey);
        opts.claimedOrgUnitsByEvent.set(catalogEvent.id, set);
      }
    }
  }
}

async function playerMayJoinCompetitionEvent(
  comp: CompWithCatalog["comp"],
  catalogEvent: CatalogEventWithGroup,
  playerUserId: string
): Promise<boolean> {
  try {
    await validatePlayersForCompetitionEvent(comp, comp, null, catalogEvent, [playerUserId], {
      dryRun: true,
      skipBatchTeamSizeAssert: true,
    });
    return true;
  } catch {
    return false;
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
    const rows = await competitionRepository.findMany({
      nameContains: q.name,
      level: q.level,
      stateId: q.stateId,
      current: q.current,
    });
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
      {
        skip,
        take: q.pageSize,
        nameContains: q.name,
        sessionYear: q.session,
        level: q.level,
        stateId: q.stateId,
        districtId: q.districtId,
      }
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

/**
 * Competitions for report filter dropdowns (summary sheet, etc.).
 * Older hierarchy visibility — excludes lower-level comps (e.g. state admin does not list DISTRICT).
 */
export async function listForReports(req: Request, res: Response, next: NextFunction) {
  try {
    const q = competitionsForReportsQuerySchema.parse(req.query);
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
    const { items, total } = await competitionRepository.findManyForReportFiltersPaginated(
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

/** Distinct competition season years (`createdAt` UTC) present in the database. */
export async function listCompetitionSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const years = await competitionRepository.findDistinctCompetitionSessionYears();
    res.json({ years });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionBodySchema.parse(req.body);
    const stateIds = [...new Set(body.stateIds)];

    const existing = await competitionRepository.findFirstByName(body.name.trim());
    if (existing) {
      throw new AppError(409, "A competition with this name already exists", "COMPETITION_NAME_TAKEN");
    }

    const level = inferCompetitionLevel(req.dbUser!);
    const districtIds =
      level === "NATIONAL" ? [] : [...new Set(body.districtIds)];
    if (level !== "NATIONAL" && districtIds.length === 0) {
      throw new AppError(400, "Please select at least one district");
    }
    const entryFeePaise = assertEntryFeeForLevel(level, body.entryFeePaise ?? null);

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
      ...(entryFeePaise != null ? { entryFeePaise } : {}),
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

    let geo: { stateIds: string[]; districtIds: string[] } | undefined;
    if (comp.level === "NATIONAL") {
      if (stateIds !== undefined) {
        await assertCompetitionScope(comp.level, stateIds, [], req.dbUser!);
        await validateCompetitionGeographyInput(stateIds, []);
        geo = { stateIds, districtIds: [] };
      }
    } else if (stateIds !== undefined || districtIds !== undefined) {
      if (stateIds === undefined || districtIds === undefined) {
        throw new AppError(400, "stateIds and districtIds must both be sent together");
      }
      if (districtIds.length === 0) {
        throw new AppError(400, "Please select at least one district");
      }
      await assertCompetitionScope(comp.level, stateIds, districtIds, req.dbUser!);
      await validateCompetitionGeographyInput(stateIds, districtIds);
      geo = { stateIds, districtIds };
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
    if (body.entryFeePaise !== undefined) {
      const fee = assertEntryFeeForLevel(comp.level, body.entryFeePaise);
      if (fee !== comp.entryFeePaise) {
        if ((await countFeeSubmissions(comp.id)) > 0) {
          throw new AppError(
            400,
            "Cannot change the entry fee after a unit has submitted payment",
            "FEE_LOCKED"
          );
        }
        data.entryFeePaise = fee;
      }
    }

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

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanManageCompetition(req.dbUser!, comp);
    const deleted = await competitionRepository.deleteCompetition(comp.id);
    res.json({
      id: comp.id,
      name: comp.name,
      ...deleted,
    });
  } catch (e) {
    next(e);
  }
}

/** Remove participants from a competition; the competition itself is kept.
 * Same-level admin clears everyone. The role one step below may clear only their territory
 * (TC → district, district admin → state, state admin → national).
 */
export async function removeAllParticipants(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    const scope = await assertCanClearCompetitionParticipants(actor, comp);
    assertCompetitionAcceptsRosterChanges(comp);
    await assertPayingUnitRosterUnlocked(actor, comp.id, comp.level);
    const playerProfileWhere =
      scope === "territory" ? actorPlayerProfileScopeWhere(actor) : undefined;
    const deleted = await competitionRepository.deleteCompetitionParticipants(
      comp.id,
      playerProfileWhere
    );
    res.json({
      id: comp.id,
      name: comp.name,
      scope,
      ...deleted,
    });
  } catch (e) {
    next(e);
  }
}

export async function eligiblePlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp, catalogEvents } = ctx;
    assertCompetitionAcceptsRosterChanges(comp);

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
    const eventForQuery = eventId
      ? catalogEvents.find((e) => e.id === eventId)
      : undefined;
    if (eventId && !eventForQuery) {
      return res.json([]);
    }

    const actorScopeWhere = actorPlayerProfileScopeWhere(actor);
    const players = await playerRepository.findManyEligibleActive(actorScopeWhere);

    const filtered: typeof players = [];
    for (const p of players) {
      if (eventForQuery) {
        if (await playerMayJoinCompetitionEvent(comp, eventForQuery, p.userId)) {
          filtered.push(p);
        }
      } else if (!(await playerSaturatedForCompetition(p.userId, ctx))) {
        filtered.push(p);
      }
    }

    const participatingByPlayer =
      await participationRepository.findParticipatingEventsByPlayerUserIds(
        comp.id,
        filtered.map((p) => p.userId)
      );

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
        participatingIn: participatingByPlayer.get(p.userId) ?? [],
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
    assertCompetitionAcceptsRosterChanges(comp);
    await assertPayingUnitRosterUnlocked(actor, comp.id, comp.level);

    const catalogEvent = catalogEvents.find((e) => e.id === body.eventId);
    if (!catalogEvent) {
      throw new AppError(400, "Unknown or inactive event", "UNKNOWN_EVENT");
    }

    const playerIds = [...new Set(body.playerUserIds.map((s) => s.trim()).filter(Boolean))];
    const team = isTeamEvent(catalogEvent);
    const bounds = effectiveEventBounds(catalogEvent);
    const actorScope = actorPlayerProfileScopeWhere(actor);

    let existingCount = 0;
    let existingTeamId: string | null = null;
    if (team) {
      const firstProfile = await playerRepository.findProfileByUserId(playerIds[0]!);
      if (!firstProfile) throw new AppError(404, "Player profile not found", "PLAYER_NOT_FOUND");
      const orgKey = orgUnitKeyForIndividualEvent(comp.level, firstProfile);
      const unitLabel = orgUnitLabelForCompetitionLevel(comp.level);
      for (const playerUserId of playerIds) {
        const profile = await playerRepository.findProfileByUserId(playerUserId);
        if (!profile) throw new AppError(404, "Player profile not found", "PLAYER_NOT_FOUND");
        if (orgUnitKeyForIndividualEvent(comp.level, profile) !== orgKey) {
          throw new AppError(
            400,
            `All players added together must be from the same ${unitLabel}`,
            "TEAM_ORG_UNIT_MISMATCH"
          );
        }
      }
      const orgWhere = orgUnitProfileWhereForTeam(comp.level, firstProfile);
      const teamScope: Prisma.PlayerProfileWhereInput =
        Object.keys(actorScope).length > 0 ? { AND: [actorScope, orgWhere] } : orgWhere;
      existingCount = await participationRepository.countParticipatedInEvent(comp.id, catalogEvent.id, {
        playerProfileWhere: teamScope,
      });
      const latest = await participationRepository.findLatestParticipatedInEventForScope(
        comp.id,
        catalogEvent.id,
        teamScope
      );
      existingTeamId = latest?.teamId ?? null;
    }

    /** Roster already meets min — allow adding fewer than min in this request (up to max). */
    const isTeamTopUp = team && existingCount >= bounds.min && existingCount > 0;

    if (isTeamTopUp) {
      await validatePlayersForCompetitionEvent(comp, comp, actor, catalogEvent, playerIds, {
        skipBatchTeamSizeAssert: true,
      });
      assertTeamSize(existingCount + playerIds.length, bounds);
    } else {
      await validatePlayersForCompetitionEvent(comp, comp, actor, catalogEvent, playerIds);
    }

    const teamId = team
      ? isTeamTopUp
        ? existingTeamId ?? newParticipationTeamId()
        : newParticipationTeamId()
      : null;

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

/**
 * Team min/max still applies unless every remaining member of that team is in `removingPlayerIds`.
 */
async function assertTeamSizeAfterUnregister(
  competitionId: string,
  catalogEvents: CatalogEventWithGroup[],
  removingPlayerIds: string[],
  eventId?: string
) {
  const removing = new Set(removingPlayerIds);
  let eventIds: string[];
  if (eventId) {
    eventIds = [eventId];
  } else {
    const rows = await participationRepository.findParticipatedEventIdsForPlayers(
      competitionId,
      removingPlayerIds
    );
    eventIds = rows.map((r) => r.eventId).filter((id): id is string => Boolean(id));
  }

  for (const eid of eventIds) {
    const catalogEvent = catalogEvents.find((e) => e.id === eid);
    if (!catalogEvent || !isTeamEvent(catalogEvent)) continue;

    const rows = await participationRepository.findParticipatedPlayerRowsForEvent(
      competitionId,
      eid
    );
    const byTeam = new Map<string, string[]>();
    for (const row of rows) {
      const key = row.teamId ?? "";
      const members = byTeam.get(key) ?? [];
      members.push(row.playerUserId);
      byTeam.set(key, members);
    }

    const bounds = effectiveEventBounds(catalogEvent);
    for (const members of byTeam.values()) {
      const remaining = members.filter((id) => !removing.has(id));
      if (remaining.length === members.length) continue;
      if (remaining.length === 0) continue;
      assertTeamSize(remaining.length, bounds);
    }
  }
}

/**
 * Unregister one or more players from a competition: deletes their participation rows,
 * or only the given `eventId` when provided. Same registrar roles/scope as signup.
 * Team events: remaining teammates must still meet `minPlayers`, unless the whole team is selected.
 */
export async function removeParticipation(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionUnregisterParticipationBodySchema.parse(req.body);
    const actor = req.dbUser!;
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp, catalogEvents } = ctx;
    assertCompetitionAcceptsRosterChanges(comp);
    await assertPayingUnitRosterUnlocked(actor, comp.id, comp.level);

    const playerUserIds = [
      ...new Set(
        [...(body.playerUserIds ?? []), body.playerUserId ?? ""]
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ];
    if (playerUserIds.length === 0) {
      throw new AppError(400, "playerUserId or playerUserIds is required", "INVALID_UNREGISTER");
    }

    for (const playerUserId of playerUserIds) {
      const profile = await playerRepository.findProfileByUserId(playerUserId);
      if (!profile) throw new AppError(404, "Player profile not found", "PLAYER_NOT_FOUND");
      assertRegistrarCanRecordParticipation(actor, comp, profile);

      const existing = await participationRepository.findParticipationsWithEventsForPlayer(
        comp.id,
        playerUserId
      );
      if (existing.length === 0) {
        throw new AppError(404, "Player is not registered in this competition", "NOT_PARTICIPATING");
      }
      if (body.eventId && !existing.some((r) => r.eventId === body.eventId)) {
        throw new AppError(
          404,
          "Player is not registered for this event in the competition",
          "NOT_IN_EVENT"
        );
      }
      if (await participationRepository.playerHasCompetedInCompetition(comp.id, playerUserId)) {
        throw new AppError(
          400,
          "Cannot unregister a player who has already competed in this competition",
          "PLAYER_ALREADY_COMPETED"
        );
      }
    }

    await assertTeamSizeAfterUnregister(comp.id, catalogEvents, playerUserIds, body.eventId);

    const result = await participationRepository.deleteParticipationsForPlayers(
      comp.id,
      playerUserIds,
      body.eventId
    );

    res.status(200).json({
      unregisteredCount: result.count,
      playerUserId: playerUserIds.length === 1 ? playerUserIds[0] : undefined,
      playerUserIds,
      eventId: body.eventId ?? null,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Replace one registered player with an eligible player for the same event.
 * Keeps team size unchanged (min/max stay satisfied). Same registrar roles/scope as signup.
 */
export async function replaceParticipation(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionReplaceParticipationBodySchema.parse(req.body);
    const actor = req.dbUser!;
    const ctx = await competitionRepository.findByIdForParticipationContext(req.params.id);
    if (!ctx) throw new AppError(404, "Competition not found");
    const { comp, catalogEvents } = ctx;
    assertCompetitionAcceptsRosterChanges(comp);
    await assertPayingUnitRosterUnlocked(actor, comp.id, comp.level);

    const removeId = body.removePlayerUserId.trim();
    const addId = body.addPlayerUserId.trim();
    if (!removeId || !addId) {
      throw new AppError(400, "Both players are required", "INVALID_REPLACE");
    }
    if (removeId === addId) {
      throw new AppError(400, "Replacement player must be different", "SAME_PLAYER");
    }

    const catalogEvent = catalogEvents.find((e) => e.id === body.eventId);
    if (!catalogEvent) {
      throw new AppError(400, "Unknown or inactive event", "UNKNOWN_EVENT");
    }

    const removeProfile = await playerRepository.findProfileByUserId(removeId);
    if (!removeProfile) throw new AppError(404, "Player profile not found", "PLAYER_NOT_FOUND");
    assertRegistrarCanRecordParticipation(actor, comp, removeProfile);

    if (await participationRepository.playerHasCompetedInCompetition(comp.id, removeId)) {
      throw new AppError(
        400,
        "Cannot replace a player who has already competed in this competition",
        "PLAYER_ALREADY_COMPETED"
      );
    }

    const removeRow = await participationRepository.findExistingParticipationForEvent(
      comp.id,
      removeId,
      catalogEvent.id
    );
    if (!removeRow) {
      throw new AppError(
        404,
        "Player is not registered for this event in the competition",
        "NOT_IN_EVENT"
      );
    }

    await validatePlayersForCompetitionEvent(comp, comp, actor, catalogEvent, [addId], {
      skipBatchTeamSizeAssert: true,
    });

    const teamId = isTeamEvent(catalogEvent)
      ? removeRow.teamId ?? newParticipationTeamId()
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.participationRecord.deleteMany({
        where: {
          competitionId: comp.id,
          playerUserId: removeId,
          eventId: catalogEvent.id,
        },
      });
      await tx.participationRecord.create({
        data: {
          competitionId: comp.id,
          playerUserId: addId,
          level: comp.level,
          participated: true,
          eventId: catalogEvent.id,
          teamId,
        },
      });
    });

    res.status(200).json({
      eventId: catalogEvent.id,
      removedPlayerUserId: removeId,
      addedPlayerUserId: addId,
      teamId,
    });
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
    assertCompetitionAcceptsRosterChanges(comp);
    await assertPayingUnitRosterUnlocked(actor, comp.id, comp.level);

    const allPlayerIds = [
      ...new Set(
        body.items.flatMap((item) => item.playerUserIds.map((s) => s.trim()).filter(Boolean))
      ),
    ];
    const existingByPlayer = new Map<string, ParticipationWithEvent[]>();
    await Promise.all(
      allPlayerIds.map(async (playerUserId) => {
        existingByPlayer.set(
          playerUserId,
          (await participationRepository.findParticipationsWithEventsForPlayer(
            comp.id,
            playerUserId
          )) as ParticipationWithEvent[]
        );
      })
    );
    const claimedOrgUnitsByEvent = new Map<string, Set<string>>();

    const rows: Array<{
      competitionId: string;
      playerUserId: string;
      level: CompetitionLevel;
      participated: boolean;
      eventId: string;
      teamId: string | null;
    }> = [];

    for (const item of body.items) {
      const ev = catalogEvents.find((e) => e.id === item.eventId);
      if (!ev) {
        throw new AppError(400, `Unknown or inactive event: ${item.eventId}`, "UNKNOWN_EVENT");
      }
      const ids = [...new Set(item.playerUserIds.map((s) => s.trim()).filter(Boolean))];
      await validatePlayersForCompetitionEvent(comp, comp, actor, ev, ids, {
        existingByPlayer,
        claimedOrgUnitsByEvent,
      });

      const teamId = isTeamEvent(ev) ? newParticipationTeamId() : null;
      for (const playerUserId of ids) {
        rows.push({
          competitionId: comp.id,
          playerUserId,
          level: comp.level,
          participated: true,
          eventId: ev.id,
          teamId,
        });
        const prior = existingByPlayer.get(playerUserId) ?? [];
        existingByPlayer.set(playerUserId, [
          ...prior,
          { eventId: ev.id, event: ev },
        ]);
      }
    }

    await participationRepository.createManyParticipationRecords(rows);

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
    const { comp, catalogEvents } = ctx;
    assertCompetitionAcceptsRosterChanges(comp);

    const q = competitionParticipationListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;

    const geoWhere = playerProfileWhereCompetitionEnabledScope(comp);
    const actorWhere = actorPlayerProfileScopeWhere(actor);
    const genderWhere = playerProfileGenderWhereFromComp(comp.genders);

    const andParts: Prisma.PlayerProfileWhereInput[] = [
      {
        registrationStatus: "ACTIVE",
        isBlacklisted: false,
        tcDisabled: false,
        user: { status: "ACCEPTED", isActive: true },
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

    const eventForQuery = q.eventId
      ? catalogEvents.find((e) => e.id === q.eventId)
      : undefined;
    if (q.eventId && !eventForQuery) {
      return res.json({
        items: [],
        page: q.page,
        pageSize: q.pageSize,
        total: 0,
        totalPages: 0,
      });
    }

    const filtered: typeof candidates = [];
    for (const p of candidates) {
      if (eventForQuery) {
        if (await playerMayJoinCompetitionEvent(comp, eventForQuery, p.userId)) {
          filtered.push(p);
        }
      } else if (!(await playerSaturatedForCompetition(p.userId, ctx))) {
        filtered.push(p);
      }
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

/** `GET /competitions/:id/participants` — optional `eventId` filters to that catalog event (used with eligible-players side-by-side). */
export async function listParticipants(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionScopedReport(actor, comp);

    const q = competitionParticipationListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;

    const andParts: Prisma.PlayerProfileWhereInput[] = [];
    const scope = actorPlayerProfileScopeWhere(actor);
    if (Object.keys(scope).length > 0) andParts.push(scope);
    if (q.stateId) {
      if (actor.role === "NATIONAL_ADMIN") {
        andParts.push({ stateId: q.stateId });
      } else if (actor.role === "STATE_ADMIN") {
        if (!actor.stateId || q.stateId !== actor.stateId) {
          throw new AppError(403, "stateId is outside your scope", "FORBIDDEN_FILTER");
        }
        andParts.push({ stateId: q.stateId });
      } else {
        throw new AppError(403, "State filter is not allowed for this role", "FORBIDDEN_FILTER");
      }
    }
    if (q.districtId) {
      if (actor.role === "STATE_ADMIN") {
        if (!actor.stateId) throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
        const district = await prisma.district.findFirst({
          where: { id: q.districtId, stateId: actor.stateId },
          select: { id: true },
        });
        if (!district) throw new AppError(403, "districtId is outside your scope", "FORBIDDEN_FILTER");
      }
      andParts.push({ districtId: q.districtId });
    }
    if (q.search) {
      andParts.push({
        OR: [
          { fullName: { contains: q.search, mode: "insensitive" } },
          { fatherName: { contains: q.search, mode: "insensitive" } },
          { motherName: { contains: q.search, mode: "insensitive" } },
        ],
      });
    }
    const playerProfileWhere =
      andParts.length === 0
        ? undefined
        : andParts.length === 1
          ? andParts[0]!
          : { AND: andParts };

    const { items, total } = await participationRepository.findManyByCompetitionPaginated(
      comp.id,
      {
        skip,
        take: q.pageSize,
      },
      { playerProfileWhere, eventId: q.eventId }
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

function paymentStateIdForActor(
  actor: DbUser,
  comp: { states: { stateId: string }[] }
): string {
  if (actor.stateId) return actor.stateId;
  const fromComp = comp.states[0]?.stateId;
  if (fromComp) return fromComp;
  throw new AppError(400, "State context missing for payment", "FORBIDDEN_SCOPE");
}

/** `GET /competitions/:id/fee-submission` — this unit's unique-player fee status. */
export async function getFeeSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionScopedReport(actor, comp);

    const unit = payingUnitForActor(actor, comp.level);
    if (!unit) {
      return res.json({
        applicable: false,
        entryFeePaise: comp.entryFeePaise,
        uniquePlayerCount: 0,
        amountPaise: 0,
        submitted: false,
        submittedAt: null,
        requiresPayment: false,
      });
    }

    const uniquePlayerCount = await countUniquePlayersForUnit(comp.id, unit);
    const existing = await findFeeSubmission(comp.id, unit);
    const fee = comp.entryFeePaise;
    const amountPaise = fee == null ? 0 : uniquePlayerCount * fee;

    res.json({
      applicable: true,
      entryFeePaise: fee,
      uniquePlayerCount,
      amountPaise,
      submitted: Boolean(existing),
      submittedAt: existing?.submittedAt ?? null,
      requiresPayment: fee != null && fee > 0,
    });
  } catch (e) {
    next(e);
  }
}

/** `GET /competitions/:id/fee-submissions` — paid units for summary-sheet Final vs Provisional. */
export async function getFeeSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionScopedReport(actor, comp);
    const items = await listFeeSubmissions(comp.id);
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

/**
 * `POST /competitions/:id/fee-submissions/order`
 * Server computes uniquePlayers × fee. Fee 0 locks without Razorpay.
 */
export async function createFeeSubmissionOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    assertCompetitionAcceptsRosterChanges(comp);

    const unit = payingUnitForActor(actor, comp.level);
    if (!unit) {
      throw new AppError(
        403,
        "Only the lower hierarchy may submit an entry fee for this competition",
        "FORBIDDEN_ROLE"
      );
    }

    if (comp.entryFeePaise == null) {
      throw new AppError(400, "This competition has no entry fee configured", "FEE_NOT_SET");
    }

    const existing = await findFeeSubmission(comp.id, unit);
    if (existing) {
      throw new AppError(409, "Roster has already been submitted", "ALREADY_SUBMITTED");
    }

    const uniquePlayerCount = await countUniquePlayersForUnit(comp.id, unit);
    if (uniquePlayerCount < 1) {
      throw new AppError(400, "Register at least one player before final submission", "NO_PLAYERS");
    }

    const amountPaise = uniquePlayerCount * comp.entryFeePaise;

    if (amountPaise === 0) {
      const row = await prisma.competitionFeeSubmission.create({
        data: {
          competitionId: comp.id,
          unitType: unit.unitType,
          unitId: unit.unitId,
          playerCount: uniquePlayerCount,
          amountPaise: 0,
        },
      });
      return res.status(201).json({
        submitted: true,
        requiresPayment: false,
        playerCount: uniquePlayerCount,
        amountPaise: 0,
        submittedAt: row.submittedAt,
      });
    }

    const stateId = paymentStateIdForActor(actor, comp);
    const metadata = {
      competitionId: comp.id,
      unitType: unit.unitType,
      unitId: unit.unitId,
      competitionLevel: comp.level,
      playerCount: uniquePlayerCount,
    };
    const cfg = await getRazorpayConfigForPayment(
      PaymentPurpose.COMPETITION_ENTRY_FEE,
      stateId,
      metadata
    );

    const payment = await paymentRepository.createPayment({
      user: { connect: { id: actor.id } },
      state: { connect: { id: stateId } },
      purpose: PaymentPurpose.COMPETITION_ENTRY_FEE,
      amountPaise,
      status: PaymentStatus.PENDING,
      metadata,
    });

    const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
    const order = await rz.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: payment.id.slice(0, 40),
      notes: {
        paymentId: payment.id,
        userId: actor.id,
        purpose: PaymentPurpose.COMPETITION_ENTRY_FEE,
        competitionId: comp.id,
      },
    });
    await paymentRepository.updateRazorpayOrderId(payment.id, order.id);

    res.status(201).json({
      submitted: false,
      requiresPayment: true,
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amountPaise,
      currency: "INR",
      keyId: cfg.razorpayKeyId,
      playerCount: uniquePlayerCount,
    });
  } catch (e) {
    next(e);
  }
}
