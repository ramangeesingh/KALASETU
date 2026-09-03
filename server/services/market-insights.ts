export const marketInsightsService = {
  getInsights() {
    return {
      trendingCrafts: [
        {
          name: "Blue Pottery",
          growth: "+42%",
          imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85",
          demandLevel: "Very High",
          topRegions: ["Jaipur", "Delhi NCR", "Bengaluru"],
        },
        {
          name: "Madhubani Art",
          growth: "+28%",
          imageUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85",
          demandLevel: "High",
          topRegions: ["Mithila", "Mumbai", "Kolkata"],
        },
        {
          name: "Banarasi Weaves",
          growth: "+19%",
          imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85",
          demandLevel: "Growing",
          topRegions: ["Varanasi", "Hyderabad", "Overseas"],
        },
        {
          name: "Dhokra Craft",
          growth: "+12%",
          imageUrl: "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?auto=format&fit=crop&w=900&q=85",
          demandLevel: "Steady",
          topRegions: ["Chhattisgarh", "Pune", "Chennai"],
        },
      ],
      recommendedTags: [
        "#HandmadeInIndia",
        "#JaipurBluePottery",
        "#SlowLiving",
        "#ArtisanMade",
        "#HeritageCraft",
        "#MadeWithLove",
        "#ConsciousDecor",
        "#AuthenticMithila",
        "#VocalForLocal",
      ],
      priceTrends: {
        percentage: "+8.2%",
        period: "last 90 days",
        craft: "Blue Pottery",
        note: "Buyers are valuing signed, certified GI-tagged craft pieces at a 15-20% premium.",
      },
      nudge: {
        title: "A little nudge for your studio",
        message: "Adding a story to your Blue Pottery Vase could increase buyer interest by up to 32%.",
        didYouKnow: "Products with 3+ regional tags get discovered 2× more often.",
      },
    };
  },
};
