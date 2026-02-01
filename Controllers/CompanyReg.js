const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');

const Company = require('../Models/Company');
const Logs = require('../Models/UserLog');
const Admin = require('../Models/AdminOwner');
const Settings = require('../Models/CompanySetting');

// 🟢 COMPANY REGISTRATION
const CompanyRegs = asyncHandler(async (req, res) => {
  const {
    Username,
    Password,
    Firstname,
    Lastname,
    Adminid,
    StreetName,
    PostalNumber,
    Lat,
    Long,
    Email,
    CompanyName,
    CAC_Number,
  } = req.body;

  // 🔴 Required fields validation
  if (
    !Username ||
    !Password ||
    !Firstname ||
    !Lastname ||
    !Email ||
    !CompanyName ||
    !CAC_Number
  ) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  // 🔍 Find admin (by id or username)
  const adminFound = Adminid
    ? await Admin.findById(Adminid)
    : await Admin.findOne({ Username });

  if (!adminFound) {
    return res.status(404).json({ message: 'Admin not found' });
  }

  // 🔍 Check company name uniqueness (case-insensitive)
  const companyExists = await Company.findOne({ CompanyName })
    .collation({ locale: 'en', strength: 2 });

  if (companyExists) {
    return res.status(409).json({
      message: `'${CompanyName}' already exists. You can register it as a branch instead.`,
    });
  }

  // 🔐 Hash password
  const hashedPassword = await bcrypt.hash(Password, 10);

  // 🧾 Create audit log
  const log = await Logs.create({
    name: `${Firstname} ${Lastname}`,
    Username,
    action: 'COMPANY_REGISTRATION',
    date: new Date(),
  });

  // 🏢 Create company
  const newCompany = await Company.create({
    Username,
    Password: hashedPassword,
    Firstname,
    Lastname,
    Email: Email.toLowerCase(),
    WalletNumber: Math.floor(100000 + Math.random() * 900000),
    Address: {
      StreetName,
      PostalNumber,
      Lat,
      Long,
    },
    CompanyName,
    CAC_Number,
    UserLog: log._id,

    // Trial configuration
    trialStartDate: new Date(),
    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    subscriptionStatus: 'trial',
    isSubscribed: false,

    // Limits
    maxBranches: 1,
    branchesCreated: 0,
    maxUsers: 5,
    usersCreated: 0,
  });

  // ⚙️ Create company settings
  await Settings.create({
    businessName: CompanyName,
    companyId: newCompany._id,
  });

  // 🔗 Attach company to admin
  adminFound.companyId = newCompany._id;
  await adminFound.save();

  // ✅ Success response
  res.status(201).json({
    success: 201,
    message: `Company '${CompanyName}' registered successfully`,
    companyId: newCompany._id,
  });
});

module.exports = CompanyRegs;
