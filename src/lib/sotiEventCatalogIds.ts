/**
 * Catalog `Event.id` sets for Soti types (team + individual).
 * Any Fari/Farri Soti id blocks any Single Soti id in the same competition, and vice versa.
 */

export const FARI_SOTI_EVENT_IDS = new Set<string>([
  "33be265c-a8c1-4d06-89f2-1b87fa884d6f",
  "3b56e7dd-e7df-47cd-b926-8b6714db15c1",
  "45479062-b566-4da5-b4ae-ec1f8f0fe322",
  "5440e3af-3518-4d6a-bca8-ab18edb6fbed",
  "5446b2d9-4430-4a80-9831-2ec14dcbff46",
  "553c3534-87e5-4109-bf04-cf9a9fe21a6b",
  "58482ac5-c972-46de-ada8-22bcdf5199ab",
  "71682023-adb1-4654-9d01-3ec89dfd2cee",
  "84801eab-689c-4b88-8416-c16afaeed85d",
  "87324a26-16c1-495f-bb22-505efa7dc299",
  "8ad81f82-d775-4d6f-8041-365fb8f10628",
  "96f8f10d-1933-41b3-84cb-341057548089",
  "97247ff8-8eee-478e-a656-10594e695827",
  "a2f8b5dc-ed89-40a0-b18c-86d71d7d0047",
  "ac2b4970-cd98-4306-b54a-d94b8cf94bab",
  "b19584aa-d443-48f1-aa6a-d516fc7ed95e",
  "b37af967-3671-42d6-a1e7-a48593348f84",
  "c5176e25-80f5-4dc6-b944-1c68baa435e1",
  "cms92rejo00tga3m3928hnva3",
  "cms92rxg000tja3m3om141kje",
  "cms92x8u300txa3m3zbbihe51",
  "cms93ghn300v1a3m3l8jlt857",
  "e88e0e1f-5785-48da-9aac-057324f0e771",
  "ef04a857-878c-4ceb-8675-c3c46789446f",
]);

export const SINGLE_SOTI_EVENT_IDS = new Set<string>([
  "02318f10-d892-4f23-b438-3d6346f1ac19",
  "09ad95e0-8e08-4906-967a-11b0230b5086",
  "1cbe7517-6a89-47a0-8c83-6862ddc8620a",
  "35c7a407-54bb-4abc-9a19-17e47a966c81",
  "3676fefc-3ffd-4275-ba8e-2f07fa0b680e",
  "39450cd0-7a6a-45a8-ba4f-ed5265195ae5",
  "3ac7880e-a90f-41f0-9945-7c593ac00f62",
  "6b0e1841-6081-48a3-bfaf-696123a3a854",
  "6bba78b9-9503-4743-b9f5-d478c458ab41",
  "700108f1-91ce-4790-a6b4-2a4b7a33441e",
  "70f2fa22-ca4e-4c89-a6aa-cc1e426f1d37",
  "89ad8c73-8505-4d48-a41a-0fc8e1af6489",
  "c9418ba8-9323-4aca-a1ed-58f7167c2312",
  "c99f9f3b-ce3c-4e66-a875-fe69293e93ce",
  "cd547c94-767d-40fd-84f1-d7ab8f96fd11",
  "cms92sx3k00tka3m3f4234uvh",
  "cms92temv00tma3m38559z7jf",
  "cms93h17v00v5a3m309izfne3",
  "cms93if9w00vfa3m3sxd40e5q",
  "d18a37af-1e4a-430a-9e66-e4407188cd58",
  "d312d44d-abc0-45d4-b552-f042979accd7",
  "d6d65b4b-3640-41f6-b514-8fba19e09818",
  "d6e1597f-eeb4-4b66-9faf-120a17173e31",
  "e1ee2121-124b-4eb8-b2ec-d01017a71a34",
]);

export const FARI_SOTI_EVENT_ID_LIST = [...FARI_SOTI_EVENT_IDS] as const;

export const SINGLE_SOTI_EVENT_ID_LIST = [...SINGLE_SOTI_EVENT_IDS] as const;
