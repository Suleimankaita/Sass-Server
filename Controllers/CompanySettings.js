const Settings = require('../Models/CompanySetting');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ensureSettings = require("../utils/ensureSettings");

// @desc    Get Settings for a specific Entity (Company or Branch)
// @route   GET /api/settings?targetId=...
const GetSettings = asyncHandler(async (req, res) => {
  const { targetId } = req.query;

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Valid Target ID is required" });
  }

  // 1. Check if Target is a Company
  const company = await Company.findById(targetId);
  if (company) {
    const settings = await ensureSettings({ companyId: company._id });
    return res.status(200).json(settings);
  }

  // 2. Check if Target is a Branch
  const branch = await Branch.findById(targetId);
  if (branch) {
    const branchSettings = await ensureSettings({ branchId: branch._id });
    const companySettings = await ensureSettings({ companyId: branch.companyId });

    // Merge (Branch settings override Company settings)
    const resolvedSettings = {
      ...companySettings.toObject(),
      ...branchSettings.toObject(),
    };

    return res.status(200).json(resolvedSettings);
  }

  return res.status(404).json({ message: "Target Entity not found" });
});

// @desc    Update or Create Settings
// @route   PUT /api/settings
const UpdateSettings = asyncHandler(async (req, res) => {
  // 1. Parse the stringified settings object from FormData
  let settings;
  console.log("Parsed Settings:", req.body);
  try {
    settings = req.body.settings ? JSON.parse(req.body.settings) : null;
  } catch (error) {
    return res.status(400).json({ message: "Invalid settings format" });
  }
  const { targetId } = req.body;

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Valid Target ID is required" });
  }

  if (!settings) {
    return res.status(400).json({ message: "No settings data provided" });
  }

  // 2. Strip protected fields
  const { _id, createdAt, updatedAt, __v, companyId, branchId, ...updateData } = settings;

  // 3. Handle the Logo File (If Multer uploaded a file)
  if (req.file) {
    // Store the path to the image. 
    // Example: 'uploads/logos/filename.jpg'
    updateData.companyLogo = req.file.filename;
  }

  // 4. Determine Query (Company vs Branch)
  const isCompany = await Company.exists({ _id: targetId });
  let query = isCompany ? { companyId: targetId } : { branchId: targetId };

  // 5. Update Database
  const updatedDoc = await Settings.findOneAndUpdate(
    query,
    { $set: updateData },
    {
      new: true,
      upsert: true, // Creates the doc if it doesn't exist
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: "Settings updated successfully",
    settings: updatedDoc,
  });
});
module.exports = {
  GetSettings,
  UpdateSettings
};