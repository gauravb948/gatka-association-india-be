import { AppError } from "../errors.js";
import * as smsRepository from "../../repositories/sms.repository.js";
import { sendViaHypecreationz } from "./hypecreationz.js";

export async function sendSmsNow(params: {
  phone: string;
  body: string;
  userId?: string;
  templateId?: string;
}) {
  const result = await sendViaHypecreationz({
    number: params.phone,
    message: params.body,
    templateId: params.templateId,
  });

  console.log("result", result);

  if (result.ok) {
    await smsRepository.createOutbox({
      phone: params.phone,
      body: params.body,
      status: "SENT",
      providerRef: result.providerRef,
      ...(params.userId ? { user: { connect: { id: params.userId } } } : {}),
    });
    return;
  }

  await smsRepository.createOutbox({
    phone: params.phone,
    body: params.body,
    status: "FAILED",
    ...(params.userId ? { user: { connect: { id: params.userId } } } : {}),
  });
  throw new AppError(
    502,
    `SMS provider rejected request: ${result.message}`,
    "SMS_PROVIDER_REJECTED"
  );
}
