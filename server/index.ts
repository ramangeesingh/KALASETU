import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { config } from "./config";
import { getDb } from "./db/database";
import { handleDemo } from "./routes/demo";
import { authRouter } from "./routes/auth-routes";
import { productRouter } from "./routes/product-routes";
import { studioRouter } from "./routes/studio-routes";
import { voiceRouter } from "./routes/voice-routes";
import { catalogueRouter } from "./routes/catalogue-routes";
import { pricingRouter } from "./routes/pricing-routes";
import { similarityRouter } from "./routes/similarity-routes";
import { insightsRouter } from "./routes/insights-routes";
import { marketplaceRouter } from "./routes/marketplace-routes";
import { profileRouter } from "./routes/profile-routes";

export function createServer() {
  // Initialize database schema and seeds
  getDb();

  const app = express();

  // Core Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Serve static uploaded media files
  app.use("/uploads", express.static(config.uploadDir));

  // Base Health & Demo Routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping pong";
    res.json({ message: ping, status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/api/demo", handleDemo);

  // KalaSetu Artisan / Seller API Modules
  app.use("/api/auth", authRouter);
  app.use("/api/products/images", studioRouter);
  app.use("/api/products", productRouter);
  app.use("/api/voice", voiceRouter);
  app.use("/api/catalogue", catalogueRouter);
  app.use("/api/pricing", pricingRouter);
  app.use("/api/similarity", similarityRouter);
  app.use("/api/insights", insightsRouter);
  app.use("/api/marketplace", marketplaceRouter);
  app.use("/api/profile", profileRouter);

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("KalaSetu API Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected error occurred in KalaSetu Artisan Studio",
    });
  });

  return app;
}
