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
    const { teacherName } = req.body;

    const classData = await classRepo.findClassById(classId);
    if (!classData) {
      return res.status(404).json({ error: 'La clase no existe.' });
    }

    const expiresAt = new Date(Date.now() + 10 * 1000); // 10s
    const check = await attendanceRepo.createAttendanceCheck({
      classId,
      createdBy: teacherName || 'docente',
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
    const { imageBase64, classId } = req.body;

    const classData = await classRepo.findClassById(classId);
    if (!classData) {
      return res.status(404).json({ error: 'La clase no existe.' });
    }

    const recognition = await comprefaceService.recognizeFaceFromBase64(imageBase64);
    if (!recognition) {
      return res.status(401).json({ error: 'No se detectó rostro o no se reconoció el alumno.' });
    }

    const { subject, similarity, raw } = recognition;
    const status = similarity >= 0.8 ? 'ok' : similarity >= 0.6 ? 'dudoso' : 'fallido';

    let student = await studentRepo.findByComprefaceSubject(subject);
    if (!student) {
      student = await studentRepo.createStudent({
        fullName: subject,
        email: null,
        comprefaceSubject: subject
      });
    }

    await classRepo.enrollStudent({
      classId,
      studentId: student.id
    });

    const response = await attendanceRepo.createAttendanceResponse({
      checkId,
      studentId: student.id,
      score: similarity,
      status,
      imagePath: null,
      rawResult: raw
    });

    res.json({
      success: true,
      studentName: student.full_name,
      similarity,
      status,
      responseId: response.id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registrando asistencia.' });
  }
});

/**
 * GET /api/classes/:classId/report
 */
router.get('/classes/:classId/report', async (req, res) => {
  try {
    const { classId } = req.params;
    const rows = await attendanceRepo.getClassReport(classId);
    res.json({ classId, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo reporte.' });
  }
});

module.exports = router;
