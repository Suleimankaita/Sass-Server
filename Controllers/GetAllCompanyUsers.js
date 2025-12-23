const asyncHandler = require('express-async-handler');
const Admin = require('../Models/AdminOwner');

const GetAdminTotalStaff = asyncHandler(async (req, res) => {
    const adminId = '694a673120f6f7479f693a04'; 

    // 1. Fetch Admin with Nested Population
    const adminData = await Admin.findById(adminId)
        .populate({
            path: 'companyId',
            populate: [
                {
                    path: 'CompanyUsers',
                    populate: { path: 'UserProfileId' }
                },
                {
                    path: 'BranchId',
                    populate: {
                        path: 'CompanyUsers',
                        populate: { path: 'UserProfileId' }
                    }
                }
            ]
        })
        .lean();

    // 🔴 SAFETY CHECK 1: Ensure Admin exists
    if (!adminData) {
        return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // 🔴 SAFETY CHECK 2: Ensure companyId is an array before mapping
    const companies = adminData.companyId || [];
    
    let grandTotalUsers = 0;
    
    const hierarchy = companies.map(company => {
        // Use || [] to prevent "map of undefined" inside branches too
        const currentCompanyUsers = company.CompanyUsers || [];
        const currentBranches = company.BranchId || [];

        const companyUsersCount = currentCompanyUsers.length;
        
        const branchStats = currentBranches.map(branch => {
            const branchUsers = branch.CompanyUsers || [];
            const branchUsersCount = branchUsers.length;
            
            grandTotalUsers += branchUsersCount; 
            
            return {
                branchName: branch.CompanyName || "Unnamed Branch",
                userCount: branchUsersCount,
                users: branchUsers
            };
        });

        grandTotalUsers += companyUsersCount; 

        return {
            companyName: company.CompanyName || "Unnamed Company",
            companyUserCount: companyUsersCount,
            companyUsers: currentCompanyUsers,
            branches: branchStats
        };
    });

    res.status(200).json({
        success: true,
        adminUsername: adminData.Username,
        grandTotalUsers: grandTotalUsers,
        data: hierarchy
    });
});

module.exports = { GetAdminTotalStaff };