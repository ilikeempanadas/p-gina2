const express = require("express");
const { pool } = require("../db");
const { requireRole } = require("../middleware/auth");
const router = express.Router();
router.use(requireRole("estudiante"));
router.get("/", async (req,res,next) => {
  try {
    const { rows: grades } = await pool.query(`SELECT g.id,g.assessment,g.score,g.notes,g.updated_at,c.name AS course_name,c.code
      FROM grades g JOIN courses c ON c.id=g.course_id WHERE g.student_id=$1 ORDER BY c.name,g.updated_at DESC`, [req.user.id]);
    const { rows: courses } = await pool.query(`SELECT c.name,c.code FROM enrollments e JOIN courses c ON c.id=e.course_id
      WHERE e.student_id=$1 ORDER BY c.name`, [req.user.id]);
    const avg = grades.length ? (grades.reduce((sum,g)=>sum+Number(g.score),0)/grades.length).toFixed(2) : "—";
    res.render("student",{title:"Mis notas",grades,courses,avg});
  } catch(e) { next(e); }
});
module.exports = router;
