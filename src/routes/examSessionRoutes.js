// src/routes/examSessionRoutes.js
const express = require('express');
const router = express.Router();

const classRepo = require('../repositories/classRepository');
const examRepo = require('../repositories/examRepository');

// mismo generador de código que antes
function generateClassCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/exams/create-session
 * Body: { name?, examTitle, questionsJson }
 *
 * questionsJson es un string JSON de un array:
 * [
 *  {
 *    "text": "¿Pregunta 1?",
 *    "options": [
 *      { "text": "Op A", "correct": true },
 *      { "text": "Op B", "correct": false }
 *    ]
 *  }
 * ]
 */
router.post('/exams/create-session', async (req, res) => {
  try {
    const { name, examTitle, questionsJson } = req.body;

    if (!examTitle || !questionsJson) {
      return res.status(400).json({ error: 'examTitle y questionsJson son requeridos.' });
    }

    let questions;
    try {
      questions = JSON.parse(questionsJson);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Formato inválido: questions debe ser un arreglo.');
      }
    } catch (err) {
      return res.status(400).json({ error: 'questionsJson no es JSON válido.' });
    }

    const code = generateClassCode();
    const className = name || `Clase ${code}`;

    // 1) Crear clase (con código)
    const classData = await classRepo.createClass({
      name: className,
      code,
      examTitle
    });

    // 2) Crear examen asociado a esa clase
    const exam = await examRepo.createExamWithQuestions({
      classId: classData.id,
      title: examTitle,
      questions
    });

    res.json({
      success: true,
      classId: classData.id,
      className: classData.name,
      code,
      examId: exam.id,
      examTitle: exam.title
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando sesión de examen.' });
  }
});

/**
 * GET /api/exam-sessions/by-code/:code
 * Devuelve datos del examen + preguntas
 */
router.get('/exam-sessions/by-code/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const classData = await classRepo.findClassByCode(code);
    if (!classData) {
      return res.json({ exists: false });
    }

    const exam = await examRepo.getExamWithQuestionsByClassId(classData.id);
    if (!exam) {
      return res.json({ exists: false, error: 'No hay examen para esta clase.' });
    }

    res.json({
      exists: true,
      classId: classData.id,
      className: classData.name,
      code: classData.code,
      exam: {
        id: exam.id,
        title: exam.title,
        questions: exam.questions
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo examen por código.' });
  }
});

module.exports = router;
