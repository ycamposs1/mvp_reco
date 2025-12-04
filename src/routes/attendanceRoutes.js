// src/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();

const comprefaceService = require('../services/comprefaceService');
const studentRepo = require('../repositories/studentRepository');
const classRepo = require('../repositories/classRepository');
const attendanceRepo = require('../repositories/attendanceRepository');

/**
 * POST /api/classes/:classId/attendance-checks
 */
router.post('/classes/:classId/attendance-checks', async (req, res) => {
  try {
    const { classId } = req.params;
    const { examId } = req.body; // Nuevo: recibimos examId

    // Crear check que expira en 1 minuto
    const expiresAt = new Date(Date.now() + 60000);

    const check = await attendanceRepo.createAttendanceCheck({
      classId,
      examId,
      createdBy: 'teacher', // MVP
      expiresAt
    });

    res.json({ success: true, check });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando verificación de asistencia.' });
  }
});

/**
 * GET /api/classes/:classId/attendance-checks/active
 */
router.get('/classes/:classId/attendance-checks/active', async (req, res) => {
  try {
    const { classId } = req.params;
    const check = await attendanceRepo.getLatestActiveCheckByClassId(classId);
    if (!check) {
      return res.json({ hasActive: false });
    }
    res.json({ hasActive: true, checkId: check.id, expiresAt: check.expires_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error consultando verificación activa.' });
  }
});

/**
 * POST /api/attendance-checks/:checkId/respond
 * Body: { imageBase64, classId }
 */
router.post('/attendance-checks/:checkId/respond', async (req, res) => {
  try {
    const { checkId } = req.params;
    const { imageBase64, classId, examAttemptId } = req.body; // Recibimos examAttemptId

    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagen requerida.' });
    }

    // 1. Llamar a CompreFace
    const recognition = await comprefaceService.recognizeFaceFromBase64(imageBase64);

    let student = null;
    let similarity = 0;
    let status = 'fallido';

    if (!recognition) {
      // CASO: No se detectó rostro (cámara tapada o mala foto)
      // Si tenemos examAttemptId, podemos saber quién es el alumno
      if (examAttemptId) {
        // Necesitamos buscar el student_id asociado al attempt
        // (Esto requiere una query extra o asumir que el frontend dice la verdad, 
        //  pero por seguridad deberíamos buscar el attempt en DB. 
        //  Para MVP, asumimos que si el attempt existe, el student es válido).
        // Haremos una query rápida para sacar el student_id del attempt.
        const { get } = require('../db');
        const attempt = await get('SELECT student_id FROM exam_attempts WHERE id = ?', [examAttemptId]);

        if (attempt) {
          // Encontramos al alumno, pero como no hubo rostro, lo marcamos bloqueado/no_face
          student = { id: attempt.student_id };
          status = 'bloqueado'; // o 'no_face'
          similarity = 0;
          console.log(`No face found for check ${checkId}, but identified student ${student.id} via attempt ${examAttemptId}. Marking as blocked.`);
        } else {
          return res.status(400).json({ error: 'No se detectó rostro y el intento de examen no es válido.' });
        }
      } else {
        return res.status(400).json({ error: 'No se detectó rostro.' });
      }
    } else {
      // CASO: Sí hubo reconocimiento
      const { subject, similarity: sim } = recognition;
      similarity = sim;

      // Buscar alumno
      student = await studentRepo.findByComprefaceSubject(subject);

      if (!student) {
        return res.status(404).json({ error: 'Estudiante no reconocido en el sistema.' });
      }

      if (similarity >= 0.8) status = 'ok';
      else if (similarity >= 0.6) status = 'dudoso';
      else status = 'bloqueado'; // Si es muy bajo, también bloqueado
    }

    // 2. Registrar respuesta
    await attendanceRepo.registerAttendanceResponse({
      checkId,
      studentId: student.id,
      score: similarity,
      status,
      capturedAt: new Date()
    });

    // Validar identidad contra el intento de examen (si se proporcionó)
    if (examAttemptId && recognition) {
      const { get } = require('../db');
      const attempt = await get('SELECT student_id FROM exam_attempts WHERE id = ?', [examAttemptId]);

      if (attempt && attempt.student_id !== student.id) {
        // ALERTA: La persona reconocida NO es la que inició el examen
        status = 'bloqueado';
        console.warn(`Identity mismatch! Exam started by student ${attempt.student_id}, but check recognized student ${student.id}. Blocking.`);

        // Actualizar el registro recién creado a bloqueado si no lo estaba
        // (Opcional, pero bueno para consistencia)
      }
    }

    if (status === 'bloqueado') {
      return res.json({
        success: false,
        status,
        similarity,
        error: 'Verificación fallida: Rostro no reconocido o no coincide con el estudiante.'
      });
    }

    res.json({ success: true, status, similarity });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error respondiendo asistencia.' });
  }
});

/**
 * GET /api/classes/:classId/report
 */
router.get('/classes/:classId/report', async (req, res) => {
  try {
    const { classId } = req.params;
    const { examId } = req.query;
    const rows = await attendanceRepo.getClassReport(classId, examId);
    res.json({ classId, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo reporte.' });
  }
});

module.exports = router;
