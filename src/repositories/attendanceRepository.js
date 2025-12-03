const { get, all, run } = require('../db');

async function createExamAttempt({ classId, examId, studentId, score, status, clientIp, userAgent }) {
  const result = await run(
    `
    INSERT INTO exam_attempts
      (class_id, exam_id, student_id, face_verified_at, verification_score, verification_status, client_ip, user_agent)
    VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?)
    `,
    [classId, examId || null, studentId, score, status, clientIp, userAgent]
  );

  const row = await get('SELECT * FROM exam_attempts WHERE id = ?', [result.lastID]);
  return row;
}

async function createAttendanceCheck({ classId, createdBy, expiresAt }) {
  const result = await run(
    `
    INSERT INTO attendance_checks (class_id, created_by, expires_at)
    VALUES (?, ?, ?)
    `,
    [classId, createdBy, expiresAt.toISOString()]
  );

  const row = await get('SELECT * FROM attendance_checks WHERE id = ?', [result.lastID]);
  return row;
}

async function getLatestActiveCheckByClassId(classId) {
  const row = await get(
    `
    SELECT *
    FROM attendance_checks
    WHERE class_id = ?
      AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [classId]
  );
  return row || null;
}

async function createAttendanceResponse({ checkId, studentId, score, status, imagePath, rawResult }) {
  const result = await run(
    `
    INSERT INTO attendance_responses
      (attendance_check_id, student_id, verification_score, verification_status, image_path, raw_result)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [checkId, studentId, score, status, imagePath, JSON.stringify(rawResult)]
  );

  const row = await get('SELECT * FROM attendance_responses WHERE id = ?', [result.lastID]);
  return row;
}

async function getClassReport(classId, examId) {
  let sql = `
    SELECT
      c.id as class_id,
      c.name as class_name,
      s.full_name,
      s.email,
      ea.started_at,
      ea.verification_status as initial_status,
      ea.verification_score as initial_score,
      ea.exam_id,
      ac.id as attendance_check_id,
      ac.created_at as attendance_created_at,
      ar.verification_status as attendance_status,
      ar.verification_score as attendance_score,
      ar.captured_at
    FROM classes c
    JOIN enrollments e ON e.class_id = c.id
    JOIN students s ON s.id = e.student_id
    LEFT JOIN exam_attempts ea ON ea.class_id = c.id AND ea.student_id = s.id
    LEFT JOIN attendance_responses ar ON ar.student_id = s.id
    LEFT JOIN attendance_checks ac ON ac.id = ar.attendance_check_id
    WHERE c.id = ?
  `;

  const params = [classId];

  // Si se pasa examId, filtramos los intentos que sean de ese examen O que sean nulos (si queremos mostrar alumnos sin intento, pero la query hace LEFT JOIN).
  // El problema es que si un alumno tiene 2 intentos (examen 1 y examen 2), saldrán 2 filas.
  // Queremos solo las filas del examen actual.
  // Pero si filtramos `AND ea.exam_id = ?`, los alumnos que no han dado el examen (ea es null) seguirán saliendo (por el LEFT JOIN)?
  // No, porque `ea.exam_id` será NULL.
  // Si queremos ver a TODOS los alumnos de la clase, pero solo sus intentos de ESTE examen:
  // Movemos la condición al ON del LEFT JOIN.

  if (examId) {
    // Reemplazamos el LEFT JOIN simple por uno con condición
    // Hack: reconstruimos la query o usamos string replacement, pero mejor reescribir la parte del JOIN.
    // Para simplificar, hacemos la query dinámica.
    sql = `
    SELECT
      c.id as class_id,
      c.name as class_name,
      s.full_name,
      s.email,
      ea.started_at,
      ea.verification_status as initial_status,
      ea.verification_score as initial_score,
      ea.exam_id,
      ac.id as attendance_check_id,
      ac.created_at as attendance_created_at,
      ar.verification_status as attendance_status,
      ar.verification_score as attendance_score,
      ar.captured_at
    FROM classes c
    JOIN enrollments e ON e.class_id = c.id
    JOIN students s ON s.id = e.student_id
    LEFT JOIN exam_attempts ea ON ea.class_id = c.id AND ea.student_id = s.id AND ea.exam_id = ?
    LEFT JOIN attendance_responses ar ON ar.student_id = s.id
    LEFT JOIN attendance_checks ac ON ac.id = ar.attendance_check_id
    WHERE c.id = ?
    ORDER BY s.full_name, ac.created_at
    `;
    params.unshift(examId); // examId va primero en el params array por el orden de ?
  } else {
    sql += ` ORDER BY s.full_name, ac.created_at`;
  }

  const rows = await all(sql, params);
  return rows;
}

async function updateExamAttemptScore(attemptId, score) {
  await run(
    `UPDATE exam_attempts SET exam_score = ? WHERE id = ?`,
    [score, attemptId]
  );
}

module.exports = {
  createExamAttempt,
  createAttendanceCheck,
  getLatestActiveCheckByClassId,
  createAttendanceResponse,
  getClassReport,
  updateExamAttemptScore
};
