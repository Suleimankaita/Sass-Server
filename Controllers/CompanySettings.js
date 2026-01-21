const Settings = require('../Models/CompanySetting');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ensureSettings = require("../utils/ensureSettings");

/**
 * GET SETTINGS
 * /api/settings?targetId=...
 */
const GetSettings = asyncHandler(async (req, res) => {
  const { targetId } = req.query;

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Valid targetId is required" });
  }

  let entity = await Company.findById(targetId);
  let entityType;
  let query;

  if (entity) {
    entityType = "company";
    query = { companyId: targetId, branchId: null };
  } else {
    entity = await Branch.findById(targetId);
    if (!entity) {
      return res.status(404).json({ message: "Target entity not found" });
    }
    entityType = "branch";
    query = { branchId: targetId };
  }

  const settings = await ensureSettings(query);

  if (entityType === "branch") {
    const companySettings = await ensureSettings({
      companyId: entity.companyId,
      branchId: null,
    });

    return res.status(200).json({
      ...companySettings.toObject(),
      ...settings.toObject(),
      companyName: entity.BranchName,
      entityLogo:
        settings.companyLogo || companySettings.companyLogo,
    });
  }

  return res.status(200).json({
    ...settings.toObject(),
    companyName: entity.CompanyName,
    entityLogo: settings.companyLogo,
  });
});



/**
 * UPDATE SETTINGS
 * PUT /api/settings
 */
const UpdateSettings = asyncHandler(async (req, res) => {
  const { targetId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Valid targetId is required" });
  }

  let settingsData;
  try {
    settingsData = JSON.parse(req.body.settings);
  } catch {
    return res.status(400).json({ message: "Invalid settings payload" });
  }

  let entity = await Company.findById(targetId);
  let entityType;

  if (entity) {
    entityType = "company";
  } else {
    entity = await Branch.findById(targetId);
    if (!entity) {
      return res.status(404).json({ message: "Target entity not found" });
    }
    entityType = "branch";
  }

  const {
    _id,
    __v,
    createdAt,
    updatedAt,
    companyId,
    branchId,
    ...updateData
  } = settingsData;
  
  console.log(updateData);

  if (req.files?.companyLogo?.[0]) {
    updateData.companyLogo = req.files.companyLogo[0].filename;
  }

  // Use businessName and slug from request if provided, otherwise use entity name
  if (!updateData.businessName) {
    updateData.businessName = entityType === "company" 
      ? entity.CompanyName 
      : entity.BranchName;
  }

  // Always set slug if provided in request
  if (req.files?.slug?.[0]?.filename) {
    updateData.slug = req.files.slug[0].filename;
  }

  const query =
    entityType === "company"
      ? { companyId: targetId, branchId: null }
      : { branchId: targetId };

  // Update the document
  await Settings.updateOne(
    query,
    { $set: updateData },
    {
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  // Fetch the fresh data from database AFTER update completes
  const freshSettings = await Settings.findOne(query);

  if (!freshSettings) {
    return res.status(500).json({ 
      success: false,
      message: "Failed to retrieve updated settings" 
    });
  }

  return res.status(200).json({
    success: true,
    message: "Settings updated successfully",
    settings: freshSettings.toObject(),
  });
});

module.exports = {
  GetSettings,
  UpdateSettings,
};
