import type { NextFunction, Request, Response } from "express";
import * as competitionRepository from "../repositories/competition.repository.js";
import { assertCanViewCompetitionScopedReport } from "../lib/competitionManagementScope.js";
import { actorPlayerProfileScopeWhere } from "../lib/competitionParticipation.js";
import {
  buildCertificateRecipients,
  loadSavedLayout,
  saveLayout,
} from "../lib/certificateRecipients.js";
import { sanitizeFileBase, streamCertificatePdf, streamCertificateZip } from "../lib/certificatePdf.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import {
  certificateGenerateBodySchema,
  certificateRecipientsQuerySchema,
  certificateTemplateBodySchema,
  certificateTemplateQuerySchema,
} from "../validators/certificate.validators.js";

const CERT_ROLES = new Set(["NATIONAL_ADMIN"]);

async function assertEventInCompetitionScope(competitionId: string, eventId: string) {
  const groups = await competitionRepository.findEventGroupsInCompetitionAgeScope(competitionId);
  if (!groups) throw new AppError(404, "Competition not found");
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      isActive: true,
      eventGroupId: { in: groups.map((g) => g.id) },
    },
    select: { id: true },
  });
  if (!event) {
    throw new AppError(400, "Event is not in this competition's age scope", "INVALID_EVENT");
  }
  return event;
}

async function loadCompetitionForCertificates(req: Request) {
  const actor = req.dbUser!;
  if (!CERT_ROLES.has(actor.role)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }
  const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
  if (!comp) throw new AppError(404, "Competition not found");
  await assertCanViewCompetitionScopedReport(actor, comp);
  await assertEventInCompetitionScope(comp.id, req.params.eventId);
  return { actor, comp };
}

/** `GET /competitions/:id/events/:eventId/certificate-recipients?kind=` */
export async function listRecipients(req: Request, res: Response, next: NextFunction) {
  try {
    const { actor, comp } = await loadCompetitionForCertificates(req);
    const q = certificateRecipientsQuerySchema.parse(req.query);
    const payload = await buildCertificateRecipients({
      competition: {
        id: comp.id,
        name: comp.name,
        level: comp.level,
        venue: comp.venue,
        startDate: comp.startDate,
        endDate: comp.endDate,
        createdAt: comp.createdAt,
      },
      eventId: req.params.eventId,
      kind: q.kind,
      playerProfileWhere: actorPlayerProfileScopeWhere(actor),
    });
    res.json(payload);
  } catch (e) {
    next(e);
  }
}

/** `POST /competitions/:id/events/:eventId/certificates` — one PDF or zip of all. */
export async function generateCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    const { actor, comp } = await loadCompetitionForCertificates(req);
    const body = certificateGenerateBodySchema.parse(req.body);
    const payload = await buildCertificateRecipients({
      competition: {
        id: comp.id,
        name: comp.name,
        level: comp.level,
        venue: comp.venue,
        startDate: comp.startDate,
        endDate: comp.endDate,
        createdAt: comp.createdAt,
      },
      eventId: req.params.eventId,
      kind: body.kind,
      playerProfileWhere: actorPlayerProfileScopeWhere(actor),
    });

    const layout = {
      widthMm: 297,
      heightMm: 210,
      backgroundUrl: body.layout.backgroundUrl ?? null,
      blocks: body.layout.blocks,
    };

    await saveLayout(body.kind, layout, actor.id);

    let recipients = payload.recipients;
    if (body.playerUserId) {
      recipients = recipients.filter((r) => r.playerUserId === body.playerUserId);
      if (recipients.length === 0) {
        throw new AppError(400, "Player is not in this certificate list", "UNKNOWN_RECIPIENT");
      }
    }
    if (recipients.length === 0) {
      throw new AppError(400, "No recipients for this certificate kind", "NO_RECIPIENTS");
    }

    const eventSlug = sanitizeFileBase(payload.event.name || req.params.eventId);
    const kindSlug = body.kind === "winners" ? "winner" : "participant";

    if (recipients.length === 1) {
      const person = recipients[0]!;
      const filename = `${kindSlug}-certificate-${sanitizeFileBase(person.fullName)}.pdf`;
      await streamCertificatePdf(res, filename, layout, person);
      return;
    }

    const filename = `${kindSlug}-certificates-${eventSlug}.zip`;
    await streamCertificateZip(res, filename, layout, recipients);
  } catch (e) {
    if (res.headersSent) return;
    next(e);
  }
}

/** `GET /certificate-templates?kind=` */
export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    if (!CERT_ROLES.has(actor.role)) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }
    const q = certificateTemplateQuerySchema.parse(req.query);
    const layout = await loadSavedLayout(q.kind);
    res.json({ kind: q.kind, layout });
  } catch (e) {
    next(e);
  }
}

/** `PUT /certificate-templates` — persist the reusable layout for a kind. */
export async function putTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    if (!CERT_ROLES.has(actor.role)) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }
    const body = certificateTemplateBodySchema.parse(req.body);
    const layout = {
      widthMm: 297,
      heightMm: 210,
      backgroundUrl: body.layout.backgroundUrl ?? null,
      blocks: body.layout.blocks,
    };
    await saveLayout(body.kind, layout, actor.id);
    res.json({ kind: body.kind, layout });
  } catch (e) {
    next(e);
  }
}
