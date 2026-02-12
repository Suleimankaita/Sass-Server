const asyncHandler = require("express-async-handler");
const axios = require("axios");

const resolveAccount = asyncHandler(async (req, res) => {
  const { account_no } = req.body;

  if (!account_no || account_no.length !== 10) {
    return res.status(400).json({ error: "Valid 10-digit account number required" });
  }

  try {
    // 1️⃣ Get all banks
    const banksRes = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
      },
    });

    const banks = banksRes.data.data;


    // 2️⃣ Try resolving the account in parallel
    const resolvePromises = banks.map((bank) => axios
        .get("https://api.paystack.co/bank/resolve", {
          params: {
            account_number: account_no,
            bank_code: bank.code,
          },
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
          },
        })
        .then((response) => {
          if (response.data.status && response.data.data) {
            return {
              account_name: response.data.data.account_name,
              account_number: response.data.data.account_number,
              bank: bank.name,
              bank_code: bank.code,
              slug: bank.slug,
            };
          }
          return null;
        })
        .catch(() => null)
    );
    
    const results = await Promise.allSettled(resolvePromises);

    // 3️⃣ Filter successful matches
    const matches = results
      .map((r) => r.value)
      .filter((r) => r && r.account_name);
    if (matches.length > 0) {
      return res.json({
        count: matches.length,
        matches,
      });
    }

    return res.status(404).json({ error: "No matching bank found" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { resolveAccount };
