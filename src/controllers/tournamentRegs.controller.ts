import type { NextFunction, Request, Response } from "express";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import * as tournamentRegistrationRepository from "../repositories/tournamentRegistration.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import { AppError } from "../lib/errors.js";
import {
  assertParticipationPrerequisite,
  assertPlayerActiveForTournament,
  assertPlayerFitsCompetitionAge,
  playerGenderMatchesCompetition,
} from "../lib/eligibility.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import {
  tournamentFinalizePaymentSchema,
  tournamentRegistrationBodySchema,
} from "../validators/tournamentRegistration.validators.js";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = tournamentRegistrationBodySchema.parse(req.body);
    const registrar = req.dbUser!;
    const allowedRoles = [
      "TRAINING_CENTER",
      "DISTRICT_ADMIN",
      "STATE_ADMIN",
      "NATIONAL_ADMIN",
    ] as const;
    if (!allowedRoles.includes(registrar.role as (typeof allowedRoles)[number])) {
      throw new AppError(403, "Cannot register players for tournament");
    }

    const comp = await competitionRepository.findByIdWithEvents(body.competitionId);
    if (!comp) throw new AppError(404, "Competition not found");

    await assertPlayerActiveForTournament(body.playerUserId);
    await assertParticipationPrerequisite(
      body.playerUserId,
      comp.sessionId,
      comp.level
    );
    await assertPlayerFitsCompetitionAge(body.playerUserId, comp.id);

    const profile = await playerRepository.findProfileByUserId(body.playerUserId);
    if (!profile) throw new AppError(404, "Player not found");
    if (!playerGenderMatchesCompetition(profile.gender, comp.gender)) {
      throw new AppError(400, "Gender not eligible");
    }

    if (registrar.role === "TRAINING_CENTER") {
      if (profile.trainingCenterId !== registrar.trainingCenterId) {
        throw new AppError(403, "Player not at your TC");
      }
      if (comp.level !== "DISTRICT") {
        throw new AppError(403, "TC registers for district level only");
      }
    }
    if (registrar.role === "DISTRICT_ADMIN") {
      if (profile.districtId !== registrar.districtId) {
        throw new AppError(403, "Player not in your district");
      }
      if (comp.level !== "STATE") {
        throw new AppError(403, "District registers for state level");
      }
    }
    if (registrar.role === "STATE_ADMIN") {
      if (profile.stateId !== registrar.stateId) {
        throw new AppError(403, "Player not in your state");
      }
      if (comp.level !== "NATIONAL") {
        throw new AppError(403, "State registers for national level");
      }
    }

    const hasEvent = comp.events.some((ce) => ce.eventId === body.eventId);
    if (!hasEvent) throw new AppError(400, "Event not in competition");

    const row = await tournamentRegistrationRepository.upsertRegistration({
      competitionId: body.competitionId,
      playerUserId: body.playerUserId,
      eventId: body.eventId,
      registeredById: registrar.id,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function finalizePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const body = tournamentFinalizePaymentSchema.parse(req.body);
    const reg = await tournamentRegistrationRepository.findByIdWithDetails(req.params.id);
    if (!reg) throw new AppError(404, "Registration not found");
    if (!reg.competition.finalSubmitRequiresPayment) {
      await tournamentRegistrationRepository.updateFinalSubmittedNow(reg.id);
      return res.json({ ok: true, skippedPayment: true });
    }
    const stateId = reg.playerUser.playerProfile?.stateId;
    if (!stateId) throw new AppError(400, "Player state missing");
    const cfg = await statePaymentRepository.findByStateId(stateId);
    if (!cfg) throw new AppError(400, "Razorpay not configured");

    const payment = await paymentRepository.createPayment({
      user: { connect: { id: reg.playerUserId } },
      state: { connect: { id: stateId } },
      purpose: "TOURNAMENT_REGISTRATION",
      amountPaise: body.amountPaise,
      session: { connect: { id: reg.competition.sessionId } },
      status: "PENDING",
      metadata: { tournamentRegistrationId: reg.id },
    });
    const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
    const order = await rz.orders.create({
      amount: body.amountPaise,
      currency: "INR",
      receipt: payment.id.slice(0, 40),
      notes: { paymentId: payment.id, tournamentRegistrationId: reg.id },
    });
    await paymentRepository.updateRazorpayOrderId(payment.id, order.id);
    res.status(201).json({
      paymentId: payment.id,
      razorpayOrderId: order.id,
      keyId: cfg.razorpayKeyId,
    });
  } catch (e) {
    next(e);
  }
}

export async function listByCompetition(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await tournamentRegistrationRepository.findManyByCompetition(
      req.params.competitionId
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
