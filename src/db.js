const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta al archivo face_exam.db en la raíz del proyecto
const dbPath = path.join(__dirname, '..', 'face_exam.db');

const db = new sqlite3.Database(dbPath);

// Helpers basados en Promesas
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // this.lastID, this.changes
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all
};
