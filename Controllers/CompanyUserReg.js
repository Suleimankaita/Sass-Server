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
        targetId // No more 'type' required
    } = req.body;
    
    const adminId = req.userId;

    // 1. Validation
    if (!Username || !Password || !Firstname || !Lastname || !Email || !targetId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // 2. Check Username Uniqueness
    const existingUser = await CompanyUser.findOne({ Username }).collation({ strength: 2, locale: 'en' });
    if (existingUser) return res.status(409).json({ message: 'Username already taken' });

    // 3. Identify Parent (Company or Branch) and Verify Ownership
    const admin = await Admin.findById(adminId).select('companyId');
    if (!admin) return res.status(401).json({ message: 'Admin not found' });

    let parentDocument = null;
    let parentType = ""; // Will be 'company' or 'branch'

    // Try finding as Company first
    const company = await Company.findOne({ _id: targetId, _id: { $in: admin.companyId } });
    
    if (company) {
        parentDocument = company;
        parentType = "company";
    } else {
        // Try finding as Branch (The branch must belong to a company owned by this admin)
        const branchOwnedByAdmin = await Company.findOne({
            _id: { $in: admin.companyId },
            BranchId: targetId
        });

        if (branchOwnedByAdmin) {
            parentDocument = await Branch.findById(targetId);
            parentType = "branch";
        }
    }

    if (!parentDocument) {
        return res.status(403).json({ message: 'Unauthorized or Target ID not found' });
    }

    // 4. Create User Profile
    const newProfile = await Profile.create({
        Firstname, Lastname, Email,
        Address: { StreetName, PostalNumber, Lat, Long },
    });

    try {
        // 5. Create Staff User
        // Use a dynamic key based on whether we detected a company or branch
        const staffData = {
            Username,
            Password, // Note: Should be hashed in production
            UserProfileId: newProfile._id,
            [parentType === 'company' ? 'companyId' : 'BranchId']: targetId
        };

        const newStaffUser = await CompanyUser.create(staffData);

        // 6. Link User to Parent Document
        parentDocument.CompanyUsers = parentDocument.CompanyUsers || [];
        parentDocument.CompanyUsers.push(newStaffUser._id);
        await parentDocument.save();

        res.status(201).json({
            success: true,
            message: `User successfully registered and linked to ${parentType}`,
            data: {
                userId: newStaffUser._id,
                linkedTo: parentType,
                targetId
            }
        });

    } catch (err) {
        // Rollback Profile creation if User creation fails
        await Profile.findByIdAndDelete(newProfile._id);
        res.status(500).json({ message: "Registration failed: " + err.message });
    }
});

module.exports = RegisterStaff;