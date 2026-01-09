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
  console.log(req.files)
  // 1. Validation
  if (!name || !quantity ||!barcode|| !Selection || !id || !CompanyId || !categoryName || !soldAtPrice || !actualPrice) {
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

  const baseProductData = {
    companyId: targetEntity._id,
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

module.exports = {
  ProductRegs,
  CreateOrder,
};