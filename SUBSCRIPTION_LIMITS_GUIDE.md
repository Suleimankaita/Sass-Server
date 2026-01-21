# Subscription Plan Limits - Implementation Guide

## Overview

This system enforces subscription-based limits on:

- **Number of branches** that can be created
- **Number of users** that can be created

## Subscription Plans & Limits

| Plan           | Max Branches | Max Users | Description           |
| -------------- | ------------ | --------- | --------------------- |
| **Free**       | 1            | 5         | Trial period (7 days) |
| **Basic**      | 1            | 5         | Basic business plan   |
| **Pro**        | Unlimited    | Unlimited | Professional plan     |
| **Enterprise** | Unlimited    | Unlimited | Enterprise plan       |

## Files Modified/Created

### 1. **Models/Company.js** (Modified)

Added subscription limit fields:

- `maxBranches` - Maximum branches allowed based on plan
- `branchesCreated` - Current number of branches created (counter)
- `maxUsers` - Maximum users allowed based on plan
- `usersCreated` - Current number of users created (counter)

### 2. **Controllers/SubscriptionController.js** (Modified)

Enhanced subscription management:

- Added `PLAN_LIMITS` configuration object
- Updated `subscribeCompany()` to set `maxBranches` and `maxUsers` based on subscription plan
- Returns limit information in responses

### 3. **Middleware/SubscriptionLimits.js** (Created)

Two middleware functions for checking limits:

#### `checkBranchLimit`

- Verifies company subscription status
- Checks if `branchesCreated < maxBranches`
- Returns error if limit exceeded
- Attaches company to `req.company`

#### `checkUserLimit`

- Verifies company subscription status
- Checks if `usersCreated < maxUsers`
- Returns error if limit exceeded
- Finds company from either Company or Branch
- Attaches company to `req.company`

### 4. **Routes/CreateBranch.js** (Modified)

Added `checkBranchLimit` middleware:

```javascript
route.route("/").post(Verify, checkBranchLimit, CreateBranch);
```

### 5. **Routes/CompanyUsersRegs.js** (Modified)

Added `checkUserLimit` middleware:

```javascript
route.route("/").post(verify, checkUserLimit, CompanyUsersRegs);
```

### 6. **Controllers/CreateBranch.js** (Modified)

- Checks branch limit before creation
- Increments `branchesCreated` counter on successful creation
- Returns current branch count in response

### 7. **Controllers/CompanyUserReg.js** (Modified)

- Checks user limit before creation
- Increments `usersCreated` counter on successful creation
- Returns current user count in response
- Finds company from either Company or Branch target

### 8. **Controllers/CompanyReg.js** (Modified)

- Sets default limits when company registers (1 branch, 5 users)
- Initializes `branchesCreated` and `usersCreated` to 0

## How It Works

### Branch Creation Flow

```
User requests to create branch
    ↓
Verify middleware checks authentication
    ↓
checkBranchLimit middleware:
  - Gets company by targetCompanyId
  - Checks subscription status (trial/active/expired)
  - Checks if branchesCreated < maxBranches
    ↓ (Pass)
CreateBranch controller:
  - Creates branch
  - Increments company.branchesCreated += 1
  - Saves company
    ↓
Return success with updated counts
```

### User Creation Flow

```
User requests to create staff user
    ↓
Verify middleware checks authentication
    ↓
checkUserLimit middleware:
  - Gets targetId (company or branch)
  - Finds associated company
  - Checks subscription status
  - Checks if usersCreated < maxUsers
    ↓ (Pass)
CompanyUserReg controller:
  - Creates user
  - Increments company.usersCreated += 1
  - Saves company
    ↓
Return success with updated counts
```

## Error Responses

### Branch Limit Exceeded

```json
{
  "message": "Branch limit reached. You have created 1 out of 1 allowed branches for your Basic plan.",
  "branchesCreated": 1,
  "maxBranches": 1,
  "subscriptionPlan": "Basic",
  "upgrade": "Please upgrade your subscription plan to create more branches"
}
```

### User Limit Exceeded

```json
{
  "message": "User limit reached. You have created 5 out of 5 allowed users for your Basic plan.",
  "usersCreated": 5,
  "maxUsers": 5,
  "subscriptionPlan": "Basic",
  "upgrade": "Please upgrade your subscription plan to create more users"
}
```

### Subscription Expired

```json
{
  "message": "Cannot create branch: Trial period has expired. Please subscribe to continue.",
  "subscriptionStatus": "trial_expired"
}
```

## API Examples

### Get Subscription Status with Limits

```bash
GET /api/subscription/status/{companyId}
```

Response:

```json
{
  "subscriptionStatus": {
    "isValid": true,
    "status": "active",
    "message": "Subscription is active"
  },
  "company": {
    "_id": "...",
    "CompanyName": "My Business",
    "subscriptionPlan": "Pro",
    "branchesCreated": 3,
    "maxBranches": 999999,
    "usersCreated": 25,
    "maxUsers": 999999
  }
}
```

### Subscribe to Pro Plan (Unlimited)

```bash
POST /api/subscription/subscribe/{companyId}
Content-Type: application/json

{
  "subscriptionPlan": "Pro",
  "durationMonths": 12,
  "paymentDetails": {
    "transactionId": "txn_12345"
  }
}
```

Response includes:

```json
{
  "maxBranches": 999999,
  "maxUsers": 999999
}
```

### Create Branch (With Limits Check)

```bash
POST /api/branches
Content-Type: application/json
Authorization: Bearer {token}

{
  "CompanyName": "Branch 2",
  "targetCompanyId": "...",
  "lat": 6.5244,
  "long": 3.3792,
  "street": "123 Main St",
  "postalNumber": 100001,
  "CompanyEmail": "branch2@company.com",
  "CompanyPassword": "secure_password"
}
```

Response:

```json
{
  "success": true,
  "message": "Branch successfully created...",
  "branchId": "...",
  "branchesCreated": 1,
  "maxBranches": 1
}
```

### Create User (With Limits Check)

```bash
POST /api/staff
Content-Type: application/json
Authorization: Bearer {token}

{
  "Username": "john_doe",
  "Password": "password123",
  "Firstname": "John",
  "Lastname": "Doe",
  "Email": "john@company.com",
  "Role": "cashier",
  "targetId": "...",
  "StreetName": "123 Main St",
  "PostalNumber": 100001,
  "Lat": 6.5244,
  "Long": 3.3792
}
```

Response:

```json
{
  "success": true,
  "message": "User successfully registered...",
  "data": {
    "userId": "...",
    "linkedTo": "company",
    "targetId": "...",
    "usersCreated": 1,
    "maxUsers": 5
  }
}
```

## Usage Examples

### Scenario 1: Basic Plan User (1 branch, 5 users)

```
1. Company registers (trial starts)
   - maxBranches: 1
   - maxUsers: 5
   - branchesCreated: 0
   - usersCreated: 0

2. Admin creates 1 branch ✅
   - branchesCreated: 1
   - Attempt to create 2nd branch ❌ (limit reached)

3. Admin creates 5 users ✅
   - usersCreated: 5
   - Attempt to create 6th user ❌ (limit reached)

4. Admin subscribes to Pro plan
   - maxBranches: 999999 (unlimited)
   - maxUsers: 999999 (unlimited)
   - Counters reset or continue from current
   - Can create unlimited branches ✅
   - Can create unlimited users ✅
```

### Scenario 2: Trial Expired Before Subscribing

```
1. Company registers (7-day trial starts)
2. User tries to create branch on day 8
   - checkBranchLimit detects trial expired
   - Returns error: "Cannot create branch: Trial period has expired..."
   - User cannot create resources until subscribed
```

### Scenario 3: Subscription Expired Without Renewal

```
1. Company subscribed to Basic for 1 month
2. Admin creates 1 branch
3. Month expires (no renewal)
4. User tries to create 2nd branch
   - checkBranchLimit detects subscription expired
   - Returns error: "Cannot create branch: Subscription has expired..."
   - Must renew subscription to continue
```

## Database Queries

### Find companies by plan

```javascript
const proPlanCompanies = await Company.find({
  subscriptionPlan: "Pro",
  subscriptionStatus: "active",
});
```

### Find companies at branch limit

```javascript
const atLimit = await Company.find({
  $expr: { $eq: ["$branchesCreated", "$maxBranches"] },
});
```

### Find companies near user limit

```javascript
const nearLimit = await Company.find({
  $expr: {
    $gte: [
      { $divide: ["$usersCreated", "$maxUsers"] },
      0.8, // 80% or more
    ],
  },
});
```

## Admin Operations

### Upgrade Company Plan (Force)

```javascript
const company = await Company.findById(companyId);
company.subscriptionPlan = "Pro";
company.maxBranches = 999999;
company.maxUsers = 999999;
await company.save();
```

### Reset Counters (For Testing)

```javascript
const company = await Company.findById(companyId);
company.branchesCreated = 0;
company.usersCreated = 0;
await company.save();
```

### Force Branch/User Deletion

```javascript
// When deleting a branch
company.branchesCreated -= 1;
await company.save();

// When deleting a user
company.usersCreated -= 1;
await company.save();
```

## Recommended Enhancements

1. **Add decrement logic** when branches/users are deleted
2. **Implement usage alerts** when reaching 80% of limit
3. **Add bulk operations** for faster migrations
4. **Create audit logs** for all subscription changes
5. **Implement grace period** for subscription expiry (e.g., 7 days)
6. **Add soft limits** that issue warnings but allow operations
7. **Create admin dashboard** to manage all subscriptions
8. **Implement billing integration** for automatic payments

## Testing Checklist

- [ ] Basic plan: Can create 1 branch ✅, 2nd branch blocked ❌
- [ ] Basic plan: Can create 5 users ✅, 6th user blocked ❌
- [ ] Pro plan: Can create unlimited branches ✅
- [ ] Pro plan: Can create unlimited users ✅
- [ ] Trial period: Blocks operations after 7 days
- [ ] Subscription expired: Blocks all operations
- [ ] Subscription renewed: Allows operations again
- [ ] Upgrade from Basic to Pro: Removes limits ✅
- [ ] Counters increment correctly
- [ ] Middleware returns proper error messages
