const express = require("express");
const { pool } = require("../db");
const { requireRole, flash } = require("../middleware/auth");
const router = express.Router();
router.use(requireRole("docente"));
router.get("/", async (req, res, next) => {
  try {
    const { rows: courses } = await pool.query(`SELECT c.id,c.name,c.code,COUNT(DISTINCT e.student_id)::int AS students
      FROM courses c LEFT JOIN enrollments e ON e.course_id=c.id WHERE c.teacher_id=$1
      GROUP BY c.id ORDER BY c.name`, [req.user.id]);
    const { rows: grades } = await pool.query(`SELECT g.id,g.assessment,g.score,g.notes,g.updated_at,
      s.full_name AS student_name,c.name AS course_name,c.id AS course_id,s.id AS student_id
      FROM grades g JOIN users s ON s.id=g.student_id JOIN courses c ON c.id=g.course_id
      WHERE c.teacher_id=$1 ORDER BY g.updated_at DESC LIMIT 30`, [req.user.id]);
    res.render("teacher", { title: "Panel docente", courses, grades });
  } catch (e) { next(e); }
});
router.get("/notas/nueva", async (req, res, next) => {
  try {
    const { rows: courses } = await pool.query("SELECT id,name,code FROM courses WHERE teacher_id=$1 ORDER BY name", [req.user.id]);
    const { rows: students } = await pool.query(`SELECT u.id,u.full_name,e.course_id FROM enrollments e
      JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=e.student_id
      WHERE c.teacher_id=$1 AND u.active=true ORDER BY u.full_name`, [req.user.id]);
    res.render("grade-form", { title: "Registrar nota", courses, students, grade: null });
  } catch(e) { next(e); }
});
router.get("/notas/:id/editar", async (req,res,next) => {
  try {
    const { rows } = await pool.query(`SELECT g.* FROM grades g JOIN courses c ON c.id=g.course_id
      WHERE g.id=$1 AND c.teacher_id=$2`, [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).render("error",{title:"Nota no encontrada",code:404,message:"No encontramos esa nota en tus cursos."});
    const { rows: courses } = await pool.query("SELECT id,name,code FROM courses WHERE teacher_id=$1", [req.user.id]);
    const { rows: students } = await pool.query(`SELECT u.id,u.full_name,e.course_id FROM enrollments e JOIN courses c ON c.id=e.course_id
      JOIN users u ON u.id=e.student_id WHERE c.teacher_id=$1 ORDER BY u.full_name`, [req.user.id]);
    res.render("grade-form", { title:"Editar nota", courses, students, grade:rows[0] });
  } catch(e) { next(e); }
});
router.post("/notas/guardar", async (req,res,next) => {
  try {
    const id = req.body.id ? Number(req.body.id) : null;
    const courseId = Number(req.body.course_id), studentId = Number(req.body.student_id);
    const assessment = String(req.body.assessment || "").trim();
    const notes = String(req.body.notes || "").trim();
    const score = Number(req.body.score);
    if (!Number.isInteger(courseId) || !Number.isInteger(studentId) || !assessment || assessment.length > 120 ||
      !Number.isFinite(score) || score < 0 || score > 5 || notes.length > 500) {
      flash(req,"error","Revisa los campos: nota entre 0 y 5, actividad y observación con longitud válida.");
      return res.redirect(id ? `/docente/notas/${id}/editar` : "/docente/notas/nueva");
    }
    const { rows: allowed } = await pool.query(`SELECT 1 FROM courses c JOIN enrollments e ON e.course_id=c.id
      WHERE c.id=$1 AND c.teacher_id=$2 AND e.student_id=$3`, [courseId, req.user.id, studentId]);
    if (!allowed[0]) { flash(req,"error","Ese estudiante no está matriculado en uno de tus cursos."); return res.redirect("/docente/notas/nueva"); }
    if (id) {
      const result = await pool.query(`UPDATE grades g SET course_id=$1,student_id=$2,assessment=$3,score=$4,notes=$5,updated_by=$6,updated_at=NOW()
        FROM courses c WHERE g.id=$7 AND c.id=g.course_id AND c.teacher_id=$6`,
        [courseId,studentId,assessment,score,notes,req.user.id,id]);
      if (!result.rowCount) { flash(req,"error","No tienes permiso para editar esa nota."); return res.redirect("/docente"); }
    } else {
      await pool.query(`INSERT INTO grades(course_id,student_id,assessment,score,notes,updated_by)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(course_id,student_id,assessment)
        DO UPDATE SET score=EXCLUDED.score,notes=EXCLUDED.notes,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
        [courseId,studentId,assessment,score,notes,req.user.id]);
    }
    flash(req,"success", id ? "Nota actualizada correctamente." : "Nota registrada correctamente.");
    res.redirect("/docente");
  } catch(e) {
    if (e.code === "23505") { flash(req,"error","Ya existe una nota con ese nombre para el estudiante en este curso."); return res.redirect("/docente/notas/nueva"); }
    next(e);
  }
});
module.exports = router;
