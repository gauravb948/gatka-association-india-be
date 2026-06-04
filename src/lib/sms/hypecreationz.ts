import { AppError } from "../errors.js";

const HYPE_URL = "https://msg.hypecreationz.com/vb/apikey.php";

type HypeRawResponse = {
  status?: boolean | string;
  code?: string | number;
  description?: string;
  message?: string;
  data?: {
    messageid?: string;
    totnumber?: string | number;
    totalcredit?: string | number;
  };
};

export type HypeSendResult =
  | { ok: true; providerRef: string | null; raw: HypeRawResponse | string }
  | { ok: false; code: string | null; message: string; raw: HypeRawResponse | string };

export async function sendViaHypecreationz(params: {
  number: string;
  message: string;
  templateId?: string;
}) {
  const apiKey = process.env.MSG_API_KEY?.trim();
  const senderId = process.env.MSG_SENDER_ID?.trim();
  if (!apiKey) {
    throw new AppError(500, "MSG_API_KEY is not configured", "SMS_CONFIG_MISSING");
  }
  if (!senderId) {
    throw new AppError(500, "MSG_SENDER_ID is not configured", "SMS_CONFIG_MISSING");
  }

  const query = new URLSearchParams({
    apikey: apiKey,
    senderid: senderId,
    number: params.number,
    message: params.message,
    format: process.env.MSG_RESPONSE_FORMAT?.trim() || "JSON",
  });
  const templateId = params.templateId?.trim();
  // Only forward a real DLT-registered template id (long numeric). Short/placeholder
  // ids cause the provider to reject; omitting the param lets the panel auto-match
  // the template by sender id (per provider docs).
  if (templateId && /^\d{12,}$/.test(templateId)) {
    query.set("templateid", templateId);
  }
  const url = `${HYPE_URL}?${query.toString()}`;
  console.log("url", url);
  const response = await fetch(url, { method: "GET" });
  const text = await response.text();
  let raw: HypeRawResponse | string = text;
  console.log("raw", raw);
  try {
    raw = JSON.parse(text) as HypeRawResponse;
  } catch {
    raw = text;
  }

  if (!response.ok) {
    throw new AppError(502, "SMS provider request failed", "SMS_PROVIDER_HTTP");
  }

  if (typeof raw === "object" && raw !== null) {
    const code = raw.code !== undefined ? String(raw.code) : null;
    if (code === "011") {
      return {
        ok: true,
        providerRef: raw.data?.messageid ?? null,
        raw,
      } as const;
    }
    const message =
      raw.description || raw.message || "SMS provider rejected request";
    return { ok: false, code, message, raw } as const;
  }

  if (text.includes("011")) {
    return { ok: true, providerRef: null, raw: text } as const;
  }
  return {
    ok: false,
    code: null,
    message: "Unexpected SMS provider response",
    raw: text,
  } as const;
}
