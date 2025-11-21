const { get, run } = require('../db');

async function findByComprefaceSubject(subject) {
  const row = await get(
    'SELECT * FROM students WHERE compreface_subject = ?',
    [subject]
  );
  return row || null;
}

async function findEnrolledStudentInClassBySubject(subject, classId) {
  const row = await get(
    `
    SELECT s.*
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    WHERE s.compreface_subject = ?
      AND e.class_id = ?
    `,
    [subject, classId]
  );
  return row || null;
}

async function createStudent({ fullName, email, comprefaceSubject }) {
  const result = await run(
    `
    INSERT INTO students (full_name, email, compreface_subject)
    VALUES (?, ?, ?)
    `,
    [fullName, email, comprefaceSubject]
  );
  return {
    id: result.lastID,
    full_name: fullName,
    email,
    compreface_subject: comprefaceSubject
  };
}

module.exports = {
  findByComprefaceSubject,
  findEnrolledStudentInClassBySubject,
  createStudent
};
