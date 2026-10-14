require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const rateLimit = require("express-rate-limit");
const { pool, initDb } = require("./src/db");
const authRoutes = require("./src/routes/auth");
const teacherRoutes = require("./src/routes/teacher");
const studentRoutes = require("./src/routes/student");
const adminRoutes = require("./src/routes/admin");
const { attachUser } = require("./src/middleware/auth");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "dev-only-change-this-session-secret",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: isProduction, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(attachUser);
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.currentPath = req.path;
  next();
});
app.use("/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRoutes);

app.get("/", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("home", { title: "Inicio" });
});
app.get("/nosotros", (req, res) => res.render("about", { title: "Nosotros" }));
app.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/auth/login");
  return res.redirect(`/${req.user.role}`);
});
app.use("/docente", teacherRoutes);
app.use("/estudiante", studentRoutes);
app.use("/administrador", adminRoutes);
app.use((req, res) => res.status(404).render("error", { title: "Página no encontrada", code: 404, message: "No encontramos la página que buscas." }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render("error", { title: "Error del servidor", code: 500, message: "Ocurrió un error inesperado. Intenta de nuevo." });
});

const port = Number(process.env.PORT) || 3000;
initDb().then(async () => {
  if (process.env.SEED_DEMO_USERS === "true") await require("./src/seed").seedDemoUsers();
  app.listen(port, "0.0.0.0", () => console.log(`SAGA Notas escuchando en puerto ${port}`));
}).catch(err => { console.error("No se pudo inicializar la base de datos:", err); process.exit(1); });

process.on("SIGTERM", async () => { await pool.end(); process.exit(0); });
