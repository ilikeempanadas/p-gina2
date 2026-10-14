const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { requireRole, flash } = require("../middleware/auth");
const router = express.Router();
router.use(requireRole("administrador"));
router.get("/", async (req,res,next) => {
  try {
    const { rows: users } = await pool.query("SELECT id,full_name,email,role,active,created_at FROM users ORDER BY created_at DESC");
    const { rows: courses } = await pool.query(`SELECT c.id,c.name,c.code,u.full_name AS teacher_name,
      COUNT(DISTINCT e.student_id)::int AS students FROM courses c LEFT JOIN users u ON u.id=c.teacher_id
      LEFT JOIN enrollments e ON e.course_id=c.id GROUP BY c.id,u.full_name ORDER BY c.name`);
    const { rows: stats } = await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM courses) AS courses,
      (SELECT COUNT(*)::int FROM grades) AS grades`);
    res.render("admin",{title:"Administración",users,courses,stats:stats[0]});
  } catch(e) { next(e); }
});
router.post("/usuarios/guardar", async (req,res,next) => {
  try {
    const id = req.body.id ? Number(req.body.id) : null;
    const name=String(req.body.full_name||"").trim(), email=String(req.body.email||"").trim().toLowerCase();
    const role=String(req.body.role||""), password=String(req.body.password||"");
    if(name.length<2 || name.length>120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !["docente","estudiante","administrador"].includes(role) || (!id && password.length<8) || (password && password.length<8)) {
      flash(req,"error","Datos inválidos. El nombre debe tener al menos 2 caracteres y la contraseña, mínimo 8.");
      return res.redirect("/administrador");
    }
    if(id && id===req.user.id && role!=="administrador") {
      flash(req,"error","No puedes quitarte tu propio rol de administrador."); return res.redirect("/administrador");
    }
    if(id) {
      if(password) {
        const hash=await bcrypt.hash(password,12);
        await pool.query("UPDATE users SET full_name=$1,email=$2,role=$3,password_hash=$4 WHERE id=$5",[name,email,role,hash,id]);
      } else await pool.query("UPDATE users SET full_name=$1,email=$2,role=$3 WHERE id=$4",[name,email,role,id]);
      flash(req,"success","Usuario actualizado.");
    } else {
      const hash=await bcrypt.hash(password,12);
      await pool.query("INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4)",[name,email,hash,role]);
      flash(req,"success","Usuario creado correctamente.");
    }
    res.redirect("/administrador");
  } catch(e) {
    if(e.code==="23505") { flash(req,"error","Ese correo ya está registrado."); return res.redirect("/administrador"); }
    next(e);
  }
});
router.post("/usuarios/:id/estado", async (req,res,next) => {
  try {
    const id=Number(req.params.id);
    if(id===req.user.id) { flash(req,"error","No puedes desactivar tu propia cuenta."); return res.redirect("/administrador"); }
    const active = req.body.active === "true";
    await pool.query("UPDATE users SET active=$1 WHERE id=$2",[active,id]);
    flash(req,"success",active?"Usuario activado.":"Usuario desactivado.");
    res.redirect("/administrador");
  } catch(e) { next(e); }
});
router.post("/cursos/guardar", async (req,res,next) => {
  try {
    const name=String(req.body.name||"").trim(), code=String(req.body.code||"").trim().toUpperCase(), teacherId=Number(req.body.teacher_id);
    if(name.length<2 || name.length>120 || !/^[A-Z0-9-]{2,20}$/.test(code) || !Number.isInteger(teacherId)) {
      flash(req,"error","Revisa el nombre, código y docente asignado."); return res.redirect("/administrador");
    }
    const {rows}=await pool.query("SELECT id FROM users WHERE id=$1 AND role='docente' AND active=true",[teacherId]);
    if(!rows[0]) { flash(req,"error","Selecciona un docente activo."); return res.redirect("/administrador"); }
    await pool.query("INSERT INTO courses(name,code,teacher_id) VALUES($1,$2,$3)",[name,code,teacherId]);
    flash(req,"success","Curso creado.");
    res.redirect("/administrador");
  } catch(e) {
    if(e.code==="23505") { flash(req,"error","Ese código de curso ya existe."); return res.redirect("/administrador"); }
    next(e);
  }
});
router.post("/matriculas/guardar", async (req,res,next) => {
  try {
    const courseId=Number(req.body.course_id), studentId=Number(req.body.student_id);
    const {rows}=await pool.query("SELECT id FROM users WHERE id=$1 AND role='estudiante' AND active=true",[studentId]);
    if(!Number.isInteger(courseId)||!rows[0]) { flash(req,"error","Selecciona un curso y un estudiante activo."); return res.redirect("/administrador"); }
    await pool.query("INSERT INTO enrollments(course_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[courseId,studentId]);
    flash(req,"success","Matrícula guardada.");
    res.redirect("/administrador");
  } catch(e) { next(e); }
});
module.exports = router;
