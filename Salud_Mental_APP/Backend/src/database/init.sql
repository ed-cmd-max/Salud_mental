CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emotions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    mood VARCHAR(50) NOT NULL,
    intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 10),
    note TEXT,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emotions_user_record_date
ON emotions (user_id, record_date DESC);

CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    instructions TEXT NOT NULL,
    estimated_duration INTEGER NOT NULL
        CHECK (estimated_duration BETWEEN 1 AND 180),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_status
ON activities (status);

CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    reflection TEXT NOT NULL,
    activity_status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (
            activity_status IN (
                'started',
                'in_progress',
                'completed'
            )
        ),
    observation TEXT,
    points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (activity_id)
        REFERENCES activities(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_date
ON user_activities (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_activity
ON user_activities (user_id, activity_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_activity_single_reward
ON user_activities (user_id, activity_id)
WHERE points_awarded = TRUE;

CREATE TABLE IF NOT EXISTS gamification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE (user_id, achievement_id)
);

INSERT INTO activities (
    title,
    description,
    category,
    instructions,
    estimated_duration,
    status
)
SELECT
    'Registro de pensamiento',
    'Actividad para identificar pensamientos negativos y reflexionar sobre ellos.',
    'Terapia Cognitivo-Conductual',
    'Describe una situación reciente que haya generado malestar. Escribe el pensamiento automático que apareció, identifica la emoción y su intensidad, analiza las evidencias a favor y en contra, y formula un pensamiento alternativo más equilibrado.',
    15,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM activities
    WHERE title = 'Registro de pensamiento'
);


INSERT INTO activities (
    title,
    description,
    category,
    instructions,
    estimated_duration,
    status
)
SELECT
    'Respiración consciente',
    'Ejercicio de respiración para reducir tensión emocional.',
    'Relajación',
    'Busca un lugar tranquilo y adopta una postura cómoda. Inhala lentamente durante cuatro segundos, mantén el aire durante dos segundos y exhala durante seis segundos. Repite el ejercicio cinco veces prestando atención a la respiración.',
    5,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM activities
    WHERE title = 'Respiración consciente'
);


INSERT INTO activities (
    title,
    description,
    category,
    instructions,
    estimated_duration,
    status
)
SELECT
    'Diario emocional',
    'Actividad para escribir cómo se sintió el usuario durante el día.',
    'Seguimiento emocional',
    'Describe el acontecimiento más importante del día, la emoción que produjo, la intensidad experimentada y la forma en que respondiste. Finaliza escribiendo una acción positiva que puedas realizar.',
    10,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM activities
    WHERE title = 'Diario emocional'
);

INSERT INTO achievements (code, title, description)
SELECT 'FIRST_EMOTION', 'Primera emoción registrada', 'Se desbloquea al registrar el primer estado emocional.'
WHERE NOT EXISTS (
    SELECT 1 FROM achievements WHERE code = 'FIRST_EMOTION'
);

INSERT INTO achievements (code, title, description)
SELECT 'FIVE_EMOTIONS', 'Cinco emociones registradas', 'Se desbloquea al registrar cinco estados emocionales.'
WHERE NOT EXISTS (
    SELECT 1 FROM achievements WHERE code = 'FIVE_EMOTIONS'
);

INSERT INTO achievements (code, title, description)
SELECT 'LEVEL_TWO', 'Nivel 2 alcanzado', 'Se desbloquea al alcanzar el nivel 2.'
WHERE NOT EXISTS (
    SELECT 1 FROM achievements WHERE code = 'LEVEL_TWO'
);

INSERT INTO achievements (code, title, description)
SELECT 'FIRST_ACTIVITY', 'Primera actividad completada', 'Se desbloquea al completar la primera actividad terapéutica.'
WHERE NOT EXISTS (
    SELECT 1 FROM achievements WHERE code = 'FIRST_ACTIVITY'
);