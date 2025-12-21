// controllers/adminController.js
const asyncHandler = require('express-async-handler');
// const Admin = require('../Models/AdminOwner');
const Company_User = require('../Models/CompanyUsers');
const use = require('../Models/User');
const Text = require('../Models/UserLog');

// Get all Admins with populated references
const getAllAdmins = asyncHandler(async (req, res) => {
  try {
    const admins = await use.find()
      .populate('username')
    //   .populate('ProductsId')
      .populate('UserLogId')
      .lean();

    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single Admin by ID
const getAdminById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await use.findById(id)
    //   .populate('username')
    //   .populate('ProductsId')
      .populate('UserLogId')
      .lean();
        console.log(admin)
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { getAllAdmins, getAdminById };
