require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const helmet   = require("helmet");
const morgan   = require("morgan");
const rateLimit = require("express-rate-limit");

const diseaseRoutes = require("./routes/disease");
const authRoutes    = require("./routes/auth");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com") ||   // ← add this
      origin === process.env.CLIENT_ORIGIN
    ) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));

// Rate-limit public API proxy routes (protect against abuse / upstream bans)
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
});
app.use("/api", limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/disease", diseaseRoutes);
app.use("/api/auth",    authRoutes);

// Health check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[ORBIT Server Error]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () =>
  console.log(`\n🛰  O.R.B.I.T. API running on http://localhost:${PORT}\n`)
);
