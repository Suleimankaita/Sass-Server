const asynchandler = require('express-async-handler');
const Company = require('../Models/Company');
const Billing = require('../Models/Billing');
const Admin = require('../Models/AdminOwner');
const User = require('../Models/User'); 
const nodemailer = require('nodemailer');
const { checkSubscriptionStatus } = require('../utils/subscriptionCheck');

/**
 * Nodemailer Transporter
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  // auth: {
  //   user: process.env.EMAIL_USER,
  //   pass: process.env.EMAIL_PASS,
  // },
        auth: { user: "suleiman20015kaita@gmail.com", pass: "wwwh pvxz cqvl htjm" }

});

/**
 * EMAIL HELPERS
 */
const sendSubscriptionEmail = async (email, companyName, plan, expiry) => {
  const mailOptions = {
    from: `"Billing System" <${process.env.EMAIL_USER}>`,
    to: email,
     attachments: [{
                    filename: 'YSStore.png',
                    path: 'http://localhost:3500/img/YSStore.png', // Ensure this is a valid local path or URL
                    cid: 'ysstorelogo'
                }],
    subject: `Success! ${companyName} is now on the ${plan} Plan`,
    html: `<h3>Subscription Active</h3>
           <p>Your company <b>${companyName}</b> has successfully subscribed to the <b>${plan}</b> plan.</p>
           <p>Expiry Date: ${new Date(expiry).toLocaleDateString()}</p>`
  };
  return transporter.sendMail(mailOptions);
};

const sendCommissionEmail = async (email, role, amount, companyName) => {
  const mailOptions = {
    from: `"Finance Alerts" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Commission Received: ₦${amount.toLocaleString()}`,
    html: `<h3>Hello ${role},</h3>
           <p>You have received a commission of <b>₦${amount.toLocaleString()}</b> from the subscription of <b>${companyName}</b>.</p>
           <p>This has been added to your wallet balance history.</p>`
  };
  return transporter.sendMail(mailOptions);
};

const PLAN_LIMITS = {
  Free: { maxBranches: 1, maxUsers: 5 },
  Basic: { maxBranches: 5, maxUsers: 10 },
  Pro: { maxBranches: 999999, maxUsers: 999999 },
  Enterprise: { maxBranches: 999999, maxUsers: 999999 },
};

/**
 * SUBSCRIBE COMPANY
 */
const subscribeCompany = asynchandler(async (req, res) => {
  try {
    const { companyId } = req.params;
    const { subscriptionPlan, durationMonths, amount, refrence, status, userEmail } = req.body;

    if (!subscriptionPlan || !PLAN_LIMITS[subscriptionPlan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // 1. Calculate Shares
    const partnerShare = amount * 0.20;
    const superAdminShare = amount * 0.80;

    // 2. Fetch Stakeholders to get their emails
    const superAdmins = await Admin.find({ Role: "SuperAdmin" }).populate('UserProfileId');
    const partners = await User.find({ Role: "Partner" }).populate('UserProfileId');

    // 3. Update DB (Push to Arrays)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + parseInt(durationMonths));

    const dbOps = [
      User.updateMany({ Role: "Partner" }, { $push: { walletBalance: partnerShare } }),
      Admin.updateMany({ Role: "SuperAdmin" }, { $push: { walletBalance: superAdminShare } }),
      company.set({
        isSubscribed: true,
        subscriptionStatus: 'active',
        subscriptionPlan,
        subscriptionEndDate,
        maxBranches: PLAN_LIMITS[subscriptionPlan].maxBranches,
        maxUsers: PLAN_LIMITS[subscriptionPlan].maxUsers
      }).save(),
      Billing.create({ companyId, amount, reference: refrence, status, planName: subscriptionPlan })
    ];

    await Promise.all(dbOps);

    // 4. Send All Emails (Non-blocking)
    // Send to Company
    sendSubscriptionEmail(userEmail="suleiman76kaita@gmail.com" || company.Email, company.CompanyName, subscriptionPlan, subscriptionEndDate);

    // Send to Partners
    partners.forEach(p => sendCommissionEmail(p.UserProfileId.Email, "Partner", partnerShare, company.CompanyName));
    
    // Send to SuperAdmins
    superAdmins.forEach(a => sendCommissionEmail(a.UserProfileId.Email, "SuperAdmin", superAdminShare, company.CompanyName));

    return res.status(200).json({ message: 'Subscription processed and commissions mailed', company });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * RENEW SUBSCRIPTION
 */
const renewSubscription = asynchandler(async (req, res) => {
  try {
    const { companyId } = req.params;
    const { durationMonths, amount, refrence, status, userEmail } = req.body;

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const partnerShare = amount * 0.20;
    const superAdminShare = amount * 0.80;

    const newEndDate = new Date(company.subscriptionEndDate > new Date() ? company.subscriptionEndDate : new Date());
    newEndDate.setMonth(newEndDate.getMonth() + parseInt(durationMonths));

    const superAdmins = await Admin.find({ Role: "SuperAdmin" }).populate('UserprofileId');
    const partners = await User.find({ Role: "Partner" }).populate('UserprofileId');

    await Promise.all([
      User.updateMany({ Role: "Partner" }, { $push: { walletBalance: partnerShare } }),
      Admin.updateMany({ Role: "SuperAdmin" }, { $push: { walletBalance: superAdminShare } }),
      company.set({ subscriptionEndDate: newEndDate, subscriptionStatus: 'active' }).save(),
      Billing.create({ companyId, amount, reference: refrence, status, planName: company.subscriptionPlan })
    ]);

    // Emails
    sendSubscriptionEmail(userEmail || company.Email, company.CompanyName, company.subscriptionPlan, newEndDate);
    partners.forEach(p => sendCommissionEmail(p.UserProfileId.Email, "Partner", partnerShare, company.CompanyName));
    superAdmins.forEach(a => sendCommissionEmail(a.UserProfileId.Email, "SuperAdmin", superAdminShare, company.CompanyName));

    return res.status(200).json({ message: 'Renewal successful', company });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * Get subscription status
 */
const getSubscriptionStatus = asynchandler(async (req, res) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId);
  if (!company) return res.status(404).json({ message: 'Company not found' });

  const billingHistory = await Billing.find({ companyId }).sort({ createdAt: -1 });
  const status = checkSubscriptionStatus(company);
  
  return res.status(200).json({
    subscriptionStatus: status,
    billing: billingHistory,
    company
  });
});

/**
 * Cancel subscription
 */
const cancelSubscription = asynchandler(async (req, res) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId);
  if (!company) return res.status(404).json({ message: 'Company not found' });

  company.isSubscribed = false;
  company.subscriptionStatus = 'cancelled';
  await company.save();

  return res.status(200).json({ message: 'Subscription cancelled', company });
});

module.exports = {
  getSubscriptionStatus,
  subscribeCompany,
  renewSubscription,
  cancelSubscription,
  PLAN_LIMITS,
};