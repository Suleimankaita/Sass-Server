const asyncHandler = require('express-async-handler');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const Settings = require('../Models/CompanySetting');
const mongoose = require('mongoose');
const GetShops = asyncHandler(async (req, res) => {
	// Fetch companies with their branches populated
	const companiesRaw = await Company.find()
		.populate({ path: 'BranchId', model: 'Branch' }).populate('EcomerceProducts')
		.lean()
		.exec();

	// Also return a full branches list (some branches may not be linked)
	const branches = await Branch.find().populate('EcomerceProducts').lean().exec();

	// Build companies array with merged settings (branch overrides company)
	const companies = await Promise.all(
		companiesRaw.map(async (company) => {
			const companySettingsDoc = await Settings.findOne({ companyId: company._id, branchId: null }).lean().exec();
			const companySettings = companySettingsDoc || {};

			let branchesWithSettings = [];
			if (Array.isArray(company.BranchId) && company.BranchId.length) {
				branchesWithSettings = await Promise.all(
					company.BranchId.map(async (br) => {
						const branchId = br && br._id ? br._id : br;
						const branchSettingsDoc = await Settings.findOne({ branchId }).lean().exec();
						const branchSettings = branchSettingsDoc || {};

						const mergedSettings = { ...companySettings, ...branchSettings };

						return { ...br, settings: mergedSettings };
					})
				);
			}

			return { ...company, settings: companySettings, BranchId: branchesWithSettings };
		})
	);

	res.status(200).json({
		success: true,
		totalCompanies: companies.length,
		totalBranches: branches.length,
		companies,
		branches,
	});
});

const GetSingleShop = asyncHandler(async (req, res) => {
    // 1. Extract the identifier and clean it 
    // This fixes the "Cast to ObjectId failed" error by ensuring we have a string
   // 1. Extract the ID from params
    let { id } = req.params;

    // FIX: If 'id' is passed as an object string (e.g., from a misconfigured frontend call)
    if (id && typeof id === 'string' && id.includes(':')) {
        id = id.split(':').pop().replace(/['"{} ]/g, '');
    }

    // 2. Validate the ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
            success: false, 
            message: `Invalid ID format: ${id}. Expected a 24-character hex string.` 
        });
    }

    // 3. Try to find as a Company first
    let entity = await Company.findById(id)
        .populate('EcomerceProducts')
        .populate({ path: 'BranchId', model: 'Branch' })
        .lean()
        .exec();

    let type = 'company';

    // 4. If not a Company, try to find as a Branch
    if (!entity) {
        entity = await Branch.findById(id)
            .populate('EcomerceProducts')
            .lean()
            .exec();
        type = 'branch';
    }

    // Return 404 if not found in either collection
    if (!entity) {
        return res.status(404).json({ success: false, message: "No Company or Branch found with this ID" });
    }

    // 5. Fetch and Merge Settings
    let finalData;

    if (type === 'company') {
        // Fetch Main Company Settings
        const companySettingsDoc = await Settings.findOne({ 
            companyId: entity._id, 
            branchId: null 
        }).lean().exec();

        finalData = {
            ...entity,
            type: 'company',
            settings: companySettingsDoc || {}
        };
    } else {
        // It's a Branch: Get Parent Company Settings + Branch Settings for merging
        const [branchSettingsDoc, companySettingsDoc] = await Promise.all([
            Settings.findOne({ branchId: entity._id }).lean().exec(),
            Settings.findOne({ companyId: entity.companyId, branchId: null }).lean().exec()
        ]);

        // Merge logic: Branch settings override parent Company settings
        const mergedSettings = { 
            ...(companySettingsDoc || {}), 
            ...(branchSettingsDoc || {}) 
        };

        finalData = {
            ...entity,
            type: 'branch',
            settings: mergedSettings
        };
    }

    // 6. Return response
    res.status(200).json({
        success: true,
        data: finalData
    });
});
module.exports = { GetShops, GetSingleShop };