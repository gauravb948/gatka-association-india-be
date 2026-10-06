import type { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import * as competitionResultRepository from "../repositories/competitionResult.repository.js";
import * as competitionAggregateStandingRepository from "../repositories/competitionAggregateStanding.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import { AppError } from "../lib/errors.js";
import { assertAttendanceForCertificate } from "../lib/eligibility.js";
import { assertCanViewCompetitionScopedReport } from "../lib/competitionManagementScope.js";
import { actorPlayerProfileScopeWhere } from "../lib/competitionParticipation.js";
import { buildResultListItems, genderLabel } from "../lib/competitionResultList.js";
import { buildCompetitionWinnersForExport } from "../lib/competitionWinnersExport.js";
import * as generatedCertificateRepository from "../repositories/generatedCertificate.repository.js";
import {
  competitionResultBodySchema,
  resultListQuerySchema,
} from "../validators/competitionResult.validators.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = resultListQuerySchema.parse(req.query);
    const ctx = await competitionAggregateStandingRepository.findResultListContext(
      {
        role: actor.role,
        stateId: actor.stateId,
        districtId: actor.districtId,
      },
      {
        search: q.search,
        level: q.level,
        session: q.session,
      }
    );
    let grouped = await buildResultListItems(ctx);
    const competitions = [...ctx.competitions]
      .map((c) => ({ id: c.id, name: c.name, level: c.level }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (q.competitionId) {
      grouped = grouped.filter((item) => item.competitionId === q.competitionId);
    }

    const ageGroups = [...new Set(grouped.map((item) => item.ageGroup).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );

    if (q.ageGroup) {
      grouped = grouped.filter((item) => item.ageGroup === q.ageGroup);
    }
    if (q.event) {
      const needle = q.event.toLowerCase();
      grouped = grouped.filter(
        (item) =>
          item.event.toLowerCase().includes(needle) || item.eventGroup.toLowerCase().includes(needle)
      );
    }

    const counts = await generatedCertificateRepository.countByEventKind(
      grouped.map((item) => ({ competitionId: item.competitionId, eventId: item.eventId }))
    );
    const countKey = (competitionId: string, eventId: string, kind: string) =>
      `${competitionId}:${eventId}:${kind}`;
    const countMap = new Map(
      counts.map((row) => [countKey(row.competitionId, row.eventId, row.kind), row._count._all])
    );
    let withCerts = grouped.map((item) => ({
      ...item,
      winnerCertificateCount: countMap.get(countKey(item.competitionId, item.eventId, "WINNER")) ?? 0,
      participantCertificateCount:
        countMap.get(countKey(item.competitionId, item.eventId, "PARTICIPANT")) ?? 0,
    }));
    if (q.certificates === "generated") {
      withCerts = withCerts.filter(
        (item) => item.winnerCertificateCount > 0 || item.participantCertificateCount > 0
      );
    } else if (q.certificates === "missing") {
      withCerts = withCerts.filter(
        (item) => item.winnerCertificateCount === 0 && item.participantCertificateCount === 0
      );
    }

    const total = withCerts.length;
    const skip = (q.page - 1) * q.pageSize;
    const pageItems = withCerts.slice(skip, skip + q.pageSize).map((item, index) => ({
      srNo: skip + index + 1,
      ...item,
    }));
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items: pageItems,
      competitions,
      ageGroups,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionResultBodySchema.parse(req.body);
    await assertAttendanceForCertificate(body.competitionId, body.eventId, body.playerUserId);
    const payload = JSON.stringify({
      t: "result",
      c: body.competitionId,
      e: body.eventId,
      p: body.playerUserId,
    });
    const qr = await QRCode.toDataURL(payload, { margin: 1, width: 120 });
    const row = await competitionResultRepository.upsertResult({
      competitionId: body.competitionId,
      eventId: body.eventId,
      playerUserId: body.playerUserId,
      rank: body.rank ?? null,
      score: body.score ?? null,
      certificateQrPayload: payload,
    });
    res.status(201).json({ ...row, qrDataUrl: qr });
  } catch (e) {
    next(e);
  }
}

export async function exportPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await competitionResultRepository.findManyForPdfExport(
      req.params.competitionId
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="results-${req.params.competitionId}.pdf"`
    );
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(16).text("Competition results", { underline: true });
    doc.moveDown();
    for (const r of rows) {
      const name = r.playerUser.playerProfile?.fullName ?? r.playerUser.email;
      doc
        .fontSize(11)
        .text(
          `${r.event.name} | ${name} | rank: ${r.rank ?? "-"} | score: ${r.score ?? "-"}`
        );
    }
    doc.end();
  } catch (e) {
    next(e);
  }
}

/** Exports individual winning players (unit podium, same rule as winner certificates). */
export async function exportXlsx(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(
      req.params.competitionId
    );
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionScopedReport(actor, comp);

    const rows = await buildCompetitionWinnersForExport({
      competitionId: comp.id,
      level: comp.level,
      playerProfileWhere: actorPlayerProfileScopeWhere(actor),
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Winners");
    ws.columns = [
      { header: "Sr No", key: "sr", width: 8 },
      { header: "Certificate No", key: "cert", width: 18 },
      { header: "Name", key: "name", width: 28 },
      { header: "Father Name", key: "father", width: 28 },
      { header: "Date of Birth", key: "dob", width: 16 },
      { header: "Aadhar Number", key: "aadhar", width: 18 },
      { header: "District", key: "district", width: 20 },
      { header: "Event", key: "event", width: 28 },
      { header: "Position", key: "position", width: 12 },
      { header: "Gender", key: "gender", width: 10 },
    ];
    rows.forEach((r, idx) => {
      ws.addRow({
        sr: idx + 1,
        cert: "",
        name: r.fullName,
        father: r.fatherName ?? "",
        dob: r.dateOfBirth.toISOString().slice(0, 10),
        aadhar: r.aadharNumber ?? "",
        district: r.districtName,
        event: r.eventName,
        position: r.rankLabel,
        gender: genderLabel(r.gender),
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="winners-${comp.id}.xlsx"`
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    next(e);
  }
}
