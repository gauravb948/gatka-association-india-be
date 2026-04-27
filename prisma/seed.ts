import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.globalSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ageCalculationDate: new Date("2026-01-01T00:00:00.000Z") },
    update: {},
  });

  const session = await prisma.session.upsert({
    where: { id: "seed-session-2026" },
    create: {
      id: "seed-session-2026",
      name: "2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    },
    update: {},
  });

  const punjab = await prisma.state.upsert({
    where: { code: "PB" },
    create: { name: "Punjab", code: "PB", isEnabled: true },
    update: {},
  });

  const dist = await prisma.district.upsert({
    where: {
      stateId_name: { stateId: punjab.id, name: "Ludhiana" },
    },
    create: { stateId: punjab.id, name: "Ludhiana", isEnabled: true },
    update: {},
  });

  const tc = await prisma.trainingCenter.upsert({
    where: { id: "seed-tc-ludhiana" },
    create: {
      id: "seed-tc-ludhiana",
      districtId: dist.id,
      name: "Main Training Center",
      isEnabled: true,
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  await prisma.user.upsert({
    where: { email: "national@gatka.local" },
    create: {
      email: "national@gatka.local",
      passwordHash,
      role: "NATIONAL_ADMIN",
      isSuperNational: true,
    },
    update: { isSuperNational: true },
  });

  const adminHash = await bcrypt.hash("Pga@088", 10);
  await prisma.user.upsert({
    where: { email: "admin@email.com" },
    create: {
      email: "admin@email.com",
      passwordHash: adminHash,
      role: "NATIONAL_ADMIN",
      isSuperNational: true,
    },
    update: {},
  });

  const ageDefs = [
    { name: "Under 11 Years", ageTo: 10, sort: 1, band: "SUB_JUNIOR" as const },
    { name: "Under 17 Years", ageTo: 16, sort: 2, band: "SUB_JUNIOR" as const },
    { name: "Under 19 Years", ageTo: 18, sort: 3, band: "JUNIOR" as const },
    { name: "Under 25 Years", ageTo: 24, sort: 4, band: "SENIOR" as const },
    { name: "Under 30 Years", ageTo: 29, sort: 5, band: "SENIOR" as const },
  ];

  const ageByName: Record<string, string> = {};
  for (const a of ageDefs) {
    const row = await prisma.ageCategory.upsert({
      where: { id: `seed-age-${a.sort}` },
      create: {
        id: `seed-age-${a.sort}`,
        name: a.name,
        ageFrom: 0,
        ageTo: a.ageTo,
        bandType: a.band,
        sortOrder: a.sort,
      },
      update: {
        name: a.name,
        ageTo: a.ageTo,
        bandType: a.band,
        sortOrder: a.sort,
      },
    });
    ageByName[a.name] = row.id;
  }

  const openRow = await prisma.ageCategory.upsert({
    where: { id: "seed-age-open" },
    create: {
      id: "seed-age-open",
      name: "Open",
      ageFrom: null,
      ageTo: null,
      bandType: "OPEN",
      sortOrder: 6,
    },
    update: {
      name: "Open",
      ageFrom: null,
      ageTo: null,
      bandType: "OPEN",
      sortOrder: 6,
    },
  });
  ageByName["Open"] = openRow.id;

  const groups: Array<{
    segment: string;
    gender: "MALE" | "FEMALE";
    ageName: string;
    sort: number;
  }> = [
    { segment: "Bhujhang", gender: "FEMALE", ageName: "Under 11 Years", sort: 1 },
    { segment: "Bhujhang", gender: "MALE", ageName: "Under 11 Years", sort: 2 },
    { segment: "Siprar", gender: "FEMALE", ageName: "Under 30 Years", sort: 3 },
    { segment: "Siprar", gender: "MALE", ageName: "Under 30 Years", sort: 4 },
    { segment: "Sipar", gender: "FEMALE", ageName: "Under 25 Years", sort: 5 },
    { segment: "Sipar", gender: "MALE", ageName: "Under 25 Years", sort: 6 },
    { segment: "Saif", gender: "FEMALE", ageName: "Under 19 Years", sort: 7 },
    { segment: "Saif", gender: "MALE", ageName: "Under 19 Years", sort: 8 },
    { segment: "Sool", gender: "FEMALE", ageName: "Under 17 Years", sort: 9 },
    { segment: "Sool", gender: "MALE", ageName: "Under 17 Years", sort: 10 },
  ];

  for (const g of groups) {
    const aid = ageByName[g.ageName];
    await prisma.eventGroup.upsert({
      where: {
        segment_gender_ageCategoryId: {
          segment: g.segment,
          gender: g.gender,
          ageCategoryId: aid,
        },
      },
      create: {
        segment: g.segment,
        gender: g.gender,
        ageCategoryId: aid,
        sortOrder: g.sort,
      },
      update: { sortOrder: g.sort },
    });
  }

  await prisma.statePaymentConfig.upsert({
    where: { stateId: punjab.id },
    create: {
      stateId: punjab.id,
      razorpayKeyId: "rzp_test_placeholder",
      razorpayKeySecret: "placeholder_secret",
      webhookSecret: "whsec_placeholder",
    },
    update: {},
  });

  await prisma.smsTemplate.createMany({
    data: [
      { key: "OTP", template: "Your OTP is {{code}}" },
      { key: "REGISTRATION", template: "Registration received" },
      { key: "RENEWAL", template: "Renewal received" },
      { key: "MEMBERSHIP_EXPIRY", template: "Membership expiring soon" },
      { key: "PAYMENT_SUCCESS", template: "Payment successful" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed OK", { session: session.id, state: punjab.code, tc: tc.id });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
