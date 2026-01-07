const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const Admin = require("../Models/AdminOwner");
const CompanyUser = require("../Models/CompanyUsers");
const User = require("../Models/User");
const Company = require("../Models/Company");

const { signAccessToken, signRefreshToken } = require("../utils/token");

// 🔁 Role → Model resolver
const resolveAccount = async (role, id) => {
    console.log(23 ,role ,id)
  switch (role) {
    case "Admin":
      return Admin.findById(id).populate('companyId').populate("UserProfileId").select("+refreshToken Active Verified ");
    case "Company_user":
      return CompanyUser.findById(id).select("+refreshToken Active CompanyId");
    case "User":
      return User.findById(id).populate('UserProfileId').select("+refreshToken Active UserProfileId");
    default:
      return null;
  }
};

exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.jwt||req.cookies?.AdminCookie;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  let payload;
  try {
    payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  
  const { id, Role, companyId,Username } = payload?.UserInfo;
  
  // 🔍 Resolve account dynamically
  const account = await resolveAccount(Role, id);

  if (!account) {
    return res.status(401).json({ message: "Account not found" });
  }

  // 🔒 Account checks
  if (!account.Active) {
    return res.status(403).json({ message: "Account disabled" });
  }
  
  if (Role === "Admin" && account.Active === false) {
    return res.status(403).json({ message: "Admin not verified" });
  }
  
  // 🏢 Company subscription validation
  if (Role === "company_user"||account.companyId||account.companyId._id) {
    const company = await Company.findById(account.companyId||account.companyId._id);
    if (!company) {
      return res.status(403).json({ message: "Company not found" });
    }
    
    if (company.expireAt && company.expireAt < new Date()) {
      return res
        .status(403)
        .json({ message: "Company subscription expired" });
    }
  }
  // console.log(payload)
  // 🔐 Refresh token match

  if (account.UserProfileId?.token !== refreshToken) {
    return res.status(401).json({ message: "Token mismatch" });
  }
  
  // ♻️ Rotate tokens
  const newAccessToken = signAccessToken({UserInfo: {
                Username,
                Role,
                 id:id,
                 companyId
                 
            }});
  const newRefreshToken = signRefreshToken({UserInfo: {
                Username,
                Role,
                 id:id||companyId,
            }});
  
  account.refreshToken = newRefreshToken;
  await account.save();
  
  // 🍪 Set cookie
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({
    accessToken: newAccessToken
  });
});
