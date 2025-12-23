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

    // 1. Find the Admin and verify the company belongs to them
    // We check if targetCompanyId exists inside the Admin's companyId array
    const foundAdmin = await AdminOwner.findById(id);
    
    if (!foundAdmin) {
        return res.status(401).json({ message: 'Admin not found' });
    }

    const ownsCompany = foundAdmin.companyId.includes(targetCompanyId);
    if (!ownsCompany) {
        return res.status(403).json({ message: 'This company does not belong to this Admin' });
    }

    // 2. Find the Company and populate existing branches for duplicate checking
    const targetCompany = await Company.findById(targetCompanyId).populate('BranchId');
    if (!targetCompany) {
        return res.status(404).json({ message: 'Company record not found' });
    }

    // 3. Duplicate Check: Ensure branch name doesn't exist in THIS specific company
    const isDuplicate = targetCompany.BranchId.some(
        branch => branch.CompanyName?.toLowerCase() === CompanyName.toLowerCase()
    );
    if (isDuplicate) {
        return res.status(409).json({ message: 'Branch name already exists in this company' });
    }

    // 4. Hash the password
    // const hashedPassword = await bcrypt.hash(CompanyPassword, 10);

    // 5. Create the Branch
    // Note: We are not storing ownerId here as requested
    const newBranch = await Branch.create({
        CompanyName,
        CompanyEmail,
        CompanyPassword,
        Address: {
            StreetName: street,
            PostalNumber: postalNumber,
            Lat: lat,
            Long: long
        }
    });

    // 6. UPDATE HIERARCHY: Link Branch to Company
    targetCompany.BranchId.push(newBranch._id);
    await targetCompany.save();

    // 7. LOGGING: Link Log to Admin
    const log = await UserLog.create({
        action: `Created branch: ${CompanyName} for Company: ${targetCompany.CompanyName}`,
        Username: foundAdmin.Username,
    });

    foundAdmin.UserLogs.push(log._id);
    await foundAdmin.save();

    res.status(201).json({ 
        message: `Branch successfully linked to ${targetCompany.CompanyName}`,
        branchId: newBranch._id 
    });
});

module.exports = CreateBranch;