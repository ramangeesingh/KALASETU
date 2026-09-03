import { Router, Response } from "express";
import { requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";
import { userRepository, productRepository } from "../db/repository";

export const profileRouter = Router();

profileRouter.use(requireSellerAuth);

// Get Artisan Profile & Stats
profileRouter.get("/", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const user = userRepository.findById(sellerId);
  if (!user) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const stats = productRepository.getStatsBySeller(sellerId);
  const { password_hash: _, ...safeUser } = user;

  res.json({
    profile: safeUser,
    stats,
  });
});

// Update Artisan Profile
profileRouter.put("/", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const {
    name,
    phone,
    email,
    craft_tradition,
    state,
    city,
    experience_years,
    bio,
    avatar_url,
    preferred_language,
  } = req.body;

  const updated = userRepository.updateProfile(sellerId, {
    name,
    phone,
    email,
    craft_tradition,
    state,
    city,
    experience_years: experience_years !== undefined ? Number(experience_years) : undefined,
    bio,
    avatar_url,
    preferred_language,
  });

  if (!updated) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const { password_hash: _, ...safeUser } = updated;
  res.json({
    message: "Profile updated successfully",
    profile: safeUser,
  });
});

// Update Preferred Language
profileRouter.post("/language", (req: AuthenticatedRequest, res: Response): void => {
  const sellerId = req.seller!.id;
  const { language } = req.body;

  if (!language) {
    res.status(400).json({ error: "Language is required" });
    return;
  }

  const updated = userRepository.updateProfile(sellerId, {
    preferred_language: language,
  });

  res.json({
    message: "Preferred language saved",
    language: updated?.preferred_language,
  });
});
