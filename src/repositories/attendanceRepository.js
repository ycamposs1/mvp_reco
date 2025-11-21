const { get, all, run } = require('../db');

async function createExamAttempt({ classId, studentId, score, status, clientIp, userAgent }) {
  const result = await run(
    `
    INSERT INTO exam_attempts
      (class_id, student_id, face_verified_at, verification_score, verification_status, client_ip, user_agent)
    VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
    `,
    [classId, studentId, score, status, clientIp, userAgent]
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

async function getClassReport(classId) {
  const rows = await all(
    `
    SELECT
      c.id as class_id,
      c.name as class_name,
      s.full_name,
      s.email,
      ea.started_at,
      ea.verification_status as initial_status,
      ea.verification_score as initial_score,
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
    ORDER BY s.full_name, ac.created_at
    `,
    [classId]
  );
  return rows;
}

module.exports = {
  createExamAttempt,
  createAttendanceCheck,
  getLatestActiveCheckByClassId,
  createAttendanceResponse,
  getClassReport
};
