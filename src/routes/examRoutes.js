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
    const { imageBase64, classId, examId } = req.body;
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

    // Lógica de estado
    let status = 'ok';
    if (similarity < 0.6) {
      status = 'bloqueado';
    } else if (similarity < 0.8) {
      status = 'dudoso';
    }

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
    // (Incluso si está bloqueado, lo matriculamos para que salga en el reporte)
    await classRepo.enrollStudent({
      classId,
      studentId: student.id
    });

    // 5. Registrar intento de examen
    const clientIp = req.ip;
    const userAgent = req.headers['user-agent'] || '';

    const attempt = await attendanceRepo.createExamAttempt({
      classId,
      examId, // Nuevo campo
      studentId: student.id,
      score: similarity,
      status,
      clientIp,
      userAgent
    });

    // Si está bloqueado, devolvemos error 401 PERO después de haber registrado todo
    if (status === 'bloqueado') {
      return res.status(401).json({
        error: 'Acceso denegado: Similitud facial insuficiente o rostro no reconocido.',
        similarity,
        status,
        studentName: student.full_name
      });
    }

    // Obtener duración del examen para devolverla (opcional, pero útil si el cliente la perdió)
    let durationMinutes = 60;
    if (examId) {
      const exam = await examRepo.getExamWithQuestionsById(examId);
      if (exam) {
        durationMinutes = exam.durationMinutes;
      }
    }

    // Corregir formato de fecha para que sea UTC (SQLite devuelve "YYYY-MM-DD HH:MM:SS")
    let startedAtIso = attempt.started_at;
    if (startedAtIso && !startedAtIso.includes('Z')) {
      startedAtIso = startedAtIso.replace(' ', 'T') + 'Z';
    }

    res.json({
      success: true,
      studentName: student.full_name,
      similarity,
      status,
      examAttemptId: attempt.id,
      startedAt: startedAtIso, // Importante para el timer
      durationMinutes
    });

  } catch (err) {
    console.error('Error en /api/face-login:');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);

    if (err.response) {
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
const examRepo = require('../repositories/examRepository');

// ... (existing imports)

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

    // Calcular puntaje
    const exam = await examRepo.getExamWithQuestionsById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado.' });
    }

    let correctCount = 0;
    const totalQuestions = exam.questions.length;

    // Mapa de respuestas correctas: questionId -> optionId (de la correcta)
    // Ojo: puede haber varias correctas, pero asumimos una por ahora o verificamos si la elegida es correcta.
    // En el repo, options tiene "correct: true/false".

    for (const ans of answers) {
      const question = exam.questions.find(q => q.id === parseInt(ans.questionId));
      if (question) {
        const selectedOption = question.options.find(o => o.id === parseInt(ans.optionId));
        if (selectedOption && selectedOption.correct) {
          correctCount++;
        }
      }
    }

    // Puntaje simple: 10 puntos por correcta
    const score = correctCount * 10;

    await attendanceRepo.updateExamAttemptScore(examAttemptId, score);

    res.json({
      success: true,
      score,
      correctCount,
      totalQuestions
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando respuestas del examen.' });
  }
});

/**
 * GET /api/exams/:examId/leaderboard
 */
router.get('/exams/:examId/leaderboard', async (req, res) => {
  try {
    const { examId } = req.params;
    // Necesitamos una consulta que una exam_attempts con students
    // Asumimos que exam_attempts tiene class_id, pero no exam_id directo (en este esquema MVP).
    // PERO, espera. exam_attempts se crea al hacer login facial.
    // El examen se asocia a la clase.
    // Un intento de examen es para una clase.
    // Si hay múltiples exámenes en una clase, ¿cómo sabemos cuál está tomando?
    // En el esquema actual:
    // exams -> class_id
    // exam_attempts -> class_id
    // student_answers -> exam_attempt_id, question_id
    // questions -> exam_id
    //
    // Para saber el score de un examen específico, miramos los attempts de esa clase
    // que tengan respuestas para ese examen.
    // O simplificamos asumiendo que el "exam_score" en exam_attempts corresponde al último examen tomado.
    //
    // Mejor query:
    // Buscar attempts de la clase del examen.
    // Filtrar aquellos que tengan score (ya rindieron).
    // Ordenar por score DESC.

    const exam = await examRepo.getExamWithQuestionsById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado.' });
    }

    // Consulta raw para leaderboard
    // Ojo: esto traerá todos los attempts de la clase, incluso de otros exámenes si hubiera.
    // Para MVP asumimos un examen activo por clase o que el score se sobreescribe.
    // Idealmente exam_attempts debería tener exam_id, pero schema.sql no lo tiene.
    // Vamos a filtrar por class_id y que tengan score.

    const { db } = require('../db'); // Importar db para consulta directa si no hay repo method
    // Usaremos una query directa aquí por simplicidad, o agregamos al repo.
    // Agreguemos al repo mejor? No, hagámoslo aquí con db.all (importando db helper)
    const { all } = require('../db');

    const rows = await all(`
      SELECT
        s.full_name,
        ea.exam_score,
        ea.started_at
      FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      WHERE ea.class_id = ?
        AND ea.exam_score IS NOT NULL
      ORDER BY ea.exam_score DESC, ea.started_at ASC
    `, [exam.class_id]);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo leaderboard.' });
  }
});

module.exports = router;
