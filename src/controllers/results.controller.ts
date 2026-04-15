import type { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import * as competitionResultRepository from "../repositories/competitionResult.repository.js";
import { assertAttendanceForCertificate } from "../lib/eligibility.js";
import { competitionResultBodySchema } from "../validators/competitionResult.validators.js";

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionResultBodySchema.parse(req.body);
    await assertAttendanceForCertificate(body.competitionId, body.playerUserId);
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

export async function exportXlsx(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await competitionResultRepository.findManyForXlsxExport(
      req.params.competitionId
    );
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Results");
    ws.columns = [
      { header: "AgeGroup", key: "age", width: 20 },
      { header: "EventGroup", key: "eg", width: 24 },
      { header: "Event", key: "ev", width: 28 },
      { header: "Player", key: "pl", width: 28 },
      { header: "Rank", key: "rk", width: 8 },
      { header: "Score", key: "sc", width: 12 },
    ];
    for (const r of rows) {
      ws.addRow({
        age: r.event.eventGroup.ageCategory.name,
        eg: `${r.event.eventGroup.segment} (${r.event.eventGroup.gender})`,
        ev: r.event.name,
        pl: r.playerUser.playerProfile?.fullName ?? r.playerUser.email,
        rk: r.rank,
        sc: r.score,
      });
    }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="results-${req.params.competitionId}.xlsx"`
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    next(e);
  }
}
