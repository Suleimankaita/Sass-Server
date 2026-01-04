const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  "http://172.20.10.2:5173/",
  'http://127.0.0.1:5500',
  'https://your-production-domain.com'
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