const Settings = require("../Models/CompanySetting");

/**
 * Ensures settings exist for a company or branch.
 * If creating for a branch, it attempts to inherit default values from the parent company.
 */
async function ensureSettings({ companyId = null, branchId = null }) {
  // 1. Define the search query
  const query = branchId ? { branchId } : { companyId };

  // 2. Try to find existing settings
  let settings = await Settings.findOne(query);

  // 3. If settings don't exist, create them
  if (!settings) {
    let defaults = {};

    // If it's a branch, try to inherit values from the parent company settings
    if (branchId && companyId) {
      const companyDefaults = await Settings.findOne({ companyId, branchId: null });
      if (companyDefaults) {
        // Convert to object and remove IDs so we don't overwrite the new branch IDs
        const { _id, createdAt, updatedAt, ...rest } = companyDefaults.toObject();
        defaults = rest;
      }
    }

    // Build payload without including a null branchId when creating company settings
    const payload = { ...defaults };
    if (branchId) {
      payload.branchId = branchId;
      if (companyId) payload.companyId = companyId;
    } else if (companyId) {
      payload.companyId = companyId;
    }

    // 4. Create the new settings document
    settings = await Settings.create(payload);
  }

  return settings;
}

module.exports = ensureSettings;