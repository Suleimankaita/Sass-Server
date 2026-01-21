const Branch = require('../Models/Branch');
const AdminOwner = require('../Models/AdminOwner'); 
const Company = require('../Models/Company');      
const UserLog = require('../Models/UserLog');
const asyncHandler = require("express-async-handler");

const CreateBranch = asyncHandler(async (req, res) => {
    const { 
        CompanyName, lat, long, street, postalNumber, 
        CompanyPassword, id, CompanyEmail, targetCompanyId 
    } = req.body;

    // 1. Find the Admin and verify the company match
    // Based on your schema, companyId is a single ObjectId, not an array
    const foundAdmin = await AdminOwner.findById(id);
    
    if (!foundAdmin) {
        return res.status(401).json({ message: 'Admin not found' });
    }

    // Verify if the targetCompanyId matches the Admin's registered companyId
    if (foundAdmin.companyId.toString() !== targetCompanyId) {
        return res.status(403).json({ message: 'Unauthorized: This company is not linked to this Admin account' });
    }

    // 2. Find the Company and populate existing branches for duplicate checking
    const targetCompany = await Company.findById(targetCompanyId).populate('BranchId');
    if (!targetCompany) {
        return res.status(404).json({ message: 'Company record not found' });
    }

    // 3. Check branch limits based on subscription
    if (targetCompany.branchesCreated >= targetCompany.maxBranches) {
        return res.status(403).json({
            message: `Branch limit reached. You have created ${targetCompany.branchesCreated} out of ${targetCompany.maxBranches} allowed branches for your ${targetCompany.subscriptionPlan} plan.`,
            branchesCreated: targetCompany.branchesCreated,
            maxBranches: targetCompany.maxBranches,
            subscriptionPlan: targetCompany.subscriptionPlan,
            upgrade: 'Please upgrade your subscription plan to create more branches'
        });
    }

    // 4. Duplicate Check: Ensure branch name doesn't exist in THIS specific company
    const isDuplicate = targetCompany.BranchId && targetCompany.BranchId.some(
        branch => branch.CompanyName?.toLowerCase() === CompanyName.toLowerCase()
    );

    if (isDuplicate) {
        return res.status(409).json({ message: 'Branch name already exists in this company' });
    }

    // 5. Create the Branch (Bcrypt removed as requested)
    const newBranch = await Branch.create({
        CompanyName,
        CompanyEmail,
        CompanyPassword, // Stored as plain text per request
        Address: {
            StreetName: street,
            PostalNumber: postalNumber,
            Lat: lat,
            Long: long
        }
    });

    // 6. UPDATE HIERARCHY: Link Branch to Company
    targetCompany.BranchId.push(newBranch._id);
    targetCompany.branchesCreated += 1; // Increment branch counter
    await targetCompany.save();

    // 7. LOGGING: Create log and link to Admin using UserLogId array
    const log = await UserLog.create({
        action: `Created branch: ${CompanyName}`,
        details: `Branch added to Company: ${targetCompany.CompanyName}`,
        Username: foundAdmin.Username,
    });

    // Update Admin's UserLogId array (matching your schema field name)
    foundAdmin.UserLogId.push(log._id);
    await foundAdmin.save();

    res.status(201).json({ 
        success: true,
        message: `Branch successfully created and linked to ${targetCompany.CompanyName}`,
        branchId: newBranch._id,
        branchesCreated: targetCompany.branchesCreated,
        maxBranches: targetCompany.maxBranches
    });
});

module.exports = CreateBranch;