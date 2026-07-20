import PDFDocument from "pdfkit";
import type { CompetitionLevel, Gender } from "@prisma/client";
import type { Response } from "express";
import type {
  CompetitionEventGroupParticipantsReport,
  CompetitionEventGroupParticipantRow,
} from "./competitionEventGroupParticipantsReport.js";
import type {
  CompetitionEventRegistrationReport,
  CompetitionEventRegistrationReportItem,
} from "./competitionEventRegistrationReport.js";
import type { SummarySheetEntityBundle } from "./summarySheetAllEntities.js";

const REPORT_PRINT_LOGO_URL =
  "https://punjabgatkaassociation.com/assets/images/gatka-logo.png";

const PAGE_MARGIN = 36;
const LOGO_SIZE = 54;

export type SummarySheetPdfCompetition = {
  name: string;
  level: CompetitionLevel;
  venue: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

function formatGenderLabel(gender: Gender): string {
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  if (gender === "BOYS") return "Boys";
  if (gender === "GIRLS") return "Girls";
  return gender;
}

function formatDateDdMmYyyy(date: Date | null | undefined): string {
  if (!date) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatPrintDateRange(start: Date | null, end: Date | null): string {
  const a = formatDateDdMmYyyy(start);
  const b = formatDateDdMmYyyy(end);
  if (a && b) return `${a} - ${b}`;
  return a || b;
}

function participatingInDisplay(events: string[]): string {
  const names = events.map((e) => e.trim()).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function ensureSpace(doc: PdfDoc, needed: number) {
  const bottom = doc.page.height - PAGE_MARGIN;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function drawTableHeader(
  doc: PdfDoc,
  cols: Array<{ label: string; x: number; w: number; align?: "left" | "center" | "right" }>
) {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
  let maxH = 10;
  for (const col of cols) {
    const align = col.align ?? "left";
    const h = doc.heightOfString(col.label, { width: col.w, align });
    maxH = Math.max(maxH, h);
    doc.text(col.label, col.x, y, { width: col.w, align, lineBreak: false });
  }
  const lineY = y + maxH + 3;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(doc.page.width - PAGE_MARGIN, lineY)
    .strokeColor("#cccccc")
    .lineWidth(0.5)
    .stroke();
  doc.y = lineY + 5;
  doc.font("Helvetica").fontSize(8);
}

function drawRegistrationSection(
  doc: PdfDoc,
  groupLabel: string,
  rows: CompetitionEventRegistrationReportItem[]
) {
  ensureSpace(doc, 60);
  const sectionY = doc.y;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(groupLabel, PAGE_MARGIN, sectionY, {
    width: doc.page.width - PAGE_MARGIN * 2,
    align: "left",
    lineBreak: false,
  });
  doc.y = sectionY + 16;

  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const cols: Array<{ label: string; x: number; w: number; align?: "left" | "center" | "right" }> = [
    { label: "Event", x: PAGE_MARGIN, w: contentWidth * 0.46, align: "left" },
    { label: "Min", x: PAGE_MARGIN + contentWidth * 0.46, w: contentWidth * 0.14, align: "center" },
    { label: "Max", x: PAGE_MARGIN + contentWidth * 0.6, w: contentWidth * 0.14, align: "center" },
    { label: "Registered", x: PAGE_MARGIN + contentWidth * 0.74, w: contentWidth * 0.26, align: "center" },
  ];
  drawTableHeader(doc, cols);

  if (rows.length === 0) {
    doc.font("Helvetica").fontSize(8).text("No events", PAGE_MARGIN, doc.y, { lineBreak: false });
    doc.y += 14;
    return;
  }

  for (const row of rows) {
    ensureSpace(doc, 16);
    const y = doc.y;
    doc.font("Helvetica").fontSize(8).fillColor("#000000");
    const cells = [
      { text: row.eventName || "—", col: cols[0]! },
      { text: String(row.minPlayers), col: cols[1]! },
      { text: String(row.maxPlayers), col: cols[2]! },
      { text: String(row.playersRegistered), col: cols[3]! },
    ];
    let maxH = 12;
    for (const cell of cells) {
      const align = cell.col.align ?? "left";
      const h = doc.heightOfString(cell.text, { width: cell.col.w, align });
      maxH = Math.max(maxH, h);
      doc.text(cell.text, cell.col.x, y, { width: cell.col.w, align, lineBreak: false });
    }
    doc.y = y + maxH + 4;
  }
  doc.y += 8;
}

function drawParticipantSection(
  doc: PdfDoc,
  groupLabel: string,
  rows: CompetitionEventGroupParticipantRow[],
  photoCache: Map<string, Buffer | null>
) {
  ensureSpace(doc, 60);
  const sectionY = doc.y;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(groupLabel, PAGE_MARGIN, sectionY, {
    width: doc.page.width - PAGE_MARGIN * 2,
    align: "left",
    lineBreak: false,
  });
  doc.y = sectionY + 16;

  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const photoW = 28;
  const cols: Array<{ label: string; x: number; w: number; align?: "left" | "center" | "right" }> = [
    { label: "Photo", x: PAGE_MARGIN, w: photoW + 4, align: "left" },
    { label: "Name", x: PAGE_MARGIN + 34, w: contentWidth * 0.16, align: "left" },
    { label: "Father", x: PAGE_MARGIN + 34 + contentWidth * 0.16, w: contentWidth * 0.12, align: "left" },
    { label: "Mother", x: PAGE_MARGIN + 34 + contentWidth * 0.28, w: contentWidth * 0.12, align: "left" },
    { label: "DOB", x: PAGE_MARGIN + 34 + contentWidth * 0.4, w: contentWidth * 0.1, align: "left" },
    { label: "Age", x: PAGE_MARGIN + 34 + contentWidth * 0.5, w: contentWidth * 0.06, align: "center" },
    { label: "Aadhar", x: PAGE_MARGIN + 34 + contentWidth * 0.56, w: contentWidth * 0.12, align: "left" },
    {
      label: "Participating in",
      x: PAGE_MARGIN + 34 + contentWidth * 0.68,
      w: contentWidth * 0.28,
      align: "left",
    },
  ];
  drawTableHeader(doc, cols);

  if (rows.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .text("No participants in this event group.", PAGE_MARGIN, doc.y, { lineBreak: false });
    doc.y += 14;
    return;
  }

  for (const row of rows) {
    ensureSpace(doc, 36);
    const y = doc.y;
    const photoUrl = row.photoUrl?.trim() || "";
    const photoBuf = photoUrl ? photoCache.get(photoUrl) ?? null : null;

    if (photoBuf) {
      try {
        doc.image(photoBuf, cols[0]!.x, y, { fit: [photoW, photoW] });
      } catch {
        const initial = (row.name.trim().charAt(0) || "?").toUpperCase();
        doc.font("Helvetica").fontSize(10).text(initial, cols[0]!.x, y + 8, {
          width: photoW,
          align: "center",
          lineBreak: false,
        });
      }
    } else {
      const initial = (row.name.trim().charAt(0) || "?").toUpperCase();
      doc.font("Helvetica").fontSize(10).text(initial, cols[0]!.x, y + 8, {
        width: photoW,
        align: "center",
        lineBreak: false,
      });
    }

    doc.font("Helvetica").fontSize(7).fillColor("#000000");
    const texts = [
      row.name || "—",
      row.fatherName?.trim() || "—",
      row.motherName?.trim() || "—",
      row.dob || "—",
      String(row.age ?? ""),
      row.aadharNumber?.trim() || "—",
      participatingInDisplay(row.participatingIn),
    ];
    let maxH = photoW;
    for (let i = 0; i < texts.length; i += 1) {
      const col = cols[i + 1]!;
      const align = col.align ?? "left";
      const h = doc.heightOfString(texts[i]!, { width: col.w, align });
      doc.text(texts[i]!, col.x, y, { width: col.w, align, lineBreak: true });
      maxH = Math.max(maxH, h);
    }
    doc.y = y + maxH + 6;
  }
  doc.y += 8;
}

async function prefetchPhotos(
  bundles: SummarySheetEntityBundle[]
): Promise<Map<string, Buffer | null>> {
  const urls = new Set<string>();
  for (const bundle of bundles) {
    for (const rows of Object.values(bundle.participants.groups ?? {})) {
      for (const row of rows) {
        const url = row.photoUrl?.trim();
        if (url) urls.add(url);
      }
    }
  }

  const cache = new Map<string, Buffer | null>();
  const logoPromise = fetchImageBuffer(REPORT_PRINT_LOGO_URL);

  // Cap concurrent fetches
  const list = [...urls];
  const concurrency = 8;
  for (let i = 0; i < list.length; i += concurrency) {
    const chunk = list.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((u) => fetchImageBuffer(u)));
    chunk.forEach((u, idx) => cache.set(u, results[idx] ?? null));
  }

  const logo = await logoPromise;
  cache.set(REPORT_PRINT_LOGO_URL, logo);
  return cache;
}

/** Draw a centered heading line across the full content width; returns next Y. */
function drawCenteredHeading(
  doc: PdfDoc,
  text: string,
  y: number,
  opts: { font: string; size: number; gapAfter?: number }
): number {
  const width = doc.page.width - PAGE_MARGIN * 2;
  doc.font(opts.font).fontSize(opts.size).fillColor("#000000");
  const h = doc.heightOfString(text, { width, align: "center" });
  doc.text(text, PAGE_MARGIN, y, {
    width,
    align: "center",
    lineBreak: true,
  });
  return y + h + (opts.gapAfter ?? 2);
}

function drawEntityHeader(
  doc: PdfDoc,
  args: {
    associationTitle: string;
    competition: SummarySheetPdfCompetition;
    scopeLabel: string;
    showAffiliation: boolean;
    logoBuf: Buffer | null;
  }
) {
  const { associationTitle, competition, scopeLabel, showAffiliation, logoBuf } = args;
  const pageWidth = doc.page.width;
  const rightX = pageWidth - PAGE_MARGIN - LOGO_SIZE;
  const y0 = PAGE_MARGIN;

  if (logoBuf) {
    try {
      doc.image(logoBuf, PAGE_MARGIN, y0, {
        fit: [LOGO_SIZE, LOGO_SIZE],
      });
      doc.image(logoBuf, rightX, y0, {
        fit: [LOGO_SIZE, LOGO_SIZE],
      });
    } catch {
      // ignore logo render errors
    }
  }

  // Center titles on the full page (same visual center as FE dual-logo header).
  let y = y0 + 2;

  y = drawCenteredHeading(doc, associationTitle, y, {
    font: "Times-Bold",
    size: 16,
    gapAfter: 2,
  });

  if (showAffiliation) {
    y = drawCenteredHeading(doc, "(Affiliated to Gatka Federation of India)", y, {
      font: "Times-Roman",
      size: 9,
      gapAfter: 6,
    });
  } else {
    y += 4;
  }

  y = drawCenteredHeading(doc, competition.name, y, {
    font: "Times-Bold",
    size: 11,
    gapAfter: 2,
  });

  if (competition.venue?.trim()) {
    y = drawCenteredHeading(doc, competition.venue.trim(), y, {
      font: "Times-Roman",
      size: 9,
      gapAfter: 2,
    });
  }

  const dateRange = formatPrintDateRange(competition.startDate, competition.endDate);
  if (dateRange) {
    y = drawCenteredHeading(doc, dateRange, y, {
      font: "Times-Roman",
      size: 9,
      gapAfter: 6,
    });
  }

  if (scopeLabel) {
    y = drawCenteredHeading(doc, scopeLabel, y, {
      font: "Times-Bold",
      size: 11,
      gapAfter: 4,
    });
  }

  doc.y = Math.max(y, y0 + LOGO_SIZE) + 12;
}

function drawTotals(doc: PdfDoc, participants: CompetitionEventGroupParticipantsReport) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = doc.y;
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  const line1 = `Players participated :- ${participants.totalParticipants ?? 0}`;
  const line2 = `No. of events played by players :- ${participants.totalEventsPlayed ?? 0}`;
  doc.text(line1, PAGE_MARGIN, y, { width, align: "left", lineBreak: false });
  y += 14;
  doc.text(line2, PAGE_MARGIN, y, { width, align: "left", lineBreak: false });
  doc.y = y + 18;
}

/** Main report-type heading (above per-group tables). */
function drawMainSectionHeading(doc: PdfDoc, title: string) {
  ensureSpace(doc, 36);
  const width = doc.page.width - PAGE_MARGIN * 2;
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000000");
  doc.text(title, PAGE_MARGIN, y, { width, align: "left", lineBreak: false });
  const lineY = y + 16;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(PAGE_MARGIN + width, lineY)
    .strokeColor("#333333")
    .lineWidth(1)
    .stroke();
  doc.y = lineY + 10;
}

function drawEntityBody(
  doc: PdfDoc,
  registration: CompetitionEventRegistrationReport,
  participants: CompetitionEventGroupParticipantsReport,
  photoCache: Map<string, Buffer | null>
) {
  drawTotals(doc, participants);

  const registrationEntries = Object.entries(registration ?? {});
  if (registrationEntries.length > 0) {
    drawMainSectionHeading(doc, "Event Group Wise");
    for (const [groupLabel, rows] of registrationEntries) {
      drawRegistrationSection(doc, groupLabel, rows);
    }
  }

  const participantEntries = Object.entries(participants?.groups ?? {});
  if (participantEntries.length > 0) {
    drawMainSectionHeading(doc, "Participants List");
    for (const [groupLabel, rows] of participantEntries) {
      drawParticipantSection(doc, groupLabel, rows, photoCache);
    }
  }
}

export async function streamSummarySheetAllEntitiesPdf(
  res: Response,
  args: {
    filename: string;
    associationTitle: string;
    competition: SummarySheetPdfCompetition;
    gender: Gender;
    bundles: SummarySheetEntityBundle[];
  }
): Promise<void> {
  const { filename, associationTitle, competition, gender, bundles } = args;
  const showAffiliation =
    competition.level === "STATE" || competition.level === "DISTRICT";
  const genderLabel = formatGenderLabel(gender);
  const photoCache = await prefetchPhotos(bundles);
  const logoBuf = photoCache.get(REPORT_PRINT_LOGO_URL) ?? null;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
  doc.pipe(res);

  if (bundles.length === 0) {
    doc.font("Helvetica").fontSize(12).text("No entities found for this competition level.");
    doc.end();
    return;
  }

  for (let i = 0; i < bundles.length; i += 1) {
    if (i > 0) doc.addPage();
    const bundle = bundles[i]!;
    const scopeLabel = genderLabel
      ? `${bundle.entity.name} (${genderLabel})`
      : bundle.entity.name;

    drawEntityHeader(doc, {
      associationTitle,
      competition,
      scopeLabel,
      showAffiliation,
      logoBuf,
    });
    drawEntityBody(doc, bundle.registration, bundle.participants, photoCache);
  }

  doc.end();
}
