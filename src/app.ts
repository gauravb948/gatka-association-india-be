import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";
import { apiRouter } from "./routes/index.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { responseEnvelope } from "./middleware/responseEnvelope.js";

export function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
  }

  app.use(
    "/api/webhooks/razorpay",
    express.raw({ type: "application/json" }),
    webhooksRouter
  );

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const openapiPath = path.join(process.cwd(), "openapi", "openapi.yaml");
  if (fs.existsSync(openapiPath)) {
    const spec = yaml.load(fs.readFileSync(openapiPath, "utf8")) as object;
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use("/api", apiLimiter, responseEnvelope, apiRouter);

  app.use(errorHandler);
  return app;
}
