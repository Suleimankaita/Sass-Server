const asynchandler = require('express-async-handler');
const DealProduct = require('../Models/Deals');
const Company = require('../Models/Company');
const Transaction = require('../Models/transactions');

// Create a deal — only Admin (platform) or Company admin/manager may create.
const createDeal = asynchandler(async (req, res) => {
  // actor info comes from Verify middleware: req.user and req.userType
  const actor = req.user;
  const actorType = req.userType || (actor && actor.Role ? 'CompanyUser' : 'User');

  const {
    name,
    originalPrice,
    dealPrice,
    discount,
    unitsLeft,
    img,
    // note: clients must NOT supply start/end times — server enforces 24h window
    categories = [],
    companyId,
    paymentAmount,
  } = req.body;

  if (!name || originalPrice == null || dealPrice == null || discount == null || unitsLeft == null || !img) {
    return res.status(400).json({ success: false, message: 'Missing required deal fields' });
  }

  // Determine company context
  let targetCompanyId = companyId;
  if (actorType === 'CompanyUser' && actor.companyId) targetCompanyId = actor.companyId;
  if (!targetCompanyId) return res.status(400).json({ success: false, message: 'companyId is required' });

  // Authorization: only Admin (platform) or company admin/manager can create deals
  if (actorType === 'CompanyUser') {
    const role = actor.Role || 'staff';
    if (!(role === 'admin' || role === 'manager')) {
      return res.status(403).json({ success: false, message: 'Only company admin or manager can create deals' });
    }
  } else if (actorType !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized to create deals' });
  }

  // Require a payment amount for deal creation (the fee)
  const fee = Number(paymentAmount || 0);
  if (isNaN(fee) || fee <= 0) return res.status(400).json({ success: false, message: 'paymentAmount must be provided and > 0' });

  // ensure company exists
  const company = await Company.findById(targetCompanyId).exec();
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  // Server-controlled start and end times: start = now, end = now + 24h
  const now = new Date();
  const startTime = now;
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Create deal product — ignore any client-supplied start/end times
  const deal = await DealProduct.create({
    name,
    company: company.CompanyName || String(company._id),
    originalPrice: Number(originalPrice),
    dealPrice: Number(dealPrice),
    discount: Number(discount),
    unitsLeft: Number(unitsLeft),
    img,
    totalUnits: Number(unitsLeft) || 0,
    startTime,
    dealEndTime: endTime,
    categories,
    isActive: true,
  });

  // Record transaction (deal creation payment)
  await Transaction.create({
    Transactiontype: 'income',
    amount: fee,
    username: actor.Username || actor.Username || 'unknown',
    userRole: actorType === 'CompanyUser' ? (actor.Role || 'staff') : 'Admin',
    description: `Deal creation fee for ${deal._id}`,
    company: company._id,
  });

  // Link deal id to company (store singularly or update existing field)
  company.DealsId = deal._id;
  await company.save();

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
