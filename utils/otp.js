const asynchandler=require('express-async-handler')
const Admin = require('../Models/AdminOwner');
const CompanyUsers = require('../Models/CompanyUsers');

constGenerate = asynchandler(async (req, res) => {
    const { userId } = req; // From your auth middleware

    const user = await Admin.findById(userId) || await CompanyUsers.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Generate the OTP
    const { code, expires } = generateOTP(10);

    // 2. Save to the database
    user.otp = code;
    user.otpExpires = expires;
    await user.save();

    // 3. Send via Email (Example using a hypothetical sendEmail function)
    // await sendEmail(user.email, "Your Payout Verification Code", `Your code is: ${code}`);

    res.status(200).json({ 
        success: true, 
        message: "A verification code has been sent to your registered email." 
    });
});

module.exports={Generate}