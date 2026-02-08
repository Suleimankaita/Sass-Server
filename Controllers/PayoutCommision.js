const axios = require('axios');
const asynchandler = require('express-async-handler');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const Admin = require('../Models/AdminOwner');
const CompanyUsers = require('../Models/CompanyUsers');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;

const transferToBank = asynchandler(async (req, res) => {
    const userid = req.userId;
    // Added 'otp' to the destructured body
    const { name, code, account_number, amount, companyId, otp } = req.body;

    // 1. Validation
    if (!userid) return res.status(400).json({ message: 'userId is required' });
    if (!name || !code || !account_number || !amount || !companyId || !otp) {
        return res.status(400).json({ message: "Missing required transfer data or OTP." });
    }

    // 2. Find User and Validate Role
    const checkRoles = ['Admin', 'manager', 'Partner','SuperAdmin'];
   
    const userFound = await Admin.findById(userid) 
    
    if (!userFound || !checkRoles.includes(userFound.Role)) {
        return res.status(401).json({ message: "Unauthorized: Insufficient permissions." });
    }

    // --- 3. OTP VERIFICATION BLOCK ---
    // Assuming your model stores 'otp' and 'otpExpires'
    if (userFound.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP code." });
    }

    if (userFound.otpExpires < Date.now()) {
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Clear OTP after successful verification to prevent replay attacks
    userFound.otp = null;
    userFound.otpExpires = null;
    await userFound.save();
    // ---------------------------------

    // 4. Find Company or Branch
    
    // 5. Balance Check
    const currentBalance = userFound.walletBalance.reduce((prv, sum) => prv + sum, 0);
    const transferAmount = Number(amount);

    if (currentBalance < transferAmount) {
        return res.status(403).json({ message: 'Insufficient balance' });
    }

    try {
        // Step 1 — Create transfer recipient
        const recipientRes = await axios.post(
            'https://api.paystack.co/transferrecipient',
            {
                type: 'nuban',
                name,
                account_number,
                bank_code: code,
                currency: 'NGN'
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const recipient_code = recipientRes.data.data.recipient_code;

        // Step 2 — Initiate transfer
        const transferRes = await axios.post(
            'https://api.paystack.co/transfer',
            {
                source: 'balance',
                amount: transferAmount * 100, // Naira to Kobo
                recipient: recipient_code,
                reason: 'Wallet Payout'
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Step 3 — Deduct from Local Database
        userFound.walletBalance[userFound.walletBalance.length - 1] -= transferAmount;
        await userFound.save();

        res.status(201).json({ 
            success: true, 
            message: "Transfer initiated", 
            data: transferRes.data.data 
        });

    } catch (error) {
        console.error('Paystack Error:', error.response?.data || error.message);
        res.status(error.response?.status || 400).json({
            message: error.response?.data?.message || "Transfer failed at Paystack"
        });
    }
});

module.exports = transferToBank;