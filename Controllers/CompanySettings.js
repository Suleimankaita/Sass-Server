const Settings = require('../Models/CompanySetting');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Get Settings for a specific Entity (Company or Branch)
// @route   GET /api/settings?targetId=...
// @access  Private
const GetSettings = asyncHandler(async (req, res) => {
    const { targetId } = req.query; // This can be a CompanyID OR a BranchID

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ message: "Valid Target ID is required" });
    }

    // 1. Try to find settings by Company ID
    let settings = await Settings.findOne({ companyId: targetId });

    // 2. If not found, try to find settings by Branch ID
    if (!settings) {
        settings = await Settings.findOne({ branchId: targetId });
    }

    // 3. If still not found, return defaults (safe fallback)
    if (!settings) {
        // Check if the entity actually exists to be sure
        const isCompany = await Company.findById(targetId);
        const isBranch = !isCompany && await Branch.findById(targetId);

        if (!isCompany && !isBranch) {
            return res.status(404).json({ message: "Target Entity not found" });
        }

        // Return default structure (frontend will handle the "empty" state)
        return res.status(200).json({
            businessName: isCompany ? isCompany.CompanyName : isBranch.CompanyName,
            vatEnabled: true,
            primaryCurrency: 'USD ($)',
            copiesPerReceipt: 1
        });
    }

    res.status(200).json(settings);
});

// @desc    Update or Create Settings
// @route   PUT /api/settings
// @access  Private
const UpdateSettings = asyncHandler(async (req, res) => {
    const { targetId, ...settingsData } = req.body;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ message: "Valid Target ID is required" });
    }

    // 1. Determine if Target is Company or Branch
    let query = {};
    let updateField = {};

    const isCompany = await Company.findById(targetId);
    
    if (isCompany) {
        query = { companyId: targetId };
        updateField = { companyId: targetId, branchId: null }; // Ensure mutual exclusivity
    } else {
        const isBranch = await Branch.findById(targetId);
        if (isBranch) {
            query = { branchId: targetId };
            updateField = { branchId: targetId, companyId: null };
        } else {
            return res.status(404).json({ message: "Target Entity (Company or Branch) not found" });
        }
    }

    // 2. Upsert Settings (Create if new, Update if exists)
    const updatedSettings = await Settings.findOneAndUpdate(
        query,
        { 
            $set: {
                ...settingsData,
                ...updateField
            } 
        },
        { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: `${isCompany ? 'Company' : 'Branch'} settings updated successfully`,
        settings: updatedSettings
    });
});

module.exports = {
    GetSettings,
    UpdateSettings
};