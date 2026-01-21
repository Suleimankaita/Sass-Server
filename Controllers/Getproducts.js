const Company = require("../Models/Company");
const Branch = require("../Models/Branch");

const Getproducts = (io) => {
  io.on('connection', (socket) => {
    socket.on("GetId", async ({ id, page = 1, limit = 15 }) => {
      try {
        console.log("Fetching paginated products for ID:", id);
        if (!id) return socket.emit("Error", { message: "ID is required" });

        // 1. Find the target (Check Company first, then Branch)
        let target = await Company.findById(id).populate("POSProductsId EcomerceProducts");
        if (!target) {
          target = await Branch.findById(id).populate("POSProductsId EcomerceProducts");
        }

        if (!target) {
          return socket.emit("Error", { message: "Data not found" });
        }

        const productsMap = new Map();

        // Helper function to process and merge products
        const processProducts = (productList, sourceName) => {
          if (!productList || !Array.isArray(productList)) return;

          productList.forEach((prod) => {
            if (!prod || !prod.sku) return;

            const data = prod._doc || prod;
            const rawSku = String(prod.sku).trim();
            const normalizedSku = rawSku.toLowerCase();

            if (productsMap.has(normalizedSku)) {
              const existing = productsMap.get(normalizedSku);
              const existingTime = new Date(existing.updatedAt || 0).getTime();
              const newTime = new Date(data.updatedAt || 0).getTime();

              // Update "foundIn" tracking regardless of which record is newer
              if (!existing.foundIn.includes(sourceName)) {
                existing.foundIn.push(sourceName);
              }

              // FIX: If the current product is NEWER than the one in the map, replace the data
              if (newTime > existingTime) {
                const currentFoundIn = existing.foundIn; // Keep the combined source list
                productsMap.set(normalizedSku, { 
                  ...data, 
                  sku: rawSku,
                  foundIn: currentFoundIn,
                  availableStock: data.quantity || 0 
                });
              }
            } else {
              // NEW PRODUCT ENTRY (First time seeing this SKU)
              productsMap.set(normalizedSku, {
                ...data,
                sku: rawSku, 
                availableStock: data.quantity || 0,
                foundIn: [sourceName],
              });
            }
          });
        };

        // 2. Process both lists
        processProducts(target.POSProductsId, 'POS');
        processProducts(target.EcomerceProducts, 'Ecomerce');

        // 3. Format Results
        const allResults = Array.from(productsMap.values()).map(p => ({
          _id: p._id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          categoryName: p.categoryName,
          price: p.price,
          barcode: p.barcode,
          soldAtPrice: p.soldAtPrice,
          quantity: p.availableStock,
          // If in both, it's synced. Otherwise, shows which one it's in.
          syncStatus: p.foundIn.length > 1 ? "Fully Synced" : `Only in ${p.foundIn[0]}`,
          img: p.img,
          updatedAt: p.updatedAt
        }));

        // 4. Pagination
        const totalProducts = allResults.length;
        const currentPage = Math.max(1, Number(page));
        const itemsPerPage = Math.max(1, Number(limit));
        const startIndex = (currentPage - 1) * itemsPerPage;
        
        const paginatedItems = allResults.slice(startIndex, startIndex + itemsPerPage);

        // 5. Emit
        socket.emit("Getproducts", {
          success: true,
          totalProducts,
          totalPages: Math.ceil(totalProducts / itemsPerPage),
          currentPage: currentPage,
          products: paginatedItems 
        });

      } catch (error) {
        console.error("Socket Error:", error);
        socket.emit("Error", { message: "Internal Server Error" });
      }
    });
  });
};

module.exports = { Getproducts };