const asyncHandler = require('express-async-handler');
const EcomerceProducts = require('../Models/EcomerceProducts');
const POSProducts = require('../Models/POSProduct');
const Order = require('../Models/User_order');
const Admin = require('../Models/AdminOwner');
const Logs = require('../Models/UserLog');
const User = require('../Models/User');
const Company = require('../Models/Company');

/**
 * 🟢 ADD PRODUCT
 */
const ProductRegs = asyncHandler(async (req, res) => {
  const { name, description, price, quantity, Selection, id, sku, barcode, costPrice, category, reorderLevel,CompanyId,categoryName } = req.body;
  const files = req.files;
  console.log(files)
  // 1. Validation
  if (!name || !price || !quantity || !Selection || !id||!CompanyId||!categoryName) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  // 2. Identify Actor (Person) AND Target (Company)
  let actingUser = null; // The person performing the action (for logs/names)
  let targetCompany = null; // The company document to save the product arrays to
  let actorRole = null;

  // Check if Admin
  const admin = await Admin.findById(id);
  if (admin) {
    actingUser = admin;
    // targetCompany = admin.companyId; // Products belong to the Company
    actorRole = 'ADMIN';
  }

  const companyFound=await Company.findById(CompanyId)
  console.log(companyFound)
  if(!companyFound)return res.status(404).json({message:'Company Not Found'}) 

      if(companyFound) {
         targetCompany = await Company.findById(CompanyId);
      }
  // Check if User (Staff)
  if (!actingUser) {
    const user = await User.findById(id).populate('UserProfileId'); // Assuming UserProfileId links to staff details
    // Note: You need logic here to find WHICH company the user belongs to. 
    // Assuming for now the user is linked to a company, or we pass companyId in body.
    // For this fix, I will assume we find the company via the user's profile or request.
    if (user) {
      actingUser = user; 
      actorRole = 'USER';
      // TODO: Ensure you fetch the correct company for this user. 
      // For now, I'll assume we might need to look it up or pass it. 
      // If user doesn't have companyId, this will fail. Let's assume passed in body or linked.
    
    }
  }

  if (!targetCompany) {
    return res.status(404).json({ message: 'Target Company not found for this user/admin' });
  }

  // 3. Prepare Shared Data (Crucial for Merging)
  // We MUST have a consistent SKU to link POS and Ecom versions later
  const finalSku = sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const imgPaths = files && Array.isArray(files) 
    ? files.map(file => file.filename) // Adjust based on your upload middleware (Multer/Cloudinary)
    : [];

  const baseProductData = {
    companyId: targetCompany._id, // Link product to company
    name,
    description,
    price,
    categoryName,
    costPrice,
    quantity,
    sku: finalSku, // Shared SKU
    barcode,
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

  let createdProducts = {};

  // 4. Create Documents based on Selection
  
  // --- POS Creation ---
  if (Selection === 'POS Only' || Selection === 'Both Platforms') {
    const posProduct = await POSProducts.create({
      ...baseProductData,
      ChangeLog: "POS"
    });
    
    // Push to Company Array
    if (!targetCompany.POSProductsId) targetCompany.POSProductsId = [];
    targetCompany.POSProductsId.push(posProduct._id);
    createdProducts.POS = posProduct;
  }

  // --- E-commerce Creation ---
  if (Selection === 'E-commerce Only' || Selection === 'Both Platforms') {
    const ecommerceProduct = await EcomerceProducts.create({
      ...baseProductData,
      ChangeLog: "Ecomerce"
    });

    // Push to Company Array
    if (!targetCompany.EcomerceProducts) targetCompany.EcomerceProducts = [];
    targetCompany.EcomerceProducts.push(ecommerceProduct._id);
    createdProducts.ECOMMERCE = ecommerceProduct;
  }

  // 5. Save Company (Updates the arrays)
  await targetCompany.save();

  // 6. Logging
  await Logs.create({
    actorId: actingUser._id,
    actorRole,
    actorName: actingUser.Firstname || actingUser.Username,
    action: 'PRODUCT_CREATED',
    platform: Selection,
    metadata: {
      productName: name,
      sku: finalSku,
      price,
      quantity,
    },
    date: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
  });

  res.status(201).json({
    message: `Product '${name}' published successfully`,
    sku: finalSku,
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