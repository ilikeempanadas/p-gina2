require("dotenv").config();
const { initDb, pool } = require("../src/db");
initDb().then(() => { console.log("Esquema de base de datos listo."); }).catch(e => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
