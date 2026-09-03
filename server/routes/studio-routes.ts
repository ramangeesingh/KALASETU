import { Router, Response } from "express";
import { requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";
import { imageEnhancerService } from "../services/image-enhancer";
import { imageRepository, productRepository } from "../db/repository";

export const studioRouter = Router();

// Allow authenticated seller to upload craft photo
studioRouter.post(
  "/upload",
  requireSellerAuth,
  imageUpload.single("image"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const sellerId = req.seller!.id;
      const { draftId } = req.body;

      let imageUrl = "";

      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.imageBase64) {
        // Handle base64 camera snapshot
        const result = await imageEnhancerService.enhanceImage(req.body.imageBase64);
        imageUrl = result.originalUrl;
      } else {
        res.status(400).json({ error: "Please select or capture a photo of your craft." });
        return;
      }

      const imgRecordId = `img-${Date.now()}`;
      imageRepository.saveImage({
        id: imgRecordId,
        seller_id: sellerId,
        product_id: draftId,
        original_url: imageUrl,
      });

      // If draftId provided, update draft's image_url
      if (draftId) {
        productRepository.upsertDraft({
          id: draftId,
          seller_id: sellerId,
          image_url: imageUrl,
          enhanced_image_url: imageUrl,
        });
      }

      res.status(201).json({
        message: "Product photo uploaded successfully",
        imageUrl,
        imageId: imgRecordId,
      });
    } catch (error: any) {
      console.error("Photo upload failed:", error);
      res.status(500).json({ error: error.message || "Failed to process photo upload" });
    }
  }
);

// Image Studio: Enhance photo
studioRouter.post(
  "/enhance",
  requireSellerAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const sellerId = req.seller!.id;
      const { imageUrl, draftId } = req.body;

      if (!imageUrl) {
        res.status(400).json({ error: "Image URL is required for enhancement" });
        return;
      }

      const result = await imageEnhancerService.enhanceImage(imageUrl);

      if (draftId) {
        productRepository.upsertDraft({
          id: draftId,
          seller_id: sellerId,
          image_url: result.originalUrl,
          enhanced_image_url: result.enhancedUrl,
        });
      }

      res.json({
        message: "Image enhanced successfully for e-commerce",
        status: result.status,
        originalUrl: result.originalUrl,
        enhancedUrl: result.enhancedUrl,
        enhancementsApplied: result.enhancementsApplied,
        dimensions: result.dimensions,
      });
    } catch (error: any) {
      console.error("Enhancement failed:", error);
      res.status(500).json({ error: error.message || "Failed to enhance product image" });
    }
  }
);
