const asyncHandler = require('express-async-handler');
const CompanyUser = require('../Models/CompanyUsers'); 
const UserProfile = require('../Models/Userprofile');

/**
 * @desc    Update Company User and their linked Profile (including Image)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
const updateCompanyUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // 1. Find the User first to get the UserProfileId reference
    const user = await CompanyUser.findById(id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const {
        Firstname,
        Lastname,
        Username,
        Email,
        Role,
        Active,
        StreetName,
        PostalNumber,
        Lat,
        Long,
        phone,
        CompanyName
    } = req.body;
    // 2. Update CompanyUser fields
    user.Firstname = Firstname || user.Firstname;
    user.Lastname = Lastname || user.Lastname;
    user.Username = Username || user.Username;
    user.Email = Email || user.Email;
    user.Role = Role || user.Role;
    user.CompanyName = CompanyName || user.CompanyName;

    if (Active !== undefined) user.Active = Active;

    // Update nested Address object in CompanyUser
    if (StreetName || PostalNumber || Lat || Long) {
        user.Address = {
            StreetName: StreetName || user.Address?.StreetName,
            PostalNumber: PostalNumber || user.Address?.PostalNumber,
            Lat: Lat || user.Address?.Lat,
            Long: Long || user.Address?.Long,
        };
    }

    // 3. Prepare and Update the linked UserProfile
    if (user.UserProfileId) {
        const profileUpdates = {};
        
        // Sync Full Name
        if (Firstname || Lastname) {
            const fname = Firstname || user.Firstname;
            const lname = Lastname || user.Lastname;
            profileUpdates.fullName = `${fname} ${lname}`.trim();
        }

        // Sync other profile fields
        if (Email) profileUpdates.Email = Email;
        if (phone) profileUpdates.phone = phone;
        if (CompanyName) profileUpdates.companyName = CompanyName;

        // 📸 IMAGE SAVING LOGIC 📸
        // If a file was uploaded via Multer, add the path/filename to the profile
        if (req.file) {
            // Use req.file.path if using Cloudinary/S3, or req.file.filename for local storage
            profileUpdates.profileImage =  req.file.filename;
        }

        await UserProfile.findByIdAndUpdate(
            user.UserProfileId,
            { $set: profileUpdates },
            { new: true }
        );
    }

    // 4. Save CompanyUser changes
    const updatedUser = await user.save();

    res.status(200).json({
        success: true,
        message: "User profile and image updated successfully",
        user: updatedUser
    });
});

module.exports = { updateCompanyUser };