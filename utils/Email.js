const nodemailer = require('nodemailer');

const sendOTPEmail = async (targetEmail, otpCode, companyName = "Your Brand") => {
  // 1. Setup Transporter (Use your SMTP details)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  // 2. Email Content with Logo Placeholder
  const mailOptions = {
    from: `"${companyName} Security" <no-reply@yourcompany.com>`,
    to: targetEmail,
    subject: "Action Required: Payout Verification Code",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://your-domain.com/path-to-logo.png" alt="${companyName} Logo" style="width: 150px; height: auto;" />
        </div>
        <h2 style="color: #333; text-align: center;">Verification Code</h2>
        <p style="color: #666; font-size: 16px;">Hello,</p>
        <p style="color: #666; font-size: 16px;">You requested a payout from your wallet. Please use the following One-Time Password (OTP) to authorize this transaction:</p>
        
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otpCode}</span>
        </div>

        <p style="color: #ff4d4d; font-size: 12px; font-weight: bold;">Note: This code expires in 10 minutes. If you did not initiate this request, please secure your account immediately.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 10px; text-align: center;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };