const Products = require("../Models/EcomerceProducts");
const Owner = require("../Models/AdminOwner");
const asyncHandler = require("express-async-handler");

const AddProducts = asyncHandler(async (req, res) => {
  const { name, description, quantity, user_add, price } = req.body;

  const img=req.files

  if (!name || !description || !quantity || !user_add || !img || !price) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Ensure img is always array
  const images = Array.isArray(img) ? img : [img];



  // Validate price & quantity
  if (isNaN(price) || isNaN(quantity)) {
    return res.status(400).json({ message: "Price and Quantity must be numbers" });
  }

  // 1️⃣ Check if the owner exists
  const owner = await Owner.findOne({ Username: user_add }).exec();
  if (!owner) {
    return res.status(404).json({ message: "Owner not found" });
  }

  // 2️⃣ Prevent duplicate product name for same owner
  const checkDuplicate = await Products.findOne({
    name: name,
    user_add: user_add
  });

  if (checkDuplicate) {
    return res.status(400).json({ message: "Product already exists for this user" });
  }

  // 3️⃣ Create Product
  const product = await Products.create({
    name,
    description,
    quantity: Number(quantity),
    user_add,
    img: images,
    price: Number(price)
  });

  // 4️⃣ Add product to Owner.ProductsId
  await Owner.updateOne(
    { Username: user_add },
    { $push: { ProductsId: product._id } }
  );

  return res.status(201).json({
    message: `Product '${name}' created successfully`,
    product
  });
});

module.exports = AddProducts;
