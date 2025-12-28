const Category = require('../Models/Categories');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const CompanyUser = require('../Models/CompanyUsers');
const AdminOwner = require('../Models/AdminOwner');
const UserLog = require('../Models/UserLog');
const asyncHandler = require('express-async-handler');

const AddCategories = asyncHandler(async (req, res) => {
    const { name, id, targetCompanyId, CompanyName } = req.body;

    if (!name || !id || !targetCompanyId || !CompanyName) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // 1. Identify the Target Entity First (Company or Branch)
    // We populate CategoriesId to perform the duplicate check later
    let targetEntity = await Company.findById(targetCompanyId).populate('CategoriesId');
    let entityLabel = 'Company';

    if (!targetEntity) {
        targetEntity = await Branch.findById(targetCompanyId).populate('CategoriesId');
        entityLabel = 'Branch';
    }

    if (!targetEntity) {
        return res.status(404).json({ message: 'Target Company or Branch not found' });
    }

    // 2. Actor Identification & Permission Check
    let actor = null;
    let actorType = null;

    const foundAdmin = await AdminOwner.findById(id);

    if (foundAdmin) {
        // Check if Admin owns the entity directly OR if it's in their companyId list
        const isDirectOwner = targetEntity.ownerId?.toString() === id;
        const isInCompanyList = foundAdmin.companyId?.some((cid) => cid.toString() === targetCompanyId);

        if (!isDirectOwner && !isInCompanyList) {
            return res.status(403).json({ message: `Access denied: You do not own this ${entityLabel}` });
        }
        
        actor = foundAdmin;
        actorType = 'admin';
    } else {
        const foundUser = await CompanyUser.findById(id);
        if (!foundUser) return res.status(401).json({ message: 'User not found' });

        if (foundUser.Role?.toLowerCase() !== 'manager') {
            return res.status(403).json({ message: 'Only managers can add categories' });
        }

        // Managers are usually tied to a specific CompanyName string in your schema
        if (foundUser.CompanyName !== CompanyName) {
            return res.status(403).json({ message: 'Unauthorized for this company context' });
        }
        actor = foundUser;
        actorType = 'companyUser';
    }

    // 3. Duplicate Check
    const trimmedName = name.trim();
    const isDuplicate = targetEntity.CategoriesId.some(
        (cat) => cat.name?.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
        return res.status(409).json({ message: `Category already exists in this ${entityLabel}` });
    }

    // 4. Create Category and Link to the Target (Company or Branch)
    const newCategory = await Category.create({ name: trimmedName });

    // Both schemas use 'CategoriesId', so this works for both
    targetEntity.CategoriesId.push(newCategory._id);
    await targetEntity.save();

    // 5. Logging
    const log = await UserLog.create({
        action: `Added category "${trimmedName}" to ${entityLabel}: ${targetEntity.CompanyName}`,
        Username: actor.Username || actor.name,
    });

    if (actorType === 'admin') {
        actor.UserLogs = actor.UserLogs || [];
        actor.UserLogs.push(log._id);
    } else {
        actor.LogId = actor.LogId || [];
        actor.LogId.push(log._id);
    }
    await actor.save();

    res.status(201).json({
        success: true,
        message: `Category added to ${entityLabel} successfully`,
        category: newCategory
    });
});

module.exports = AddCategories;