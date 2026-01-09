const Company = require("../Models/Company");
const Branch = require("../Models/Branch");

exports.getCategories = async (req, res) => {
    try {
        const { companyId, branchId } = req.query;
        let data;

        if (branchId) {
            // Find branch and populate the CategoriesId array
            data = await Branch.findById(branchId)
                .select("CategoriesId CompanyName") // Only get necessary fields
                .populate("CategoriesId");
            
            if (!data) return res.status(404).json({ message: "Branch not found" });
        } 
        else if (companyId) {
            // Find company and populate the CategoriesId array
            data = await Company.findById(companyId)
                .select("CategoriesId CompanyName")
                .populate("CategoriesId");

            if (!data) return res.status(404).json({ message: "Company not found" });
        } 
        else {
            return res.status(400).json({ message: "Please provide a branchId or companyId" });
        }

        return res.status(200).json({
            success: true,
            source: branchId ? "Branch" : "Company",
            categories: data.CategoriesId
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};