const Jwt = require('jsonwebtoken');
const asynchandler = require("express-async-handler");
const User = require("../Models/User");
const CompanyUser = require("../Models/CompanyUsers");
const Company = require("../Models/AdminOwner");

const Verify = asynchandler(async (req, res, next) => {
    // 1. Extract Token
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(403).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify Token
        const decoded = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const { id, Username } = decoded.UserInfo;

        // 3. Search across all potential User Collections
        // We run these in parallel for better performance
        const [user, companyUser, admin] = await Promise.all([
            User.findById(id),
            CompanyUser.findById(id),
            Company.findById(id)
        ]);

        // 4. Identify the active account
        const foundAccount = user || companyUser || admin;

        if (!foundAccount) {
            return res.status(403).json({ message: "Access denied: Account not found" });
        }

        // 5. Status & Suspension Checks
        // Check if the specific user account is active
        if (foundAccount.Active === false) {
            return res.status(403).json({ 
                message: 'Your account is suspended. Contact Ys_support@gmail.com' 
            });
        }

        // 6. Company-level Suspension Check
        // If the user belongs to a company, check if the parent company is active
        if (companyUser || user) {
            const companyId = foundAccount.companyId || foundAccount.Company; 
            if (companyId) {
                const parentCompany = await Company.findById(companyId);
                if (parentCompany && parentCompany.Active === false) {
                    return res.status(403).json({ 
                        message: 'Your company is suspended. Contact Ys_support@gmail.com' 
                    });
                }
            }
        }

        // 7. Attach data to Request object
        // We attach the whole object (excluding password) for use in later routes
        req.user = foundAccount;
        req.userId = id;
        req.username = Username;
        req.userType = admin ? 'Admin' : (companyUser ? 'CompanyUser' : 'User');

        next();

    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
});

module.exports = Verify;