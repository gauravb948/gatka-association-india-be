import type { EntityStatus, User } from "@prisma/client";

export type DbUser = User & {
  state: {
    id: string;
    isEnabled: boolean;
    code: string;
  } | null;
  district: {
    id: string;
    isEnabled: boolean;
    state: { id: string; isEnabled: boolean };
  } | null;
  trainingCenter: {
    id: string;
    isEnabled: boolean;
    status: EntityStatus;
    statusReason: string | null;
    district: {
      id: string;
      isEnabled: boolean;
      state: { id: string; isEnabled: boolean };
    };
  } | null;
};
