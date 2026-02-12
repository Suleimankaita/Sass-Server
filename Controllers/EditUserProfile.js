const asyncHandler = require('express-async-handler');
const UserProfile = require('../Models/Userprofile');
const User = require('../Models/User');
const CompanyUser = require('../Models/CompanyUsers');
const Admin = require('../Models/AdminOwner');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const UpdateProfile = asyncHandler(async (req, res) => {
    const id = req.userId;
    const updates = req.body;

    if (!id) {
        return res.status(400).json({ "message": "UserId required" });
    }

    // 1. Find the account (Check all three possible models)
    let account = await User.findById(id);
    if (!account) account = await CompanyUser.findById(id);
    if (!account) account = await Admin.findById(id);

    if (!account) {
        return res.status(404).json({ "message": "User not found" });
    }

    // 2. Get the current profile
    let currentProfile = null;
    let profileId = account.UserProfileId?._id || account.UserProfileId;

    if (profileId) {
        currentProfile = await UserProfile.findById(profileId);
    }

    // 3. Define field mapping
    const accountSpecificFields = [
        'Firstname', 'Lastname', 'Username', 'Password',
        'Active', 'Role', 'CompanyName', 'Verified'
    ];

    const accountUpdates = {};
    const profileUpdates = {};

    // 4. Handle profile image upload
    if (req.file && req.file.filename) {
        if (currentProfile && currentProfile.profileImage) {
            const uploadsDir = path.join(__dirname, '../uploads/profile-images/');
            const oldImagePath = path.join(uploadsDir, currentProfile.profileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
        }
        profileUpdates.profileImage = req.file.filename;
    }

    // 5. Separate account and profile updates
    Object.keys(updates).forEach(key => {
        if (accountSpecificFields.includes(key)) {
            accountUpdates[key] = updates[key];
        } else if (key !== 'addresses' && key !== 'shippingAddresses' && key !== 'billingAddresses') {
            // Standard profile fields (Bio, phone, etc.)
            if (key !== 'profileImage' || !req.file) {
                profileUpdates[key] = updates[key];
            }
        }
    });

    // 6. Special handling for nested UserProfileId object if sent from frontend
    if (updates.UserProfileId && typeof updates.UserProfileId === 'object') {
        Object.keys(updates.UserProfileId).forEach(key => {
            if (!['addresses', 'shippingAddresses', 'billingAddresses', 'profileImage'].includes(key)) {
                profileUpdates[key] = updates.UserProfileId[key];
            }
        });
    }

    // 7. Robust Address Handling (Fixes Duplicates & Default issue)
    let incomingUpdates = [];

    if (updates.shippingAddresses && Array.isArray(updates.shippingAddresses)) {
        incomingUpdates.push(...updates.shippingAddresses.map(a => ({ ...a, type: 'Shipping' })));
    }
    if (updates.billingAddresses && Array.isArray(updates.billingAddresses)) {
        incomingUpdates.push(...updates.billingAddresses.map(a => ({ ...a, type: 'Billing' })));
    }
    if (updates.addresses && Array.isArray(updates.addresses)) {
        incomingUpdates.push(...updates.addresses);
    }

    if (incomingUpdates.length > 0) {
        // Convert Mongoose documents to plain objects for easier manipulation
        let finalAddresses = currentProfile?.addresses ? currentProfile.addresses.map(a => a.toObject()) : [];

        incomingUpdates.forEach(newAddr => {
            const newAddrId = (newAddr._id || newAddr.id)?.toString();
            const existingIndex = finalAddresses.findIndex(addr => 
                (addr._id || addr.id)?.toString() === newAddrId
            );

            if (existingIndex !== -1 && newAddrId) {
                // UPDATE existing
                finalAddresses[existingIndex] = { ...finalAddresses[existingIndex], ...newAddr };
            } else {
                // CREATE new
                finalAddresses.push(newAddr);
            }

            // If this address is set as default, unset others of the same type
            if (newAddr.isDefault === true) {
                const currentType = newAddr.type;
                finalAddresses = finalAddresses.map(addr => {
                    if (addr.type === currentType && (addr._id || addr.id)?.toString() !== newAddrId) {
                        return { ...addr, isDefault: false };
                    }
                    return addr;
                });
            }
        });

        // Ensure at least one default exists per type if list isn't empty
        ["Shipping", "Billing"].forEach(type => {
            const typeAddrs = finalAddresses.filter(a => a.type === type);
            const hasDefault = typeAddrs.some(a => a.isDefault === true);
            if (typeAddrs.length > 0 && !hasDefault) {
                const firstIdx = finalAddresses.findIndex(a => a.type === type);
                if (firstIdx !== -1) finalAddresses[firstIdx].isDefault = true;
            }
        });

        profileUpdates.addresses = finalAddresses;
    }

    // 8. Password Hashing
    if (accountUpdates.Password) {
        const salt = await bcrypt.genSalt(10);
        accountUpdates.Password = await bcrypt.hash(accountUpdates.Password, salt);
    }

    // 9. Update Account
    let updatedAccount = account;
    if (Object.keys(accountUpdates).length > 0) {
        updatedAccount = await account.constructor.findByIdAndUpdate(
            id,
            { $set: accountUpdates },
            { new: true, runValidators: true }
        );
    }

    // 10. Update Profile
    let finalProfile = currentProfile;
    if (profileId && Object.keys(profileUpdates).length > 0) {
        finalProfile = await UserProfile.findByIdAndUpdate(
            profileId,
            { $set: profileUpdates },
            { new: true, runValidators: true }
        );
    }

    // 11. Refetch with population for consistent response
    const result = await updatedAccount.constructor.findById(id).populate('UserProfileId');

    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
            account: result,
            profile: result.UserProfileId
        }
    });
});

module.exports = UpdateProfile;