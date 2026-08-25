import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { extFromContentType, uploadBufferToR2 } from "../src/lib/r2.js";
import {
  CMS_NATIONAL_PAGES,
  CMS_STATE_PAGES,
  SEED_ASSOCIATION_MEMBERS,
  SEED_WEAPONS,
  saveCmsPage,
} from "./seedCms.js";

const STATE_ID = "cmnq4yuql0000100fd8n5p551";

/** Wayback snapshots of the old-site files (live host now serves the new app). */
const WAYBACK_TIMESTAMPS: Record<string, string> = {
  "data1.jpg": "20220313072649",
  "data2.jpg": "20220313073856",
  "data3.jpg": "20220313072741",
  "data4.jpg": "20220313072149",
  "data5.jpg": "20220313072405",
  "data6.jpg": "20220313073551",
  "data7.jpg": "20220313072206",
  "data8.jpg": "20220313073820",
  "data9.jpg": "20220313072923",
  "data10.jpg": "20220313072257",
};

const prisma = new PrismaClient();

function extFromUrl(url: string): string {
  const path = url.split("?")[0] ?? url;
  const match = path.match(/\.([a-z0-9]+)$/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (ext === "png" || ext === "jpg" || ext === "webp" || ext === "gif") return ext;
  return "jpg";
}

function candidateImageUrls(url: string): string[] {
  const www = url.replace("://punjabgatkaassociation.com", "://www.punjabgatkaassociation.com");
  const filename = (url.split("?")[0] ?? url).split("/").pop() ?? "";
  const timestamp = WAYBACK_TIMESTAMPS[filename];
  const urls = [url];
  if (www !== url) urls.push(www);
  if (timestamp) {
    urls.push(`https://web.archive.org/web/${timestamp}id_/${www}`);
  }
  return urls;
}

async function fetchImage(url: string): Promise<{ body: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "gatka-cms-migrate/1.0",
      Accept: "image/jpeg,image/png,image/webp,image/gif,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length === 0) {
    throw new Error("empty response body");
  }
  if (!contentType.startsWith("image/")) {
    throw new Error(`unexpected content-type ${contentType}`);
  }
  return { body, contentType };
}

async function downloadImage(url: string): Promise<{ body: Buffer; contentType: string }> {
  const errors: string[] = [];
  for (const candidate of candidateImageUrls(url)) {
    try {
      return await fetchImage(candidate);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${candidate}: ${message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function main() {
  const state = await prisma.state.findUnique({ where: { id: STATE_ID } });
  if (!state) {
    throw new Error(`State ${STATE_ID} does not exist. Aborting.`);
  }
  console.log(`Migrating CMS static data for state ${state.name} (${state.id})`);

  for (const p of CMS_NATIONAL_PAGES) {
    await saveCmsPage(prisma, p.page, p.title, p.html, null);
    console.log(`Upserted national page ${p.page}`);
  }
  for (const p of CMS_STATE_PAGES) {
    await saveCmsPage(prisma, p.page, p.title, p.html, STATE_ID);
    console.log(`Upserted state page ${p.page}`);
  }

  let uploaded = 0;
  let failed = 0;
  for (const weapon of SEED_WEAPONS) {
    try {
      const { body, contentType } = await downloadImage(weapon.imageUrl);
      const ext = extFromContentType(contentType) ?? extFromUrl(weapon.imageUrl);
      const key = `cms/weapons/${weapon.id}.${ext}`;
      const { publicUrl } = await uploadBufferToR2({ key, body, contentType });
      await prisma.weapon.upsert({
        where: { id: weapon.id },
        create: {
          id: weapon.id,
          name: weapon.name,
          namePa: weapon.name,
          description: null,
          imageUrl: publicUrl,
          sortOrder: weapon.sortOrder,
          isActive: true,
        },
        update: {
          name: weapon.name,
          namePa: weapon.name,
          imageUrl: publicUrl,
          sortOrder: weapon.sortOrder,
        },
      });
      uploaded += 1;
      console.log(`Weapon ${weapon.id} uploaded -> ${publicUrl}`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Weapon ${weapon.id} failed (${weapon.imageUrl}): ${message}`);
    }
  }

  for (const member of SEED_ASSOCIATION_MEMBERS) {
    await prisma.associationMember.upsert({
      where: { id: member.id },
      create: { ...member, stateId: STATE_ID },
      update: {
        name: member.name,
        designation: member.designation,
        mobile: member.mobile,
        sortOrder: member.sortOrder,
        stateId: STATE_ID,
      },
    });
  }
  console.log(`Upserted ${SEED_ASSOCIATION_MEMBERS.length} association members`);

  console.log({
    nationalPages: CMS_NATIONAL_PAGES.length,
    statePages: CMS_STATE_PAGES.length,
    weaponsUploaded: uploaded,
    weaponsFailed: failed,
    members: SEED_ASSOCIATION_MEMBERS.length,
  });

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
