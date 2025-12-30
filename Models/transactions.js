const mongosee = require('mongoose');

const TransactionSchema = new mongosee.Schema({
    Transactiontype: {
        type: String,
        enum: ['income', 'expense', 'transfer', 'refund', 'Card Payment', 'Pos Payment cash'],
    },
    amount: { type: Number, required: true },
    Date: {
        type: String,
        default: () => new Date().toISOString().split('T')[0],
    },
    Time: {
        type: String,
        default: () => new Date().toLocaleTimeString(),
    },
    username: { type: String, required: true },
    userRole: { type: String, required: true },
    description: { type: String },
    company: { type: mongosee.Schema.Types.ObjectId, ref: 'Company' },
    branch: { type: mongosee.Schema.Types.ObjectId, ref: 'Branch' },
}, {
    timestamps: true,
});

module.exports = mongosee.model('Transaction', TransactionSchema);