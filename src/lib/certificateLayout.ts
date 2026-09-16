export const A4_LANDSCAPE_MM = { widthMm: 297, heightMm: 210 } as const;

export type CertificateKindQuery = "winners" | "participants";

export type CertificateTextAlign = "left" | "center" | "right";
export type CertificateFontWeight = "normal" | "bold";

export type CertificateTextBlock = {
  id: string;
  text: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  fontSizePt: number;
  fontWeight: CertificateFontWeight;
  align: CertificateTextAlign;
  color: string;
};

export type CertificateLayout = {
  widthMm: number;
  heightMm: number;
  backgroundUrl: string | null;
  blocks: CertificateTextBlock[];
};

export type CertificateMergeFields = {
  playerName: string;
  rank: string;
  event: string;
  competition: string;
  unitName: string;
  date: string;
};

export const CERTIFICATE_MERGE_TOKENS = [
  "{{playerName}}",
  "{{rank}}",
  "{{event}}",
  "{{competition}}",
  "{{unitName}}",
  "{{date}}",
] as const;

function block(
  partial: Pick<CertificateTextBlock, "id" | "text" | "yMm" | "fontSizePt"> &
    Partial<CertificateTextBlock>
): CertificateTextBlock {
  return {
    xMm: 18.5,
    widthMm: 260,
    fontWeight: "normal",
    align: "center",
    color: "#1e293b",
    ...partial,
  };
}

export function defaultCertificateLayout(kind: CertificateKindQuery): CertificateLayout {
  const title = kind === "winners" ? "Certificate of Merit" : "Certificate of Participation";
  const body =
    kind === "winners" ? "has secured {{rank}} in {{event}}" : "has participated in {{event}}";
  return {
    widthMm: A4_LANDSCAPE_MM.widthMm,
    heightMm: A4_LANDSCAPE_MM.heightMm,
    backgroundUrl: null,
    blocks: [
      block({
        id: "org",
        text: "Gatka Federation of India",
        yMm: 16,
        fontSizePt: 14,
        fontWeight: "bold",
        color: "#0f172a",
      }),
      block({
        id: "title",
        text: title,
        yMm: 32,
        fontSizePt: 28,
        fontWeight: "bold",
        color: "#b45309",
      }),
      block({
        id: "certify",
        text: "This is to certify that",
        yMm: 68,
        fontSizePt: 12,
      }),
      block({
        id: "name",
        text: "{{playerName}}",
        yMm: 84,
        fontSizePt: 22,
        fontWeight: "bold",
      }),
      block({
        id: "unit",
        text: "representing {{unitName}}",
        yMm: 108,
        fontSizePt: 12,
      }),
      block({
        id: "body",
        text: body,
        yMm: 126,
        fontSizePt: 14,
      }),
      block({
        id: "comp",
        text: "{{competition}}",
        yMm: 148,
        fontSizePt: 13,
        fontWeight: "bold",
      }),
      block({
        id: "date",
        text: "{{date}}",
        yMm: 178,
        fontSizePt: 11,
        color: "#475569",
      }),
    ],
  };
}

export function applyCertificateMerge(text: string, fields: CertificateMergeFields): string {
  return text
    .replaceAll("{{playerName}}", fields.playerName)
    .replaceAll("{{rank}}", fields.rank)
    .replaceAll("{{event}}", fields.event)
    .replaceAll("{{competition}}", fields.competition)
    .replaceAll("{{unitName}}", fields.unitName)
    .replaceAll("{{date}}", fields.date);
}

export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

export function rankLabelForBand(rankBand: number): string {
  if (rankBand === 1) return "Gold";
  if (rankBand === 2) return "Silver";
  if (rankBand === 3) return "Bronze";
  return "Participant";
}

export function formatCertificateDate(date: Date | null | undefined): string {
  if (!date) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
