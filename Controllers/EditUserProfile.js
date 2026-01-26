const asyncHandler = require('express-async-handler');
const UserProfile = require('../Models/Userprofile');
const User = require('../Models/User');
const CompanyUser = require('../Models/CompanyUsers');
const Admin = require('../Models/AdminOwner');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const UpdateProfile = asyncHandler(async (req, res) => {
    console.log('=== UPDATE PROFILE STARTED ===');
    console.log('Request userId:', req.userId);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const id = req.userId; 
    const updates = req.body;

    if (!id) {
        console.log('ERROR: UserId is required');
        return res.status(400).json({ "message": "UserId required" });
    }

    // 1. Find the account first
    console.log('Finding account with ID:', id);
    let account = await User.findById(id);
    if (!account) account = await CompanyUser.findById(id);
    if (!account) account = await Admin.findById(id);

    if (!account) {
        console.log('ERROR: Account not found');
        return res.status(404).json({ "message": "User not found" });
    }
    console.log('Account found:', account._id);

    // 2. Get the current profile
    console.log('Getting current profile...');
    let currentProfile = null;
    let profileId;
    
    if (account.UserProfileId && typeof account.UserProfileId === 'object' && account.UserProfileId._id) {
        profileId = account.UserProfileId._id;
        console.log('Profile ID from populated object:', profileId);
        currentProfile = await UserProfile.findById(profileId);
    } else if (account.UserProfileId) {
        profileId = account.UserProfileId;
        console.log('Profile ID from string:', profileId);
        currentProfile = await UserProfile.findById(profileId);
    } else {
        console.log('WARNING: No UserProfileId found in account');
    }

    if (currentProfile) {
        console.log('Current profile found:', currentProfile._id);
        console.log('Current addresses:', currentProfile.addresses || []);
    } else {
        console.log('WARNING: No current profile found');
    }

    // 3. Define field mapping
    const accountSpecificFields = [
        'Firstname', 'Lastname', 'Username', 'Password', 
        'Active', 'Role', 'CompanyName', 'Verified'
    ];

    const accountUpdates = {};
    const profileUpdates = {};

    // 4. Handle profile image if file exists
    if (req.file && req.file.filename) {
        console.log('=== FILE UPLOAD DETECTED ===');
        console.log('File details:', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });
        
        // Verify file exists on disk
        const filePath = req.file.path;
        if (fs.existsSync(filePath)) {
            console.log('File exists on disk:', filePath);
        } else {
            console.log('ERROR: File does not exist on disk:', filePath);
        }
        
        // Delete old profile image if it exists
        if (currentProfile && currentProfile.profileImage) {
            console.log('Old profile image found:', currentProfile.profileImage);
            const uploadsDir = path.join(__dirname, '../uploads/profile-images/');
            const oldImagePath = path.join(uploadsDir, currentProfile.profileImage);
            console.log('Looking for old image at:', oldImagePath);
            
            if (fs.existsSync(oldImagePath)) {
                console.log('Deleting old profile image...');
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error('Error deleting old profile image:', err);
                    } else {
                        console.log('Old profile image deleted successfully');
                    }
                });
            }
        }
        
        // Save new image filename
        profileUpdates.profileImage = req.file.filename;
        console.log('Profile updates object after adding image:', profileUpdates);
    } else {
        console.log('No file uploaded in this request');
    }

    // 5. Separate account and profile updates from request body
    console.log('Processing request body updates:', updates);
    Object.keys(updates).forEach(key => {
        if (accountSpecificFields.includes(key)) {
            accountUpdates[key] = updates[key];
            console.log(`Added to accountUpdates: ${key} = ${updates[key]}`);
        } else {
            // Don't override profileImage if it was already set from file
            if (key !== 'profileImage' || !req.file) {
                profileUpdates[key] = updates[key];
                console.log(`Added to profileUpdates: ${key} = ${updates[key]}`);
            }
        }
    });

    // 6. Special handling for UserProfileId if it's being updated as an object
    if (updates.UserProfileId && typeof updates.UserProfileId === 'object') {
        console.log('Processing UserProfileId object:', updates.UserProfileId);
        Object.keys(updates.UserProfileId).forEach(key => {
            if (key !== 'profileImage' || !req.file) {
                profileUpdates[key] = updates.UserProfileId[key];
                console.log(`Added from UserProfileId to profileUpdates: ${key} = ${updates.UserProfileId[key]}`);
            }
        });
    }

    // 7. Special handling for addresses - COMBINE SHIPPING AND BILLING
    let combinedAddresses = [];
    
    // If shipping addresses are sent
    if (updates.shippingAddresses && Array.isArray(updates.shippingAddresses)) {
        console.log('Processing shipping addresses:', updates.shippingAddresses);
        const shippingWithType = updates.shippingAddresses.map(addr => ({
            ...addr,
            type: 'Shipping'
        }));
        combinedAddresses = [...combinedAddresses, ...shippingWithType];
    }
    
    // If billing addresses are sent
    if (updates.billingAddresses && Array.isArray(updates.billingAddresses)) {
        console.log('Processing billing addresses:', updates.billingAddresses);
        const billingWithType = updates.billingAddresses.map(addr => ({
            ...addr,
            type: 'Billing'
        }));
        combinedAddresses = [...combinedAddresses, ...billingWithType];
    }
    
    // If a single addresses array is sent (for backward compatibility)
    if (updates.addresses && Array.isArray(updates.addresses)) {
        console.log('Processing combined addresses array:', updates.addresses);
        combinedAddresses = updates.addresses;
    }
    
    // If we have any addresses to update
    if (combinedAddresses.length > 0) {
        console.log('Final combined addresses to save:', combinedAddresses);
        
        // Get current addresses to preserve ones not being updated
        let finalAddresses = [];
        if (currentProfile && currentProfile.addresses) {
            // Keep addresses that are not in the update (based on id)
            const updatedIds = combinedAddresses.map(addr => addr.id || addr._id).filter(id => id);
            finalAddresses = currentProfile.addresses.filter(addr => 
                !updatedIds.includes(addr.id?.toString()) && 
                !updatedIds.includes(addr._id?.toString())
            );
        }
        
        // Add the updated addresses
        finalAddresses = [...finalAddresses, ...combinedAddresses];
        profileUpdates.addresses = finalAddresses;
    }

    console.log('Final accountUpdates:', accountUpdates);
    console.log('Final profileUpdates:', profileUpdates);

    // 8. Handle Password Hashing if it's being updated
    if (accountUpdates.Password) {
        console.log('Hashing password...');
        const salt = await bcrypt.genSalt(10);
        accountUpdates.Password = await bcrypt.hash(accountUpdates.Password, salt);
    }

    // 9. Update the Primary Account
    let updatedAccount = account;
    if (Object.keys(accountUpdates).length > 0) {
        console.log('Updating account with:', accountUpdates);
        updatedAccount = await account.constructor.findByIdAndUpdate(
            id, 
            { $set: accountUpdates }, 
            { new: true, runValidators: true }
        );
        console.log('Account updated:', updatedAccount._id);
    } else {
        console.log('No account updates to apply');
    }

    // 10. Update the Linked UserProfile
    let updatedProfile = null;
    
    if (profileId && Object.keys(profileUpdates).length > 0) {
        try {
            console.log('=== UPDATING PROFILE ===');
            console.log('Profile ID to update:', profileId);
            console.log('Profile updates to apply:', profileUpdates);
            
            updatedProfile = await UserProfile.findByIdAndUpdate(
                profileId,
                { $set: profileUpdates },
                { new: true, runValidators: true }
            );
            
            console.log('Profile updated successfully');
            console.log('Updated addresses:', updatedProfile ? updatedProfile.addresses : 'No addresses');
            
        } catch (error) {
            console.error('ERROR updating profile:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Error updating profile", 
                error: error.message 
            });
        }
    } else {
        console.log('No profile updates to apply or no profileId found');
    }

    // 11. Refetch the account with populated profile
    console.log('Refetching account with populated profile...');
    let finalAccount = updatedAccount;
    let finalProfile = updatedProfile || currentProfile;
    
    if (profileId) {
        finalAccount = await account.constructor.findById(id).populate('UserProfileId');
        finalProfile = finalAccount.UserProfileId;
        console.log('Refetched profile addresses:', finalProfile ? finalProfile.addresses : 'No addresses');
    }

    // 12. Return the combined data
    console.log('=== UPDATE COMPLETE ===');
    
    res.status(200).json({
        success: true,
        message: "Update successful",
        data: {
            account: finalAccount,
            profile: finalProfile || "No profile found"
        }
    });
});

module.exports = UpdateProfile;