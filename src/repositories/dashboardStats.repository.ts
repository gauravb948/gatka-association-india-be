import { EntityStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import * as competitionRepository from "./competition.repository.js";

const acceptedUser: Prisma.UserWhereInput = {
  status: EntityStatus.ACCEPTED,
  isActive: true,
};

const submittedUser: Prisma.UserWhereInput = {
  status: EntityStatus.SUBMITTED,
};

const acceptedCoach: Prisma.UserWhereInput = {
  role: "COACH",
  ...acceptedUser,
};

const acceptedReferee: Prisma.UserWhereInput = {
  role: "REFEREE",
  ...acceptedUser,
  refereeProfile: { isBlacklisted: false },
};

const acceptedTrainingCenter: Prisma.TrainingCenterWhereInput = {
  status: EntityStatus.ACCEPTED,
  isEnabled: true,
};

const submittedDistrictRegistration: Prisma.DistrictRegistrationWhereInput = {
  status: EntityStatus.SUBMITTED,
};

export type DashboardGeoScope =
  | { kind: "national" }
  | { kind: "state"; stateId: string }
  | { kind: "district"; districtId: string }
  | { kind: "training_center"; trainingCenterId: string; districtId: string };

/** Users in geographic tree under a state, limited to ACCEPTED active accounts. */
function usersInStateAccepted(stateId: string): Prisma.UserWhereInput {
  return usersInState(stateId, acceptedUser);
}

/** Users in a district subtree, limited to ACCEPTED active accounts. */
function usersInDistrictAccepted(districtId: string): Prisma.UserWhereInput {
  return usersInDistrict(districtId, acceptedUser);
}

function usersInState(stateId: string, extra: Prisma.UserWhereInput): Prisma.UserWhereInput {
  return {
    AND: [
      {
        OR: [
          { stateId },
          { district: { stateId } },
          { trainingCenter: { district: { stateId } } },
        ],
      },
      extra,
    ],
  };
}

function usersInDistrict(districtId: string, extra: Prisma.UserWhereInput): Prisma.UserWhereInput {
  return {
    AND: [
      {
        OR: [{ districtId }, { trainingCenter: { districtId } }],
      },
      extra,
    ],
  };
}

function trainingCentersInState(stateId: string): Prisma.TrainingCenterWhereInput {
  return {
    AND: [acceptedTrainingCenter, { district: { stateId } }],
  };
}

function trainingCentersInDistrict(districtId: string): Prisma.TrainingCenterWhereInput {
  return {
    AND: [acceptedTrainingCenter, { districtId }],
  };
}

/** Player profiles whose linked account is ACCEPTED and active. */
const acceptedPlayer: Prisma.PlayerProfileWhereInput = {
  user: acceptedUser,
};

function tournamentRegsWhere(
  profileGeo: Prisma.PlayerProfileWhereInput
): Prisma.TournamentRegistrationWhereInput {
  return {
    playerUser: {
      status: EntityStatus.ACCEPTED,
      isActive: true,
      playerProfile: profileGeo,
    },
  };
}

export async function getDashboardCounts(params: {
  scope: DashboardGeoScope;
  competitionUser: {
    id: string;
    role: Role;
    stateId: string | null;
    districtId: string | null;
  };
}) {
  const { scope, competitionUser } = params;

  let totalStatesP: Promise<number | null> = Promise.resolve(null);
  let totalDistrictsP: Promise<number>;
  let totalUsersP: Promise<number>;
  let playersP: Promise<number>;
  let tournamentRegistrationsP: Promise<number>;

  switch (scope.kind) {
    case "national":
      totalStatesP = prisma.state.count({ where: { isEnabled: true } });
      totalDistrictsP = prisma.district.count({ where: { isEnabled: true } });
      totalUsersP = prisma.user.count({ where: acceptedUser });
      playersP = prisma.playerProfile.count({ where: acceptedPlayer });
      tournamentRegistrationsP = prisma.tournamentRegistration.count({
        where: { playerUser: acceptedUser },
      });
      break;
    case "state":
      totalDistrictsP = prisma.district.count({
        where: { stateId: scope.stateId, isEnabled: true },
      });
      totalUsersP = prisma.user.count({ where: usersInStateAccepted(scope.stateId) });
      playersP = prisma.playerProfile.count({
        where: { ...acceptedPlayer, stateId: scope.stateId },
      });
      tournamentRegistrationsP = prisma.tournamentRegistration.count({
        where: tournamentRegsWhere({ stateId: scope.stateId }),
      });
      break;
    case "district":
      totalDistrictsP = prisma.district.count({
        where: { id: scope.districtId, isEnabled: true },
      });
      totalUsersP = prisma.user.count({ where: usersInDistrictAccepted(scope.districtId) });
      playersP = prisma.playerProfile.count({
        where: { ...acceptedPlayer, districtId: scope.districtId },
      });
      tournamentRegistrationsP = prisma.tournamentRegistration.count({
        where: tournamentRegsWhere({ districtId: scope.districtId }),
      });
      break;
    case "training_center":
      totalDistrictsP = prisma.district.count({
        where: { id: scope.districtId, isEnabled: true },
      });
      totalUsersP = prisma.user.count({
        where: {
          AND: [{ trainingCenterId: scope.trainingCenterId }, acceptedUser],
        },
      });
      playersP = prisma.playerProfile.count({
        where: { ...acceptedPlayer, trainingCenterId: scope.trainingCenterId },
      });
      tournamentRegistrationsP = prisma.tournamentRegistration.count({
        where: tournamentRegsWhere({ trainingCenterId: scope.trainingCenterId }),
      });
      break;
  }

  const [
    totalStates,
    totalDistricts,
    totalUsers,
    ageGroups,
    eventGroups,
    competitions,
    players,
    tournamentRegistrations,
  ] = await Promise.all([
    totalStatesP,
    totalDistrictsP,
    totalUsersP,
    prisma.ageCategory.count({
      where: { isActive: true },
    }),
    prisma.eventGroup.count({
      where: { isActive: true },
    }),
    competitionRepository.countCompetitionsForAuthenticatedUser(competitionUser),
    playersP,
    tournamentRegistrationsP,
  ]);

  return {
    totalStates,
    totalDistricts,
    totalUsers,
    ageGroups,
    eventGroups,
    competitions,
    players,
    tournamentRegistrations,
  };
}

export type DashboardOverviewCounts = {
  activeCoaches: number;
  pendingApprovals: number;
  trainingCenters: number;
  refereesCertified: number;
};

async function pendingApprovalsForScope(scope: DashboardGeoScope): Promise<number> {
  switch (scope.kind) {
    case "national": {
      const [users, districtRegs] = await Promise.all([
        prisma.user.count({ where: submittedUser }),
        prisma.districtRegistration.count({ where: submittedDistrictRegistration }),
      ]);
      return users + districtRegs;
    }
    case "state": {
      const [users, districtRegs] = await Promise.all([
        prisma.user.count({ where: usersInState(scope.stateId, submittedUser) }),
        prisma.districtRegistration.count({
          where: { AND: [submittedDistrictRegistration, { stateId: scope.stateId }] },
        }),
      ]);
      return users + districtRegs;
    }
    case "district": {
      const [users, districtRegs] = await Promise.all([
        prisma.user.count({ where: usersInDistrict(scope.districtId, submittedUser) }),
        prisma.districtRegistration.count({
          where: { AND: [submittedDistrictRegistration, { districtId: scope.districtId }] },
        }),
      ]);
      return users + districtRegs;
    }
    case "training_center": {
      const [users, districtRegs] = await Promise.all([
        prisma.user.count({
          where: {
            AND: [{ trainingCenterId: scope.trainingCenterId }, submittedUser],
          },
        }),
        prisma.districtRegistration.count({
          where: { AND: [submittedDistrictRegistration, { districtId: scope.districtId }] },
        }),
      ]);
      return users + districtRegs;
    }
  }
}

/** Dashboard card metrics scoped to the signed-in admin hierarchy. */
export async function getDashboardOverviewCounts(
  scope: DashboardGeoScope
): Promise<DashboardOverviewCounts> {
  switch (scope.kind) {
    case "national": {
      const [activeCoaches, refereesCertified, trainingCenters, pendingApprovals] =
        await Promise.all([
          prisma.user.count({ where: acceptedCoach }),
          prisma.user.count({ where: acceptedReferee }),
          prisma.trainingCenter.count({ where: acceptedTrainingCenter }),
          pendingApprovalsForScope(scope),
        ]);
      return { activeCoaches, refereesCertified, trainingCenters, pendingApprovals };
    }
    case "state": {
      const [activeCoaches, refereesCertified, trainingCenters, pendingApprovals] =
        await Promise.all([
          prisma.user.count({ where: usersInState(scope.stateId, acceptedCoach) }),
          prisma.user.count({ where: usersInState(scope.stateId, acceptedReferee) }),
          prisma.trainingCenter.count({ where: trainingCentersInState(scope.stateId) }),
          pendingApprovalsForScope(scope),
        ]);
      return { activeCoaches, refereesCertified, trainingCenters, pendingApprovals };
    }
    case "district": {
      const [activeCoaches, refereesCertified, trainingCenters, pendingApprovals] =
        await Promise.all([
          prisma.user.count({ where: usersInDistrict(scope.districtId, acceptedCoach) }),
          prisma.user.count({ where: usersInDistrict(scope.districtId, acceptedReferee) }),
          prisma.trainingCenter.count({ where: trainingCentersInDistrict(scope.districtId) }),
          pendingApprovalsForScope(scope),
        ]);
      return { activeCoaches, refereesCertified, trainingCenters, pendingApprovals };
    }
    case "training_center": {
      const [activeCoaches, refereesCertified, trainingCenters, pendingApprovals] =
        await Promise.all([
          prisma.user.count({
            where: {
              AND: [{ trainingCenterId: scope.trainingCenterId }, acceptedCoach],
            },
          }),
          prisma.user.count({
            where: {
              AND: [{ trainingCenterId: scope.trainingCenterId }, acceptedReferee],
            },
          }),
          prisma.trainingCenter.count({
            where: { AND: [acceptedTrainingCenter, { id: scope.trainingCenterId }] },
          }),
          pendingApprovalsForScope(scope),
        ]);
      return { activeCoaches, refereesCertified, trainingCenters, pendingApprovals };
    }
  }
}
