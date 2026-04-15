import type { NextFunction, Request, Response } from "express";
import * as competitionResultRepository from "../repositories/competitionResult.repository.js";

export async function verifyQr(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.query.payload as string | undefined;
    if (!raw) {
      res.status(400).json({ valid: false, error: "payload required" });
      return;
    }
    const data = JSON.parse(raw) as {
      t?: string;
      c?: string;
      e?: string;
      p?: string;
    };
    if (data.t !== "result" || !data.c || !data.e || !data.p) {
      res.json({ valid: false });
      return;
    }
    const row = await competitionResultRepository.findUniqueForVerify(
      data.c,
      data.e,
      data.p
    );
    if (!row) {
      res.json({ valid: false });
      return;
    }
    res.json({
      valid: true,
      competition: row.competition,
      event: row.event,
      player: {
        id: row.playerUser.id,
        email: row.playerUser.email,
        fullName: row.playerUser.playerProfile?.fullName,
        registrationNumber: row.playerUser.playerProfile?.registrationNumber,
      },
      rank: row.rank,
      score: row.score,
    });
  } catch (e) {
    next(e);
  }
}
