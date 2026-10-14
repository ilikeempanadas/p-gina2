# SAGA Notas — sistema académico

Aplicación web de gestión de calificaciones con tres roles: **docente**, **estudiante** y **administrador**. Incluye autenticación, autorización por rol, cursos, matrículas, calificaciones, paneles separados y una página «Nosotros».

## Stack y decisiones

- **Node.js + Express:** servidor sencillo, con middleware explícito para autenticación y autorización.
- **EJS + CSS:** vistas del servidor, sin un proceso de compilación de frontend.
- **PostgreSQL:** persistencia real y compatible con Render. Usuarios, cursos, matrículas, notas y sesiones se almacenan en la base de datos.
- **bcryptjs:** contraseñas guardadas como hashes con factor de costo 12.
- **express-session + connect-pg-simple:** sesiones persistentes en PostgreSQL.

La solicitud no incluía una paleta concreta de colores. Por eso el proyecto define una paleta coherente como variables CSS al inicio de `public/css/styles.css` (azul tinta, turquesa, lavanda y naranja suave).

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior
- npm

## Ejecutar localmente

1. Crea una base de datos PostgreSQL, por ejemplo:

   ```sql
   CREATE DATABASE saga_notas;
   ```

2. Copia `.env.example` como `.env` y configura `DATABASE_URL` y `SESSION_SECRET`:

   ```bash
   cp .env.example .env
   ```

   En Windows PowerShell puedes usar `Copy-Item .env.example .env`.

3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Inicializa el esquema. La aplicación también ejecuta una inicialización idempotente al arrancar:

   ```bash
   npm run db:init
   ```

5. Crea los datos de prueba (opcional si `SEED_DEMO_USERS=true`):

   ```bash
   npm run db:seed
   ```

6. Arranca:

   ```bash
   npm start
   ```

7. Abre `http://localhost:3000`.

### Usuarios de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Docente | `docente@demo.com` | `Docente123!` |
| Estudiante | `estudiante@demo.com` | `Estudiante123!` |
| Administrador | `admin@demo.com` | `Admin123!` |

El seed crea también un curso «Ciencias Sociales», matrícula de demostración y una calificación de 4.50. Las cuentas de demostración son solo para desarrollo: cambia o elimina esas credenciales antes de usar el sistema con información real. En producción puedes establecer `SEED_DEMO_USERS=false` una vez creados los usuarios necesarios.

## Funciones por rol

### Docente
- Ver cursos asignados y cantidad de estudiantes matriculados.
- Registrar una calificación entre 0 y 5, con actividad y observaciones.
- Editar calificaciones existentes.
- Solo puede registrar notas de estudiantes matriculados en sus cursos.

### Estudiante
- Ver cursos matriculados, notas, observaciones e historial.
- Ver un promedio simple de las evaluaciones registradas.
- Las rutas de escritura no están disponibles para este rol.

### Administrador
- Crear usuarios, modificar nombre/correo/rol y cambiar contraseña.
- Activar y desactivar cuentas.
- Crear cursos y asignar un docente.
- Matricular estudiantes en cursos.
- Ver conteos generales y listado de cursos.

## Base de datos y migraciones

El esquema inicial vive en `src/db.js`, en la función `initDb()`. Usa `CREATE TABLE IF NOT EXISTS` e índices, por lo que puede ejecutarse repetidamente. Para cambios futuros, se recomienda convertir este esquema inicial en migraciones numeradas y versionadas.

Tablas:
- `users`: datos de cuenta, hash de contraseña, rol y estado.
- `courses`: cursos y docente asignado.
- `enrollments`: relación de matrícula entre curso y estudiante.
- `grades`: calificaciones, actividad, observación, autor de actualización y fecha.
- `user_sessions`: sesiones de inicio de sesión.

## Desplegar en Render

1. Sube este proyecto a un repositorio Git (GitHub, GitLab o Bitbucket).
2. En Render crea una **PostgreSQL database**. Copia su **Internal Database URL** si el servicio web estará en la misma región.
3. Crea un **Web Service** conectado al repositorio.
4. Configura:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. En Environment configura:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Internal Database URL de la base PostgreSQL
   - `SESSION_SECRET` = cadena aleatoria larga (32+ caracteres)
   - `SEED_DEMO_USERS` = `true` para crear los usuarios de prueba durante el primer despliegue; luego cámbialo a `false`.
6. Despliega. En el arranque se crea el esquema si aún no existe. Comprueba el log del servicio y abre la URL `.onrender.com`.
7. Entra con una cuenta de demostración, crea usuarios/cursos y luego desactiva las cuentas de demo o cambia sus contraseñas.

**Persistencia:** usa PostgreSQL administrado por Render, no el sistema de archivos efímero del servicio web. Confirma el periodo de retención y las copias de seguridad disponibles según el plan de Render elegido.

### Seguridad y producción

- No subas `.env` al repositorio.
- Usa una clave `SESSION_SECRET` única y larga.
- No mantengas las contraseñas de demostración activas en una instalación pública.
- `helmet` agrega encabezados de seguridad y el login tiene limitación de intentos.
- Las consultas usan parámetros SQL.
- Las rutas verifican el rol en el servidor; ocultar enlaces en la interfaz no se usa como mecanismo de autorización.
- Las cookies de sesión usan `httpOnly`, `sameSite=lax` y `secure` en producción.
- Para una puesta en producción con datos sensibles, añade protección CSRF, política CSP adaptada, auditoría de cambios, recuperación de contraseña, copias de seguridad verificadas y pruebas automatizadas. No uses este proyecto sin revisión adicional como sistema institucional de alto impacto.

## Estructura del proyecto

```text
saga-notas/
├── package.json
├── server.js
├── .env.example
├── .gitignore
├── README.md
├── scripts/
│   ├── init-db.js
│   └── seed.js
├── src/
│   ├── db.js
│   ├── seed.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── teacher.js
│   │   ├── student.js
│   │   └── admin.js
│   └── views/
│       ├── home.ejs
│       ├── about.ejs
│       ├── login.ejs
│       ├── teacher.ejs
│       ├── student.ejs
│       ├── admin.ejs
│       ├── grade-form.ejs
│       ├── error.ejs
│       └── partials/
│           ├── header.ejs
│           └── footer.ejs
└── public/
    ├── css/styles.css
    └── js/app.js
```

## Limitaciones conocidas

Esta es una base funcional completa para un proyecto académico, no una réplica oficial de SAGA ni un sistema certificado. El promedio mostrado es un promedio aritmético simple de las calificaciones registradas, sin ponderaciones por periodo. La gestión de periodos, recuperación de contraseña, exportación de informes y auditoría avanzada pueden añadirse según los requisitos de la institución.
