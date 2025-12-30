const Transaction = require('../Models/transactions');
const Branch = require('../Models/Branch');
const Company = require('../Models/Company');
const mongoose = require('mongoose');

const ALLOWED_TYPES = new Set(['income','expense','transfer','refund','Card Payment','Cash Payment','Pos Payment cash']);

async function addTransaction(req, res) {
    // Removed session and startTransaction for standalone MongoDB compatibility
    try {
        const { 
            targetId, 
            targetModel, 
            Transactiontype, 
            amount, 
            username, 
            userRole, 
            description 
        } = req.body;

        // 1. Validations
        if (!targetId || !targetModel || !Transactiontype || amount === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (!ALLOWED_TYPES.has(Transactiontype)) {
            return res.status(400).json({ success: false, message: 'Invalid Transaction type' });
        }

        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        // 2. Identify Target Model
        const Model = targetModel === 'Branch' ? Branch : targetModel === 'Company' ? Company : null;
        if (!Model) {
            return res.status(400).json({ success: false, message: 'Invalid targetModel. Use "Branch" or "Company"' });
        }

        // 3. Create the Transaction
        // We use create() normally without the session array wrapper
        const txn = await Transaction.create({
            Transactiontype,
            amount: amt,
            username,
            userRole,
            description,
            [targetModel.toLowerCase()]: targetId 
        });

        // 4. Update the Target Document
        const updatedTarget = await Model.findByIdAndUpdate(
            targetId, 
            { $set: { TransactionId: txn._id } }, 
            { new: true }
        );

        // 5. Cleanup if target not found
        if (!updatedTarget) {
            // Since we can't use transactions to rollback, we manually delete the txn
            await Transaction.findByIdAndDelete(txn._id);
            return res.status(404).json({ success: false, message: `${targetModel} not found` });
        }

        return res.status(201).json({ 
            success: true, 
            message: `Transaction linked to ${targetModel}`,
            data: txn 
        });

    } catch (error) {
        console.error('Transaction Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}


async function getTransactions(req, res) {
	try {
		const { limit = 100, skip = 0, branchId, companyId } = req.query;
		const filter = {};
		if (branchId) filter.branch = branchId;
		if (companyId) filter.company = companyId;

		const txns = await Transaction.find(filter)
			.sort({ createdAt: -1 })
			.skip(Number(skip))
			.limit(Math.min(Number(limit), 1000))
			.populate('branch')
			.populate('company');
		return res.status(200).json({ success: true, data: txns });
	} catch (error) {
		console.error('getTransactions error:', error);
		return res.status(500).json({ success: false, message: 'Server error' });
	}
}

module.exports = { addTransaction, getTransactions };

