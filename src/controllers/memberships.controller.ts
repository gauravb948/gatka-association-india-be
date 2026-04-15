import type { NextFunction, Request, Response } from "express";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { expireAllMemberships } from "../lib/membershipExpiry.js";
import { AppError } from "../lib/errors.js";

/** GET /memberships/me — current user's memberships, newest first. */
export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.membership.findMany({
      where: { userId: req.dbUser!.id },
      orderBy: { createdAt: "desc" },
      include: { payment: { select: { id: true, purpose: true, amountPaise: true, status: true, createdAt: true } } },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** GET /memberships/user/:userId — admin view of a specific user's memberships. */
export async function listByUserId(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.membership.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: "desc" },
      include: { payment: { select: { id: true, purpose: true, amountPaise: true, status: true, createdAt: true } } },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** GET /memberships — admin paginated list with optional filters. */
export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const statusFilter = req.query.status as string | undefined;
    const where: { status?: MembershipStatus } = {};
    if (statusFilter && statusFilter in MembershipStatus) {
      where.status = statusFilter as MembershipStatus;
    }

    const [items, total] = await prisma.$transaction([
      prisma.membership.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true, username: true, role: true, stateId: true, districtId: true } },
          payment: { select: { id: true, purpose: true, amountPaise: true, status: true } },
        },
      }),
      prisma.membership.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    res.json({ items, page, pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

/** POST /memberships/expire — trigger membership expiry (national admin or cron). */
export async function triggerExpiry(_req: Request, res: Response, next: NextFunction) {
  try {
    const count = await expireAllMemberships();
    res.json({ expired: count });
  } catch (e) {
    next(e);
  }
}

/** GET /memberships/:id — single membership detail. */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await prisma.membership.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, username: true, role: true } },
        payment: { select: { id: true, purpose: true, amountPaise: true, status: true } },
      },
    });
    if (!row) throw new AppError(404, "Membership not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
}
