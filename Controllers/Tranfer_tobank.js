const axios = require('axios');
const asynchandler = require('express-async-handler');

const PAYSTACK_SECRET_KEY = 'sk_live_8881e5914c026b0962911655cdeb45fc8fb47bd5';

const transferToBank = asynchandler(async (req, res) => {
  try {
    const { name, code, account_number, amount } = req.body;
    console.log(req.body)

    if (!name || !code || !account_number || !amount) {
      return res.status(400).json({ message: "Missing required transfer data." });
    }
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
        amount: Number(amount) * 100, // convert naira to kobo
        recipient: recipient_code,
        reason: 'Ys wallet'
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(transferRes.data);
    res.status(201).json({ message: transferRes.data });

  } catch (error) {
    res.status(400).json({
      message: error.response?.data?.message || error.message
    });
  }
});

module.exports = transferToBank;
