const mongoose = require('mongoose'); // Need this for ObjectId validation
const Category = require('../Models/Categories');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const CompanyUser = require('../Models/CompanyUsers');
const AdminOwner = require('../Models/AdminOwner');
const UserLog = require('../Models/UserLog');
const asyncHandler = require('express-async-handler');

const UpdateCategories = asyncHandler(async (req, res) => {
    const { name, id, targetCompanyId, CompanyName, categoryId } = req.body;

    console.log(req.body)
    // 1. Basic Validation
    if (!name || !id || !targetCompanyId || !CompanyName || !categoryId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // DEBUG: Check what is actually arriving
    console.log(`Searching for Entity ID: "${targetCompanyId}"`);

    // 2. Ensure targetCompanyId is a valid ObjectId before querying
    // If you pass a slug by mistake, findById will fail or return null
    if (!mongoose.Types.ObjectId.isValid(targetCompanyId)) {
        return res.status(400).json({ message: 'Invalid Target Company ID format' });
    }

    const trimmedName = name.trim();

    // 3. Identify Target Entity (Main Company or Branch)
    // We use .exec() to ensure the promise executes fully
    let targetEntity = await Company.findById(targetCompanyId).populate('CategoriesId').exec();
    let entityLabel = 'Company';

    if (!targetEntity) {
        console.log("Not found in Company collection, checking Branch...");
        targetEntity = await Branch.findById(targetCompanyId).populate('CategoriesId').exec();
        entityLabel = 'Branch';
    }

    // Still not found? Let's check if it exists WITHOUT populate just in case populate is breaking it
    if (!targetEntity) {
        const rawCheck = await mongoose.connection.db.collection('companies').findOne({ _id: new mongoose.Types.ObjectId(targetCompanyId) }) 
                        || await mongoose.connection.db.collection('branches').findOne({ _id: new mongoose.Types.ObjectId(targetCompanyId) });
        
        console.log("Raw Database Check result:", rawCheck ? "Found in DB but Model failed" : "Not found in DB at all");
        
        return res.status(404).json({ message: 'Target Company or Branch not found in database' });
    }

    // 4. Identify the Actor and Check Permissions
    let actor = null;
    let actorType = null;

    const foundAdmin = await AdminOwner.findById(id).exec();

    if (foundAdmin) {
        const ownsEntity = foundAdmin.companyId?.toString() === targetCompanyId ||targetEntity.ownerId?.toString() === id;

        if (!ownsEntity) {
            return res.status(403).json({ message: `Access denied: Admin does not own this ${entityLabel}` });
        }
        actor = foundAdmin;
        actorType = 'admin';
    } else {
        const foundUser = await CompanyUser.findById(id).exec();
        if (!foundUser) return res.status(401).json({ message: 'Actor (User) not found' });

        if (foundUser.Role?.toLowerCase() !== 'manager') {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        if (foundUser.CompanyName !== CompanyName) {
            return res.status(403).json({ message: 'Unauthorized for this company context' });
        }

        actor = foundUser;
        actorType = 'companyUser';
    }

    // 5. Verify Category Relationship to the Entity
    const categories = Array.isArray(targetEntity.CategoriesId) ? targetEntity.CategoriesId : [];
    const categoryExistsInEntity = categories.some((c) => c && c._id && c._id.toString() === categoryId);

    if (!categoryExistsInEntity) {
        return res.status(404).json({ message: `Category not linked to this ${entityLabel}` });
    }

    // 6. Duplicate Check
    const duplicate = categories.some((c) => 
        c && c.name && 
        c.name.toLowerCase() === trimmedName.toLowerCase() && 
        c._id.toString() !== categoryId
    );
    if (duplicate) return res.status(409).json({ message: 'A category with this name already exists' });

    // 7. Perform Update
    const existingCategory = await Category.findById(categoryId).exec();
    if (!existingCategory) return res.status(404).json({ message: 'Category record not found' });

    const oldName = existingCategory.name;
    existingCategory.name = trimmedName;
    await existingCategory.save();

    // 8. Logging
    const log = await UserLog.create({
        action: `Updated category: ${oldName} -> ${trimmedName} for ${entityLabel}: ${targetEntity.CompanyName}`,
        Username: actor.Username || actor.name || 'Unknown User',
    });

    if (actorType === 'admin') {
        actor.UserLogs = actor.UserLogs || [];
        actor.UserLogs.push(log._id);
    } else {
        actor.LogId = Array.isArray(actor.LogId) ? actor.LogId : [];
        actor.LogId.push(log._id);
    }
    
    await actor.save();

    res.status(200).json({ 
        success: true,
        message: 'Category updated successfully', 
        category: existingCategory 
    });
});

module.exports = UpdateCategories;