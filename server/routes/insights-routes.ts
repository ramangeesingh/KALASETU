import { Router, Request, Response } from "express";
import { marketInsightsService } from "../services/market-insights";

export const insightsRouter = Router();

insightsRouter.get("/", (_req: Request, res: Response): void => {
  const data = marketInsightsService.getInsights();
  res.json(data);
});
