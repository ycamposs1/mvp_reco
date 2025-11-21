// src/repositories/answerRepository.js
const { run } = require('../db');

/**
 * answers: [
 *   { questionId: 1, optionId: 10 },
 *   { questionId: 2, optionId: 15 },
 *   ...
 * ]
 */
async function saveStudentAnswers(examAttemptId, answers) {
  for (const ans of answers) {
    await run(
      `
      INSERT INTO student_answers (exam_attempt_id, question_id, option_id)
      VALUES (?, ?, ?)
      `,
      [examAttemptId, ans.questionId, ans.optionId || null]
    );
  }
}

module.exports = {
  saveStudentAnswers
};
