// src/server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { port } = require('./config');
const examSessionRoutes = require('./routes/examSessionRoutes');


const examRoutes = require('./routes/examRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const classRoutes = require('./routes/classRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Front estático
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api', examRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', classRoutes);

// Rutas front:
// ahora sin :classId en la URL, trabajaremos por código/clase en el front.
app.get('/exam', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'exam.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'teacher.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Ruta para creación de sesión de examen
//const examSessionRoutes = require('./routes/examSessionRoutes');

// ...

app.use('/api', examRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', classRoutes);        // si aún lo estás usando
app.use('/api', examSessionRoutes);  // <- añade esto

