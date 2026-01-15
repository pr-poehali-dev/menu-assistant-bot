-- Создание таблицы для хранения состояний пользователей
CREATE TABLE IF NOT EXISTS user_states (
    chat_id BIGINT PRIMARY KEY,
    step VARCHAR(50) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    menu JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_states_chat_id ON user_states(chat_id);
