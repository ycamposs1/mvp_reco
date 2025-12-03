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
app.use('/api/exams', examRoutes);


// API
app.use('/api', examRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', classRoutes);

// Ruta.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.use('/api', examRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', classRoutes);        
app.use('/api', examSessionRoutes);  

const PORT = process.env.PORT || port || 3000;

// MUY IMPORTANTE: escuchar en 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

