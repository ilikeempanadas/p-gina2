const bcrypt = require("bcryptjs");
const { pool } = require("./db");
async function seedDemoUsers() {
  const demos = [
    { name: "Laura Gómez", email: "docente@demo.com", password: "Docente123!", role: "docente" },
    { name: "Samuel Torres", email: "estudiante@demo.com", password: "Estudiante123!", role: "estudiante" },
    { name: "Administración SAGA", email: "admin@demo.com", password: "Admin123!", role: "administrador" }
  ];
  for (const u of demos) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(`INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4)
      ON CONFLICT(email) DO NOTHING`, [u.name, u.email, hash, u.role]);
  }
  const { rows: teachers } = await pool.query("SELECT id FROM users WHERE email='docente@demo.com'");
  const { rows: students } = await pool.query("SELECT id FROM users WHERE email='estudiante@demo.com'");
  if (teachers[0] && students[0]) {
    await pool.query(`INSERT INTO courses(name,code,teacher_id) VALUES('Ciencias Sociales','SOC-11',$1)
      ON CONFLICT(code) DO NOTHING`, [teachers[0].id]);
    const { rows: courses } = await pool.query("SELECT id FROM courses WHERE code='SOC-11'");
    if (courses[0]) {
      await pool.query("INSERT INTO enrollments(course_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [courses[0].id, students[0].id]);
      await pool.query(`INSERT INTO grades(course_id,student_id,assessment,score,notes,updated_by)
        VALUES($1,$2,'Taller inicial',4.50,'Buen trabajo de prueba',$3) ON CONFLICT(course_id,student_id,assessment) DO NOTHING`,
        [courses[0].id, students[0].id, teachers[0].id]);
    }
  }
}
module.exports = { seedDemoUsers };
