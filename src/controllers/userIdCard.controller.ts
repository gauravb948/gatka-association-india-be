import { EntityStatus, Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import * as userRepository from "../repositories/user.repository.js";
import { publicUserIdCardQuerySchema } from "../validators/userIdCard.validators.js";

type GeoState = { id: string; name: string } | null;
type GeoDistrict = { id: string; name: string } | null;
type GeoTc = { id: string; name: string } | null;

function compactState(row: { id: string; name: string; isEnabled: boolean } | null | undefined): GeoState {
  if (!row?.isEnabled) return null;
  return { id: row.id, name: row.name };
}

function compactDistrict(row: { id: string; name: string; isEnabled: boolean } | null | undefined): GeoDistrict {
  if (!row?.isEnabled) return null;
  return { id: row.id, name: row.name };
}

function compactTc(row: { id: string; name: string } | null | undefined): GeoTc {
  return row ? { id: row.id, name: row.name } : null;
}

function trainingCenterGate(tc: {
  isEnabled: boolean;
  status: EntityStatus;
  district: {
    isEnabled: boolean;
    state: { isEnabled: boolean };
  };
}) {
  return (
    tc.isEnabled &&
    tc.status === EntityStatus.ACCEPTED &&
    tc.district.isEnabled &&
    tc.district.state.isEnabled
  );
}

/** `GET /users/id-card/public?userId=…` — no Bearer token; limited fields for membership / ID cards. */
export async function getPublicUserIdCard(req: Request, res: Response, next: NextFunction) {
  try {
    const q = publicUserIdCardQuerySchema.safeParse(req.query);
    if (!q.success) {
      const msg = q.error.flatten().fieldErrors.userId?.[0] ?? "Invalid query";
      throw new AppError(400, msg, "INVALID_QUERY");
    }

    const userId = q.data.userId;
    const user = await userRepository.findPublicIdCardContextByUserId(userId);
    if (!user) {
      throw new AppError(404, "Member not found or inactive", "ID_CARD_NOT_FOUND");
    }

    const payload = buildPublicIdCardPayload(user);
    if (!payload) {
      throw new AppError(404, "Member not found or inactive", "ID_CARD_NOT_FOUND");
    }

    res.json(payload);
  } catch (e) {
    next(e);
  }
}

type CardUser = NonNullable<Awaited<ReturnType<typeof userRepository.findPublicIdCardContextByUserId>>>;

function buildPublicIdCardPayload(user: CardUser) {
  const baseHead = () => ({
    userId: user.id,
    role: user.role,
    dateOfBirth: null as string | null,
    gender: null as string | null,
    registrationNumber: null as string | null,
    photoUrl: null as string | null,
    trainingCenter: null as GeoTc,
    district: null as GeoDistrict,
    state: null as GeoState,
  });

  switch (user.role) {
    case Role.NATIONAL_ADMIN: {
      const local = user.email.split("@")[0]?.trim();
      const name =
        local && local.length > 0 ? local.replace(/\./g, " ").replace(/_/g, " ") : "National administrator";
      return {
        ...baseHead(),
        name,
      };
    }

    case Role.PLAYER: {
      const p = user.playerProfile;
      if (
        !p ||
        p.isBlacklisted ||
        p.tcDisabled ||
        p.registrationStatus !== "ACTIVE" ||
        !p.trainingCenter ||
        !trainingCenterGate(p.trainingCenter)
      ) {
        return null;
      }
      if (!compactState(p.state) || !compactDistrict(p.district)) return null;
      return {
        ...baseHead(),
        name: p.fullName,
        dateOfBirth: p.dateOfBirth.toISOString(),
        gender: p.gender,
        registrationNumber: p.registrationNumber,
        photoUrl: p.photoUrl,
        trainingCenter: compactTc(p.trainingCenter),
        district: compactDistrict(p.district),
        state: compactState(p.state),
      };
    }

    case Role.COACH: {
      const c = user.coachProfile;
      const tc = c?.trainingCenter;
      if (!c || c.isBlacklisted || !tc || !trainingCenterGate(tc)) return null;
      return {
        ...baseHead(),
        name: c.fullName,
        gender: c.gender,
        registrationNumber: c.registrationNumber,
        photoUrl: c.photoUrl,
        trainingCenter: compactTc(tc),
        district: tc.district ? compactDistrict(tc.district) : null,
        state: tc.district?.state ? compactState(tc.district.state) : null,
      };
    }

    case Role.REFEREE: {
      const r = user.refereeProfile;
      if (!r || r.isBlacklisted || !compactState(r.state)) return null;
      if (r.district && !compactDistrict(r.district)) return null;
      return {
        ...baseHead(),
        name: r.fullName,
        gender: r.gender,
        registrationNumber: r.registrationNumber,
        photoUrl: r.photoUrl,
        district: r.district ? compactDistrict(r.district) : null,
        state: compactState(r.state),
      };
    }

    case Role.VOLUNTEER: {
      const v = user.volunteerProfile;
      if (!v || v.isBlacklisted || !compactState(v.state)) return null;
      return {
        ...baseHead(),
        name: v.fullName,
        gender: v.gender,
        registrationNumber: v.registrationNumber,
        photoUrl: v.photoUrl,
        state: compactState(v.state),
      };
    }

    case Role.TRAINING_CENTER: {
      const tc = user.trainingCenter;
      if (!tc || !trainingCenterGate(tc)) return null;
      const nameHead = tc.headName?.trim() || tc.name;
      return {
        ...baseHead(),
        name: nameHead,
        photoUrl: tc.headPassportPhotoUrl,
        trainingCenter: { id: tc.id, name: tc.name },
        district: tc.district ? compactDistrict(tc.district) : null,
        state: tc.district?.state ? compactState(tc.district.state) : null,
      };
    }

    case Role.STATE_ADMIN: {
      const reg = user.stateRegistrationApplicant;
      if (!reg || reg.status !== EntityStatus.ACCEPTED || !compactState(reg.state)) return null;
      return {
        ...baseHead(),
        name: `${reg.firstName} ${reg.lastName}`.trim(),
        photoUrl: reg.passportPhotoUrl,
        state: compactState(reg.state),
      };
    }

    case Role.DISTRICT_ADMIN: {
      const reg = user.districtRegistrationApplicant;
      if (
        !reg ||
        reg.status !== EntityStatus.ACCEPTED ||
        !compactState(reg.state) ||
        !compactDistrict(reg.district)
      ) {
        return null;
      }
      return {
        ...baseHead(),
        name: `${reg.firstName} ${reg.lastName}`.trim(),
        photoUrl: reg.passportPhotoUrl,
        district: compactDistrict(reg.district),
        state: compactState(reg.state),
      };
    }

    default:
      return null;
  }
}
