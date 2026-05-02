const allowedOrigins = [
  'http://localhost:5173',
	'https://ysstoreapp.com',
	'https://www.ysstoreapp.com',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  "http://172.20.10.2:5173",
  "http://172.20.10.3:5173",
  "http://172.20.10.6:3000",
  'http://127.0.0.1:5500',
  "http://172.20.10.6:3500",
  "http://172.20.10.11:5173",
  "https://172.20.10.2:5173",
  "http://172.30.0.1:3500",
"http://192.168.56.1:3500",
"http://172.28.96.1:3500"
];

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return cb(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

module.exports = corsOptions;
