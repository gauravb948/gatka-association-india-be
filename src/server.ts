import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`Gatka API listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});
