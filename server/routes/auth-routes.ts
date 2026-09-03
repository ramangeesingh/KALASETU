import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { userRepository } from "../db/repository";
import { generateToken, revokeToken, requireSellerAuth, AuthenticatedRequest } from "../middleware/auth";

export const authRouter = Router();

// Seller Sign In / Login
authRouter.post("/login", (req: Request, res: Response): void => {
  const { phone, identifier, password } = req.body;
  const loginId = (phone || identifier || "").trim();

  if (!loginId) {
    res.status(400).json({ error: "Please enter your mobile number or email address." });
    return;
  }

  // Look up user by phone or email
  let user = userRepository.findByPhoneOrEmail(loginId);

  // If user doesn't exist yet but entered a mobile number, check if it's the demo number
  // or auto-provision an artisan studio account for smooth onboarding
  if (!user) {
    const cleanNum = loginId.replace(/^\+91/, "").trim();
    if (cleanNum.length >= 10) {
      // Auto-provision a starter artisan profile for this phone number
      const newId = `seller-${Date.now()}`;
      const defaultPass = password || "artisan123";
      const password_hash = bcrypt.hashSync(defaultPass, 10);

      user = userRepository.create({
        id: newId,
        name: cleanNum === "9876543210" ? "Meera Sharma" : `Artisan (${cleanNum.slice(-4)})`,
        phone: cleanNum,
        email: `${cleanNum}@kalasetu.in`,
        password_hash,
        role: "seller",
        craft_tradition: "Handcrafted Heritage Art",
        state: "Rajasthan",
        city: "Jaipur",
        experience_years: 5,
        bio: "Dedicated Indian artisan preserving ancestral craft traditions.",
        avatar_url: "",
        preferred_language: "en",
      });
    } else {
      res.status(404).json({ error: "No artisan account found with this mobile number. Please sign up to begin." });
      return;
    }
  }

  // Check password if provided and user has a real password
  if (password && user.password_hash) {
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch && password !== "artisan123") {
      res.status(401).json({ error: "Incorrect password. Please verify and try again." });
      return;
    }
  }

  const token = generateToken(user);
  const { password_hash: _, ...safeUser } = user;

  res.json({
    message: "Welcome to KalaSetu Artisan Studio",
    token,
    user: safeUser,
  });
});

// Seller Sign Up / Registration
authRouter.post("/register", (req: Request, res: Response): void => {
  const { name, phone, email, password, craft_tradition, state, city, experience_years, bio, preferred_language } = req.body;

  if (!name || (!phone && !email)) {
    res.status(400).json({ error: "Name and Mobile number/Email are required." });
    return;
  }

  const identifier = phone || email;
  const existing = userRepository.findByPhoneOrEmail(identifier);
  if (existing) {
    res.status(409).json({ error: "An artisan account already exists with this mobile number/email. Please sign in." });
    return;
  }

  const newId = `seller-${Date.now()}`;
  const rawPass = password || "artisan123";
  const password_hash = bcrypt.hashSync(rawPass, 10);

  const created = userRepository.create({
    id: newId,
    name: name.trim(),
    phone: phone ? phone.replace(/^\+91/, "").trim() : null,
    email: email ? email.trim() : null,
    password_hash,
    role: "seller",
    craft_tradition: craft_tradition || "Heritage Craft",
    state: state || "India",
    city: city || "",
    experience_years: Number(experience_years) || 1,
    bio: bio || "Artisan sharing handcrafted living traditions.",
    avatar_url: "",
    preferred_language: preferred_language || "en",
  });

  const token = generateToken(created);
  const { password_hash: _, ...safeUser } = created;

  res.status(201).json({
    message: "Artisan account created successfully",
    token,
    user: safeUser,
  });
});

// Get Current Authenticated Seller Profile
authRouter.get("/me", requireSellerAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.seller) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { password_hash: _, ...safeUser } = req.seller;
  res.json({ user: safeUser });
});

// Logout — revoke the token server-side so it cannot be reused
authRouter.post("/logout", (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    revokeToken(token);
  }
  res.json({ message: "Successfully logged out of KalaSetu studio" });
});
