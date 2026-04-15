import * as smsRepository from "../repositories/sms.repository.js";

export function queueSms(phone: string, body: string, userId?: string) {
  return smsRepository.createOutbox({
    phone,
    body,
    status: "QUEUED",
    ...(userId ? { user: { connect: { id: userId } } } : {}),
  });
}
