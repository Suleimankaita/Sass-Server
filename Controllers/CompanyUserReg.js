const asyncHandler = require('express-async-handler');
// const bcrypt = require('bcrypt');

// Import your Schemas
const Admin = require('../Models/AdminOwner');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const Profile = require('../Models/Userprofile'); 
const CompanyUser = require('../Models/CompanyUsers'); 

const RegisterStaff = asyncHandler(async (req, res) => {
    try {
        const {
            Username, Password, Firstname, Lastname, Email,
            StreetName, PostalNumber, Lat, Long,
            id,              // The Admin ID (Owner)
            targetId,        // The ID of the Company OR Branch
            type             // "company" or "branch"
        } = req.body;

        // 1. Validation
        if (!Username || !Password || !Firstname || !Lastname || !Email || !id || !targetId || !type) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // 2. Check Username Uniqueness
        const existingUser = await CompanyUser.findOne({ Username })
            .collation({ strength: 2, locale: 'en' });
        if (existingUser) return res.status(409).json({ message: 'Username already taken' });

        // 3. Get the Admin to see their Companies
        // We only need the list of companyIds the admin owns
        const admin = await Admin.findById(id).select('companyId');
        if (!admin) return res.status(401).json({ message: 'Admin not found' });

        let parentDocument = null; 
        let parentModelName = "";

        // ======================================================
        // 🟢 TYPE: COMPANY (Direct Link: Admin -> Company)
        // ======================================================
        if (type.toLowerCase() === 'company') {
            
            // Check if the Admin's "companyId" array contains this targetId
            const isOwner = admin.companyId.includes(targetId);
            
            if (!isOwner) {
                return res.status(403).json({ message: 'Unauthorized: Admin does not own this Company' });
            }

            parentDocument = await Company.findById(targetId);
            parentModelName = "Company";

        // ======================================================
        // 🔵 TYPE: BRANCH (Deep Link: Admin -> Company -> Branch)
        // ======================================================
        } else if (type.toLowerCase() === 'branch') {

            // CRITICAL CHANGE: We do NOT look at Admin.BranchId.
            // We search for a Company that:
            // 1. Is in the Admin's list of companies (admin.companyId)
            // 2. Has the targetId inside its OWN "BranchId" array
            
            const parentCompany = await Company.findOne({
                _id: { $in: admin.companyId }, // Company must be owned by Admin
                BranchId: targetId             // Company must own the Branch
            });

            if (!parentCompany) {
                return res.status(403).json({ message: 'Unauthorized: This branch is not inside any of your companies.' });
            }

            // If we found a company, it means the relationship is valid. Now fetch the Branch.
            parentDocument = await Branch.findById(targetId);
            parentModelName = "Branch";

        } else {
            return res.status(400).json({ message: "Invalid type. Use 'company' or 'branch'" });
        }

        // 4. Create User Profile
        const newProfile = await Profile.create({
            Firstname, Lastname, Email,
            Address: { StreetName, PostalNumber, Lat, Long },
        });

        // 5. Create Staff User
        // const hashedPassword = await bcrypt.hash(Password, 10);
        const newStaffUser = await CompanyUser.create({
            Username,
            Password,
            UserProfileId: newProfile._id,
        });

        // 6. Link to Parent (Safe Check)
        if (!parentDocument) {
            // Clean up if parent wasn't found in the final step
            await CompanyUser.findByIdAndDelete(newStaffUser._id);
            await Profile.findByIdAndDelete(newProfile._id);
            return res.status(404).json({ message: `${parentModelName} record missing` });
        }

        // 7. Push to the "CompanyUsers" array (Exists in both Branch and Company schemas)
        if (!parentDocument.CompanyUsers) parentDocument.CompanyUsers = [];
        
        parentDocument.CompanyUsers.push(newStaffUser._id);
        await parentDocument.save();

        res.status(201).json({
            success: true,
            message: `User linked to ${parentModelName} successfully`,
            userId: newStaffUser._id
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = RegisterStaff;