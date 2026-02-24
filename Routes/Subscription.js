const express = require('express');
const router = express.Router();
const {
  getSubscriptionStatus,
  subscribeCompany,
  renewSubscription,
  GetAllBilling,
  cancelSubscription,
} = require('../Controllers/SubscriptionController');

/**
 * @route GET /api/subscription/status/:companyId
 * @desc Get company subscription status
 * @access Public (but should add auth middleware in production)
 */
router.get('/GetAllbilling', GetAllBilling);
router.get('/status/:companyId', getSubscriptionStatus);

/**
 * @route POST /api/subscription/subscribe/:companyId
 * @desc Subscribe company to a plan after payment
 * @access Private (admin only)
 * @body {
 *   subscriptionPlan: "Basic|Pro|Enterprise",
 *   durationMonths: number,
 *   paymentDetails: object (optional)
 * }
 */
router.post('/subscribe/:companyId', subscribeCompany);

/**
 * @route POST /api/subscription/renew/:companyId
 * @desc Renew company subscription
 * @access Private (admin only)
 * @body {
 *   durationMonths: number
 * }
 */
router.post('/renew/:companyId', renewSubscription);

/**
 * @route POST /api/subscription/cancel/:companyId
 * @desc Cancel company subscription
 * @access Private (admin only)
 */
router.post('/cancel/:companyId', cancelSubscription);

module.exports = router;
