// src/repositories/examRepository.js
const { get, all, run } = require('../db');

/**
 * questions: [
 *  {
 *    text: "Pregunta 1",
 *    options: [
 *      { text: "Opción A", correct: true },
 *      { text: "Opción B", correct: false }
 *    ]
 *  },
 *  ...
 * ]
 */
async function createExamWithQuestions({ classId, title, questions }) {
  // Crear examen
  const examRes = await run(
    `INSERT INTO exams (class_id, title) VALUES (?, ?)`,
    [classId, title]
  );
  const examId = examRes.lastID;

  // Insertar preguntas + opciones
  let order = 1;
  for (const q of questions) {
    const qRes = await run(
      `INSERT INTO questions (exam_id, text, question_order) VALUES (?, ?, ?)`,
      [examId, q.text, order++]
    );
    const questionId = qRes.lastID;

    for (const opt of q.options) {
      await run(
        `INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)`,
        [questionId, opt.text, opt.correct ? 1 : 0]
      );
    }
  }

  return getExamWithQuestionsById(examId);
}

async function getExamWithQuestionsByClassId(classId) {
  const exam = await get(
    `SELECT * FROM exams WHERE class_id = ? ORDER BY created_at DESC LIMIT 1`,
    [classId]
  );
  if (!exam) return null;
  return getExamWithQuestionsById(exam.id);
}

async function getExamWithQuestionsById(examId) {
  const exam = await get(`SELECT * FROM exams WHERE id = ?`, [examId]);
  if (!exam) return null;

  const questions = await all(
    `SELECT * FROM questions WHERE exam_id = ? ORDER BY question_order ASC`,
    [examId]
  );

  const questionIds = questions.map(q => q.id);
  let options = [];
  if (questionIds.length > 0) {
    const placeholders = questionIds.map(() => '?').join(',');
    options = await all(
      `SELECT * FROM options WHERE question_id IN (${placeholders})`,
      questionIds
    );
  }

  const questionsWithOptions = questions.map(q => ({
    id: q.id,
    text: q.text,
    order: q.question_order,
    options: options
      .filter(o => o.question_id === q.id)
      .map(o => ({
        id: o.id,
        text: o.text
        // no mandamos is_correct al alumno 👀
      }))
  }));

  return {
    id: exam.id,
    class_id: exam.class_id,
    title: exam.title,
    questions: questionsWithOptions
  };
}

module.exports = {
  createExamWithQuestions,
  getExamWithQuestionsByClassId,
  getExamWithQuestionsById
};
