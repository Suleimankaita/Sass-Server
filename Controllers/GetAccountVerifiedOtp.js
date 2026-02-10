const asyncHandler = require('express-async-handler');
const Admin = require('../Models/AdminOwner');
const CompanyUsers = require('../Models/CompanyUsers');
const Users = require('../Models/User');
const UserProfile = require('../Models/Userprofile');

const findAccount = async ({ Username, Email, userId }) => {
  if (userId) {
    let u = await Admin.findById(userId).exec();
    if (u) return { user: u, role: 'admin' };
    u = await CompanyUsers.findById(userId).exec();
    if (u) return { user: u, role: 'companyUser' };
    u = await Users.findById(userId).exec();
    if (u) return { user: u, role: 'user' };
    return null;
  }

  if (Username) {
    let u = await Admin.findOne({ Username }).exec();
    if (u) return { user: u, role: 'admin' };
    u = await CompanyUsers.findOne({ Username }).exec();
    if (u) return { user: u, role: 'companyUser' };
    u = await Users.findOne({ Username }).exec();
    if (u) return { user: u, role: 'user' };
    return null;
  }

  if (Email) {
    const emailLower = String(Email).toLowerCase().trim();
    const profile = await UserProfile.findOne({ Email: emailLower }).exec();
    if (!profile) return null;
    const pid = profile._id;
    let u = await Admin.findOne({ UserProfileId: pid }).exec();
    if (u) return { user: u, role: 'admin' };
    u = await CompanyUsers.findOne({ UserProfileId: pid }).exec();
    if (u) return { user: u, role: 'companyUser' };
    u = await Users.findOne({ UserProfileId: pid }).exec();
    if (u) return { user: u, role: 'user' };
    return null;
  }

  return null;
};

// GET OTP verification status for an account
const getAccountOtpStatus = asyncHandler(async (req, res) => {
  const  id  = req.userId

  if ( !id) {
    return res.status(400).json({ success: false, message: 'Provide userId' });
  }

  const result = await findAccount({ userId: id });
  if (!result || !result.user) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  const { user } = result;
  const isVerified = !!user.IsOtpverified;

  return res.status(200).json({ success: true, IsOtpverified: isVerified });
});

module.exports = { getAccountOtpStatus };
