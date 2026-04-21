/**
 * ORBIT Auth Routes
 * Decodes both Firebase (Google) JWTs and Supabase JWTs.
 * No external SDK needed — both use standard JWT format.
 */
const express = require("express");
const router  = express.Router();

function decodeJWT(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json   = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// POST /api/auth/verify
// Accepts both Firebase ID tokens and Supabase access tokens
router.post("/verify", (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken required" });

  const decoded = decodeJWT(idToken);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  // Supabase tokens use "sub" as uid and have "email" directly
  // Firebase tokens use "user_id" as uid
  const uid   = decoded.user_id || decoded.sub;
  const email = decoded.email   || decoded.email_verified || "";
  const name  = decoded.name
    || decoded.user_metadata?.full_name
    || email;
  const picture = decoded.picture
    || decoded.user_metadata?.avatar_url
    || null;

  res.json({ uid, email, name, picture, role: "viewer" });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  const token   = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const decoded = decodeJWT(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  res.json({
    uid:   decoded.user_id || decoded.sub,
    email: decoded.email,
    name:  decoded.name || decoded.user_metadata?.full_name || decoded.email,
  });
});

module.exports = router;
