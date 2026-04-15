import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as campRepository from "../repositories/camp.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../lib/errors.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import { campBodySchema } from "../validators/camp.validators.js";

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await campRepository.findManyAllOrdered();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = campBodySchema.parse(req.body);
    const data: Prisma.CampCreateInput = {
      level: body.level,
      name: body.name,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      audience: body.audience,
      feeAmountPaise: body.feeAmountPaise ?? null,
    };
    if (body.sessionId) data.session = { connect: { id: body.sessionId } };
    if (body.stateId) data.state = { connect: { id: body.stateId } };
    if (body.districtId) data.district = { connect: { id: body.districtId } };
    const row = await campRepository.createCamp(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const camp = await campRepository.findById(req.params.id);
    if (!camp) throw new AppError(404, "Camp not found");
    const u = req.dbUser!;
    const reg = await campRepository.createCampRegistration({
      camp: { connect: { id: camp.id } },
      user: { connect: { id: u.id } },
      status: camp.feeAmountPaise ? "PENDING_PAYMENT" : "REGISTERED",
    });
    if (!camp.feeAmountPaise || camp.feeAmountPaise <= 0) {
      return res.status(201).json(reg);
    }
    const profile =
      u.role === "PLAYER"
        ? await playerRepository.findProfileByUserId(u.id)
        : null;
    const dbState = await userRepository.findStateIdOnly(u.id);
    const stateId = profile?.stateId ?? u.stateId ?? dbState?.stateId;
    if (!stateId) throw new AppError(400, "Cannot resolve state for payment");
    const cfg = await statePaymentRepository.findByStateId(stateId);
    if (!cfg) throw new AppError(400, "Razorpay not configured");
    const payData: Prisma.PaymentCreateInput = {
      user: { connect: { id: u.id } },
      state: { connect: { id: stateId } },
      purpose: "CAMP_REGISTRATION",
      amountPaise: camp.feeAmountPaise,
      status: "PENDING",
      metadata: { campRegistrationId: reg.id },
    };
    if (camp.sessionId) payData.session = { connect: { id: camp.sessionId } };
    const payment = await paymentRepository.createPayment(payData);
    const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
    const order = await rz.orders.create({
      amount: camp.feeAmountPaise,
      currency: "INR",
      receipt: payment.id.slice(0, 40),
      notes: { paymentId: payment.id, campRegistrationId: reg.id },
    });
    await paymentRepository.updateRazorpayOrderId(payment.id, order.id);
    res.status(201).json({
      registration: reg,
      paymentId: payment.id,
      razorpayOrderId: order.id,
      keyId: cfg.razorpayKeyId,
    });
  } catch (e) {
    next(e);
  }
}

export async function listRegistrations(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await campRepository.findRegistrationsByCamp(req.params.id);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
