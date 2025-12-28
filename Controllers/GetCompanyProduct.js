const EcomerceProducts = require("../Models/EcomerceProducts");

const POSProduct = require("../Models/POSProduct");

const Order = require("../Models/User_order");

const asyncHandler = require("express-async-handler");

const Company = require("../Models/Company");

const Admin = require("../Models/AdminOwner");

const GetCompanyProduct = asyncHandler(async (req, res) => {

  try {

    const { id } = req.query;

    if (!id) return res.status(400).json({ message: "ID is required" });



    // 1. Fetch Admin and Deep Populate

    const adminUser = await Admin.findById(id).populate({

       path: 'companyId',

      populate: [

        { path: 'POSProductsId', model: 'POSProducts' },

        { path: 'EcomerceProducts', model: 'EcomerceProducts' }

      ]

    });



    const targetCompany = adminUser?.companyId?.[0];

    if (!targetCompany) return res.status(404).json({ message: "Company data not found" });



    const productsMap = new Map();



    // 2. Helper to extract clean data

    const getCleanData = (item) => (item._doc ? item._doc : item);



    // 3. Process POS Products First

    if (targetCompany.POSProductsId) {

      targetCompany.POSProductsId.forEach((prod) => {

        if (prod && prod.sku) {

          const data = getCleanData(prod);

          productsMap.set(prod.sku, {

            ...data,

            availableStock: data.quantity || 0, // Master quantity

            foundIn: ['POS'],

            lastUpdate: data.updatedAt

          });

        }

      });

    }



    // 4. Process E-commerce and Sync

    if (targetCompany.EcomerceProducts) {

      targetCompany.EcomerceProducts.forEach((prod) => {

        if (prod && prod.sku) {

          const ecomData = getCleanData(prod);

         

          if (productsMap.has(prod.sku)) {

            const existing = productsMap.get(prod.sku);

           

            // --- SYNC LOGIC: Check which update is newer ---

            const posTime = new Date(existing.lastUpdate).getTime();

            const ecomTime = new Date(ecomData.updatedAt).getTime();



            if (ecomTime > posTime) {

              // E-commerce was updated more recently, use its quantity

              existing.availableStock = ecomData.quantity;

              existing.lastUpdate = ecomData.updatedAt;

            }

            // If POS was newer, we keep the POS quantity (already set)



            existing.foundIn.push('Ecomerce');

          } else {

            // Product only exists in E-commerce

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



    // 5. Convert Map to final clean array

    const result = Array.from(productsMap.values()).map(p => ({

      _id: p._id,

      sku: p.sku,

      name: p.name,

      category: p.category,

      price: p.price,

      // THE MASTER QUANTITY

      quantity: p.availableStock,

      syncStatus: p.foundIn.length > 1 ? "Fully Synced" : `Only in ${p.foundIn[0]}`,

      lastSync: p.lastUpdate

    }));



    res.status(200).json({

      success: true,

      totalProducts: result.length,

      products: result

    });



  } catch (error) {

    console.error("Sync Error:", error);

    res.status(500).json({ message: "Internal Server Error" });

  }

});



module.exports = GetCompanyProduct;