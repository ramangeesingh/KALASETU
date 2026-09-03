export interface MarketplaceChannel {
  id: string;
  name: string;
  description: string;
  category: "b2b" | "ondc" | "government" | "ecommerce";
  enabled: boolean;
  status: "ready" | "published" | "pending";
}

export const marketplaceService = {
  getAvailableChannels(): MarketplaceChannel[] {
    return [
      {
        id: "b2b",
        name: "B2B buyers",
        description: "Curated wholesale network of boutique hotels and designers",
        category: "b2b",
        enabled: true,
        status: "ready",
      },
      {
        id: "ondc",
        name: "ONDC",
        description: "Open Network for Digital Commerce — nationwide buyer discovery",
        category: "ondc",
        enabled: true,
        status: "ready",
      },
      {
        id: "gem",
        name: "Government marketplaces",
        description: "GeM portal & state emporium procurement programs",
        category: "government",
        enabled: true,
        status: "ready",
      },
      {
        id: "other",
        name: "Other marketplaces",
        description: "Amazon Karigar, Etsy & international craft partners",
        category: "ecommerce",
        enabled: true,
        status: "ready",
      },
    ];
  },

  generateListingId(craftPrefix: string = "BP"): string {
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    return `KS-${craftPrefix.toUpperCase().slice(0, 2)}-${dateStr}`;
  },

  formatMarketplaceLinks(listingId: string, channels: string[]) {
    return channels.map((channel) => ({
      channel,
      listingId,
      status: "PUBLISHED",
      url: `https://marketplace.kalasetu.in/listing/${listingId}?channel=${encodeURIComponent(channel)}`,
      publishedAt: new Date().toISOString(),
    }));
  },
};
