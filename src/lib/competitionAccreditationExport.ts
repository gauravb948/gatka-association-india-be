import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { CompetitionLevel, Gender } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { Response } from "express";
import { ZipArchive } from "archiver";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";
import { AppError } from "./errors.js";
import { getR2Bucket, getR2Client, getR2PublicBaseUrl } from "./r2.js";

export type AccreditationOrgColumnLabel = "State" | "District" | "Training Center";

export type AccreditationPlayerRow = {
  fullName: string;
  fatherName: string | null;
  dateOfBirth: string | null;
  ageGroup: string;
  organisation: string;
  gender: string;
  registrationNumber: string | null;
  participatingIn: string;
  photoUrl: string | null;
};

type AccreditationPlayerInternal = AccreditationPlayerRow & {
  playerUserId: string;
};

export type AccreditationRoster = {
  competitionName: string;
  level: CompetitionLevel;
  orgColumnLabel: AccreditationOrgColumnLabel;
  totalPlayers: number;
  players: AccreditationPlayerRow[];
};

export function orgColumnLabelForLevel(level: CompetitionLevel): AccreditationOrgColumnLabel {
  if (level === "NATIONAL") return "State";
  if (level === "STATE") return "District";
  return "Training Center";
}

function organisationForLevel(
  level: CompetitionLevel,
  profile: {
    state: { name: string } | null;
    district: { name: string } | null;
    trainingCenter: { name: string } | null;
  }
): string {
  if (level === "NATIONAL") return profile.state?.name?.trim() ?? "";
  if (level === "STATE") return profile.district?.name?.trim() ?? "";
  return profile.trainingCenter?.name?.trim() ?? "";
}

function genderDisplay(gender: Gender): string {
  if (gender === "MALE" || gender === "BOYS") return "Male";
  if (gender === "FEMALE" || gender === "GIRLS") return "Female";
  return gender;
}

/** Accreditation cards use hyphenated labels, e.g. U-19. */
export function accreditationAgeGroupLabel(ageCategory: {
  name: string;
  ageTo: number | null;
}): string {
  if (ageCategory.ageTo != null) return `U-${ageCategory.ageTo + 1}`;
  return ageCategory.name.trim();
}

function ageGroupSortKey(label: string): number {
  const m = /(\d+)/.exec(label);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

function joinLabels(labels: Set<string>, sortKey?: (label: string) => number): string {
  return [...labels]
    .filter(Boolean)
    .sort((a, b) => (sortKey ? sortKey(a) - sortKey(b) : 0) || a.localeCompare(b))
    .join(", ");
}

function toPublicRow(row: AccreditationPlayerInternal): AccreditationPlayerRow {
  return {
    fullName: row.fullName,
    fatherName: row.fatherName,
    dateOfBirth: row.dateOfBirth,
    ageGroup: row.ageGroup,
    organisation: row.organisation,
    gender: row.gender,
    registrationNumber: row.registrationNumber,
    participatingIn: row.participatingIn,
    photoUrl: row.photoUrl,
  };
}

export async function buildAccreditationRoster(
  competitionId: string,
  playerProfileWhere: Prisma.PlayerProfileWhereInput
): Promise<{ roster: AccreditationRoster; internals: AccreditationPlayerInternal[] }> {
  const comp = await competitionRepository.findByIdForPlayerEligibility(competitionId);
  if (!comp) throw new AppError(404, "Competition not found");

  const rows = await participationRepository.findParticipationsForAccreditationExport(
    competitionId,
    playerProfileWhere
  );

  const byPlayer = new Map<
    string,
    AccreditationPlayerInternal & { ageGroups: Set<string>; eventNames: Set<string> }
  >();

  for (const row of rows) {
    const profile = row.playerUser.playerProfile;
    if (!profile) continue;

    let entry = byPlayer.get(row.playerUserId);
    if (!entry) {
      entry = {
        playerUserId: row.playerUserId,
        fullName: profile.fullName,
        fatherName: profile.fatherName,
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : null,
        ageGroup: "",
        organisation: organisationForLevel(comp.level, profile),
        gender: genderDisplay(profile.gender),
        registrationNumber: profile.registrationNumber,
        participatingIn: "",
        photoUrl: profile.photoUrl,
        ageGroups: new Set<string>(),
        eventNames: new Set<string>(),
      };
      byPlayer.set(row.playerUserId, entry);
    }

    const ageCategory = row.event?.eventGroup?.ageCategory;
    if (ageCategory) {
      entry.ageGroups.add(accreditationAgeGroupLabel(ageCategory));
    }
    const eventName = row.event?.name?.trim();
    if (eventName) {
      entry.eventNames.add(eventName);
    }
  }

  const internals: AccreditationPlayerInternal[] = [...byPlayer.values()]
    .map((entry) => ({
      playerUserId: entry.playerUserId,
      fullName: entry.fullName,
      fatherName: entry.fatherName,
      dateOfBirth: entry.dateOfBirth,
      ageGroup: joinLabels(entry.ageGroups, ageGroupSortKey),
      organisation: entry.organisation,
      gender: entry.gender,
      registrationNumber: entry.registrationNumber,
      participatingIn: joinLabels(entry.eventNames),
      photoUrl: entry.photoUrl,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName) || (a.registrationNumber ?? "").localeCompare(b.registrationNumber ?? ""));

  const roster: AccreditationRoster = {
    competitionName: comp.name,
    level: comp.level,
    orgColumnLabel: orgColumnLabelForLevel(comp.level),
    totalPlayers: internals.length,
    players: internals.map(toPublicRow),
  };

  return { roster, internals };
}

function sanitizeZipBase(value: string): string {
  const safe = value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return safe || "player";
}

function extFromContentTypeOrUrl(contentType: string | undefined, url: string): string {
  const base = contentType?.split(";")[0]?.trim().toLowerCase();
  if (base === "image/jpeg" || base === "image/jpg") return "jpg";
  if (base === "image/png") return "png";
  if (base === "image/webp") return "webp";
  if (base === "image/gif") return "gif";
  const m = /\.([a-z0-9]+)(?:\?|$)/i.exec(url);
  return m?.[1]?.toLowerCase() ?? "jpg";
}

function r2KeyFromPublicUrl(photoUrl: string): string | null {
  try {
    const base = getR2PublicBaseUrl();
    const normalized = photoUrl.trim();
    if (!normalized.toLowerCase().startsWith(base.toLowerCase() + "/")) return null;
    return decodeURIComponent(normalized.slice(base.length + 1));
  } catch {
    return null;
  }
}

async function loadPhotoBuffer(
  photoUrl: string
): Promise<{ body: Buffer; contentType: string | undefined } | null> {
  const key = r2KeyFromPublicUrl(photoUrl);
  if (key) {
    try {
      const out = await getR2Client().send(
        new GetObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
        })
      );
      const bytes = await out.Body?.transformToByteArray();
      if (!bytes?.length) return null;
      return { body: Buffer.from(bytes), contentType: out.ContentType };
    } catch {
      // Fall through to HTTP fetch.
    }
  }

  try {
    const resp = await fetch(photoUrl);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!buf.length) return null;
    return { body: buf, contentType: resp.headers.get("content-type") ?? undefined };
  } catch {
    return null;
  }
}

function uniqueZipName(base: string, ext: string, used: Set<string>): string {
  let name = `${base}.${ext}`;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    name = `${base}-${n}.${ext}`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

export async function streamAccreditationPhotosZip(
  res: Response,
  competitionName: string,
  internals: AccreditationPlayerInternal[]
): Promise<void> {
  const safeName = (competitionName || "accreditation")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  const filename = `${safeName || "accreditation"}-photos.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // JPEGs/PNGs barely shrink; store is much faster for 800+ photos.
  const archive = new ZipArchive({ store: true });
  const archiveError = new Promise<never>((_, reject) => {
    archive.on("error", reject);
  });

  archive.pipe(res);

  const usedNames = new Set<string>();
  const withPhotos = internals.filter((p) => p.photoUrl?.trim());
  const concurrency = 8;

  const work = (async () => {
    for (let i = 0; i < withPhotos.length; i += concurrency) {
      const batch = withPhotos.slice(i, i + concurrency);
      const loaded = await Promise.all(
        batch.map(async (player) => {
          const photoUrl = player.photoUrl!.trim();
          const file = await loadPhotoBuffer(photoUrl);
          return { player, photoUrl, file };
        })
      );
      for (const item of loaded) {
        if (!item.file) continue;
        const base = sanitizeZipBase(
          item.player.registrationNumber?.trim() || item.player.playerUserId
        );
        const ext = extFromContentTypeOrUrl(item.file.contentType, item.photoUrl);
        archive.append(item.file.body, { name: uniqueZipName(base, ext, usedNames) });
      }
    }
    await archive.finalize();
  })();

  await Promise.race([work, archiveError]);
}
