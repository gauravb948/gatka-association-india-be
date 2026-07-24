import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as aboutUsController from "../controllers/aboutUs.controller.js";

export const aboutUsRouter = Router();

aboutUsRouter.get("/public/national", aboutUsController.listPublicNational);
aboutUsRouter.get("/public/by-state/:stateId", aboutUsController.listPublicByPathState);
aboutUsRouter.get("/public", aboutUsController.listPublic);
aboutUsRouter.get("/by-state/:stateId", aboutUsController.listPublicByPathState);

const adminOnly = [requireAuth, requireRoles("NATIONAL_ADMIN", "STATE_ADMIN")] as const;

/** Current admin's about-us only (national row for national admin). */
aboutUsRouter.get("/", ...adminOnly, aboutUsController.getMine);
/** Alias kept for older clients. */
aboutUsRouter.get("/admin", ...adminOnly, aboutUsController.getMine);

aboutUsRouter.post("/", ...adminOnly, aboutUsController.create);
aboutUsRouter.patch("/", ...adminOnly, aboutUsController.patchMine);

aboutUsRouter.get("/:id", ...adminOnly, aboutUsController.getById);
aboutUsRouter.patch("/:id", ...adminOnly, aboutUsController.patch);
aboutUsRouter.delete("/:id", ...adminOnly, aboutUsController.remove);
