const asynchandler = require('express-async-handler');
const mongoose = require('mongoose');
const FoodPrice = require('../Models/FoodPrice');

// Compute effective price applying discount, seasonal adjustment and tax
function computeEffectivePrice(doc) {
  if (!doc) return null;
  let price = Number(doc.basePrice || 0);

  // apply discount
  if (doc.discount && doc.discount.type && doc.discount.type !== 'none') {
    if (doc.discount.type === 'percent') {
      price = price * (1 - (Number(doc.discount.value || 0) / 100));
    } else if (doc.discount.type === 'fixed') {
      price = Math.max(0, price - Number(doc.discount.value || 0));
    }
  }

  // seasonal adjustment (percent), only if within window
  if (doc.seasonal && doc.seasonal.percent) {
    const now = new Date();
    const s = doc.seasonal.startsAt ? new Date(doc.seasonal.startsAt) : null;
    const e = doc.seasonal.endsAt ? new Date(doc.seasonal.endsAt) : null;
    const active = (!s || now >= s) && (!e || now <= e);
    if (active) {
      price = price * (1 + Number(doc.seasonal.percent) / 100);
    }
  }

  // apply tax
  if (doc.taxRate) {
    price = price * (1 + Number(doc.taxRate || 0) / 100);
  }

  return Number(price.toFixed(2));
}

// Create price
const createPrice = asynchandler(async (req, res) => {
  const body = req.body;
  if (!body.name || body.basePrice == null) return res.status(400).json({ message: 'name and basePrice required' });

  if (body.companyId && !mongoose.Types.ObjectId.isValid(body.companyId)) {
    return res.status(400).json({ message: 'invalid companyId' });
  }

  const created = await FoodPrice.create(body);
  return res.status(201).json({ success: true, price: created });
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
const listPrices = asynchandler(async (req, res) => {
  const filter = {};
  if (req.query.companyId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.companyId)) return res.status(400).json({ message: 'invalid companyId' });
    filter.companyId = req.query.companyId;
  }
  if (req.query.active) filter.active = String(req.query.active) === 'true';

  const docs = await FoodPrice.find(filter).limit(1000).exec();
  const payload = docs.map(d => ({
    price: d,
    effectivePrice: computeEffectivePrice(d),
  }));
  return res.status(200).json({ success: true, data: payload });
});

// Update price
const updatePrice = asynchandler(async (req, res) => {
  const id = req.params.id || req.body.id;
  if (!id) return res.status(400).json({ message: 'id is required' });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'invalid id' });

  // prevent clients from setting computed fields
  const up = { ...req.body };
  delete up._id;

  const updated = await FoodPrice.findByIdAndUpdate(id, up, { new: true }).exec();
  if (!updated) return res.status(404).json({ message: 'not found' });
  return res.status(200).json({ success: true, price: updated, effectivePrice: computeEffectivePrice(updated) });
});

// Delete (soft) price
const deletePrice = asynchandler(async (req, res) => {
  const id = req.params.id || req.body.id;
  if (!id) return res.status(400).json({ message: 'id is required' });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'invalid id' });

  const doc = await FoodPrice.findById(id).exec();
  if (!doc) return res.status(404).json({ message: 'not found' });
  doc.active = false;
  await doc.save();
  return res.status(200).json({ success: true });
});

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
