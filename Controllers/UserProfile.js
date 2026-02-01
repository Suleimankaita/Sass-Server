const asyncHandler = require('express-async-handler');
const User = require('../Models/User');
const CompanyUser = require('../Models/CompanyUsers');
const Admin = require('../Models/AdminOwner');

const GetProfile = asyncHandler(async (req, res) => {
  const id = req.userId;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'UserId required',
    });
  }

  let user = null;

  // 1️⃣ Try normal User
  user = await User.findById(id)
    .populate('UserProfileId')
    // .populate('OrderId')
    // .populate('NotificationId')
    .lean();

  // 2️⃣ Try Company User
  if (!user) {
    user = await CompanyUser.findById(id)
      .populate('UserProfileId')
    //   .populate('OrderId')
    //   .populate('NotificationId')
      .lean();
  }

  // 3️⃣ Try Admin
  if (!user) {
    user = await Admin.findById(id)
      .populate('UserProfileId')
    //   .populate('OrderId')
    //   .populate('NotificationId')
      .lean();
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json(user);
});

module.exports = GetProfile;
