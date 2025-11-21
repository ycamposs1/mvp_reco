const { get, all, run } = require('../db');

async function findClassById(classId) {
  const row = await get(
    'SELECT * FROM classes WHERE id = ?',
    [classId]
  );
  return row || null;
}

async function findClassByCode(code) {
  const row = await get(
    'SELECT * FROM classes WHERE code = ?',
    [code]
  );
  return row || null;
}

async function createClass({ name, code, examTitle }) {
  const result = await run(
    `
    INSERT INTO classes (name, code, exam_title)
    VALUES (?, ?, ?)
    `,
    [name, code, examTitle]
  );
  return {
    id: result.lastID,
    name,
    code,
    exam_title: examTitle
  };
}

async function enrollStudent({ classId, studentId }) {
  try {
    const result = await run(
      `
      INSERT INTO enrollments (class_id, student_id)
      VALUES (?, ?)
      `,
      [classId, studentId]
    );
    return { id: result.lastID, class_id: classId, student_id: studentId };
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return null;
    }
    throw err;
  }
}

async function getStudentsInClass(classId) {
  const rows = await all(
    `
    SELECT s.*
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    WHERE e.class_id = ?
    ORDER BY s.full_name
    `,
    [classId]
  );
  return rows;
}

async function isStudentEnrolled(classId, studentId) {
  const row = await get(
    `
    SELECT 1
    FROM enrollments
    WHERE class_id = ? AND student_id = ?
    `,
    [classId, studentId]
  );
  return !!row;
}

module.exports = {
  findClassById,
  findClassByCode,
  createClass,
  enrollStudent,
  getStudentsInClass,
  isStudentEnrolled
};
