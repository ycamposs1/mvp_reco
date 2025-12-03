// src/db.js
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Ruta al archivo .db (en la raíz del proyecto)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'face_exam.db');
// Ruta al schema.sql
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

// Abrir/crear la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo la base de datos:', err.message);
  } else {
    console.log('Base de datos SQLite abierta en:', dbPath);

    // Leer y aplicar el schema
    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema, (err2) => {
        if (err2) {
          console.error('Error aplicando schema.sql:', err2.message);
        } else {
          console.log('schema.sql aplicado (o tablas ya existían).');
        }
      });
    } catch (readErr) {
      console.error('No se pudo leer schema.sql:', readErr.message);
    }
  }
});

module.exports = db;
