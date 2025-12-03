-- db/schema.sql

-- Tabla de alumnos
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  compreface_subject TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clases
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  exam_title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matriculas: qué alumno está en qué clase
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  UNIQUE(student_id, class_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Intentos de examen (entrada / verificación inicial de identidad)
CREATE TABLE IF NOT EXISTS exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  face_verified_at DATETIME,
  verification_score REAL,
  verification_status TEXT,
  client_ip TEXT,
  user_agent TEXT,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Verificaciones de asistencia (cada vez que el profe aprieta el botón)
CREATE TABLE IF NOT EXISTS attendance_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Respuestas de los alumnos a cada verificación
CREATE TABLE IF NOT EXISTS attendance_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attendance_check_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verification_score REAL,
  verification_status TEXT,
  image_path TEXT,
  raw_result TEXT, -- aquí puedes guardar JSON como string
  FOREIGN KEY (attendance_check_id) REFERENCES attendance_checks(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Índices para optimizar consultas frecuentes
-- Exámenes (uno por "clase/código" en este MVP)
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Preguntas del examen
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- Opciones de respuesta
CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Respuestas de estudiantes
CREATE TABLE IF NOT EXISTS student_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  option_id INTEGER,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(id),
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (option_id) REFERENCES options(id)
);
