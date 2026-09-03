import { Router, Response } from "express";
import { requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";
import { smartPricingService } from "../services/smart-pricing";
import { productRepository } from "../db/repository";

export const pricingRouter = Router();

pricingRouter.post(
  "/calculate",
  requireSellerAuth,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const sellerId = req.seller!.id;
      const {
        draftId,
        materialCost,
        labourHours,
        hourlyRate,
        complexity,
        category,
        craftTradition,
        desiredMarginPercent,
      } = req.body;

      const recommendation = smartPricingService.calculate({
        materialCost,
        labourHours,
        hourlyRate,
        complexity,
        category,
        craftTradition,
        desiredMarginPercent,
      });

      if (draftId) {
        productRepository.upsertDraft({
          id: draftId,
          seller_id: sellerId,
          recommended_price: recommendation.recommendedPrice,
          price_range_min: recommendation.minSuggestedPrice,
          price_range_max: recommendation.maxSuggestedPrice,
          confidence_score: recommendation.confidenceScore,
          pricing_breakdown_json: JSON.stringify(recommendation.factors),
          // default price to recommended if not already set
          price: recommendation.recommendedPrice,
        });
      }

      res.json(recommendation);
    } catch (error: any) {
      console.error("Smart pricing calculation error:", error);
      res.status(500).json({ error: error.message || "Failed to calculate pricing recommendation" });
    }
  }
);
