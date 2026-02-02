const axios = require('axios');
const asynchandler = require('express-async-handler');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');

// Note: Always use process.env for keys in production!
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY 

const transferToBank = asynchandler(async (req, res) => {
    const userid = req.userId;
    const { name, code, account_number, amount, companyId } = req.body;
  console.log(companyId)
    // 1. Validation
    if (!userid) return res.status(400).json({ 'message': 'userId is required' });
    if (!name || !code || !account_number || !amount || !companyId) {
        return res.status(400).json({ message: "Missing required transfer data." });
    }

    // 2. Find Company or Branch
    const foundcom = await Company.findById(companyId) || await Branch.findById(companyId);
    if (!foundcom) return res.status(404).json({ 'message': 'Company or Branch not found' });

    // 3. Balance Check
    // We sum the array [0, 1500] to get total available funds
    const currentBalance = foundcom.walletBalance.reduce((prv, sum) => prv + sum, 0);
    const transferAmount = Number(amount);

    if (currentBalance < transferAmount) {
        return res.status(403).json({ 'message': 'Insufficient balance' });
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
        // We assume the first index or a specific logic for your walletBalance array. 
        // Here, we update the balance by subtracting the amount.
        foundcom.walletBalance[foundcom.walletBalance.length - 1] -= transferAmount;
        await foundcom.save();

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