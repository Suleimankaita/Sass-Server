// routes/forceLogoutRoutes.js
const express = require('express');
const router = express.Router();
const GlobalForceLogoutController = require('../Controllers/GlobalforceLogout');
const authenticate  = require('../Middleware/Verify');

// 🔐 All routes require SuperAdmin authentication

// 1. Global force logout - Clear ALL user tokens (excluding SuperAdmin)
router.post(
  '/global',
  authenticate,
  GlobalForceLogoutController.clearAllUserTokens
);

// 2. Selective force logout - Clear tokens by user type
// router.post(
//   '/selective',
//   authenticate,
//   GlobalForceLogoutController.clearTokensByUserType
// );

// // 3. Individual force logout - Clear token for specific user
// router.post(
//   '/individual',
//   authenticate,
//   GlobalForceLogoutController.clearTokenByUserId
// );

// 4. Get force logout statistics
// router.get(
//   '/stats',
//   authenticate,
//   GlobalForceLogoutController.getForceLogoutStats
// );

module.exports = router;