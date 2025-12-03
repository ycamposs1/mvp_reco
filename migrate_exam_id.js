const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'face_exam.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Running migrations...');

    db.run("ALTER TABLE exam_attempts ADD COLUMN exam_id INTEGER", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column exam_id already exists in exam_attempts.');
            } else {
                console.error('Error adding exam_id:', err.message);
            }
        } else {
            console.log('Added exam_id to exam_attempts.');
        }
    });
});

db.close();
