const asynchandler = require('express-async-handler');
const mongoose = require('mongoose');
const FoodPrice = require('../Models/FoodPrice');
// Compute effective price applying discount, seasonal adjustment and tax
const computeEffectivePrice = (doc) => {
  if (!doc) return 0;
  let price = Number(doc.basePrice || 0);

  // 1. Discount
  if (doc.discount?.type === 'percent') {
    price *= (1 - (Number(doc.discount.value || 0) / 100));
  } else if (doc.discount?.type === 'fixed') {
    price = Math.max(0, price - Number(doc.discount.value || 0));
  }

  // 2. Seasonal (if within dates)
  if (doc.seasonal?.percent) {
    const now = new Date();
    const start = doc.seasonal.startsAt ? new Date(doc.seasonal.startsAt) : null;
    const end = doc.seasonal.endsAt ? new Date(doc.seasonal.endsAt) : null;
    if ((!start || now >= start) && (!end || now <= end)) {
      price *= (1 + Number(doc.seasonal.percent) / 100);
    }
  }

  // 3. Tax
  if (doc.taxRate) {
    price *= (1 + Number(doc.taxRate) / 100);
  }

  return Number(price.toFixed(2));
};

// --- CREATE ---
const createPrice = asynchandler(async (req, res) => {
  const { name, category, basePrice, description, volatility, discount, seasonal, taxRate } = req.body;

  // Calculate the initial effective price
  const tempDoc = { basePrice, discount, seasonal, taxRate };
  const calculatedPrice = computeEffectivePrice(tempDoc);

  const priceData = {
    name,
    category,
    description,
    volatility: volatility || 'MEDIUM',
    basePrice: Number(basePrice),
    taxRate: Number(taxRate || 0),
    currentPrice: calculatedPrice, // This is "newPrice" for frontend
    previousPrice: calculatedPrice, // Initial state
    imageUrl: req.file ? req.file.filename : undefined,
    discount: {
      type: discount?.type || 'none',
      value: Number(discount?.value || 0)
    },
    seasonal: {
      percent: Number(seasonal?.percent || 0),
      startsAt: seasonal?.startsAt,
      endsAt: seasonal?.endsAt
    },
    // Initialize history with the first data point
    history: [{ price: calculatedPrice, date: new Date() }]
  };

  const created = await FoodPrice.create(priceData);
  res.status(201).json({ success: true, data: created });
});

// --- LIST (Mapped for Frontend) ---
const listPrices = asynchandler(async (req, res) => {
  const docs = await FoodPrice.find({ active: { $ne: false } }).exec();

  // Map DB fields to the exact keys your React Frontend expects
  const formattedData = docs.map(d => ({
    id: d._id,
    name: d.name,
    category: d.category,
    imageUrl: d.imageUrl,
    oldPrice: d.previousPrice, // Mapped
    newPrice: d.currentPrice,  // Mapped
    change: d.change,          // Calculated by Schema Pre-save
    volatility: d.volatility,
    description: d.description,
    history: d.history         // Array for Chart.js
  }));

  return res.status(200).json({ success: true, data: formattedData });
});

// --- UPDATE ---
const updatePrice = asynchandler(async (req, res) => {
  const id = req.params.id;
  const existingDoc = await FoodPrice.findById(id);

  if (!existingDoc) return res.status(404).json({ message: 'Not found' });

  // 1. Reconstruct flat FormData into structured objects
  const updateData = {
    name: req.body.name,
    category: req.body.category,
    basePrice: Number(req.body.basePrice),
    taxRate: Number(req.body.taxRate || 0),
    discount: {
      type: req.body['discount[type]'] || 'none',
      value: Number(req.body['discount[value]'] || 0)
    },
    seasonal: {
      percent: Number(req.body['seasonal[percent]'] || 0),
      startsAt: req.body['seasonal[startsAt]'] || null,
      endsAt: req.body['seasonal[endsAt]'] || null
    }
  };

  if (req.file) updateData.imageUrl = req.file.filename;

  // 2. Compute the new price
  // Ensure computeEffectivePrice uses Numbers, not objects
  updateData.previousPrice = existingDoc.currentPrice;
  updateData.currentPrice = computeEffectivePrice(updateData); 

  // 3. Update with $set and $push
  const updated = await FoodPrice.findByIdAndUpdate(
    id,
    { 
      $set: updateData,
      $push: { history: { price: updateData.currentPrice, date: new Date() } }
    },
    { new: true, runValidators: true }
  ).exec();

  res.status(200).json({ success: true, data: updated });
});

// Get single price
const getPrice = asynchandler(async (req, res) => {
  const id = req.params.id || req.query.id || req.body.id;
  if (!id) return res.status(400).json({ message: 'id is required' });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'invalid id' });

  const doc = await FoodPrice.findById(id).exec();
  if (!doc) return res.status(404).json({ message: 'not found' });
  const effective = computeEffectivePrice(doc);
  return res.status(200).json({ success: true, price: doc, effectivePrice: effective });
});

// List prices (optional companyId filter)


// Update price
// const updatePrice = asynchandler(async (req, res) => {
//   const id = req.params.id || req.body.id;
  
//   if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(400).json({ message: 'A valid ID is required' });
//   }

//   // 1. Prepare the update object
//   // Note: FormData sends nested objects as strings like "discount[type]"
//   // Depending on your middleware, you may need to parse them manually:
//   const updateData = {
//     ...req.body,
//     // Ensure numbers are actually numbers
//     basePrice: req.body.basePrice ? Number(req.body.basePrice) : undefined,
//     taxRate: req.body.taxRate ? Number(req.body.taxRate) : undefined,
//   };

//   // 2. Fix the Image bug
//   if (req.file) {
//     // Correct way to add the filename/path
//     updateData.image = req.file.filename; 
//   }

//   // 3. Reconstruct nested objects if they were sent as flat keys
//   if (req.body.discount) {
//     updateData.discount = {
//       type: req.body.discount.type || 'none',
//       value: Number(req.body.discount.value || 0)
//     };
//   }
  
//   if (req.body.seasonal) {
//     updateData.seasonal = {
//       percent: Number(req.body.seasonal.percent || 0),
//       startsAt: req.body.seasonal.startsAt,
//       endsAt: req.body.seasonal.endsAt
//     };
//   }

//   // Prevent ID overwriting
//   delete updateData._id;

//   // 4. Update the Database
//   const updated = await FoodPrice.findByIdAndUpdate(
//     id, 
//     { $set: updateData }, 
//     { new: true, runValidators: true }
//   ).exec();

//   if (!updated) {
//     return res.status(404).json({ message: 'Food item not found' });
//   }

//   // 5. Return the updated item + computed price
//   return res.status(200).json({ 
//     success: true, 
//     price: updated, 
//     effectivePrice: computeEffectivePrice(updated) 
//   });
// });

const deletePrice = asynchandler(async (req, res) => {
  const id = req.params.id;
  const doc = await FoodPrice.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!doc) return res.status(404).json({ message: 'Item not found' });
  return res.status(200).json({ success: true, message: 'Item deactivated' });
});

// Delete (soft) price
// const deletePrice = asynchandler(async (req, res) => {
//   const id = req.params.id || req.body.id;
//   if (!id) return res.status(400).json({ message: 'id is required' });
//   if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'invalid id' });

//   const doc = await FoodPrice.findById(id).exec();
//   if (!doc) return res.status(404).json({ message: 'not found' });
//   doc.active = false;
//   await doc.save();
//   return res.status(200).json({ success: true });
// });

// Bulk update: accepts array of {id, fields}
const bulkUpdate = asynchandler(async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
  if (!items.length) return res.status(400).json({ message: 'items array required' });

  const ops = items.map(it => ({
    updateOne: {
      filter: { _id: it.id },
      update: { $set: it.fields || {} },
    }
  }));

  await FoodPrice.bulkWrite(ops);
  return res.status(200).json({ success: true });
});

module.exports = {
  computeEffectivePrice,
  createPrice,
  getPrice,
  listPrices,
  updatePrice,
  deletePrice,
  bulkUpdate,
};
