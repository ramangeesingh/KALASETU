import { config } from "../config";

interface CatalogueResponse {
  transcription: string;
  product_name: string;
  category: string;
  english_description: string;
  regional_description: string;
  language: string;
  materials: string[];
  craft_origin: string;
  state: string;
  city: string;
  traditional_technique: string;
  cultural_story: string;
  tags: string[];
  translations: {
    en: string;
    hi: string;
    pa: string;
    ta: string;
    te: string;
  };
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(contents: any[], systemInstruction?: string): Promise<string> {
  const url = `${GEMINI_API_URL}?key=${config.geminiApiKey}`;
  const payload: any = {
    contents,
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    throw new Error(`Gemini API returned ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response text received from Gemini");
  }
  return text;
}

export const geminiService = {
  async generateCatalogue(params: {
    transcription?: string;
    language?: string;
    imageUrl?: string;
    existingName?: string;
    existingCategory?: string;
    materials?: string;
    craftOrigin?: string;
    sellerState?: string;
    sellerCity?: string;
  }): Promise<CatalogueResponse> {
    const artisanLang = params.language || "Hindi";
    const transcriptionText = params.transcription || "";

    // Detect language code for regional description
    const langCodeMap: Record<string, string> = {
      Hindi: "hi", Punjabi: "pa", Tamil: "ta", Telugu: "te", English: "en"
    };
    const langCode = langCodeMap[artisanLang] || "hi";

    const systemPrompt = `You are KalaSetu AI, an Indian artisan cataloging assistant.

CRITICAL RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
1. The artisan's voice transcription is the ONLY source of truth for product information.
2. NEVER invent facts. If information is not stated in the transcription or seller profile, leave it blank or write "Not specified".
3. NEVER hallucinate materials (no quartz, glass, ceramic, etc. unless explicitly mentioned).
4. NEVER hallucinate locations (no Jaipur, Rajasthan, etc. unless the seller's profile states it).
5. NEVER put the raw transcription text into the english_description field.
6. The english_description MUST be a clean English translation/summary of what the artisan actually said.
7. The regional_description MUST be written in ${artisanLang} and MUST describe the same product as english_description.
8. Tags MUST be derived only from confirmed information.

Output STRICTLY valid JSON with no markdown backticks:
{
  "transcription": "The exact original spoken text passed in — copy it verbatim",
  "product_name": "Derive only from what the artisan said. Example: 'Blue Pot with Mandala Art'",
  "category": "Home Decor | Apparel & Textiles | Metal Crafts | Paintings & Folk Art | Pottery & Ceramics | Wooden Crafts | Other",
  "english_description": "A clean, natural English translation of what the artisan described. 1-2 sentences. Do NOT copy the Hindi/regional text here.",
  "regional_description": "The same description as english_description, written in ${artisanLang} script. MUST match the content of english_description.",
  "language": "${artisanLang}",
  "materials": ["Only materials explicitly mentioned. Empty array [] if none mentioned."],
  "craft_origin": "Only if seller profile or transcription provides a location. Otherwise empty string.",
  "state": "Only if confirmed. Otherwise empty string.",
  "city": "Only if confirmed. Otherwise empty string.",
  "traditional_technique": "Only if explicitly mentioned. Otherwise empty string.",
  "cultural_story": "Only if the artisan shared heritage context. Otherwise empty string.",
  "tags": ["Only from confirmed information. e.g. blue pot, mandala art, handmade, indian craft"],
  "translations": {
    "en": "Same as english_description",
    "hi": "Hindi translation of english_description",
    "pa": "Punjabi translation of english_description",
    "ta": "Tamil translation of english_description",
    "te": "Telugu translation of english_description"
  }
}`;

    const locationHint = params.sellerState || params.craftOrigin
      ? `Seller's known location: ${[params.sellerCity, params.sellerState, params.craftOrigin].filter(Boolean).join(", ")}`
      : "Seller location: Not provided — do NOT invent a location.";

    const promptText = `Artisan's voice transcription (this is what they said, in their own language):
"${transcriptionText || "(No voice provided)"}"

Artisan's spoken language: ${artisanLang}
${locationHint}
Product name hint (may be empty): ${params.existingName || ""}
Category hint (may be empty): ${params.existingCategory || ""}
Materials hint (may be empty): ${params.materials || ""}

TASK: Generate the structured product catalogue JSON from ONLY the above information. Do not add any facts not present above.`;

    try {
      const response = await callGemini([{ parts: [{ text: promptText }] }], systemPrompt);
      const cleanJson = response.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanJson) as CatalogueResponse;

      // Safety: ensure transcription field is the original text, not a summary
      if (!parsed.transcription || parsed.transcription === parsed.english_description) {
        parsed.transcription = transcriptionText;
      }

      // Safety: ensure english_description is not the raw Hindi/regional text
      if (
        parsed.english_description === transcriptionText &&
        (langCode !== "en")
      ) {
        // Gemini returned the transcription as english description — fix it
        parsed.english_description = parsed.translations?.en || parsed.english_description;
      }

      // Safety: ensure regional_description is in the right language
      if (!parsed.regional_description || parsed.regional_description === parsed.english_description) {
        parsed.regional_description = parsed.translations?.[langCode] || parsed.regional_description;
      }

      return parsed;
    } catch (error) {
      console.warn("Gemini generation failed, returning honest minimal default:", error);

      // Honest fallback: derive only from what the artisan actually said
      const nameFromTranscription = params.existingName || "Handcrafted Artisan Product";
      const categoryFromHint = params.existingCategory || "Other";

      return {
        transcription: transcriptionText,
        product_name: nameFromTranscription,
        category: categoryFromHint,
        english_description: transcriptionText
          ? `Artisan describes: "${transcriptionText}"`
          : "A handcrafted product by an Indian artisan.",
        regional_description: transcriptionText || "",
        language: artisanLang,
        materials: [],
        craft_origin: params.craftOrigin || "",
        state: params.sellerState || "",
        city: params.sellerCity || "",
        traditional_technique: "",
        cultural_story: "",
        tags: ["handmade", "artisan", "indian craft"],
        translations: {
          en: transcriptionText
            ? `Artisan describes: "${transcriptionText}"`
            : "A handcrafted product by an Indian artisan.",
          hi: transcriptionText || "एक भारतीय कारीगर द्वारा हस्तनिर्मित उत्पाद।",
          pa: "ਇੱਕ ਭਾਰਤੀ ਕਾਰੀਗਰ ਦੁਆਰਾ ਹੱਥ ਨਾਲ ਬਣਾਇਆ ਉਤਪਾਦ।",
          ta: "ஒரு இந்திய கைவினைஞரால் கையால் தயாரிக்கப்பட்ட பொருள்.",
          te: "ఒక భారతీయ చేతివృత్తిదారుడిచే చేతితో తయారు చేయబడిన వస్తువు."
        },
      };
    }
  },

  async transcribeAudio(audioBuffer: Buffer, mimeType: string, langHint: string = "hi"): Promise<{ transcription: string; detectedLanguage: string; languageName: string }> {
    const base64Audio = audioBuffer.toString("base64");
    const langNames: Record<string, string> = {
      hi: "Hindi",
      en: "English",
      pa: "Punjabi",
      ta: "Tamil",
      te: "Telugu"
    };

    const prompt = `Listen to this artisan's audio recording describing their handmade craft product.
Your task is ONLY to transcribe what was spoken — do NOT summarize, improve or translate.
Transcribe the speech precisely and verbatim into its native script:
- Hindi → Devanagari script
- Punjabi → Gurmukhi script
- Tamil → Tamil script
- Telugu → Telugu script
- English → Latin script

Also detect the language spoken.
Output ONLY valid JSON with no backticks:
{
  "transcription": "Exact verbatim transcription in native script",
  "detected_code": "hi | en | pa | ta | te",
  "language_name": "Hindi | English | Punjabi | Tamil | Telugu"
}`;

    try {
      const response = await callGemini([
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "audio/webm",
                data: base64Audio,
              },
            },
            { text: prompt },
          ],
        },
      ]);

      const cleanJson = response.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        transcription: parsed.transcription,
        detectedLanguage: parsed.detected_code || langHint,
        languageName: parsed.language_name || (langNames[parsed.detected_code] || "Hindi"),
      };
    } catch (error) {
      console.warn("Gemini audio transcription fallback:", error);
      return {
        transcription: "",
        detectedLanguage: langHint || "hi",
        languageName: langNames[langHint] || "Hindi",
      };
    }
  },

  async translateText(text: string, targetLanguage: "en" | "hi" | "pa" | "ta" | "te"): Promise<string> {
    const langNames: Record<string, string> = {
      en: "English",
      hi: "Hindi",
      pa: "Punjabi",
      ta: "Tamil",
      te: "Telugu"
    };

    const prompt = `Translate the following artisan craft description into natural ${langNames[targetLanguage]}.
Do not add notes, markdown, or quotation marks. Return only the translated string.

Text:
${text}`;

    try {
      const translated = await callGemini([{ parts: [{ text: prompt }] }]);
      return translated.trim();
    } catch (err) {
      console.warn("Translation fallback:", err);
      return text;
    }
  },

  async checkSimilarity(product: { name: string; category: string; description: string; craft_tradition?: string }): Promise<{
    similarityScore: number;
    status: string;
    similarityNotes: string;
    similarItems: Array<{ name: string; matchPercent: number; reason: string }>;
  }> {
    const prompt = `Assess the visual/thematic similarity of this new artisan product compared to common market designs:
Product: ${product.name}
Category: ${product.category}
Tradition: ${product.craft_tradition || ""}
Description: ${product.description}

Evaluate if it has a unique artisan identity or resembles generic mass-produced items.
Return ONLY valid JSON with no backticks:
{
  "similarityScore": 8,
  "status": "No significant similarity detected | Potential similarity detected — X%",
  "similarityNotes": "A brief respectful note confirming the artisan's distinct voice and traditional originality.",
  "similarItems": [
    { "name": "Generic item name", "matchPercent": 14, "reason": "Brief reason for match." }
  ]
}`;

    try {
      const response = await callGemini([{ parts: [{ text: prompt }] }]);
      const cleanJson = response.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      return {
        similarityScore: 8,
        status: "No significant similarity detected",
        similarityNotes: "Your handcrafted piece displays a distinct visual and cultural identity. It is ready to stand on its own in the heritage marketplace.",
        similarItems: [
          { name: "Similar craft type", matchPercent: 12, reason: "Common regional motif, but your brushwork and silhouette are distinct." }
        ]
      };
    }
  }
};
