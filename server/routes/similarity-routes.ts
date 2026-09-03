import { Router, Response } from "express";
import { requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";
import { geminiService } from "../services/gemini";
import { productRepository } from "../db/repository";

export const similarityRouter = Router();

similarityRouter.post(
  "/check",
  requireSellerAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const sellerId = req.seller!.id;
      const { draftId, name, category, description, craftTradition } = req.body;

      const result = await geminiService.checkSimilarity({
        name: name || "Handcrafted Heritage Art Piece",
        category: category || "Home Decor",
        description: description || "Authentic handcrafted Indian craft piece",
        craft_tradition: craftTradition,
      });

      if (draftId) {
        productRepository.upsertDraft({
          id: draftId,
          seller_id: sellerId,
          similarity_score: result.similarityScore,
          similarity_status: result.status,
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Similarity check error:", error);
      res.status(500).json({ error: "Failed to perform product similarity check" });
    }
  }
);
