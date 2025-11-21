// src/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const classRepo = require('../repositories/classRepository');

// Helper para código tipo Kahoot (6 dígitos)
function generateClassCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/classes/generate
 * Body: { name?, examTitle?, teacherName? }
 * Devuelve: { success, classId, code }
 */
router.post('/classes/generate', async (req, res) => {
  try {
    const { name, examTitle } = req.body;

    const code = generateClassCode();
    const className = name || `Clase ${code}`;
    const classData = await classRepo.createClass({
      name: className,
      code,
      examTitle: examTitle || null
    });

    res.json({
      success: true,
      classId: classData.id,
      code: classData.code,
      name: classData.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando clase/código.' });
  }
});

/**
 * GET /api/classes/by-code/:code
 * Devuelve: { exists: boolean, classId?, name? }
 */
router.get('/classes/by-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const classData = await classRepo.findClassByCode(code);
    if (!classData) {
      return res.json({ exists: false });
    }
    res.json({
      exists: true,
      classId: classData.id,
      name: classData.name,
      code: classData.code
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error buscando clase por código.' });
  }
});

module.exports = router;
