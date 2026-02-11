const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const Company = require('../Models/Company');
const Logs = require('../Models/UserLog');
const Admin = require('../Models/AdminOwner');
const Settings = require('../Models/CompanySetting');

// --- NODEMAILER TRANSPORTER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

  if (!Username || !Password || !Firstname || !Lastname || !Email || !CompanyName ) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  const adminFound = Adminid ? await Admin.findById(Adminid) : await Admin.findOne({ Username });
  if (!adminFound) return res.status(404).json({ message: 'Admin not found' });

  const companyExists = await Company.findOne({ CompanyName }).collation({ locale: 'en', strength: 2 });
  if (companyExists) {
    return res.status(409).json({ message: `'${CompanyName}' already exists.` });
  }

  const hashedPassword = await bcrypt.hash(Password, 10);

  const log = await Logs.create({
    name: `${Firstname} ${Lastname}`,
    Username,
    action: 'COMPANY_REGISTRATION',
    date: new Date(),
  });

  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const newCompany = await Company.create({
    Username,
    Password: hashedPassword,
    Firstname,
    Lastname,
    Email: Email.toLowerCase(),
    WalletNumber: Math.floor(100000 + Math.random() * 900000),
    Address: { StreetName, PostalNumber, Lat, Long },
    CompanyName,
    CAC_Number,
    UserLog: log._id,
    trialStartDate: new Date(),
    trialEndDate: trialEndDate,
    subscriptionStatus: 'trial',
    isSubscribed: false,
    maxBranches: 1,
    branchesCreated: 0,
    maxUsers: 5,
    usersCreated: 0,
  });

  await Settings.create({
    businessName: CompanyName,
    companyId: newCompany._id,
  });

  adminFound.companyId = newCompany._id;
  await adminFound.save();

  // --- 📧 SEND DESIGNED WELCOME EMAIL WITH POLICY ---
  const mailOptions = {
    from: `"YsStore Onboarding" <${process.env.EMAIL_USER}>`,
    to: Email, // Sending to the registered user's email
    attachments: [{
        filename: 'YSStore.png',
        path: 'http://localhost:3500/img/YSStore.png', 
        cid: 'ysstorelogo'
    }],
    subject: `Welcome to YsStore, ${CompanyName}!`,
    html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; color: #333;">
      
   <div style="background-color: #cdcdcd6f; padding: 0; position: relative; text-align: center;">
        <div style="background: linear-gradient(rgba(102, 198, 236, 0.8), rgba(102, 198, 236, 0.9));">
          <img src="cid:ysstorelogo" alt="YsStore Logo" width='100%' height="100%" style="  height: auto; display: block; margin: auto; filter: brightness(0) invert(1);">
        </div>
        <div style="background-color: #ffffff; height: 30px; border-top-left-radius: 30px; border-top-right-radius: 30px; margin-top: -30px;"></div>
      </div>
      
      <div style="padding: 0 40px 40px 40px;">
        <h2 style="color: #1a365d; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">Welcome Aboard!</h2>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Success! <strong style="color: #66c6ec;">${CompanyName}</strong> is now live. We’ve built a powerful environment for you to manage, scale, and thrive.
        </p>

        <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Registration Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7;"><strong>Account ID:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7; text-align: right; color: #1e293b;">${Username}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7;"><strong>Trial Status:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7; text-align: right; color: #059669; font-weight: 600;">Active (7 Days)</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Expires On:</strong></td>
              <td style="padding: 10px 0; text-align: right; color: #e11d48;">${trialEndDate.toDateString()}</td>
            </tr>
          </table>
        </div>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 40px 0;">

        <h2 style="color: #1e293b; font-size: 20px; text-align: center; margin-bottom: 25px;">YsStore Platform Policy</h2>
        
        <div style="font-size: 14px; color: #4b5563; line-height: 1.6;">
          <div style="margin-bottom: 20px;">
            <h4 style="color: #2563eb; margin-bottom: 5px;">1. Introduction</h4>
            <p style="margin: 0;">YsStore is a digital commerce platform designed to help manage products, sales, and operations efficiently. By using the platform, you agree to these terms.</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #2563eb; margin-bottom: 5px;">2. Data Security & Privacy</h4>
            <ul style="padding-left: 20px; margin: 0;">
              <li>Industry-standard security measures protect your business data.</li>
              <li>Your data will <strong>never</strong> be shared with third parties without consent.</li>
              <li>You remain the full owner of your data at all times.</li>
            </ul>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #2563eb; margin-bottom: 5px;">3. Multi-Branch Management</h4>
            <p style="margin: 0;">Create a company account and manage multiple branches centrally. Each branch maintains its own records while administrators enjoy full oversight.</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #2563eb; margin-bottom: 5px;">4. Secure Transaction Flow</h4>
            <p style="margin: 0; background-color: #fffbeb; padding: 10px; border-left: 4px solid #f59e0b;">
              <strong>Pending:</strong> Funds on hold during preparation.<br>
              <strong>Shipped:</strong> Seller marks order as delivered.<br>
              <strong>Released:</strong> Funds released upon delivery confirmation.
            </p>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="color: #2563eb; margin-bottom: 5px;">5. User Responsibility</h4>
            <p style="margin: 0;">Users must provide accurate information and deliver products as described. Fraudulent activity results in immediate account termination.</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 45px;">
          <a href="https://your-dashboard-link.com" style="background-color: #2563eb; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            Get Started Now
          </a>
        </div>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f3f4f6;">
        <p style="margin-bottom: 10px;">This policy is updated periodically to improve your experience.</p>
        <p style="margin-bottom: 20px;">&copy; ${new Date().getFullYear()} <strong>${CompanyName}</strong> via YsStore Platform.</p>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <a href="#" style="color: #64748b; margin: 0 10px; text-decoration: none;">Terms of Service</a>
          <a href="#" style="color: #64748b; margin: 0 10px; text-decoration: none;">Privacy Policy</a>
          <a href="#" style="color: #64748b; margin: 0 10px; text-decoration: none;">Support</a>
        </div>
      </div>
    </div>
    `
  };

  transporter.sendMail(mailOptions).catch(err => console.error("Welcome Email Error:", err));

  res.status(201).json({
    success: 201,
    message: `Company '${CompanyName}' registered successfully`,
    companyId: newCompany._id,
  });
});

module.exports = CompanyRegs;