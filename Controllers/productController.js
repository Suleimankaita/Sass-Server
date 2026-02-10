const asyncHandler = require('express-async-handler');
const EcomerceProducts = require('../Models/EcomerceProducts');
const POSProducts = require('../Models/POSProduct');
const Order = require('../Models/User_order');
const Admin = require('../Models/AdminOwner');
const Logs = require('../Models/UserLog');
const User = require('../Models/CompanyUsers');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');

/**
 * 🟢 ADD PRODUCT
 */

const ProductRegs = asyncHandler(async (req, res) => {
  const { 
    name, description, price, quantity, Selection, id, sku, barcode, 
    costPrice, category, reorderLevel, CompanyId, categoryName, 
    soldAtPrice, actualPrice 
  } = req.body;

  const files = req.files;

  console.log(req.body)
  // 1. Validation
  if (!name || !quantity ||!barcode|| !Selection || !id || !CompanyId || !categoryName || !soldAtPrice || !actualPrice||!req.files) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  // 2. Identify the Actor (Admin or Staff User)
  const adminActor = await Admin.findById(id);
  const userActor = !adminActor ? await User.findById(id).populate('UserProfileId') : null;
  
  const actingUser = adminActor || userActor;
  if (!actingUser) {
    return res.status(404).json({ message: 'User or Admin not found' });
  }

  const actorRole = adminActor ? 'ADMIN' : 'USER';

  // 3. Identify the Target (Company or Branch)
  let targetEntity = await Company.findById(CompanyId);
  let entityType = 'Company';

  if (!targetEntity) {
    targetEntity = await Branch.findById(CompanyId);
    entityType = 'Branch';
  }

  console.log(entityType)
  if (!targetEntity) {
    return res.status(404).json({ message: 'Target Company or Branch not found' });
  }

  // 4. Authorization Check: Is this User a member of this Company/Branch?
  if (actorRole === 'USER') {
    // Check if the user's ID exists in the target entity's companyUsers array
    // We use .toString() to compare MongoDB ObjectIds
    const isMember = targetEntity.CompanyUsers && targetEntity.CompanyUsers.some(
      (userId) => userId.toString() === actingUser._id.toString()
    );

    console.log(isMember)
    if (!isMember) {
      return res.status(403).json({ 
        message: `Access Denied: You are not authorized to add products to this ${entityType}` 
      });
    }
  }

  // 5. Prepare Product Data
  // const finalSku = sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const imgPaths = files && Array.isArray(files) ? files.map(file => file.filename) : [];
  console.log("Paths    ", imgPaths)
  console.log("files   ",req.files)

    const ids= entityType==="Branch"?"branchId":"companyId"
  const baseProductData = {
    [ids]: targetEntity._id,
    entityType: entityType,
    name,
    description,
   price: Number(price) || 0,
    categoryName,
    costPrice: Number(costPrice) || 0,
    soldAtPrice: Number(soldAtPrice) || 0,
    actualPrice: Number(actualPrice) || 0,
    quantity: Number(quantity) || 0,
    // sku:Number(finalSku),
    barcode:Number(barcode),
    category,
    reorderLevel,
    img: imgPaths,
    UserUpload: {
      name: actingUser.Firstname ? `${actingUser.Firstname} ${actingUser.Lastname}` : actingUser.Username,
      Username: actingUser.Username,
      role: actorRole,
      Date: new Date().toISOString().split('T')[0],
      Time: new Date().toLocaleTimeString(),
    },
  };

  // 6. Create Product Documents
  let createdProducts = {};

  if (Selection === 'POS Only' || Selection === 'Both Platforms') {
    const posProduct = await POSProducts.create({ ...baseProductData, ChangeLog: "POS" });
    if (!targetEntity.POSProductsId) targetEntity.POSProductsId = [];
    targetEntity.POSProductsId.push(posProduct._id);
    createdProducts.POS = posProduct;
    
  }

  if (Selection === 'E-commerce Only' || Selection === 'Both Platforms') {
    const ecommerceProduct = await EcomerceProducts.create({ ...baseProductData, ChangeLog: "Ecomerce" });
    if (!targetEntity.EcomerceProducts) targetEntity.EcomerceProducts = [];
    targetEntity.EcomerceProducts.push(ecommerceProduct._id);
    createdProducts.ECOMMERCE = ecommerceProduct;
  }

  // 7. Save Entity and Log
  await targetEntity.save();

  await Logs.create({
    actorId: actingUser._id,
    actorRole,
    action: 'PRODUCT_CREATED',
    platform: Selection,
    metadata: { productName: name, targetName: targetEntity.name, entityType },
    date: new Date().toISOString(),
  });

  res.status(201).json({
    message: `Product '${name}' added to ${entityType} successfully`,
    foundIn: entityType,
    // sku: finalSku,
    products: createdProducts,
  });
});
/**
 * 🟢 CREATE ORDER
 */
const CreateOrder = asyncHandler(async (req, res) => {
  const { productId, userId, quantity } = req.body;

  if (!productId || !userId || !quantity) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // 1. Check Product Existence & Stock
  // We check E-commerce products first (assuming online order)
  // If you want to check POS, you'd need logic to know which DB to look in.
  let product = await EcomerceProducts.findById(productId);
  let productType = 'Ecomerce';

  if (!product) {
    // Fallback: Check POS if not found in Ecom (optional, depends on your business logic)
    product = await POSProducts.findById(productId);
    productType = 'POS';
  }

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // 2. Validate Quantity
  if (product.quantity < quantity) {
    return res.status(400).json({ 
      message: `Insufficient stock. Only ${product.quantity} available.` 
    });
  }

  // 3. Create Order
  const order = await Order.create({
    productId,
    productModel: productType, // Useful for `refPath` in Mongoose to know which collection to populate
    userId,
    quantity,
    price: product.price, // Snapshot the price at time of purchase
    totalAmount: product.price * quantity,
    orderDate: new Date().toISOString(),
    status: 'Pending',
  });

  // 4. Deduct Stock
  product.quantity -= quantity;
  await product.save();

  res.status(201).json({
    message: 'Order created successfully',
    order,
  });
});

/**
 * 🟡 UPDATE PRODUCT
 * Handles updating existing products in POS, E-commerce, or both.
 */
const UpdateProduct = asyncHandler(async (req, res) => {
  const {
    productId,
    name,
    description,
    quantity,
    Selection, // "POS Only", "E-commerce Only", or "Both Platforms"
    id, // Acting User ID
    barcode,
    categoryName,
    soldAtPrice,
    actualPrice,
    costPrice,
    CompanyId,
  } = req.body;

  const files = req.files;

  // 1. Validation
  if (!productId || !id || !CompanyId) {
    return res.status(400).json({ message: 'Product ID, User ID, and Company ID are required' });
  }

  // 2. Identify Actor & Role
  const adminActor = await Admin.findById(id);
  const userActor = !adminActor ? await User.findById(id).populate('UserProfileId') : null;
  const actingUser = adminActor || userActor;

  if (!actingUser) {
    return res.status(404).json({ message: 'User or Admin not found' });
  }
  const actorRole = adminActor ? 'ADMIN' : 'USER';

  // 3. Find original product to determine source and current images
  // We check both to see where the product currently exists
  const posProduct = await POSProducts.findById(productId);
  const ecomProduct = await EcomerceProducts.findById(productId);
  const existingProduct = posProduct || ecomProduct;

  if (!existingProduct) {
    return res.status(404).json({ message: 'Product not found on any platform' });
  }

  // 4. Authorization Check
  const targetEntity = await Company.findById(CompanyId) || await Branch.findById(CompanyId);
  if (!targetEntity) {
    return res.status(404).json({ message: 'Company or Branch not found' });
  }

  if (actorRole === 'USER') {
    const isMember = targetEntity.CompanyUsers?.some(uId => uId.toString() === actingUser._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Access Denied: You do not belong to this entity' });
    }
  }

  // 5. Image Logic
  // If new files are uploaded, replace the array. Otherwise, keep the old ones.
  let imgPaths = existingProduct.img;
  if (files && Array.isArray(files) && files.length > 0) {
    imgPaths = files.map(file => file.filename);
  }

  // 6. Prepare Update Object
  const updateData = {
    name: name || existingProduct.name,
    description: description || existingProduct.description,
    categoryName: categoryName || existingProduct.categoryName,
    costPrice: costPrice !== undefined ? Number(costPrice) : existingProduct.costPrice,
    soldAtPrice: soldAtPrice !== undefined ? Number(soldAtPrice) : existingProduct.soldAtPrice,
    actualPrice: actualPrice !== undefined ? Number(actualPrice) : existingProduct.actualPrice,
    quantity: quantity !== undefined ? Number(quantity) : existingProduct.quantity,
    barcode: barcode || existingProduct.barcode, // Keep as string to avoid precision loss
    img: imgPaths,
    "UserUpload.lastModifiedBy": actingUser.Username,
    "UserUpload.lastModifiedDate": new Date().toISOString(),
  };

  // 7. Execute Synchronized Updates
  let updatedInPOS = null;
  let updatedInEcom = null;

  // Logic to handle cross-platform updates
  try {
    if (Selection === 'POS Only' || Selection === 'Both Platforms') {
      updatedInPOS = await POSProducts.findByIdAndUpdate(productId, updateData, { new: true });
    }

    if (Selection === 'E-commerce Only' || Selection === 'Both Platforms') {
      updatedInEcom = await EcomerceProducts.findByIdAndUpdate(productId, updateData, { new: true });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Database update failed', error: error.message });
  }

  if (!updatedInPOS && !updatedInEcom) {
    return res.status(400).json({ message: 'Failed to update product. Check Selection value.' });
  }

  // 8. Log the Action
  await Logs.create({
    actorId: actingUser._id,
    actorRole,
    action: 'PRODUCT_UPDATED',
    platform: Selection,
    metadata: { 
      productName: updateData.name, 
      targetName: targetEntity.name,
      platforms: Selection 
    },
    date: new Date().toISOString(),
  });

  res.status(200).json({
    message: `Product '${updateData.name}' updated successfully on ${Selection}`,
    product: updatedInPOS || updatedInEcom, // Return the updated document
  });
});
module.exports = {
  ProductRegs,
  CreateOrder,
  UpdateProduct
};