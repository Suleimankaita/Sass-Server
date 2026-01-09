const mongoose = require('mongoose');
const Category = require('../Models/Categories');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const CompanyUser = require('../Models/CompanyUsers');
const AdminOwner = require('../Models/AdminOwner');
const UserLog = require('../Models/UserLog');
const asyncHandler = require('express-async-handler');

const DeleteCategory = asyncHandler(async (req, res) => {
    const { id, targetCompanyId, categoryId, CompanyName } = req.body;

    console.log(req.body)
    // 1. Validation
    if (!id || !targetCompanyId || !categoryId) {
        return res.status(400).json({ message: 'User ID, Target Company ID, and Category ID are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(targetCompanyId)) {
        return res.status(400).json({ message: 'Invalid Target Company/Branch ID format' });
    }

    // 2. Identify Target Entity (Branch or Company)
    let targetEntity = await Company.findById(targetCompanyId);
    let TargetModel = Company;
    let entityLabel = 'Company';

    if (!targetEntity) {
        targetEntity = await Branch.findById(targetCompanyId);
        TargetModel = Branch;
        entityLabel = 'Branch';
    }

    if (!targetEntity) {
        return res.status(404).json({ message: 'Target Company or Branch not found' });
    }

    // 3. Permission Check
    let actor = null;
    let actorType = null;

    const foundAdmin = await AdminOwner.findById(id);

    if (foundAdmin) {
        const ownsEntity = foundAdmin.companyId?.toString() === targetCompanyId||targetEntity.ownerId?.toString() === id;
        
        if (!ownsEntity) return res.status(403).json({ message: `Unauthorized: Admin does not own this ${entityLabel}` });
        
        actor = foundAdmin;
        actorType = 'admin';
    } else {
        const foundUser = await CompanyUser.findById(id);
        if (!foundUser) return res.status(401).json({ message: 'Actor not found' });

        if (!foundUser.Role || foundUser.Role.toLowerCase() !== 'manager') {
            return res.status(403).json({ message: 'Insufficient permissions to delete' });
        }

        if (foundUser.CompanyName !== CompanyName) {
            return res.status(403).json({ message: 'Unauthorized for this company context' });
        }
        
        actor = foundUser;
        actorType = 'companyUser';
    }

    // 4. Find the Category
    const categoryToDelete = await Category.findById(categoryId);
    if (!categoryToDelete) return res.status(404).json({ message: 'Category record not found' });

    // 5. Remove Category reference from the Entity and Delete Category
    // We use the dynamic TargetModel identified in step 2
    
    await TargetModel.findByIdAndUpdate(targetCompanyId, {
        $pull: { CategoriesId: categoryId }
    });

    await categoryToDelete.deleteOne();

    // 6. Logging the action
    const log = await UserLog.create({
        action: `Deleted category: ${categoryToDelete.name} from ${entityLabel}: ${targetEntity.CompanyName}`,
        Username: actor.Username || actor.name,
    });

    // 7. Update Actor's log history
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
        message: `Category '${categoryToDelete.name}' deleted from ${entityLabel} successfully` 
    });
});

module.exports = DeleteCategory;