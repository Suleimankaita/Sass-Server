const asyncHandler = require('express-async-handler');
const Admin = require('../Models/AdminOwner');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const Profile = require('../Models/Userprofile'); 
const CompanyUser = require('../Models/CompanyUsers'); 

const RegisterStaff = asyncHandler(async (req, res) => {
    const {
        Username, Password, Firstname, Lastname, Email,
        StreetName, PostalNumber, Lat, Long,
        Role,
        targetId // No more 'type' required
    } = req.body;
    
    const userId = req.userId;

    // 1. Validation
    if (!Username || !Password || !Firstname || !Lastname || !Email || !targetId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const emailfound=await Profile.findOne({Email}).collation({ strength: 2, locale: 'en' });
    if(emailfound)return res.status(409).json({ message: 'Email already in use' });
        
    //  2. Check if user is Admin or Manager (Authorization Check)
    const admin = await Admin.findById(userId).select('companyId');
    let isAdmin = !!admin;
    let requester = admin;

    if (!isAdmin) {
        // Check if user is a manager (CompanyUser with manager role)
        const manager = await CompanyUser.findById(userId).select('Role companyId');
        if (!manager || manager.Role !== 'manager') {
            return res.status(403).json({ message: 'Only admin or manager can create users' });
        }
        requester = manager;
    }

    if (!requester) {
        return res.status(401).json({ message: 'User not found' });
    }

    // 3. Check Username Uniqueness
    const existingUser = await CompanyUser.findOne({ Username }).collation({ strength: 2, locale: 'en' });
    if (existingUser) return res.status(409).json({ message: 'Username already taken' });

    // 4. Identify Parent (Company or Branch) and Verify Ownership
    const adminRecord = await Admin.findById(userId).select('companyId');
    if (!adminRecord && !isAdmin&&!requester) return res.status(401).json({ message: 'Admin not found' });

    let parentDocument = null;
    let parentType = ""; // Will be 'company' or 'branch'
    let company = null; // Track the company for user limit check

    // Try finding as Company first
    const foundCompany = await Company.findOne({ _id: targetId });
    
    // Verify that the requester has access to this company
    if (foundCompany) {
        if (isAdmin) {
            // Admin must own this company
            const companyOwned = await Company.findOne({ _id: targetId, _id: { $in: requester.companyId } });
            if (!companyOwned) {
                return res.status(403).json({ message: 'Unauthorized - Company not owned by you' });
            }
        } else {
            // Manager must be from the same company
            if (requester.companyId.toString() !== targetId.toString()) {
                return res.status(403).json({ message: 'Unauthorized - Manager must belong to same company' });
            }
        }
        parentDocument = foundCompany;
        parentType = "company";
        company = foundCompany;
    } else {
        // Try finding as Branch (The branch must belong to a company owned by this admin)
        const branchOwnedByAdmin = await Branch.findOne({
        _id: targetId
        });


        if (branchOwnedByAdmin) {
            parentDocument = await Branch.findById(targetId);
            parentType = "branch";
            
            // Find the company that owns this branch
            company = await Company.findOne({
                BranchId: { $in: [targetId] }
            });
        }
    }

    if (!parentDocument) {
        return res.status(403).json({ message: 'Unauthorized or Target ID not found' });
    }

    // 5. Check user limits based on subscription
    if (!company) {
        return res.status(404).json({ message: 'Company not found for this target' });
    }

    if (company.usersCreated >= company.maxUsers) {
        return res.status(403).json({
            message: `User limit reached. You have created ${company.usersCreated} out of ${company.maxUsers} allowed users for your ${company.subscriptionPlan} plan.`,
            usersCreated: company.usersCreated,
            maxUsers: company.maxUsers,
            subscriptionPlan: company.subscriptionPlan,
            upgrade: 'Please upgrade your subscription plan to create more users'
        });
    }

    // 6. Create User Profile
    const newProfile = await Profile.create({
        Firstname, Lastname, Email,
        Address: { StreetName, PostalNumber, Lat, Long },
    });

    // if(parentType==='branch'){
    // }
    try {
        // 7. Create Staff User
        let staffData = {
            Username,
            Password, // Note: Should be hashed in production
            UserProfileId: newProfile._id,
            Role
        };

        // Set company and branch IDs based on parent type
        if (parentType === 'company') {
            staffData.companyId = targetId;
        } else if (parentType === 'branch') {
            // For branch users, get the company from the branch
            const branchData = await Branch.findById(targetId).select('ownerId');
            const branchCompanyId = branchData?.ownerId; // or wherever company reference is stored
            staffData.companyId = branchCompanyId || targetId;
            staffData.BranchId = targetId;
        }

        const newStaffUser = await CompanyUser.create(staffData);

        // 8. Link User to Parent Document (Company or Branch)
        parentDocument.CompanyUsers = parentDocument.CompanyUsers || [];
        parentDocument.CompanyUsers.push(newStaffUser._id);
        
        // 9. Increment user counter on company
        if (company) {
            company.usersCreated += 1;
            await company.save();
        }
        
        await parentDocument.save();

        res.status(201).json({
            success: true,
            message: `User successfully registered and linked to ${parentType}`,
            data: {
                userId: newStaffUser._id,
                linkedTo: parentType,
                targetId: targetId,
                usersCreated: company.usersCreated,
                maxUsers: company.maxUsers
            }
        });

    } catch (err) {
        // Rollback Profile creation if User creation fails
        await Profile.findByIdAndDelete(newProfile._id);
        res.status(500).json({ message: "Registration failed: " + err.message });
    }
});

module.exports = RegisterStaff;