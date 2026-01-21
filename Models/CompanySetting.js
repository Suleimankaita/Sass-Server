const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema(
  {
    // ======================
    // Ownership (ONE only)
    // ======================
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },

    // ======================
    // Identity
    // ======================
    businessName: { type: String, default: "K S limited" },
    address: { type: String, default: "Address, City" },
    companyLogo: { type: String, default: null },
    slug: { type: String, default: null },

    // ======================
    // Financials
    // ======================
    vatEnabled: { type: Boolean, default: true },
    vatRate: { type: Number, default: 15 },
    defaultTaxRateBase: { type: Number, default: 15 },

    primaryCurrency: { type: String, default: "Naira (₦)" },
    secondaryCurrency: { type: String, default: "Naira (₦)" },
    showCurrencySymbol: { type: Boolean, default: false },

    // ======================
    // Operations
    // ======================
    copiesPerReceipt: { type: Number, default: 1 },
    showCompanyLogoReceipt: { type: Boolean, default: true },
    showItemImagesReceipt: { type: Boolean, default: false },
    selectedPrinter: { type: String, default: "Local PDF Printer" },

    // ======================
    // Security
    // ======================
    enableTimeRestrictions: { type: Boolean, default: true },
    loginStartTime: { type: String, default: "08:00" },
    loginEndTime: { type: String, default: "22:00" },

    disallowedUsersEnabled: { type: Boolean, default: true },
    disallowedUsersList: { type: [String], default: [] },

    // ======================
    // Data Management
    // ======================
    backupFrequency: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      default: "Daily",
    },
  },
  { timestamps: true }
);
SettingsSchema.pre("validate", function (next) {
  const hasCompany = !!this.companyId;
  const hasBranch = !!this.branchId;

  if (hasCompany === hasBranch) {
    return next(
      new Error(
        "Settings must belong to exactly ONE: companyId OR branchId"
      )
    );
  }

  next();
});
module.exports = mongoose.model("CompanySetting", SettingsSchema);