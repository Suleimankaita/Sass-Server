// const asyncHandler = require('express-async-handler');
// const Admin = require('../Models/AdminOwner');
// const Company = require('../Models/Company');
// const Branch = require('../Models/Branch');
// const GetStaffMembers = asyncHandler(async (req, res) => {
//     const adminId = "695958dfb8c82a370c0b192b"; 
//     const type= "Company"; 
//     const { targetId,  } = req.query;

//     if (!targetId || !type) {
//         return res.status(400).json({ message: "targetId and type (company/branch) are required" });
//     }

//     // 1. Fetch the Admin
//     const admin = await Admin.findById(adminId).select('companyId');
    
//     // 🔴 THE FIX: Check if admin exists before reading .companyId
//     if (!admin) {
//         return res.status(404).json({ 
//             success: false, 
//             message: "Admin account not found. Please log in again." 
//         });
//     }

//     let parentData;

//     if (type.toLowerCase() === 'company') {
//         // Now it is safe to read admin.companyId
//         if (!admin.companyId.includes(targetId)) {
//             return res.status(403).json({ message: "Unauthorized: You do not own this company" });
//         }

//         parentData = await Company.findById(targetId).populate({
//             path: 'CompanyUsers',
//             populate: { path: 'UserProfileId' }
//         });

//     } else if (type.toLowerCase() === 'branch') {
//         const validParent = await Company.findOne({
//             _id: { $in: admin.companyId },
//             BranchId: targetId
//         });

//         if (!validParent) {
//             return res.status(403).json({ message: "Unauthorized: Branch not found in your companies" });
//         }

//         parentData = await Branch.findById(targetId).populate({
//             path: 'CompanyUsers',
//             populate: { path: 'UserProfileId' }
//         });
//     }

//     // Final check for the target document
//     if (!parentData) {
//         return res.status(404).json({ message: "Target Company or Branch not found" });
//     }

//     res.status(200).json({
//         success: true,
//         users: parentData.CompanyUsers
//     });
// });

// module.exports = { GetStaffMembers };
const asyncHandler = require('express-async-handler');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');

const GetAllCompanyUsers = asyncHandler(async (req, res) => {
    const { targetId } = req.query; // This is the Company ID

    if (!targetId) {
        return res.status(400).json({ success: false, message: "Company ID is required" });
    }

    // 1. Fetch company + populate users directly attached + branches (and their users)
    const company = await Company.findById(targetId)
        .populate({
            path: 'CompanyUsers',
                       populate: [
                { path: 'LogId',model: 'UserLog' }, 
                { path: 'UserProfileId',model: 'UserProfile' }
            ]
        })
        .populate({
            path: 'BranchId',
            populate: {
                path: 'CompanyUsers',
             populate: [
                { path: 'LogId',model: 'UserLog' }, 
                { path: 'UserProfileId',model: 'UserProfile' }
            ]
            }
        })||await Branch.findById(targetId)
        .populate({
            path: 'CompanyUsers',
                       populate: [
                { path: 'LogId',model: 'UserLog' }, 
                { path: 'UserProfileId',model: 'UserProfile' }
            ]
        });

    if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" });
    }

    // 2. Extract users from the Company level
    const directUsers = company.CompanyUsers || [];

    // 3. Extract and flatten users from all Branches (guard if BranchId is undefined)
    const branchUsers = (company.BranchId || []).reduce((acc, branch) => {
        return acc.concat(branch.CompanyUsers || []);
    }, []);

    // 4. Combine both lists
    const allUsers = [...directUsers, ...branchUsers];

    // 5. Remove duplicates (if a user is in both lists)
    const uniqueUsers = Array.from(new Map(allUsers.map(user => [user._id.toString(), user])).values());

    console.log(`Total unique users found: ${uniqueUsers}`);
    res.status(200).json({
        success: true,
        count: uniqueUsers.length,
        users: uniqueUsers
    });
});
module.exports = GetAllCompanyUsers;