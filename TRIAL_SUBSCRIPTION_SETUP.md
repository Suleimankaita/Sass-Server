# 7-Day Trial & Subscription System Implementation

## Overview

This system implements a 7-day trial period for new companies. After the trial expires, only admins can log in. Users can log in again after subscribing.

## Files Modified/Created

### 1. **Models/Company.js** (Modified)

Added trial and subscription fields:

- `trialStartDate` - When the trial begins (set on company registration)
- `trialEndDate` - When the trial ends (7 days after registration)
- `isSubscribed` - Boolean to track if company has an active subscription
- `subscriptionEndDate` - When the current subscription expires
- `subscriptionPlan` - Current subscription tier (Free, Basic, Pro, Enterprise)
- `subscriptionStatus` - Current status (trial, active, expired, cancelled)

### 2. **utils/subscriptionCheck.js** (Created)

Utility functions to check subscription status:

#### `checkSubscriptionStatus(company)`

Returns the subscription status of a company:

- If subscribed and active: `{ isValid: true, status: 'active' }`
- If trial still valid: `{ isValid: true, status: 'trial', daysRemaining: X }`
- If trial expired: `{ isValid: false, status: 'trial_expired' }`
- If subscription expired: `{ isValid: false, status: 'expired' }`

#### `canUserLogin(user, company, userRole)`

Determines if a user can log in:

- **Admins**: Always can log in ✅
- **Regular Users**: Can log in only if trial is active OR subscription is active ❌

### 3. **Controllers/CompanyAuth.js** (Modified)

Updated login logic to:

1. Check if user exists and password matches
2. Call `canUserLogin()` to verify subscription status
3. Reject login with appropriate message if subscription expired
4. Allow login only for admins or users with valid trial/subscription

### 4. **Controllers/AdminAuth.js** (Modified)

Same subscription check as CompanyAuth to prevent admin team members from logging in after trial expires.

### 5. **Controllers/CompanyReg.js** (Modified)

When a company registers:

- Sets `trialStartDate` to current date
- Sets `trialEndDate` to 7 days from now
- Sets `subscriptionStatus` to 'trial'
- Sets `isSubscribed` to false

### 6. **Controllers/SubscriptionController.js** (Created)

Handles subscription management:

#### `getSubscriptionStatus(companyId)`

**Endpoint:** `GET /api/subscription/status/:companyId`
**Response:** Current subscription status and company info

#### `subscribeCompany(companyId)`

**Endpoint:** `POST /api/subscription/subscribe/:companyId`
**Body:**

```json
{
  "subscriptionPlan": "Basic|Pro|Enterprise",
  "durationMonths": 1,
  "paymentDetails": {}
}
```

**Action:** Activates subscription after payment

#### `renewSubscription(companyId)`

**Endpoint:** `POST /api/subscription/renew/:companyId`
**Body:**

```json
{
  "durationMonths": 1
}
```

**Action:** Extends subscription for additional months

#### `cancelSubscription(companyId)`

**Endpoint:** `POST /api/subscription/cancel/:companyId`
**Action:** Cancels the current subscription

### 7. **Routes/Subscription.js** (Created)

Express routes for all subscription management endpoints.

## Integration Steps

### Step 1: Add Subscription Routes to Main Routes File

In your `Routes/mainRoutes.js` or main server file, add:

```javascript
const subscriptionRoutes = require("./Routes/Subscription");

// Add this before app.listen()
app.use("/api/subscription", subscriptionRoutes);
```

### Step 2: Database Migration

For existing companies, run this script to add trial dates:

```javascript
const Company = require("./Models/Company");

async function addTrialDates() {
  try {
    const companies = await Company.find({
      trialStartDate: { $exists: false },
    });

    for (let company of companies) {
      company.trialStartDate = new Date(company.createdAt || Date.now());
      company.trialEndDate = new Date(
        company.trialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      company.subscriptionStatus = "trial";
      company.isSubscribed = false;
      await company.save();
    }

    console.log(`Updated ${companies.length} companies with trial dates`);
  } catch (err) {
    console.error("Migration error:", err);
  }
}

addTrialDates();
```

## User Flow

### 1. **New Company Registration**

- Company registers → Trial starts (7 days)
- `trialStartDate` = Today
- `trialEndDate` = Today + 7 days
- Admin can log in ✅
- Regular users can log in ✅

### 2. **During Trial Period (Days 1-7)**

- Admin can log in ✅
- Regular users can log in ✅
- Response includes: "Trial period active. X day(s) remaining."

### 3. **After Trial Expires**

- Admin can still log in ✅
- Regular users get error: "Trial period has expired. Please subscribe to continue." ❌

### 4. **After Admin Subscribes**

- Call: `POST /api/subscription/subscribe/:companyId`
- Set subscription plan, duration
- Both admins and regular users can log in ✅
- Response includes subscription end date

### 5. **Subscription Expires**

- Without renewal, users get error: "Subscription has expired. Please renew to continue." ❌
- Call: `POST /api/subscription/renew/:companyId` to extend

## API Examples

### Check Subscription Status

```bash
GET /api/subscription/status/company_id_here
```

Response:

```json
{
  "subscriptionStatus": {
    "isValid": true,
    "status": "trial",
    "message": "Trial period active. 5 day(s) remaining.",
    "daysRemaining": 5,
    "trialEndDate": "2026-01-26T10:00:00.000Z"
  },
  "company": {
    "_id": "company_id",
    "CompanyName": "My Company",
    "subscriptionPlan": "Free"
  }
}
```

### Subscribe Company

```bash
POST /api/subscription/subscribe/company_id_here
Content-Type: application/json

{
  "subscriptionPlan": "Pro",
  "durationMonths": 1,
  "paymentDetails": {
    "transactionId": "txn_12345",
    "amount": 9999
  }
}
```

### Renew Subscription

```bash
POST /api/subscription/renew/company_id_here
Content-Type: application/json

{
  "durationMonths": 12
}
```

## Error Messages to Frontend

| Scenario                    | Status | Message                                                   |
| --------------------------- | ------ | --------------------------------------------------------- |
| Valid trial                 | 200    | "Trial period active. X day(s) remaining."                |
| Valid subscription          | 200    | "Subscription is active"                                  |
| Trial expired               | 403    | "Trial period has expired. Please subscribe to continue." |
| Subscription expired        | 403    | "Subscription has expired. Please renew to continue."     |
| Account suspended           | 403    | "Account suspended. Contact support."                     |
| No valid trial/subscription | 403    | "No valid trial or subscription found."                   |

## Frontend Implementation Tips

1. **Login Response**: Check for `subscriptionStatus` field in error response
2. **Trial Banner**: Display remaining trial days from `daysRemaining` field
3. **Subscribe Prompt**: Show subscribe button when subscription expires
4. **Renewal Reminder**: Send notification before `subscriptionEndDate`

## Testing Checklist

- [ ] New company registration creates 7-day trial
- [ ] Admin can log in during trial
- [ ] Regular users can log in during trial
- [ ] After 7 days, regular users cannot log in
- [ ] After subscription, users can log in
- [ ] Admin always has access
- [ ] Subscription renewal extends end date
- [ ] Subscription cancellation prevents login
- [ ] Trial days remaining count decreases correctly

## Notes

- Trial period is **exactly 7 days** from registration
- Admins are identified by `Role === "Admin"`
- Subscription end dates should be calculated server-side to prevent client manipulation
- Add authentication middleware to subscription routes in production
- Consider adding payment gateway integration for automatic subscription updates
