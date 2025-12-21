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
const { Server } = require("socket.io");

// Sticky & Cluster Adapter Dependencies
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");

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

    httpServer.listen(PORT, () => {
        console.log(`[Master] Gateway listening on port ${PORT}`);
    });

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker) => {
        console.error(`[Master] Worker ${worker.process.pid} died. Restarting...`);
        setTimeout(() => cluster.fork(), 1000);
    });

    return; 
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
const { getDiskInfoSync } = require("node-disk-info");

const connectDB = require("./Config/Connecton");
const app = express();
// FIX: Ensure req.query is available for sanitizers
app.set('query parser', 'extended'); 

console.log(os.type());
const httpServer = http.createServer(app);

// Connect to Database
connectDB();

/**
 * 1. BASIC SECURITY & LOGGING
 */
app.use(helmet());
app.use(morgan(IS_PRODUCTION ? "combined" : "dev"));

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.CLIENT_URL
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS Policy Violation"));
        }
    },
    credentials: true,
}));

/**
 * 2. BODY PARSERS & SANITIZATION
 */
app.use(express.json({ limit: "10mb" }));
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

io.on("connection", (socket) => {
    // console.log(`Connected to worker ${process.pid}`);
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
    limits: { fileSize: 5 * 1024 * 1024 },
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

/**
 * 6. ROUTES
 */
const apiRoutes = express.Router();

apiRoutes.use("/", require("./Routes/Root"));


// apiRoutes.use("/Auth/Login", require("./Routes/Auth"));

// apiRoutes.use("/Auth/Regs", require("./Routes/UserReg"));

// apiRoutes.use("/Auth/CompanyAuth", require("./Routes/CompanyAuth"));

// apiRoutes.use("/Auth/CompanyRegs",

//     upload.fields([{ name: "Logo", maxCount: 1 }, { name: "CAC_img", maxCount: 1 }]),

//     require("./Routes/CompanyReg")

// );



// apiRoutes.use("/api/CompanyUsersRegs", require("./Routes/CompanyUsersRegs"));

// apiRoutes.use("/api/CompanyUserAuth", require("./Routes/CompanyUsersAuth"));

// apiRoutes.use("/api/User/Order", require("./Routes/Order"));

// apiRoutes.use("/api/Verify/CompanyVeried", require("./Routes/VerifyCompany"));

// apiRoutes.use("/api/GetAdmin/UserCompany", require("./Routes/GetCompanyAllUsers_admin"));

// apiRoutes.use("/api/Admin/GetUserCompany", require("./Routes/GetAdmin_User"));

// apiRoutes.use("/api/GetAdmins", require("./Routes/GetAll"));

// apiRoutes.use("/AddProducts", require("./Routes/AddProducts"));

// apiRoutes.use("/Logs", require("./Routes/Logs"));

// apiRoutes.use("/api", require("./Routes/mainRoutes"));






app.use(apiRoutes);

/**
 * 7. ERROR HANDLING
 */
app.use((req, res, next) => {
    next(createError(404, "Route not found"));
});

app.use((err, req, res, next) => {
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
mongoose.connection.once("open", () => {
    console.log(`[Worker ${process.pid}] Database connected & Ready`);
});