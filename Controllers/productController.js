const asynchandler = require('express-async-handler');
const Product = require('../Models/Products');
const Order = require('../Models/User_order');
const Logss = require('../Models/UserLog');

// 🟢 ADD PRODUCT
const ProductRegs = asynchandler(async (req, res) => {
  try {
    const { name, description, price, quantity, user_add, img } = req.body;

    if (!name || !price || !quantity || !user_add,id)
      return res.status(400).json({ message: 'All required fields must be provided' });

    const newProduct = await Product.create({
      Product: [
        {
          name,
          description,
          price,
          quantity,
          user_add,
          img,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
        },
      ],
    });

    await Logss.create({
      Logs: [
        {
          name: user_add,
          Username: user_add,
          Password: 'N/A',
          Date: new Date().toISOString(),
          time: new Date().toLocaleTimeString(),
        },
      ],
    });

    res.status(201).json({
      message: `Product '${name}' added successfully`,
      product: newProduct,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 CREATE ORDER
const CreateOrder = asynchandler(async (req, res) => {
  try {
    const { productId, userId, quantity } = req.body;

    if (!productId || !userId || !quantity)
      return res.status(400).json({ message: 'All fields are required' });

    const order = await Order.create({
      productId,
      userId,
      quantity,
      orderDate: new Date().toISOString(),
      status: 'Pending',
    });

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { ProductRegs, CreateOrder };
