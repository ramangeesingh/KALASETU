import { getDb } from "./database";

export interface UserRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  password_hash: string;
  role: string;
  craft_tradition: string;
  state: string;
  city: string;
  experience_years: number;
  bio: string;
  avatar_url: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  seller_id: string;
  listing_id: string;
  name: string;
  category: string;
  description: string;
  translations_json: string;
  materials_json: string;
  dimensions: string;
  craft_origin: string;
  state: string;
  city: string;
  craft_tradition: string;
  technique: string;
  cultural_story: string;
  tags_json: string;
  price: number;
  recommended_price: number;
  price_range_min: number;
  price_range_max: number;
  confidence_score: number;
  pricing_breakdown_json: string;
  image_url: string;
  enhanced_image_url: string;
  similarity_score: number;
  similarity_status: string;
  status: "DRAFT" | "PROCESSING" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED";
  marketplaces_json: string;
  created_at: string;
  updated_at: string;
}

export const userRepository = {
  findById(id: string): UserRow | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as UserRow | undefined;
    return row || null;
  },

  findByPhone(phone: string): UserRow | null {
    const db = getDb();
    const cleanPhone = phone.replace(/^\+91/, "").trim();
    const row = db.prepare("SELECT * FROM users WHERE phone = ? OR phone = ?").get(phone, cleanPhone) as unknown as UserRow | undefined;
    return row || null;
  },

  findByPhoneOrEmail(identifier: string): UserRow | null {
    const db = getDb();
    const clean = identifier.replace(/^\+91/, "").trim();
    const row = db.prepare("SELECT * FROM users WHERE phone = ? OR phone = ? OR email = ?").get(identifier, clean, identifier) as unknown as UserRow | undefined;
    return row || null;
  },

  create(user: Omit<UserRow, "created_at" | "updated_at">): UserRow {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (
        id, name, phone, email, password_hash, role, craft_tradition, state, city, experience_years, bio, avatar_url, preferred_language, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id, user.name, user.phone, user.email, user.password_hash, user.role,
      user.craft_tradition, user.state, user.city, user.experience_years, user.bio,
      user.avatar_url, user.preferred_language, now, now
    );
    return this.findById(user.id)!;
  },

  updateProfile(id: string, updates: Partial<UserRow>): UserRow | null {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    db.prepare(`
      UPDATE users SET
        name = ?, phone = ?, email = ?, craft_tradition = ?, state = ?, city = ?,
        experience_years = ?, bio = ?, avatar_url = ?, preferred_language = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name, updated.phone, updated.email, updated.craft_tradition, updated.state, updated.city,
      updated.experience_years, updated.bio, updated.avatar_url, updated.preferred_language, updated.updated_at,
      id
    );
    return updated;
  }
};

export const productRepository = {
  findById(id: string): ProductRow | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as unknown as ProductRow | undefined;
    return row || null;
  },

  findBySellerAndId(sellerId: string, id: string): ProductRow | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM products WHERE id = ? AND seller_id = ?").get(id, sellerId) as unknown as ProductRow | undefined;
    return row || null;
  },

  findAllBySeller(sellerId: string, status?: string): ProductRow[] {
    const db = getDb();
    if (status && status !== "ALL") {
      return db.prepare("SELECT * FROM products WHERE seller_id = ? AND UPPER(status) = UPPER(?) ORDER BY created_at DESC").all(sellerId, status) as unknown as ProductRow[];
    }
    return db.prepare("SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC").all(sellerId) as unknown as ProductRow[];
  },

  getStatsBySeller(sellerId: string) {
    const db = getDb();
    const totalRow = db.prepare("SELECT COUNT(*) as count FROM products WHERE seller_id = ?").get(sellerId) as { count: number };
    const publishedRow = db.prepare("SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND status = 'PUBLISHED'").get(sellerId) as { count: number };
    const draftRow = db.prepare("SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND status = 'DRAFT'").get(sellerId) as { count: number };
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND (status = 'PROCESSING' OR status = 'READY_FOR_REVIEW')").get(sellerId) as { count: number };

    return {
      totalProducts: totalRow.count,
      publishedListings: publishedRow.count,
      draftsCount: draftRow.count,
      pendingCount: pendingRow.count,
      monthlyViews: "42.8k",
      viewsChange: "+18.4%",
      studioCompletion: totalRow.count > 0 ? `${Math.min(100, Math.round((publishedRow.count / totalRow.count) * 100))}%` : "86%",
    };
  },

  upsertDraft(product: Partial<ProductRow> & { id: string; seller_id: string }): ProductRow {
    const db = getDb();
    const existing = this.findById(product.id);
    const now = new Date().toISOString();

    if (existing) {
      const targetSellerId = product.seller_id || existing.seller_id;
      const merged = { ...existing, ...product, seller_id: targetSellerId, updated_at: now };
      db.prepare(`
        UPDATE products SET
          seller_id = ?,
          name = ?, category = ?, description = ?, translations_json = ?, materials_json = ?,
          dimensions = ?, craft_origin = ?, state = ?, city = ?, craft_tradition = ?,
          technique = ?, cultural_story = ?, tags_json = ?, price = ?, recommended_price = ?,
          price_range_min = ?, price_range_max = ?, confidence_score = ?, pricing_breakdown_json = ?,
          image_url = ?, enhanced_image_url = ?, similarity_score = ?, similarity_status = ?,
          status = ?, marketplaces_json = ?, updated_at = ?
        WHERE id = ?
      `).run(
        targetSellerId,
        merged.name, merged.category, merged.description, merged.translations_json, merged.materials_json,
        merged.dimensions, merged.craft_origin, merged.state, merged.city, merged.craft_tradition,
        merged.technique, merged.cultural_story, merged.tags_json, merged.price, merged.recommended_price,
        merged.price_range_min, merged.price_range_max, merged.confidence_score, merged.pricing_breakdown_json,
        merged.image_url, merged.enhanced_image_url, merged.similarity_score, merged.similarity_status,
        merged.status, merged.marketplaces_json, merged.updated_at,
        product.id
      );
      return this.findById(product.id)!;
    } else {
      db.prepare(`
        INSERT INTO products (
          id, seller_id, listing_id, name, category, description, translations_json, materials_json,
          dimensions, craft_origin, state, city, craft_tradition, technique, cultural_story, tags_json,
          price, recommended_price, price_range_min, price_range_max, confidence_score, pricing_breakdown_json,
          image_url, enhanced_image_url, similarity_score, similarity_status, status, marketplaces_json, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        product.id,
        product.seller_id,
        product.listing_id || "",
        product.name || "Untitled Craft",
        product.category || "Home Decor",
        product.description || "",
        product.translations_json || "{}",
        product.materials_json || "[]",
        product.dimensions || "",
        product.craft_origin || "",
        product.state || "",
        product.city || "",
        product.craft_tradition || "",
        product.technique || "",
        product.cultural_story || "",
        product.tags_json || "[]",
        product.price || 0,
        product.recommended_price || 0,
        product.price_range_min || 0,
        product.price_range_max || 0,
        product.confidence_score || 90,
        product.pricing_breakdown_json || "{}",
        product.image_url || "",
        product.enhanced_image_url || "",
        product.similarity_score || 8,
        product.similarity_status || "No significant similarity detected",
        product.status || "DRAFT",
        product.marketplaces_json || "[]",
        now,
        now
      );
      return this.findById(product.id)!;
    }
  },

  publish(sellerId: string, id: string, listingId: string, marketplaces: string[]): ProductRow | null {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products SET
        seller_id = ?,
        listing_id = ?,
        status = 'PUBLISHED',
        marketplaces_json = ?,
        updated_at = ?
      WHERE id = ?
    `).run(sellerId, listingId, JSON.stringify(marketplaces), now, id);
    return this.findById(id);
  },

  delete(sellerId: string, id: string): boolean {
    const db = getDb();
    const res = db.prepare("DELETE FROM products WHERE id = ? AND seller_id = ?").run(id, sellerId);
    return res.changes > 0;
  },

  getHeritageCatalogue(): ProductRow[] {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM products
      WHERE craft_tradition != '' AND (status = 'PUBLISHED' OR status = 'APPROVED')
      ORDER BY created_at DESC
      LIMIT 12
    `).all() as unknown as ProductRow[];
  },

  getAllForSimilarity(): { id: string; name: string; category: string; craft_tradition: string; tags: string }[] {
    const db = getDb();
    return db.prepare("SELECT id, name, category, craft_tradition, tags_json as tags FROM products").all() as unknown as { id: string; name: string; category: string; craft_tradition: string; tags: string }[];
  }
};

export const imageRepository = {
  saveImage(record: { id: string; product_id?: string; seller_id: string; original_url: string; enhanced_url?: string; metadata?: any }) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO product_images (id, product_id, seller_id, original_url, enhanced_url, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.product_id || null,
      record.seller_id,
      record.original_url,
      record.enhanced_url || "",
      JSON.stringify(record.metadata || {}),
      now
    );
  }
};

export const voiceRepository = {
  saveRecording(record: { id: string; product_id?: string; seller_id: string; audio_url: string; detected_language: string; transcription: string }) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO voice_recordings (id, product_id, seller_id, audio_url, detected_language, transcription, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.product_id || null,
      record.seller_id,
      record.audio_url,
      record.detected_language,
      record.transcription,
      now
    );
  }
};
