const Categories = require('../Models/Categories');

const GlobalCategoryEngine = {
  /**
   * 1. GLOBAL KNOWLEDGE GRAPH
   * This maps the "World's" categories into conceptual clusters.
   */
  taxonomy: {
    "Electronics": {
      synonyms: ["tech", "digital", "gadgets", "appliances"],
      related: ["Accessories", "Computers", "Phones", "Audio", "Cameras"],
      sub: ["Laptops", "Tablets", "Smartphones", "Printers", "Monitors"]
    },
    "Fashion": {
      synonyms: ["apparel", "clothing", "attire", "garments"],
      related: ["Accessories", "Shoes", "Jewelry", "Bags"],
      sub: ["Shirts", "Dresses", "Activewear", "Suits"]
    },
    "Home & Garden": {
      synonyms: ["living", "household", "furniture", "decor"],
      related: ["Appliances", "Tools", "Kitchen"],
      sub: ["Bedding", "Lighting", "Outdoor", "Cookware"]
    },
    "Automotive": {
      synonyms: ["cars", "vehicles", "motors"],
      related: ["Tools", "Electronics", "Hardware"],
      sub: ["Tires", "Engine Parts", "Interior Accessories"]
    },
    "Accessories": {
      synonyms: ["addons", "peripherals", "supplies", "extras"],
      // Crucial: Accessories relates to almost every hardware sector
      related: ["Phones", "Laptops", "Cameras", "Computers", "Fashion", "Cars", "Gaming"]
    }
  },

  /**
   * 2. EXPANDED SYNONYM DICTIONARY (Universal Meaning)
   */
  dictionary: {
    "laptop": "computer", "notebook": "computer", "pc": "computer",
    "smartphone": "phone", "cell": "phone", "mobile": "phone",
    "sneaker": "shoe", "boot": "shoe", "footwear": "shoe",
    "fridge": "appliance", "tv": "television", "display": "monitor"
  },

  normalize: (s) => s.toLowerCase().replace(/[^a-z ]/g, '').trim(),

  /**
   * 3. SEMANTIC SEARCH ALGORITHM
   */
  findRelated: async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) return res.status(400).json({ message: "Search term required" });

      const term = GlobalCategoryEngine.normalize(name);
      const allCategories = await Categories.find().lean();
      
      // Step A: Determine the "Concept" of the search
      const conceptRoot = GlobalCategoryEngine.dictionary[term] || term;
      
      // Step B: Find related keywords from the Global Taxonomy
      let relatedKeywords = [conceptRoot];
      
      // If searching "Accessories", pull all related categories from the graph
      for (const [key, data] of Object.entries(GlobalCategoryEngine.taxonomy)) {
        if (GlobalCategoryEngine.normalize(key).includes(term) || data.synonyms.includes(term)) {
          relatedKeywords = [...relatedKeywords, ...data.related, ...data.sub];
        }
      }

      // Step C: Score the DB categories based on the Knowledge Graph
      const matches = allCategories.map(cat => {
        const catName = GlobalCategoryEngine.normalize(cat.name);
        let score = 0;
        let reason = "No match";

        // 1. Direct or Synonym Match (Highest Priority)
        if (catName.includes(conceptRoot)) {
          score = 1.0;
          reason = "Direct Concept Match";
        } 
        // 2. Relational Match (Medium Priority)
        else {
          const match = relatedKeywords.find(k => catName.includes(k.toLowerCase()));
          if (match) {
            score = 0.8;
            reason = `Relational match via '${match}'`;
          }
        }

        return { ...cat, score, reason };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

      res.json({
        query: name,
        inferredConcepts: relatedKeywords,
        results: matches
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = GlobalCategoryEngine;