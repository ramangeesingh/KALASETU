import { Router, Response } from "express";
import { productRepository, ProductRow } from "../db/repository";
import { requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";
import { marketplaceService } from "../services/marketplace";

export const productRouter = Router();

// Apply seller auth to all product routes
productRouter.use(requireSellerAuth);

// Get All Products for the Authenticated Seller
productRouter.get("/", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const { status } = req.query;

  const rawProducts = productRepository.findAllBySeller(sellerId, typeof status === "string" ? status : undefined);

  const parsedProducts = rawProducts.map((p) => ({
    ...p,
    translations: safeJsonParse(p.translations_json, {}),
    materials: safeJsonParse(p.materials_json, []),
    tags: safeJsonParse(p.tags_json, []),
    pricing_breakdown: safeJsonParse(p.pricing_breakdown_json, []),
    marketplaces: safeJsonParse(p.marketplaces_json, []),
  }));

  res.json({
    products: parsedProducts,
    count: parsedProducts.length,
  });
});

// Get Studio Dashboard Stats
productRouter.get("/stats", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const stats = productRepository.getStatsBySeller(sellerId);
  res.json(stats);
});

// Get Single Product by ID
productRouter.get("/:id", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const id = req.params.id as string;

  const p = productRepository.findBySellerAndId(sellerId, id);
  if (!p) {
    res.status(404).json({ error: "Product not found or belongs to another artisan." });
    return;
  }

  res.json({
    product: {
      ...p,
      translations: safeJsonParse(p.translations_json, {}),
      materials: safeJsonParse(p.materials_json, []),
      tags: safeJsonParse(p.tags_json, []),
      pricing_breakdown: safeJsonParse(p.pricing_breakdown_json, []),
      marketplaces: safeJsonParse(p.marketplaces_json, []),
    },
  });
});

// Save or Update Product Draft (at any stage of the guided flow)
productRouter.post("/draft", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const body = req.body;

  const draftId = body.id || `draft-${Date.now()}`;

  const payload: Partial<ProductRow> & { id: string; seller_id: string } = {
    id: draftId,
    seller_id: sellerId,
    name: body.name || "Untitled Craft",
    category: body.category || "Home Decor",
    description: body.description || "",
    translations_json: typeof body.translations === "object" ? JSON.stringify(body.translations) : body.translations_json || "{}",
    materials_json: Array.isArray(body.materials) ? JSON.stringify(body.materials) : body.materials_json || "[]",
    dimensions: body.dimensions || "",
    craft_origin: body.craft_origin || (body.city && body.state ? `${body.city}, ${body.state}` : ""),
    state: body.state || "",
    city: body.city || "",
    craft_tradition: body.craft_tradition || "",
    technique: body.technique || "",
    cultural_story: body.cultural_story || "",
    tags_json: Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json || "[]",
    price: Number(body.price) || 0,
    recommended_price: Number(body.recommended_price) || Number(body.price) || 0,
    price_range_min: Number(body.price_range_min) || 0,
    price_range_max: Number(body.price_range_max) || 0,
    confidence_score: Number(body.confidence_score) || 90,
    pricing_breakdown_json: Array.isArray(body.pricing_breakdown) ? JSON.stringify(body.pricing_breakdown) : body.pricing_breakdown_json || "[]",
    image_url: body.image_url || "",
    enhanced_image_url: body.enhanced_image_url || body.image_url || "",
    similarity_score: Number(body.similarity_score) || 8,
    similarity_status: body.similarity_status || "No significant similarity detected",
    status: (body.status as any) || "DRAFT",
    marketplaces_json: Array.isArray(body.marketplaces) ? JSON.stringify(body.marketplaces) : body.marketplaces_json || "[]",
  };

  const saved = productRepository.upsertDraft(payload);

  res.json({
    message: "Product draft autosaved successfully",
    product: {
      ...saved,
      translations: safeJsonParse(saved.translations_json, {}),
      materials: safeJsonParse(saved.materials_json, []),
      tags: safeJsonParse(saved.tags_json, []),
      pricing_breakdown: safeJsonParse(saved.pricing_breakdown_json, []),
      marketplaces: safeJsonParse(saved.marketplaces_json, []),
    },
  });
});

// Approve Product (seller review check)
productRouter.post("/:id/approve", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const id = req.params.id as string;

  let product = productRepository.findBySellerAndId(sellerId, id);
  if (!product) {
    const raw = productRepository.findById(id);
    if (raw && (raw.id.startsWith("draft-") || raw.seller_id === "seller-meera-sharma-101")) {
      product = productRepository.upsertDraft({
        ...raw,
        id,
        seller_id: sellerId,
      });
    }
  }

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const updated = productRepository.upsertDraft({
    id,
    seller_id: sellerId,
    status: "APPROVED",
  });

  res.json({
    message: "Product approved by artisan and ready to publish",
    product: updated,
  });
});

// Publish Product to Marketplaces
productRouter.post("/:id/publish", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const id = req.params.id as string;
  const { marketplaces, product: productPayload } = req.body;

  let product = productRepository.findBySellerAndId(sellerId, id);
  if (!product) {
    const raw = productRepository.findById(id);
    if (raw) {
      product = productRepository.upsertDraft({
        ...raw,
        id,
        seller_id: sellerId,
      });
    } else if (productPayload) {
      product = productRepository.upsertDraft({
        ...productPayload,
        id,
        seller_id: sellerId,
      });
    }
  }

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // Validate required publishing attributes
  const missing: string[] = [];
  if (!product.name || product.name === "Untitled Craft") missing.push("Product Name");
  if (!product.price || product.price <= 0) missing.push("Valid Price");
  if (!product.image_url) missing.push("Product Photo");
  if (!product.craft_origin && !product.craft_tradition) missing.push("Craft Tradition or Origin");

  if (missing.length > 0) {
    res.status(422).json({
      error: `Cannot publish listing. Missing required fields: ${missing.join(", ")}`,
    });
    return;
  }

  // Generate unique listing ID: KS-XXXXXX
  const prefix = (product.craft_tradition || product.name || "KS")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();
  const listingId = product.listing_id || marketplaceService.generateListingId(prefix);

  const targetMarketplaces = Array.isArray(marketplaces) && marketplaces.length > 0
    ? marketplaces
    : ["ONDC", "B2B buyers", "Government marketplaces", "Other marketplaces"];

  const published = productRepository.publish(sellerId, id, listingId, targetMarketplaces);
  const links = marketplaceService.formatMarketplaceLinks(listingId, targetMarketplaces);

  res.json({
    message: "Product successfully published to craft marketplaces!",
    listingId,
    product: published,
    marketplaceLinks: links,
  });
});

// Unpublish Product (set back to DRAFT)
productRouter.post("/:id/unpublish", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const id = req.params.id as string;

  const product = productRepository.findBySellerAndId(sellerId, id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const updated = productRepository.upsertDraft({
    id,
    seller_id: sellerId,
    status: "DRAFT",
  });

  res.json({
    message: "Product unpublished and moved to drafts",
    product: updated,
  });
});

// Delete Product
productRouter.delete("/:id", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const id = req.params.id as string;

  const success = productRepository.delete(sellerId, id);
  if (!success) {
    res.status(404).json({ error: "Product could not be deleted or does not exist." });
    return;
  }

  res.json({ message: "Product deleted successfully" });
});

function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}
