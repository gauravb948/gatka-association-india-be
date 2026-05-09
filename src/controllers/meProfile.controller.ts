import type { Prisma, Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { assertHierarchyEnabled, type UserForHierarchyCheck } from "../lib/access.js";
import { withAdminRegistrationIds } from "../lib/withAdminRegistrationIds.js";
import * as userRepository from "../repositories/user.repository.js";
import { patchMyProfileBodySchema } from "../validators/meProfile.validators.js";

const SECTION_KEYS = [
  "playerProfile",
  "coachProfile",
  "refereeProfile",
  "volunteerProfile",
  "trainingCenterOrg",
  "stateRegistration",
  "districtRegistration",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

const ROLE_SECTION: Record<Role, SectionKey | null> = {
  NATIONAL_ADMIN: null,
  PLAYER: "playerProfile",
  COACH: "coachProfile",
  REFEREE: "refereeProfile",
  VOLUNTEER: "volunteerProfile",
  TRAINING_CENTER: "trainingCenterOrg",
  STATE_ADMIN: "stateRegistration",
  DISTRICT_ADMIN: "districtRegistration",
};

function nonEmptySection(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && Object.keys(obj).length > 0;
}

function pruneUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/** Self-service profile update: login email/phone plus one role-specific profile subsection per request. */
export async function patchMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = patchMyProfileBodySchema.parse(req.body);

    if (body.email !== undefined && body.email !== actor.email) {
      const taken = await userRepository.findByEmail(body.email);
      if (taken && taken.id !== actor.id) {
        throw new AppError(409, "Email already in use", "EMAIL_IN_USE");
      }
    }

    const actorRole = actor.role as Role;
    const expectedSection = ROLE_SECTION[actorRole];
    for (const key of SECTION_KEYS) {
      const section = body[key];
      if (!nonEmptySection(section)) continue;
      if (expectedSection !== key) {
        throw new AppError(400, `Cannot update ${key} for your account type`, "INVALID_PROFILE_SECTION");
      }
    }

    await prisma.$transaction(async (tx) => {
      const userData: Prisma.UserUpdateInput = {};
      if (body.email !== undefined) userData.email = body.email;
      if (body.phone !== undefined) userData.phone = body.phone;
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: actor.id }, data: userData });
      }

      if (expectedSection === "playerProfile" && body.playerProfile && nonEmptySection(body.playerProfile)) {
        const data = pruneUndefined(body.playerProfile as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.playerProfile.update({
            where: { userId: actor.id },
            data: data as Prisma.PlayerProfileUpdateInput,
          });
        }
      } else if (expectedSection === "coachProfile" && body.coachProfile && nonEmptySection(body.coachProfile)) {
        const data = pruneUndefined(body.coachProfile as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.coachProfile.update({
            where: { userId: actor.id },
            data: data as Prisma.CoachProfileUpdateInput,
          });
        }
      } else if (
        expectedSection === "refereeProfile" &&
        body.refereeProfile &&
        nonEmptySection(body.refereeProfile)
      ) {
        const data = pruneUndefined(body.refereeProfile as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.refereeProfile.update({
            where: { userId: actor.id },
            data: data as Prisma.RefereeProfileUpdateInput,
          });
        }
      } else if (
        expectedSection === "volunteerProfile" &&
        body.volunteerProfile &&
        nonEmptySection(body.volunteerProfile)
      ) {
        const data = pruneUndefined(body.volunteerProfile as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.volunteerProfile.update({
            where: { userId: actor.id },
            data: data as Prisma.VolunteerProfileUpdateInput,
          });
        }
      } else if (
        expectedSection === "trainingCenterOrg" &&
        body.trainingCenterOrg &&
        nonEmptySection(body.trainingCenterOrg)
      ) {
        const tcId = actor.trainingCenterId;
        if (!tcId) throw new AppError(400, "Training center not linked to your account", "TC_MISSING");
        const data = pruneUndefined(body.trainingCenterOrg as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.trainingCenter.update({
            where: { id: tcId },
            data: data as Prisma.TrainingCenterUpdateInput,
          });
        }
      } else if (
        expectedSection === "stateRegistration" &&
        body.stateRegistration &&
        nonEmptySection(body.stateRegistration)
      ) {
        const reg = await tx.stateRegistration.findUnique({ where: { userId: actor.id } });
        if (!reg) throw new AppError(404, "State registration not found");
        const data = pruneUndefined(body.stateRegistration as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.stateRegistration.update({
            where: { userId: actor.id },
            data: data as Prisma.StateRegistrationUpdateInput,
          });
          if (data.mobileNo !== undefined) {
            await tx.user.update({
              where: { id: actor.id },
              data: { phone: data.mobileNo as string },
            });
          }
        }
      } else if (
        expectedSection === "districtRegistration" &&
        body.districtRegistration &&
        nonEmptySection(body.districtRegistration)
      ) {
        const reg = await tx.districtRegistration.findUnique({ where: { userId: actor.id } });
        if (!reg) throw new AppError(404, "District registration not found");
        const data = pruneUndefined(body.districtRegistration as Record<string, unknown>);
        if (Object.keys(data).length > 0) {
          await tx.districtRegistration.update({
            where: { userId: actor.id },
            data: data as Prisma.DistrictRegistrationUpdateInput,
          });
          if (data.mobileNo !== undefined) {
            await tx.user.update({
              where: { id: actor.id },
              data: { phone: data.mobileNo as string },
            });
          }
        }
      }
    });

    const full = await userRepository.findByIdForLoginResponse(actor.id);
    if (!full) throw new AppError(500, "User not found");
    assertHierarchyEnabled(full as UserForHierarchyCheck);
    res.json({ user: await withAdminRegistrationIds(full) });
  } catch (e) {
    next(e);
  }
}
