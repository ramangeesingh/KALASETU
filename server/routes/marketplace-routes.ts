import { Router, Response } from "express";
import { requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";
import { marketplaceService } from "../services/marketplace";
import { productRepository } from "../db/repository";

export const marketplaceRouter = Router();

marketplaceRouter.get("/channels", requireSellerAuth, (_req: AuthenticatedRequest, res: Response): void => {
  const channels = marketplaceService.getAvailableChannels();
  res.json({ channels });
});

marketplaceRouter.post("/link", requireSellerAuth, (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const { productId, channels } = req.body;

  const product = productRepository.findBySellerAndId(sellerId, productId);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const selectedChannels = Array.isArray(channels) ? channels : ["ONDC", "B2B buyers"];
  const listingId = product.listing_id || marketplaceService.generateListingId("KS");

  const links = marketplaceService.formatMarketplaceLinks(listingId, selectedChannels);

  productRepository.upsertDraft({
    id: productId,
    seller_id: sellerId,
    marketplaces_json: JSON.stringify(selectedChannels),
    listing_id: listingId,
  });

  res.json({
    message: "Marketplace linkage configured",
    listingId,
    links,
  });
});
