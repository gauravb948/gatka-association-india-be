import { prisma } from "../lib/prisma.js";
import type { ConfigurableFeeRole } from "../validators/rolePaymentFee.validators.js";

export function findAllOrdered() {
  return prisma.rolePaymentFeeConfig.findMany({
    orderBy: { role: "asc" },
  });
}

export function upsertMany(fees: { role: ConfigurableFeeRole; feeAmountPaise: number }[]) {
  return prisma.$transaction(
    fees.map((f) =>
      prisma.rolePaymentFeeConfig.upsert({
        where: { role: f.role },
        create: { role: f.role, feeAmountPaise: f.feeAmountPaise },
        update: { feeAmountPaise: f.feeAmountPaise },
      })
    )
  );
}
