const mongoose = require("mongoose");

const CategoriesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    normalizedName: {
        type: String,
        index: true,
        default: null
    },

    canonicalName: {
        type: String,
        index: true,
        default: null
    },

    embedding: {
        type: [Number],
        default: null
    },

    mergeStatus: {
        type: String,
        enum: ["none", "pending", "merged"],
        default: "none"
    },

    mergedInto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CateGories",
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("CateGories", CategoriesSchema);
