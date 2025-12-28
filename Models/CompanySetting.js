const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // Link to EITHER a Company OR a Branch
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        default: null
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null
    },
    
    // --- Identity ---
    businessName: { type: String, default: '' },
    address: { type: String, default: '' },
    companyLogo: { type: String, default: null }, 

    // --- Financials ---
    vatEnabled: { type: Boolean, default: true },
    vatRate: { type: Number, default: 15.0 },
    defaultTaxRateBase: { type: Number, default: 15 },
    primaryCurrency: { type: String, default: 'USD ($)' },
    secondaryCurrency: { type: String, default: 'EUR (€)' },
    showCurrencySymbol: { type: Boolean, default: false },

    // --- Operations ---
    copiesPerReceipt: { type: Number, default: 1 },
    showCompanyLogoReceipt: { type: Boolean, default: true },
    showItemImagesReceipt: { type: Boolean, default: false },
    selectedPrinter: { type: String, default: 'Default Printer' },
    
    // --- Security ---
    enableTimeRestrictions: { type: Boolean, default: false },
    loginStartTime: { type: String, default: '08:00' },
    loginEndTime: { type: String, default: '22:00' },
    
    disallowedUsersEnabled: { type: Boolean, default: false },
    disallowedUsersList: [{ type: String }], // List of emails/names

    backupFrequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], default: 'Daily' }
}, {
    timestamps: true 
});

// Prevent duplicate settings for the same entity
SettingsSchema.index({ companyId: 1 }, { unique: true, partialFilterExpression: { companyId: { $exists: true, $ne: null } } });
SettingsSchema.index({ branchId: 1 }, { unique: true, partialFilterExpression: { branchId: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Settings', SettingsSchema);