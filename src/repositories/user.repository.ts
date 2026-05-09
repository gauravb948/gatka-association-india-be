import { EntityStatus } from "@prisma/client";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findFirstByEmailOrPhone(phoneOrEmail: string) {
  return prisma.user.findFirst({
    where: { OR: [{ email: phoneOrEmail }, { phone: phoneOrEmail }] },
  });
}

export function findByIdWithAccessGraph(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      state: true,
      district: { include: { state: true } },
      trainingCenter: {
        include: { district: { include: { state: true } } },
      },
    },
  });
}

const loginProfileSelect = {
  playerProfile: {
    select: {
      fullName: true,
      fatherName: true,
      motherName: true,
      aadharNumber: true,
      maritalStatus: true,
      whatsappNo: true,
      tShirtSize: true,
      playingHand: true,
      photoUrl: true,
      aadharFrontUrl: true,
      aadharBackUrl: true,
      address: true,
      gender: true,
      dateOfBirth: true,
      registrationNumber: true,
      membershipValidFrom: true,
      membershipValidUntil: true,
      registrationStatus: true,
      documentsVerifiedAt: true,
      isBlacklisted: true,
      stateId: true,
      districtId: true,
      trainingCenterId: true,
      dateOfJoining: true,
      termsAcceptedAt: true,
    },
  },
  coachProfile: {
    select: {
      registrationNumber: true,
      fullName: true,
      fatherName: true,
      aadharNumber: true,
      address: true,
      education: true,
      photoUrl: true,
      aadharFrontUrl: true,
      aadharBackUrl: true,
      gender: true,
      appliedFor: true,
      experienceInGatka: true,
      membershipValidUntil: true,
      trainingCenterId: true,
      isBlacklisted: true,
      termsAcceptedAt: true,
    },
  },
  refereeProfile: {
    select: {
      registrationNumber: true,
      fullName: true,
      fatherName: true,
      aadharNumber: true,
      alternatePhone: true,
      address: true,
      appliedFor: true,
      education: true,
      experienceInGatka: true,
      photoUrl: true,
      aadharFrontUrl: true,
      aadharBackUrl: true,
      gender: true,
      stateId: true,
      districtId: true,
      membershipValidUntil: true,
      isBlacklisted: true,
      termsAcceptedAt: true,
    },
  },
  volunteerProfile: {
    select: {
      registrationNumber: true,
      fullName: true,
      photoUrl: true,
      gender: true,
      stateId: true,
      membershipValidUntil: true,
      isBlacklisted: true,
    },
  },
} as const;

/** Full user for login response (no password); satisfies hierarchy checks. */
export function findByIdForLoginResponse(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      disabledReason: true,
      status: true,
      statusReason: true,
      isSuperNational: true,
      stateId: true,
      districtId: true,
      trainingCenterId: true,
      createdAt: true,
      updatedAt: true,
      state: {
        select: { id: true, name: true, code: true, isEnabled: true },
      },
      district: {
        select: {
          id: true,
          name: true,
          isEnabled: true,
          state: { select: { id: true, isEnabled: true } },
        },
      },
      trainingCenter: {
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          isEnabled: true,
          status: true,
          statusReason: true,
          termsAcceptedAt: true,
          district: {
            select: {
              id: true,
              isEnabled: true,
              state: { select: { id: true, isEnabled: true } },
            },
          },
        },
      },
      ...loginProfileSelect,
    },
  });
}

export function findByIdRoleOnly(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
}

export function findByIdWithinScope(id: string, scopeWhere: Prisma.UserWhereInput) {
  return prisma.user.findFirst({
    where: { AND: [{ id }, scopeWhere] },
    select: { id: true },
  });
}

export function findStateIdOnly(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { stateId: true },
  });
}

export function createPlayerWithProfile(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updatePassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: { id: true },
  });
}

export async function markSubmittedIfPending(userId: string) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!row) return;
  if (row.status !== EntityStatus.PENDING) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: EntityStatus.SUBMITTED,
      statusReason: "Payment completed; submitted for approval",
    },
  });
}

const adminSelect = {
  id: true,
  email: true,
  role: true,
  stateId: true,
  districtId: true,
  trainingCenterId: true,
  isSuperNational: true,
} as const;

export function createAdminUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({
    data,
    select: adminSelect,
  });
}

export async function completePasswordResetWithOtp(
  userId: string,
  passwordHash: string,
  otpId: string
) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.otpCode.update({
      where: { id: otpId },
      data: { consumedAt: new Date() },
    }),
  ]);
}

const adminUserListSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  disabledReason: true,
  status: true,
  statusReason: true,
  isSuperNational: true,
  stateId: true,
  districtId: true,
  trainingCenterId: true,
  createdAt: true,
  updatedAt: true,
  state: { select: { id: true, name: true, code: true } },
  district: { select: { id: true, name: true } },
  trainingCenter: {
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      address: true,
      registrarNumber: true,
      headName: true,
      headAadharNumber: true,
      registrationCertificateUrl: true,
      headPassportPhotoUrl: true,
      headAadharFrontUrl: true,
      headAadharBackUrl: true,
      isEnabled: true,
      status: true,
      statusReason: true,
      termsAcceptedAt: true,
      district: {
        select: {
          id: true,
          name: true,
          state: { select: { id: true, name: true, code: true, isEnabled: true } },
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  },
  ...loginProfileSelect,
  stateRegistrationApplicant: {
    select: {
      id: true,
      stateId: true,
      firstName: true,
      lastName: true,
      email: true,
      mobileNo: true,
      address: true,
      passportPhotoUrl: true,
      status: true,
      statusReason: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  districtRegistrationApplicant: {
    select: {
      id: true,
      stateId: true,
      districtId: true,
      firstName: true,
      lastName: true,
      email: true,
      mobileNo: true,
      address: true,
      passportPhotoUrl: true,
      status: true,
      statusReason: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export function findManyPaginatedForAdminList(params: {
  skip: number;
  take: number;
  statuses?: EntityStatus[];
  roles?: Role[];
}) {
  const where: Prisma.UserWhereInput = {};
  if (params.statuses?.length) where.status = { in: params.statuses };
  if (params.roles?.length) where.role = { in: params.roles };

  return prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      select: adminUserListSelect,
    }),
    prisma.user.count({ where }),
  ]);
}

/** Paginated user rows using a pre-built `where` (e.g. hierarchy + role + status). */
export function findManyPaginatedWithWhere(params: {
  where: Prisma.UserWhereInput;
  skip: number;
  take: number;
}) {
  return prisma.$transaction([
    prisma.user.findMany({
      where: params.where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      select: adminUserListSelect,
    }),
    prisma.user.count({ where: params.where }),
  ]);
}

/** User + profiles for assembling a public ID card (accepted + active callers only—see controller rules per role). */
export function findPublicIdCardContextByUserId(userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      status: EntityStatus.ACCEPTED,
    },
    select: {
      id: true,
      role: true,
      email: true,
      playerProfile: {
        select: {
          fullName: true,
          photoUrl: true,
          dateOfBirth: true,
          gender: true,
          registrationNumber: true,
          registrationStatus: true,
          isBlacklisted: true,
          tcDisabled: true,
          trainingCenter: {
            select: {
              id: true,
              name: true,
              isEnabled: true,
              status: true,
              district: {
                select: {
                  id: true,
                  name: true,
                  isEnabled: true,
                  state: { select: { id: true, name: true, isEnabled: true } },
                },
              },
            },
          },
          district: { select: { id: true, name: true, isEnabled: true } },
          state: { select: { id: true, name: true, isEnabled: true } },
        },
      },
      coachProfile: {
        select: {
          fullName: true,
          photoUrl: true,
          gender: true,
          registrationNumber: true,
          isBlacklisted: true,
          trainingCenter: {
            select: {
              id: true,
              name: true,
              isEnabled: true,
              status: true,
              district: {
                select: {
                  id: true,
                  name: true,
                  isEnabled: true,
                  state: { select: { id: true, name: true, isEnabled: true } },
                },
              },
            },
          },
        },
      },
      refereeProfile: {
        select: {
          fullName: true,
          photoUrl: true,
          gender: true,
          registrationNumber: true,
          isBlacklisted: true,
          state: { select: { id: true, name: true, isEnabled: true } },
          district: { select: { id: true, name: true, isEnabled: true } },
        },
      },
      volunteerProfile: {
        select: {
          fullName: true,
          photoUrl: true,
          gender: true,
          registrationNumber: true,
          isBlacklisted: true,
          state: { select: { id: true, name: true, isEnabled: true } },
        },
      },
      stateRegistrationApplicant: {
        select: {
          firstName: true,
          lastName: true,
          passportPhotoUrl: true,
          status: true,
          state: { select: { id: true, name: true, isEnabled: true } },
        },
      },
      districtRegistrationApplicant: {
        select: {
          firstName: true,
          lastName: true,
          passportPhotoUrl: true,
          status: true,
          district: { select: { id: true, name: true, isEnabled: true } },
          state: { select: { id: true, name: true, isEnabled: true } },
        },
      },
      trainingCenter: {
        select: {
          id: true,
          name: true,
          headName: true,
          headPassportPhotoUrl: true,
          isEnabled: true,
          status: true,
          district: {
            select: {
              id: true,
              name: true,
              isEnabled: true,
              state: { select: { id: true, name: true, isEnabled: true } },
            },
          },
        },
      },
    },
  });
}
