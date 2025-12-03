// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();

const comprefaceService = require('../services/comprefaceService');
const studentRepo = require('../repositories/studentRepository');
const classRepo = require('../repositories/classRepository');
const attendanceRepo = require('../repositories/attendanceRepository');

const answerRepo = require('../repositories/answerRepository');

const { createExam } = require('../controllers/examController');

/**
 * POST /api/exams
 * Body: { classId, title, questions: [ { text, options: [{ text, correct }] } ] }
 *
 * Ejemplo de body:
 * {
 *   "classId": 1,
 *   "title": "Examen 1",
 *   "questions": [
 *     {
 *       "text": "¿Capital de Perú?",
 *       "options": [
 *         { "text": "Lima", "correct": true },
 *         { "text": "Cusco", "correct": false },
 *         { "text": "Arequipa", "correct": false }
 *       ]
 *     }
 *   ]
 * }
 */
router.post('/exams', createExam);

/**
 * POST /api/face-login
 * Body: { imageBase64, classId }
 */
router.post('/face-login', async (req, res) => {
  try {
    const { imageBase64, classId } = req.body;
    if (!imageBase64 || !classId) {
      return res.status(400).json({ error: 'imageBase64 y classId son requeridos.' });
    }

    // 1. Verificar que la clase exista
    const classData = await classRepo.findClassById(classId);
    if (!classData) {
      return res.status(404).json({ error: 'La clase no existe.' });
    }

    // 2. Llamar a CompreFace
    const recognition = await comprefaceService.recognizeFaceFromBase64(imageBase64);
    if (!recognition) {
      return res.status(401).json({ error: 'No se detectó rostro o no se reconoció el alumno.' });
    }

    const { subject, similarity } = recognition;
    const status = similarity >= 0.8 ? 'ok' : similarity >= 0.6 ? 'dudoso' : 'fallido';

    // 3. Buscar alumno por subject, si no existe lo creamos
    let student = await studentRepo.findByComprefaceSubject(subject);
    if (!student) {
      student = await studentRepo.createStudent({
        fullName: subject,
        email: null,
        comprefaceSubject: subject
      });
    }

    // 4. Matricularlo en la clase si aún no lo está
    await classRepo.enrollStudent({
      classId,
      studentId: student.id
    });

    // 5. Registrar intento de examen
    const clientIp = req.ip;
    const userAgent = req.headers['user-agent'] || '';

    const attempt = await attendanceRepo.createExamAttempt({
      classId,
      studentId: student.id,
      score: similarity,
      status,
      clientIp,
      userAgent
    });

    res.json({
      success: true,
      studentName: student.full_name,
      similarity,
      status,
      examAttemptId: attempt.id
    });

  } catch (err) {
    console.error('Error en /api/face-login:');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);

    if (err.response){
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }

    res.status(500).json({
      error: 'Error interno en el login facial.',
      details: err.message,
      compreface: err.response?.data || null
    });
  }
});

/**
 * POST /api/exam-sessions/:examId/submit
 * Body: { examAttemptId, answers: [{ questionId, optionId }, ...] }
 */
router.post('/exam-sessions/:examId/submit', async (req, res) => {
  try {
    const { examId } = req.params;
    const { examAttemptId, answers } = req.body;

    if (!examAttemptId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'examAttemptId y answers son requeridos.' });
    }

    await answerRepo.saveStudentAnswers(examAttemptId, answers);

    // MVP: aún no calculas score aquí
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando respuestas del examen.' });
  }
});

module.exports = router;
