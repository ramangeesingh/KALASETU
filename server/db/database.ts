import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { config } from "../config";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(config.dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'seller',
      craft_tradition TEXT DEFAULT 'Jaipur Blue Pottery',
      state TEXT DEFAULT 'Rajasthan',
      city TEXT DEFAULT 'Amer, Jaipur',
      experience_years INTEGER DEFAULT 18,
      bio TEXT DEFAULT 'I learned the language of blue pottery from my mother, who learned it from hers. Today, every flower I paint carries a little bit of our home in Jaipur.',
      avatar_url TEXT DEFAULT '',
      preferred_language TEXT DEFAULT 'en',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      listing_id TEXT DEFAULT '',
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Home Decor',
      description TEXT DEFAULT '',
      translations_json TEXT DEFAULT '{}',
      materials_json TEXT DEFAULT '[]',
      dimensions TEXT DEFAULT '',
      craft_origin TEXT DEFAULT '',
      state TEXT DEFAULT '',
      city TEXT DEFAULT '',
      craft_tradition TEXT DEFAULT '',
      technique TEXT DEFAULT '',
      cultural_story TEXT DEFAULT '',
      tags_json TEXT DEFAULT '[]',
      price REAL DEFAULT 0,
      recommended_price REAL DEFAULT 0,
      price_range_min REAL DEFAULT 0,
      price_range_max REAL DEFAULT 0,
      confidence_score INTEGER DEFAULT 92,
      pricing_breakdown_json TEXT DEFAULT '{}',
      image_url TEXT DEFAULT '',
      enhanced_image_url TEXT DEFAULT '',
      similarity_score INTEGER DEFAULT 8,
      similarity_status TEXT DEFAULT 'No significant similarity detected',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      marketplaces_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      seller_id TEXT NOT NULL,
      original_url TEXT NOT NULL,
      enhanced_url TEXT DEFAULT '',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS voice_recordings (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      seller_id TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      detected_language TEXT DEFAULT 'hi',
      transcription TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS marketplaces (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      marketplace_name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      listing_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Seed default artisan Meera Sharma if no users exist
  const countRow = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (countRow.count === 0) {
    seedDefaultData(db);
  }
}

function seedDefaultData(db: DatabaseSync) {
  const sellerId = "seller-meera-sharma-101";
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync("artisan123", 10);

  db.prepare(`
    INSERT INTO users (
      id, name, phone, email, password_hash, role, craft_tradition, state, city, experience_years, bio, preferred_language, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    sellerId,
    "Meera Sharma",
    "9876543210",
    "meera.artisan@kalasetu.in",
    passwordHash,
    "seller",
    "Jaipur Blue Pottery",
    "Rajasthan",
    "Amer, Jaipur",
    18,
    "I learned the language of blue pottery from my mother, who learned it from hers. Today, every flower I paint carries a little bit of our home in Jaipur.",
    "en",
    now,
    now
  );

  const sampleProducts = [
    {
      id: "prod-blue-pottery-vase",
      seller_id: sellerId,
      listing_id: "KS-BP-240924",
      name: "Blue Pottery Vase",
      category: "Home Decor",
      description: "A hand-painted Blue Pottery vase inspired by the quiet gardens of Jaipur. Each floral detail is painted by hand using a traditional turquoise palette.",
      translations_json: JSON.stringify({
        en: "A hand-painted Blue Pottery vase inspired by the quiet gardens of Jaipur. Each floral detail is painted by hand using a traditional turquoise palette.",
        hi: "जयपुर के शांत बगीचों से प्रेरित हाथ से चित्रित नीली मिट्टी का फूलदान। प्रत्येक पुष्प विवरण पारंपरिक फ़िरोज़ा पैलेट का उपयोग करके हाथ से चित्रित किया गया है।",
        pa: "ਜੈਪੁਰ ਦੇ ਸ਼ਾਂਤ ਬਾਗਾਂ ਤੋਂ ਪ੍ਰੇਰਿਤ ਹੱਥ ਨਾਲ ਪੇਂਟ ਕੀਤਾ ਨੀਲੀ ਮਿੱਟੀ ਦਾ ਗੁਲਦਸਤਾ।",
        ta: "ஜெய்ப்பூரின் அமைதியான தோட்டங்களால் ஈர்க்கப்பட்ட கையால் வர்ணம் பூசப்பட்ட நீல மண்பாண்ட குவளை.",
        te: "జైపూర్ ప్రశాంతమైన తోటల నుండి ప్రేరణ పొందిన చేతితో గీసిన నీలి కుండల వాసే."
      }),
      materials_json: JSON.stringify(["Quartz", "Glass", "Natural pigments", "Multani mitti"]),
      dimensions: "12 x 6 inches",
      craft_origin: "Jaipur, Rajasthan",
      state: "Rajasthan",
      city: "Amer, Jaipur",
      craft_tradition: "Jaipur Blue Pottery",
      technique: "Hand painting & glazing",
      cultural_story: "In the lanes of Jaipur, blue pottery has been shaped by patient hands for generations. Meera's floral language is a love letter to the courtyards where she first learned to paint.",
      tags_json: JSON.stringify(["blue pottery", "jaipur", "handmade", "heritage craft", "floral"]),
      price: 2450,
      recommended_price: 2450,
      price_range_min: 2100,
      price_range_max: 2800,
      confidence_score: 92,
      pricing_breakdown_json: JSON.stringify([
        { label: "Material cost", amount: "₹680", percent: "28%" },
        { label: "Labour cost", amount: "₹1,120", percent: "46%" },
        { label: "Market trend", amount: "₹650", percent: "26%" }
      ]),
      image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85",
      enhanced_image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85",
      similarity_score: 8,
      similarity_status: "No significant similarity detected",
      status: "PUBLISHED",
      marketplaces_json: JSON.stringify(["ONDC", "B2B wholesale", "GeM & state emporiums", "Amazon Karigar"]),
      created_at: now,
      updated_at: now,
    },
    {
      id: "prod-phulkari-dupatta",
      seller_id: sellerId,
      listing_id: "KS-PH-240925",
      name: "Phulkari Dupatta",
      category: "Apparel & Textiles",
      description: "Authentic hand-embroidered Phulkari with geometric silk thread patterns on coarse cotton khaddar fabric.",
      translations_json: JSON.stringify({
        en: "Authentic hand-embroidered Phulkari with geometric silk thread patterns on coarse cotton khaddar fabric.",
        hi: "खुरदुरे सूती खद्दर कपड़े पर ज्यामितीय रेशमी धागे के पैटर्न के साथ प्रामाणिक हाथ से कढ़ाई की गई फुलकारी।",
        pa: "ਖੱਦਰ ਦੇ ਕੱਪੜੇ ਉੱਤੇ ਰੇਸ਼ਮੀ ਧਾਗੇ ਨਾਲ ਹੱਥੀਂ ਕੱਢੀ ਗਈ ਰਵਾਇਤੀ ਫੁਲਕਾਰੀ।",
        ta: "கையால் எம்பிராய்டரி செய்யப்பட்ட பாரம்பரிய புல்காரி துப்பட்டா.",
        te: "చేతితో ఎంబ్రాయిడరీ చేయబడిన సాంప్రదాయ ఫుల్కారీ దుపట్టా."
      }),
      materials_json: JSON.stringify(["Khaddar cotton", "Pat silk thread", "Natural dyes"]),
      dimensions: "2.5 x 1 meter",
      craft_origin: "Punjab",
      state: "Punjab",
      city: "Amritsar",
      craft_tradition: "Phulkari Embroidery",
      technique: "Darning stitch embroidery from reverse side",
      cultural_story: "Phulkari, meaning flower work, is traditionally gifted during auspicious celebrations in Punjab, symbolizing joy and maternal blessing.",
      tags_json: JSON.stringify(["phulkari", "punjab", "silk thread", "embroidery", "textile"]),
      price: 3800,
      recommended_price: 3800,
      price_range_min: 3400,
      price_range_max: 4200,
      confidence_score: 89,
      pricing_breakdown_json: JSON.stringify([
        { label: "Material cost", amount: "₹1,100", percent: "29%" },
        { label: "Labour cost", amount: "₹1,850", percent: "49%" },
        { label: "Market trend", amount: "₹850", percent: "22%" }
      ]),
      image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85",
      enhanced_image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85",
      similarity_score: 12,
      similarity_status: "No significant similarity detected",
      status: "DRAFT",
      marketplaces_json: JSON.stringify(["ONDC"]),
      created_at: now,
      updated_at: now,
    },
    {
      id: "prod-dhokra-horse",
      seller_id: sellerId,
      listing_id: "KS-DH-240926",
      name: "Dhokra Horse Figurine",
      category: "Metal Crafts",
      description: "Non-ferrous metal casting using the ancient lost-wax technique, crafted by Bastar tribal metal artisans.",
      translations_json: JSON.stringify({
        en: "Non-ferrous metal casting using the ancient lost-wax technique, crafted by Bastar tribal metal artisans.",
        hi: "प्राचीन लुप्त-मोम तकनीक का उपयोग करके गैर-लौह धातु की ढलाई, बस्तर के आदिवासी धातु कारीगरों द्वारा तैयार की गई।",
        pa: "ਪ੍ਰਾਚੀਨ ਗੁੰਮ-ਮੋਮ ਤਕਨੀਕ ਨਾਲ ਤਿਆਰ ਢੋਕਰਾ ਘੋੜਾ ਸ਼ਿਲਪ।",
        ta: "பாரம்பரிய இழந்த மெழுகு நுட்பத்தில் செய்யப்பட்ட தோக்ரா குதிரை சிலை.",
        te: "పురాతన ధోక్రా మెటల్ క్రాఫ్ట్ గుర్రం బొమ్మ."
      }),
      materials_json: JSON.stringify(["Brass alloy", "Beeswax", "Clay core"]),
      dimensions: "7 x 5 x 2.5 inches",
      craft_origin: "Bastar, Chhattisgarh",
      state: "Chhattisgarh",
      city: "Bastar",
      craft_tradition: "Dhokra Bell Metal",
      technique: "Cire perdue (Lost-wax casting)",
      cultural_story: "Practiced for over 4,000 years since Mohenjo-daro times, Dhokra pieces bear delicate wax threads coiled by hand into mystical folk motifs.",
      tags_json: JSON.stringify(["dhokra", "tribal art", "lost-wax", "brass", "bastar"]),
      price: 1950,
      recommended_price: 1950,
      price_range_min: 1750,
      price_range_max: 2300,
      confidence_score: 95,
      pricing_breakdown_json: JSON.stringify([
        { label: "Material cost", amount: "₹520", percent: "27%" },
        { label: "Labour cost", amount: "₹980", percent: "50%" },
        { label: "Market trend", amount: "₹450", percent: "23%" }
      ]),
      image_url: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85",
      enhanced_image_url: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85",
      similarity_score: 5,
      similarity_status: "No significant similarity detected",
      status: "PROCESSING",
      marketplaces_json: JSON.stringify(["GeM & state emporiums"]),
      created_at: now,
      updated_at: now,
    },
    {
      id: "prod-madhubani-sun",
      seller_id: sellerId,
      listing_id: "KS-MB-240927",
      name: "Madhubani Sun Story",
      category: "Paintings & Folk Art",
      description: "Traditional Mithila painting depicting the benevolent Sun God using bamboo twigs and natural mineral pigments on handmade paper.",
      translations_json: JSON.stringify({
        en: "Traditional Mithila painting depicting the benevolent Sun God using bamboo twigs and natural mineral pigments on handmade paper.",
        hi: "हस्तनिर्मित कागज पर बांस की टहनियों और प्राकृतिक रंगों का उपयोग करके सूर्य देव को दर्शाती पारंपरिक मिथिला पेंटिंग।",
        pa: "ਹੱਥੀਂ ਬਣੇ ਕਾਗਜ਼ ਉੱਤੇ ਰਵਾਇਤੀ ਮਧੁਬਨੀ ਕਲਾ।",
        ta: "பாரம்பரிய மதுபானி சூரிய ஓவியம்.",
        te: "సాంప్రదాయ మధుబని సూర్య చిత్రలేఖనం."
      }),
      materials_json: JSON.stringify(["Handmade paper", "Natural plant pigments", "Bamboo nib"]),
      dimensions: "16 x 20 inches",
      craft_origin: "Madhubani, Bihar",
      state: "Bihar",
      city: "Madhubani",
      craft_tradition: "Madhubani Folk Painting",
      technique: "Fine line drawing with double border filling",
      cultural_story: "Passed down from mothers to daughters in Mithila, each line in Madhubani art is drawn without erasing, celebrating cosmic energy and harmony with nature.",
      tags_json: JSON.stringify(["madhubani", "mithila", "folk art", "natural dyes", "handmade"]),
      price: 4200,
      recommended_price: 4200,
      price_range_min: 3900,
      price_range_max: 4800,
      confidence_score: 94,
      pricing_breakdown_json: JSON.stringify([
        { label: "Material cost", amount: "₹800", percent: "19%" },
        { label: "Labour cost", amount: "₹2,400", percent: "57%" },
        { label: "Market trend", amount: "₹1,000", percent: "24%" }
      ]),
      image_url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85",
      enhanced_image_url: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85",
      similarity_score: 6,
      similarity_status: "No significant similarity detected",
      status: "PUBLISHED",
      marketplaces_json: JSON.stringify(["ONDC", "Etsy & more"]),
      created_at: now,
      updated_at: now,
    }
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      id, seller_id, listing_id, name, category, description, translations_json, materials_json, dimensions,
      craft_origin, state, city, craft_tradition, technique, cultural_story, tags_json,
      price, recommended_price, price_range_min, price_range_max, confidence_score, pricing_breakdown_json,
      image_url, enhanced_image_url, similarity_score, similarity_status, status, marketplaces_json, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  for (const p of sampleProducts) {
    insertProd.run(
      p.id, p.seller_id, p.listing_id, p.name, p.category, p.description, p.translations_json, p.materials_json, p.dimensions,
      p.craft_origin, p.state, p.city, p.craft_tradition, p.technique, p.cultural_story, p.tags_json,
      p.price, p.recommended_price, p.price_range_min, p.price_range_max, p.confidence_score, p.pricing_breakdown_json,
      p.image_url, p.enhanced_image_url, p.similarity_score, p.similarity_status, p.status, p.marketplaces_json, p.created_at, p.updated_at
    );
  }
}
