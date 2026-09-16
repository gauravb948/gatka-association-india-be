import type { NextFunction, Request, Response } from "express";
import * as competitionRepository from "../repositories/competition.repository.js";
import { assertCanViewCompetitionScopedReport } from "../lib/competitionManagementScope.js";
import { actorPlayerProfileScopeWhere } from "../lib/competitionParticipation.js";
import type { CertificateLayout } from "../lib/certificateLayout.js";
import {
  buildCertificateRecipients,
  dbKindFromQuery,
  loadSavedLayout,
  saveLayout,
} from "../lib/certificateRecipients.js";
import {
  persistGeneratedPdf,
  renderRecipientPdfs,
  sanitizeFileBase,
  streamCertificatePdf,
  streamCertificateZip,
} from "../lib/certificatePdf.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import {
  certificateGenerateBodySchema,
  certificateRecipientsQuerySchema,
  certificateTemplateBodySchema,
  certificateTemplateQuerySchema,
} from "../validators/certificate.validators.js";

const VIEW_ROLES = new Set(["DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"]);
const MUTATE_ROLES = new Set(["NATIONAL_ADMIN"]);

function toStoredLayout(layout: CertificateLayout): CertificateLayout {
  return {
    widthMm: 297,
    heightMm: 210,
    backgroundUrl: layout.backgroundUrl ?? null,
    blocks: layout.blocks,
    logos: layout.logos ?? [],
  };
}

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

async function loadCompetitionForCertificates(req: Request, mutate: boolean) {
  const actor = req.dbUser!;
  const allowed = mutate ? MUTATE_ROLES : VIEW_ROLES;
  if (!allowed.has(actor.role)) {
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
    const { actor, comp } = await loadCompetitionForCertificates(req, false);
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

/** `POST /competitions/:id/events/:eventId/certificates` — save to R2/DB, then PDF/zip unless persistOnly. */
export async function generateCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    const { actor, comp } = await loadCompetitionForCertificates(req, true);
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

    const layout = toStoredLayout(body.layout);
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

    const files = await renderRecipientPdfs({ layout, recipients });
    const dbKind = dbKindFromQuery(body.kind);
    const saved: { playerUserId: string; fileUrl: string }[] = [];
    for (const file of files) {
      const fileUrl = await persistGeneratedPdf({
        competitionId: comp.id,
        eventId: req.params.eventId,
        playerUserId: file.recipient.playerUserId,
        kind: dbKind,
        buf: file.buf,
        generatedById: actor.id,
      });
      saved.push({ playerUserId: file.recipient.playerUserId, fileUrl });
    }

    if (body.persistOnly) {
      res.json({ saved, count: saved.length });
      return;
    }

    const eventSlug = sanitizeFileBase(payload.event.name || req.params.eventId);
    const kindSlug = body.kind === "winners" ? "winner" : "participant";

    if (files.length === 1) {
      const person = files[0]!;
      const filename = `${kindSlug}-certificate-${sanitizeFileBase(person.recipient.fullName)}.pdf`;
      await streamCertificatePdf(res, filename, person.buf);
      return;
    }

    const filename = `${kindSlug}-certificates-${eventSlug}.zip`;
    await streamCertificateZip(res, filename, files);
  } catch (e) {
    if (res.headersSent) return;
    next(e);
  }
}

/** `GET /certificate-templates?kind=` */
export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    if (!MUTATE_ROLES.has(actor.role)) {
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
    if (!MUTATE_ROLES.has(actor.role)) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }
    const body = certificateTemplateBodySchema.parse(req.body);
    const layout = toStoredLayout(body.layout);
    await saveLayout(body.kind, layout, actor.id);
    res.json({ kind: body.kind, layout });
  } catch (e) {
    next(e);
  }
}
