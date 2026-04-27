/**
 * Fixed catalog `Event.id` sets for Soti event types. Update when seeding new events.
 * If a player has participated in any Fari Soti here, they cannot take Single Soti in the same competition.
 */

export const FARI_SOTI_EVENT_IDS = new Set<string>([
  "0d263c39-bf82-4c0b-abe7-ae2425cc7c2d",
  "130df5e7-73cf-47a4-9e3b-b512033a2fd3",
  "18d19741-e314-4fb6-802b-aef796d550eb",
  "1cb2f9e8-7293-4ccd-8c91-c4f39822de40",
  "2d5ba387-d4b7-4e4b-891e-09838e48dc26",
  "2e437de4-670a-4310-9d76-e7fbd965e0d2",
  "3458c527-1ead-4628-9ec3-841237455048",
  "357acd2d-4b0b-4c2e-ae21-42ddd0da795d",
  "604ae3d9-ad19-4c09-85c6-7a8ada105c65",
  "65f23680-d84a-4855-8199-416bc767e9c1",
  "79115040-22c5-4467-ab76-75b176043769",
  "905a5ef8-965d-417b-b836-f1968efd54e5",
  "9844236d-efc0-446d-ae2b-29bf685e434d",
  "aecd153e-ab40-4e04-ba16-14e8a9417ed6",
  "ba09c7cf-1151-4e30-82cb-88ab0099185f",
  "c5eedc7c-4eac-4b21-9357-101c8e8a505d",
  "c9fa8eff-c5ed-4395-aef7-64b3aca3295b",
  "dad3ae4e-6bc7-47aa-be4b-7c0e7d1edda1",
  "f7f5f0ea-b1f8-48ed-b763-2bd48e9ccdf9",
  "f87feaa2-dd0b-4b06-bea1-44d0b350a5f4",
]);

export const SINGLE_SOTI_EVENT_IDS = new Set<string>([
  "01f0eae9-4597-4255-a5f5-8246e11389e4",
  "12b810f8-9a9e-4b2f-be52-8d0d4b393924",
  "23e62d5f-7ad3-491f-b0d2-3da8a1c09da6",
  "26f9d87f-b503-4934-96af-a7404f56b0cb",
  "289546b7-df8d-412d-bd51-3774e2aa8750",
  "31861659-1e46-410e-8a12-35f48c8e1a7e",
  "39e8c53a-76da-4b82-a89f-c5d944a45aa5",
  "416c7911-2dfd-4d8d-98ba-cbd4f6fb6b95",
  "4ca4e378-d5ba-4e8a-bf21-2a9f5238b9aa",
  "735ab212-49d4-445a-9ec6-bef5fe8de52f",
  "77d76a4b-f135-454f-9ddc-bd361380fc51",
  "8412bcc7-49be-4085-b43a-8ed80baf95f8",
  "96121d04-6b02-4ac0-b94d-95e07b00acf3",
  "9b80fa70-2b56-4eda-939d-7f9fa5a85a5a",
  "a3c4df05-67c5-4421-8c29-c2e9c8aff2d6",
  "c79346dd-5a97-4411-bec4-ad5bea197a87",
  "cea3f253-241e-4a39-9af8-88b91a072c31",
  "e1930cf0-9e3f-40bd-b9bf-6a4a5023634d",
  "e8331dbf-8bc6-4ba8-b712-dbccca554bdd",
  "fceda7c0-6911-4386-9e7f-d4b87e881060",
]);

export const FARI_SOTI_EVENT_ID_LIST = [...FARI_SOTI_EVENT_IDS] as const;

export const SINGLE_SOTI_EVENT_ID_LIST = [...SINGLE_SOTI_EVENT_IDS] as const;
