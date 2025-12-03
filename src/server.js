// src/server.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const { port } = require('./config');

// Rutas
const examRoutes = require('./routes/examRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const classRoutes = require('./routes/classRoutes');
const examSessionRoutes = require('./routes/examSessionRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Frontend (carpeta public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API agrupada (verificar luego)
app.use('/api', examRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', classRoutes);
app.use('/api', examSessionRoutes);

// Render / Producción usa process.env.PORT siempre
const PORT = process.env.PORT || port || 3000;

// IMPORTANTE: escuchar en 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
