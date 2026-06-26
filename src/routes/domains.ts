import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as stateDomainController from "../controllers/stateDomain.controller.js";

export const domainsRouter = Router();

domainsRouter.get("/public/by-domain-name", stateDomainController.getPublicByDomainName);

domainsRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  stateDomainController.list
);

domainsRouter.patch(
  "/:stateId",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  stateDomainController.patchByStateId
);
