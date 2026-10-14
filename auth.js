const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { flash } = require("../middleware/auth");
const router = express.Router();
router.get("/login", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("login", { title: "Iniciar sesión" });
});
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      flash(req, "error", "Escribe un correo válido y tu contraseña."); return res.redirect("/auth/login");
    }
    const { rows } = await pool.query("SELECT id,password_hash,active FROM users WHERE email=$1", [email]);
    const user = rows[0];
    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
      flash(req, "error", "Credenciales incorrectas o cuenta desactivada."); return res.redirect("/auth/login");
    }
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.save(err2 => { if (err2) return next(err2); res.redirect("/dashboard"); });
    });
  } catch (e) { next(e); }
});
router.post("/logout", (req, res, next) => req.session.destroy(err => {
  if (err) return next(err);
  res.clearCookie("connect.sid"); res.redirect("/");
}));
module.exports = router;
