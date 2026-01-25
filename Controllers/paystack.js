const axios = require("axios");
const asyncHandler = require("express-async-handler");
const Order = require("../Models/User_order"); // adjust path

/**
 * POST /api/orders/paystack
 * Frontend sends full order payload + paymentReference
 */
const createOrderWithPaystack = asyncHandler(async (req, res) => {
    const { paymentReference } = req.body;

    if (!paymentReference) {
        return res.status(400).json({ message: "Payment reference required" });
    }

    // 1. Verify payment with Paystack
    const verification = await axios.get(
        `https://api.paystack.co/transaction/verify/${paymentReference}`,
        {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
            },
        }
    );

    if (!verification.data.status) {
        return res.status(400).json({ message: "Payment verification failed" });
    }

    const paystackData = verification.data.data;

    if (paystackData.status !== "success") {
        return res.status(400).json({
            message: "Payment not successful",
            paymentStatus: paystackData.status,
        });
    }

    // 2. Prevent duplicate orders
    const existingOrder = await Order.findOne({ paymentReference });
    if (existingOrder) {
        return res.status(409).json({
            message: "Order already created for this payment",
        });
    }

    // 3. Create order (safe)
    const order = await Order.create({
        ...req.body,
        paid: true,
        paymentStatus: "success",
        amountPaid: paystackData.amount / 100,
        paymentGateway: "paystack",
    });

    res.status(201).json({
        message: "Order created successfully",
        order,
    });
});

module.exports = {
    createOrderWithPaystack,
};