/**
 * =========================================
 * HIGH PERFORMANCE SAAS SERVER (CLUSTERED)
 * Setup: Sticky Sessions + Cluster Adapter + Health Monitoring
 * =========================================
 */

require("dotenv").config();
const cluster = require("cluster");
const os = require("os");
const path = require("path");
const http = require("http");
const {Getproducts}=require("./Controllers/Getproducts")
const {GetUserSaleData}=require("./Controllers/GetUserSaleData")
const {GetBranchproducts}=require("./Controllers/GetBranchProducts")
const {AllBracodeGetproducts}=require("./Controllers/AllProductsBarcode")
const initNotificationCron= require("./Controllers/initNotificationCron")
const { Server } = require("socket.io");
const socketController=require("./Controllers/UpdateDeliveryProduct");
const { initCustomerCare } = require('./Controllers/ticketSocket');
// Sticky & Cluster Adapter Dependencies
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const admin=require('./Models/AdminOwner')
const User=require('./Models/User')
const CompanyUsers=require('./Models/CompanyUsers')
// --- Configuration ---
const PORT = process.env.PORT || 3500;
const numCPUs = os.cpus().length;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * ==========================
 * MASTER PROCESS
 * ==========================
 */

if (cluster.isPrimary) {
    console.log(`[Master] PID: ${process.pid} running`);

    const httpServer = http.createServer();

    // Setup Sticky Sessions on Master
    setupMaster(httpServer, {
        loadBalancingMethod: "least-connection", 
    });

    // Setup Cluster Adapter Primary
    setupPrimary();


    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker) => {
        console.error(`[Master] Worker ${worker.process.pid} died. Restarting...`);
        setTimeout(() => cluster.fork(), 1000);
    });

    return ; 
}
   

/**
 * ==========================
 * WORKER PROCESS
 * ==========================
 */
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const createError = require("http-errors");
const multer = require("multer");
// const os = require("os");
const osu = require("os-utils");
const origin= require("./Config/Origin");
const { getDiskInfoSync } = require("node-disk-info");
const corsOptions = require("./Config/Origin"); // import the full options object
const connectDB = require("./Config/Connecton");
const Company = require("./Models/Company");
const Branch = require("./Models/Branch");
const Transaction = require("./Models/transactions");
const asyncHandler=require('express-async-handler')
const bodyParser=require('body-parser')
const app = express();
// FIX: Ensure req.query is available for sanitizers
app.set('query parser', 'extended'); 

console.log(os.type());
const httpServer = http.createServer(app);

// Connect to Database
connectDB();

app.use(cors(corsOptions));
/**
 * 1. BASIC SECURITY & LOGGING
 */
// app.use(helmet());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Resource-Policy");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.use(morgan(IS_PRODUCTION ? "combined" : "dev"));

const allowedOrigins = [
     'http://localhost:5173',
  "http://172.20.10.6:3500",
     'http://172.20.10.2:5173',
     'http://172.20.10.3:5173',
  'http://127.0.0.1:5173',
  "https://172.20.10.2:5173/",
  'https://your-production-domain.com'
];



/**
 * 2. BODY PARSERS & SANITIZATION
 */

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true })); // Changed to true for nested objects
app.use(cookieParser());
app.use(compression());

// Uncommented and Fixed MongoSanitize
app.use((req, res, next) => {
    req.query = req.query || {}; // Safety net
    next();
});
// app.use(
//   mongoSanitize({
//     allowDots: true, 
//     replaceWith: '_', 
//   })
// );
app.use(hpp());           

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api", limiter);

 httpServer.listen(PORT,'0.0.0.0', () => {
       return console.log(`[Master] Gateway listening on port ${PORT}`);
    });

    // app.use((req, res, next) => {
   initNotificationCron()
//       next();
// });
/**
 * 3. SOCKET.IO SETUP (CLUSTERED)
 */
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
});

io.adapter(createAdapter());
setupWorker(io); 

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Initialize ticket socket handlers

socketController(io);
io.on("connection", (socket) => {
  // connected to worker
  // setInterval(() => {

    socket.on("join_identity_room", (id) => {
    socket.join(id.toString());
    console.log(`Socket ${socket.id} joined room: ${id}`);
  });

  // Optional: Specific room for SuperAdmins
  socket.on("join_admin_pool", () => {
    socket.join("super_admins");
  });
    socket.on('loc',(coords)=>{
      console.log(coords)
    })
    
    initCustomerCare(io);
    // setInterval(() => {
      
    //   initNotificationCron(io);
    // }, 1000);
    Getproducts(io);
    AllBracodeGetproducts(io);
    GetUserSaleData(io);
    GetBranchproducts(io);
    // }, 1000);
    
});

/**
 * 4. STATIC FILES & MULTER
 */
app.use(express.static(path.join(__dirname, "Public"), { maxAge: '1d' }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "Public/img")),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * =====================================
 * 5. SERVER HEALTH CHECK ENDPOINT
 * =====================================
 */
const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
app.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();

  osu.cpuUsage(cpu => {
    // --- MEMORY ---
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsedPercent = ((totalMem - freeMem) / totalMem) * 100;

    // --- DISK ---
    let diskUsedPercent = 0;
    try {
      const disk = getDiskInfoSync()[0];
      diskUsedPercent =
        ((disk.blocks - disk.available) / disk.blocks) * 100;
    } catch (err) {
      diskUsedPercent = 0; // fail-safe
    }

    // --- CPU ---
    const cpuPercent = cpu * 100;

    // --- HEALTH SCORING ---
    let score = 0;

    // CPU (25%)
    score += cpuPercent <= 30 ? 25 :
             cpuPercent <= 50 ? 20 :
             cpuPercent <= 70 ? 12 :
             cpuPercent <= 85 ? 6 : 0;

    // Memory (25%)
    score += memUsedPercent <= 50 ? 25 :
             memUsedPercent <= 65 ? 18 :
             memUsedPercent <= 80 ? 10 : 0;

    // Disk (20%)
    score += diskUsedPercent <= 60 ? 20 :
             diskUsedPercent <= 75 ? 14 :
             diskUsedPercent <= 90 ? 6 : 0;

    // App uptime (20%)
    score += process.uptime() > 60 ? 20 : 5;

    // Socket / latency assumption (10%)
    score += 10;

    const healthStatus =
      score >= 90 ? "Excellent" :
      score >= 75 ? "Good" :
      score >= 60 ? "Fair" :
      "Critical";

    const healthCheck = {
      status: "UP",
      health_percent: score,
      health_label: healthStatus,
      timestamp: new Date(),

      worker: {
        pid: process.pid,
        uptime: process.uptime().toFixed(2) + " seconds",
      },

      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        used_percent: memUsedPercent.toFixed(1) + "%",
      },

      system: {
        cpu_usage: cpuPercent.toFixed(1) + "%",
        load_avg: os.loadavg(),
        free_mem: formatBytes(freeMem),
        total_mem: formatBytes(totalMem),
        disk_used: diskUsedPercent.toFixed(1) + "%",
      },

      socket_io: {
        connected_clients: io.engine.clientsCount,
      },
    };

    res.status(200).json(healthCheck);
  });
});
const apiRoutes = express.Router();

 


// app.use(require('./Middleware/Verify'))

app.post(
  "/paystack/webhook",
  bodyParser.raw({ type: "*/*" }),
  asyncHandler(async (req, res) => {
    console.log("✅ Paystack Webhook triggered!");

    // log entire body to debug
    console.log("🧾 RAW BODY (buffer):", req.body);
    try {
      if (!req.body || !req.body.length) {
        console.log("❌ Empty body received");
        return res.sendStatus(200);
      }

      const secret = process.env.PAYSTACK_KEY;
      const signature = req.headers["x-paystack-signature"];

      if (!signature) {
        console.log("❌ Missing Paystack signature");
        return res.sendStatus(400);
      }

      // Verify signature
      const hash = crypto
        .createHmac("sha512", secret)
        .update(req.body)
        .digest("hex");

      if (hash !== signature) {
        console.log("❌ Invalid signature");
        return res.sendStatus(400);
      }

// Parse the raw body buffer into JSON
const event = JSON.parse(req.body.toString());
console.log("🔥 Event Type:", event.event);
console.log("📦 Event Data:", event.data);

// ✅ Handle Transfer Success
if (event.data.status === "success") {
  const { amount, reference, authorization, metadata } = event.data;

  // ✅ Get receiver account number correctly for dedicated NUBAN
  const account_no = metadata?.receiver_account_number || authorization?.receiver_bank_account_number;
  console.log("💳 Account to credit:", account_no);

  if (!account_no) {
    console.log("⚠️ No account number in metadata");
    return res.sendStatus(200);
  }

  // ✅ Find the user in your database
  const user = await User.findOne({WalletNumber:account_no }).populate('UserProfileId').exec()||admin.findOne({     WalletNumber:account_no }).populate('UserProfileId').exec()||CompanyUsers.findOne({WalletNumber:account_no }).populate('UserProfileId').exec()||Company.findOne({WalletNumber:account_no }).exec()||Branch.findOne({WalletNumber:account_no }).exec();
  if (!user) {
    console.log("⚠️ User not found for account:", account_no);
    return res.sendStatus(200);
  }

  // ✅ Convert kobo to naira
  const creditAmount = amount / 100;

  // ✅ Push new wallet entry
  user.WalletBalance.push(creditAmount);

  // ✅ Add transaction record
   const transac =await Transaction.create({
    from: authorization?.sender_name || "Unknown Sender",
    to: user.account_name,
    status: "successful",
    product_name: "Wallet Funding",
    sender_bank: authorization?.sender_bank,
    sender_name: authorization?.sender_name,
    amount: creditAmount,
    type: "credit",
    Date: new Date().toLocaleDateString(),
    Time: new Date().toLocaleTimeString(),
    referenceId: reference,
  });

  await user.save();

  console.log(`✅ Wallet credited ₦${creditAmount} for ${user.account_name}`);
}

    res.sendStatus(200);
      

    } catch (err) {
      console.error("⚠️ Webhook Error:", err.message);
      res.sendStatus(500);
    }
  })
);

const { performance } = require('perf_hooks');




// --- DATA STORES ---
const currentRequests = [];
const metricsHistory = [];


const HISTORY_LIMIT = 60; // last 10 minutes (10s intervals)


// 1. Capture request metrics
app.use((req, res, next) => {
const start = performance.now();


res.on('finish', () => {
currentRequests.push({
duration: performance.now() - start,
isError: res.statusCode >= 400,
});
});


next();
});


// 2. Snapshot every 10 seconds
setInterval(() => {
const total = currentRequests.length;


let avgTime = 0;
let errorRate = 0;


if (total > 0) {
const errors = currentRequests.filter(r => r.isError).length;
const totalTime = currentRequests.reduce((sum, r) => sum + r.duration, 0);


avgTime = totalTime / total;
errorRate = (errors / total) * 100;
}


const snapshot = {
timestamp: Date.now(), // numeric (best for charts)
responseTime: avgTime, // number (ms)
errorRate: errorRate // number (%)
};


metricsHistory.push(snapshot);


if (metricsHistory.length > HISTORY_LIMIT) {
metricsHistory.shift();
}


// clear bucket safely
currentRequests.length = 0;


}, 10000);


// 3. API endpoint
app.get('/metrics/history', (req, res) => {
res.json(metricsHistory);
});
apiRoutes.use("/", require("./Routes/GetEcomerceProdoucts"));

apiRoutes.use("/GetSingleEcom", require("./Routes/GetSingleEconmerceProduct"));

apiRoutes.use("/GetAllOrders", require("./Routes/GetAllOrders"));

apiRoutes.use("/AddProducts",upload.array('file'), require("./Routes/AddProducts"));

apiRoutes.use("/GetSale/", require("./Routes/GetSale"));

apiRoutes.use("/SearchBank", require("./Routes/SearchBank"));

apiRoutes.use("/PayOutCheckout", require("./Routes/PayOutTransaction"));

apiRoutes.use("/UpdateCompanyUser",upload.single('file'), require("./Routes/UpdateCompanyUser"));

apiRoutes.use("/GetSingleProduct", require("./Routes/GetSingleProduct"));

apiRoutes.use("/UpdateProduct", upload.array('file'), require("./Routes/UpdateProduct"));


apiRoutes.use("/logout", require("./Routes/LogOut"));
apiRoutes.use("/Auth/ForceLogout", require("./Routes/ForceLogout"));

apiRoutes.use("/LogOutAll", require("./Routes/LogOutAll"));

apiRoutes.use("/Auth/", require("./Routes/refresh"));

apiRoutes.use("/Sell", require("./Routes/Sell"));

apiRoutes.use("/GetAllSales", require("./Routes/GetAllSale"));

apiRoutes.use("/UserOtp/", require("./Routes/GenerateOtp"));

apiRoutes.use("/comfirmOtp/", require("./Routes/comfirmOtp"));
apiRoutes.use("/GetAccountVerifiedOtp", require("./Routes/GetAccountVerifiedOtp"));

apiRoutes.use("/Auth/Login", require("./Routes/Auth"));

apiRoutes.use("/Auth/Regs", require("./Routes/UserReg"));

apiRoutes.use("/", require("./Routes/GetSimilarCate"));

apiRoutes.use("/Auth/CompanyAuth", require("./Routes/CompanyAuth"));

apiRoutes.use("/api/auth/", require("./Routes/ResetPassword"));

apiRoutes.use("/Products/", require("./Routes/GetComapnyProduct"));

apiRoutes.use("/Transaction", require("./Routes/AddTransaction"));

apiRoutes.use("/Settings/", upload.fields([{name:'companyLogo',maxCount:1},{name:'slug',maxCount:1}]), require("./Routes/CompanySettings"));

apiRoutes.use("/api/AdminAuth", require("./Routes/AdminAuth"));

apiRoutes.use("/Auth/CompanyRegs",

    upload.fields([{ name: "Logo", maxCount: 1 }, { name: "CAC_img", maxCount: 1 }]),

    require("./Routes/CompanyReg")

);

apiRoutes.use("/food/", upload.single('image'), require("./Routes/FoodPrice"));

apiRoutes.use("/CompanyUsersRegs", require("./Routes/CompanyUsersRegs"));

apiRoutes.use("/Cart", require("./Routes/Cart"));

apiRoutes.use("/Deals",upload.single("file"), require("./Routes/Deals"));

apiRoutes.use("/WalletBalance", require("./Routes/WalletBalence"));

apiRoutes.use("/CreateBranch", require("./Routes/CreateBranch"));

apiRoutes.use("/Otp", require("./Routes/PayoutOtp"));

apiRoutes.use("/Notifications", require("./Routes/Notifications"));

apiRoutes.use("/AdminWalletBalance", require("./Routes/AdminWalletBalance"));

apiRoutes.use("/PayoutAdmin", require("./Routes/PayoutAdmin"));

apiRoutes.use("/Seen", require("./Routes/Seen"));

apiRoutes.use("/GetCompanyUsers", require("./Routes/GetCompanyUsers"));

apiRoutes.use("/AddCategories", require("./Routes/AddCategories"));

apiRoutes.use("/UpdateCategories", require("./Routes/UpdateCategories"));

apiRoutes.use("/DeleteCategory", require("./Routes/DeleteCategory"));

apiRoutes.use("/SuperAdminSettings", require("./Routes/SuperAdminSettings"));

apiRoutes.use("/GetCategories", require("./Routes/GetCategory"));

apiRoutes.use("/GetTotalUsers", require("./Routes/GetAllcompanyUsers"));

apiRoutes.use("/Get/Branch", require("./Routes/GetBranch"));

apiRoutes.use("/Get/GetBranchUsers", require("./Routes/GetBranchUsers"));

apiRoutes.use("/GetUserprofile", require("./Routes/UserProfile"));

apiRoutes.use("/GetUserNotification", require("./Routes/GetUserNotification"));

apiRoutes.use("/GetShops", require("./Routes/GetShops"));

apiRoutes.use("/full-snapshot", require("./Routes/MongodbAnalitics"));

apiRoutes.use("/GetIventoryData", require("./Routes/GetInventoryData"));

apiRoutes.use("/AuditLogs", require("./Routes/AuditLogs"));

app.use("/ForceLogOut",require('./Routes/GlobalForceLogout'));


apiRoutes.use("/EditUserProfile", upload.single("profileImage"), require("./Routes/UpdateProfile"));

apiRoutes.use("/api/CompanyUserAuth", require("./Routes/CompanyUsersAuth"));

apiRoutes.use("/api/Subscription", require("./Routes/Subscription"));

apiRoutes.use("/AllUsers", require("./Routes/AllUsers"));

apiRoutes.use("/api/CompanyAuth", require("./Routes/CompanyAuth"));

apiRoutes.use("/Get/GetAdminCompany", require("./Routes/GetAdmincompany"));

apiRoutes.use("/User/Order", require("./Routes/Order"));

apiRoutes.use("/Exipre", require("./Routes/GetcompanyExpreDate"));

apiRoutes.use("/paystack", require("./Routes/Paystack"));

apiRoutes.use("/updateOrderStatus", require("./Routes/UpdateOrder"));

apiRoutes.use("/UserOrders", require("./Routes/GetUserOrders"));

apiRoutes.use("/api/Verify/CompanyVeried", require("./Routes/VerifyCompany"));

apiRoutes.use("/api/GetAdmin/UserCompany", require("./Routes/GetCompanyAllUsers_admin"));

apiRoutes.use("/api/Admin/GetUserCompany", require("./Routes/GetAdmin_User"));

apiRoutes.use("/api/GetAdmins", require("./Routes/GetAll"));

apiRoutes.use("/AddProducts", require("./Routes/AddProducts"));

apiRoutes.use("/Logs", require("./Routes/Logs"));

apiRoutes.use("/api/", 
    // upload.fields([{ name: "Logo", maxCount: 1 }, { name: "CAC_img", maxCount: 1 }]),
    
    require("./Routes/mainRoutes"));




    


app.use(apiRoutes);

mongoose.connection.once("open", () => {
    console.log(`[Worker ${process.pid}] Database connected & Ready`);
});


/**
 * 7. ERROR HANDLING
 */
app.use((req, res, next) => {
    next(createError(404, "Route not found"));
});

app.use((err, req, res, next) => {
    // RE-APPLY CORS HEADERS IN THE ERROR HANDLER
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
  //  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      }

    const status = err.status || 500;
    res.status(status).json({
        success: false,
        status: status,
        message: err.message || "Internal Server Error",
    });
});
/**
 * 8. START WORKER
 */
