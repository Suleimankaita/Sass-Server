const EcomerceProducts = require("../Models/EcomerceProducts");
const POSProduct = require("../Models/POSProduct");
const Order = require("../Models/User_order");
const asyncHandler = require("express-async-handler");
const Company = require("../Models/Company");
const Admin = require("../Models/AdminOwner");
const Branch = require("../Models/Branch");

const Getproducts = (io) => {
  io.on('connection', (socket) => {
    try {
      socket.on("GetId", async ({ id, page = 1, limit = 15 }) => {
        console.log("Fetching for Company ID Or Branch:", id);

        if (!id) return socket.emit("Error", { message: "Company ID is required" });

        const targetCompany = await Company.findById(id)
          .populate("POSProductsId")
          .populate("EcomerceProducts")||await Branch.findById(id).populate("POSProductsId")
          .populate("EcomerceProducts");

        if (!targetCompany) return socket.emit("Error", { message: "Company data or Branch not found" });

        const productsMap = new Map();
        const getCleanData = (item) => (item._doc ? item._doc : item);

        // 2. Process POS
        if (targetCompany.POSProductsId) {
          targetCompany.POSProductsId.forEach((prod) => {
            if (prod && prod.sku) {
              const data = getCleanData(prod);
              productsMap.set(prod.sku, {
                ...data,
                availableStock: data.quantity || 0,
                foundIn: ['POS'],
                lastUpdate: data.updatedAt,
              });
            }
          });
        }

        // 3. Process E-commerce & Sync
        if (targetCompany.EcomerceProducts) {
          targetCompany.EcomerceProducts.forEach((prod) => {
            if (prod && prod.sku) {
              const ecomData = getCleanData(prod);
              if (productsMap.has(prod.sku)) {
                const existing = productsMap.get(prod.sku);
                const posTime = new Date(existing.lastUpdate).getTime();
                const ecomTime = new Date(ecomData.updatedAt).getTime();

                // Keep newest data but mark as synced
                if (ecomTime > posTime) {
                  existing.availableStock = ecomData.quantity;
                  existing.lastUpdate = ecomData.updatedAt;
                }
                existing.foundIn.push('Ecomerce');
              } else {
                productsMap.set(prod.sku, {
                  ...ecomData,
                  availableStock: ecomData.quantity || 0,
                  foundIn: ['Ecomerce'],
                  lastUpdate: ecomData.updatedAt
                });
              }
            }
          });
        }

        // 4. Format Results
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
          syncStatus: p.foundIn.length > 1 ? "Fully Synced" : `Only in ${p.foundIn[0]}`,
          img: p.img,
          lastSync: p.lastUpdate
        }));

        const totalProducts = allResults.length;
        const startIndex = (page - 1) * limit;
        const paginatedItems = allResults.slice(startIndex, startIndex + Number(limit));

        socket.emit("Getproducts", {
          success: true,
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
          currentPage: Number(page),
          products: paginatedItems 
        });
      });

    } catch (error) {
      console.error("Socket Error:", error);
      socket.emit("Error", { message: "Internal Server Error" });
    }
  });
};

module.exports = { Getproducts };