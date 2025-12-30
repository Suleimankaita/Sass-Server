const mongoose = require("mongoose");

const DealProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Human-readable company name
    company: { type: String, required: true },
    // Reference to the Company document for filtering
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    originalPrice: { type: Number, required: true },
    dealPrice: { type: Number, required: true },
    discount: { type: Number, required: true },
    unitsLeft: { type: Number, required: true },
    img: { type: String, required: true },
    // Optional: track total units initially available
    totalUnits: { type: Number, default: 50 },
      // startTime and dealEndTime are set by the server (not by clients)
      startTime: { type: Date, default: () => new Date() },
      // store deal end time for countdown — default to 24 hours from creation
      dealEndTime: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    // Optional: categories or tags
    categories: [{ type: String }],
    // Optional: active flag
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DealProduct", DealProductSchema);
