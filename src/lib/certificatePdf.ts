import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ZipArchive } from "archiver";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import {
  applyCertificateMerge,
  mmToPt,
  type CertificateLayout,
  type CertificateMergeFields,
} from "./certificateLayout.js";
import { mergeFieldsForRecipient, type CertificateRecipient } from "./certificateRecipients.js";
import { getR2Bucket, getR2Client, getR2PublicBaseUrl } from "./r2.js";

function r2KeyFromPublicUrl(url: string): string | null {
  try {
    const base = getR2PublicBaseUrl();
    const normalized = url.trim();
    if (!normalized.toLowerCase().startsWith(base.toLowerCase() + "/")) return null;
    return decodeURIComponent(normalized.slice(base.length + 1));
  } catch {
    return null;
  }
}

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  const key = r2KeyFromPublicUrl(url);
  if (key) {
    try {
      const out = await getR2Client().send(
        new GetObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
        })
      );
      const bytes = await out.Body?.transformToByteArray();
      if (bytes?.length) return Buffer.from(bytes);
    } catch {
      // Fall through to HTTP fetch.
    }
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function drawCertificate(
  doc: PdfDoc,
  layout: CertificateLayout,
  fields: CertificateMergeFields,
  background: Buffer | null
) {
  const pageW = mmToPt(297);
  const pageH = mmToPt(210);
  if (background) {
    try {
      doc.image(background, 0, 0, { width: pageW, height: pageH });
    } catch {
      // Invalid image — skip background.
    }
  }

  for (const block of layout.blocks) {
    const text = applyCertificateMerge(block.text, fields);
    if (!text.trim()) continue;
    const x = mmToPt(block.xMm);
    const y = mmToPt(block.yMm);
    const width = mmToPt(block.widthMm);
    doc.font(block.fontWeight === "bold" ? "Times-Bold" : "Times-Roman");
    doc.fontSize(block.fontSizePt);
    doc.fillColor(block.color || "#1e293b");
    doc.text(text, x, y, {
      width,
      align: block.align,
      lineBreak: true,
    });
  }
}

export async function renderCertificatePdfBuffer(
  layout: CertificateLayout,
  fields: CertificateMergeFields,
  background: Buffer | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    drawCertificate(doc, layout, fields, background);
    doc.end();
  });
}

export async function loadCertificateBackground(
  layout: CertificateLayout
): Promise<Buffer | null> {
  const url = layout.backgroundUrl?.trim();
  if (!url) return null;
  return loadImageBuffer(url);
}

function sanitizeFileBase(value: string): string {
  const safe = value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim().replace(/\s+/g, "-");
  return (safe || "certificate").slice(0, 80);
}

function uniqueZipName(base: string, used: Set<string>): string {
  let name = `${base}.pdf`;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    name = `${base}-${n}.pdf`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

export async function streamCertificatePdf(
  res: Response,
  filename: string,
  layout: CertificateLayout,
  recipient: CertificateRecipient
): Promise<void> {
  const background = await loadCertificateBackground(layout);
  const buf = await renderCertificatePdfBuffer(
    layout,
    mergeFieldsForRecipient(recipient),
    background
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.end(buf);
}

export async function streamCertificateZip(
  res: Response,
  filename: string,
  layout: CertificateLayout,
  recipients: CertificateRecipient[]
): Promise<void> {
  const background = await loadCertificateBackground(layout);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ store: true });
  const archiveError = new Promise<never>((_, reject) => {
    archive.on("error", reject);
  });
  archive.pipe(res);

  const used = new Set<string>();
  const work = (async () => {
    for (const recipient of recipients) {
      const buf = await renderCertificatePdfBuffer(
        layout,
        mergeFieldsForRecipient(recipient),
        background
      );
      const base = sanitizeFileBase(recipient.fullName || recipient.playerUserId);
      archive.append(buf, { name: uniqueZipName(base, used) });
    }
    await archive.finalize();
  })();

  await Promise.race([work, archiveError]);
}

export { sanitizeFileBase };
