const asynchandler = require('express-async-handler');
const DealProduct = require('../Models/Deals');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const Transaction = require('../Models/transactions');

// Create a deal — only Admin (platform) or Company admin/manager may create.
const createDeal = asynchandler(async (req, res) => {
  const actor = req.user;
  const actorType = req.userType || (actor && actor.Role ? 'CompanyUser' : 'User');
  console.log('Create Deal Actor:', actorType, actor ? actor.Username : 'unknown');

  if (!actor) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const {
    name,
    originalPrice,
    dealPrice,
    discount,
    unitsLeft,
    img,
    categories = [],
    targetId, // Unified ID for either Company or Branch
    paymentAmount,
  } = req.body;

  if (!name || !targetId || !paymentAmount || !img) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // 1. Identify if targetId is a Branch or a Company
  let entity = await Branch.findById(targetId).exec();
  let entityType = 'Branch';

  if (!entity) {
    entity = await Company.findById(targetId).exec();
    entityType = 'Company';
  }

  if (!entity) {
    return res.status(404).json({ success: false, message: 'No Company or Branch found with this ID' });
  }

  // 2. Authorization Logic
  if (actorType === 'CompanyUser') {
    const role = actor.Role || 'staff';
    if (!(role === 'admin' || role === 'manager')) {
      return res.status(403).json({ success: false, message: 'Unauthorized role' });
    }
  }

  // 3. Create the Deal
  const now = new Date();
  const deal = await DealProduct.create({
    name,
    ownerName: entity.BranchName || entity.CompanyName,
    ownerId: entity._id,
    ownerType: entityType, 
    originalPrice: Number(originalPrice),
    dealPrice: Number(dealPrice),
    discount: Number(discount),
    unitsLeft: Number(unitsLeft),
    img,
    startTime: now,
    dealEndTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    categories,
    isActive: true,
  });

  // 4. Record Transaction
  await Transaction.create({
    Transactiontype: 'income',
    amount: Number(paymentAmount),
    username: actor.Username || 'unknown',
    description: `Deal fee for ${entityType}: ${entity._id}`,
    [entityType === 'Branch' ? 'branch' : 'company']: entity._id,
  });

  // 5. Update the entity safely
  // FIX: We use findByIdAndUpdate to avoid triggering validation errors on existing bad data (like 'slug')
  if (entityType === 'Branch') {
    await Branch.findByIdAndUpdate(entity._id, { DealsId: deal._id });
  } else {
    await Company.findByIdAndUpdate(entity._id, { DealsId: deal._id });
  }

  return res.status(201).json({ success: true, deal });
});
const listDeals = asynchandler(async (req, res) => {
  const now = new Date();
  // mark expired deals as inactive (keep them in DB)
  await DealProduct.updateMany({ isActive: true, dealEndTime: { $lte: now } }, { isActive: false }).exec();

  // return only active (non-expired) deals
  const deals = await DealProduct.find({ isActive: true, dealEndTime: { $gt: now } }).limit(200).exec();
  return res.status(200).json({ success: true, deals });
});

// List deals for a specific company. Query: ?companyId=<id>&includeExpired=true
const getCompanyDeals = asynchandler(async (req, res) => {
  const companyId = req.params.companyId || req.query.companyId || req.body.companyId;
  if (!companyId) return res.status(400).json({ success: false, message: 'companyId is required' });

  const company = await Company.findById(companyId).exec();
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const now = new Date();
  // mark expired deals as inactive
  await DealProduct.updateMany({ companyId, isActive: true, dealEndTime: { $lte: now } }, { isActive: false }).exec();

  const includeExpired = String(req.query.includeExpired || '').toLowerCase() === 'true';
  const filter = { companyId };
  if (!includeExpired) filter.isActive = true;

  const deals = await DealProduct.find(filter).sort({ createdAt: -1 }).limit(200).exec();
  return res.status(200).json({ success: true, deals });
});

// Get a single deal by id for a specific company: params: companyId, dealId
const getCompanyDeal = asynchandler(async (req, res) => {
  const companyId = req.params.companyId || req.query.companyId || req.body.companyId;
  const dealId = req.params.dealId || req.query.dealId || req.body.dealId;
  if (!companyId || !dealId) return res.status(400).json({ success: false, message: 'companyId and dealId are required' });

  const deal = await DealProduct.findById(dealId).exec();
  if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
  if (!deal.companyId || String(deal.companyId) !== String(companyId)) {
    return res.status(403).json({ success: false, message: 'Deal does not belong to specified company' });
  }

  const now = new Date();
  const isExpired = deal.dealEndTime && deal.dealEndTime <= now;
  return res.status(200).json({ success: true, deal, isExpired });
});

module.exports = {
  createDeal,
  listDeals,
  getCompanyDeals,
  getCompanyDeal,
};
