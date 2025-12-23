-- Tabla para registrar eventos de analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  fk_id_producto BIGINT REFERENCES productos(id) ON DELETE SET NULL,
  fk_id_zona BIGINT REFERENCES zonas(id) ON DELETE SET NULL
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_producto ON analytics_events(fk_id_producto);
CREATE INDEX idx_analytics_events_zona ON analytics_events(fk_id_zona);

-- Tabla para métricas agregadas diarias (opcional, para optimizar consultas)
CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  count BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  unique_sessions BIGINT DEFAULT 0,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(date, event_type)
);

-- Índices para la tabla de métricas diarias
CREATE INDEX idx_analytics_daily_metrics_date ON analytics_daily_metrics(date);
CREATE INDEX idx_analytics_daily_metrics_event_type ON analytics_daily_metrics(event_type);

-- Habilitar Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Política: Permitir INSERT a usuarios autenticados y anónimos (para el frontend)
CREATE POLICY "Permitir INSERT de eventos a todos"
ON analytics_events FOR INSERT
WITH CHECK (true);

-- Política: Permitir SELECT solo a usuarios autenticados (para el admin)
CREATE POLICY "Permitir SELECT de eventos a usuarios autenticados"
ON analytics_events FOR SELECT
USING (auth.role() = 'authenticated');

-- Política: Permitir SELECT de métricas a usuarios autenticados
CREATE POLICY "Permitir SELECT de métricas a usuarios autenticados"
ON analytics_daily_metrics FOR SELECT
USING (auth.role() = 'authenticated');

-- Política: Permitir INSERT/UPDATE de métricas a usuarios autenticados
CREATE POLICY "Permitir INSERT/UPDATE de métricas a usuarios autenticados"
ON analytics_daily_metrics FOR ALL
USING (auth.role() = 'authenticated');

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en analytics_daily_metrics
CREATE TRIGGER update_analytics_daily_metrics_updated_at
  BEFORE UPDATE ON analytics_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentar las tablas
COMMENT ON TABLE analytics_events IS 'Registra todos los eventos de analytics del sistema';
COMMENT ON TABLE analytics_daily_metrics IS 'Métricas agregadas por día para optimizar consultas';

COMMENT ON COLUMN analytics_events.event_type IS 'Tipo de evento: page_view, whatsapp_click, shopping_list_add, product_view, search, etc.';
COMMENT ON COLUMN analytics_events.event_data IS 'Datos adicionales del evento en formato JSON';
COMMENT ON COLUMN analytics_events.user_id IS 'ID del usuario (si está autenticado)';
COMMENT ON COLUMN analytics_events.session_id IS 'ID de sesión del navegador';
COMMENT ON COLUMN analytics_events.ip_address IS 'Dirección IP del usuario';
COMMENT ON COLUMN analytics_events.user_agent IS 'User agent del navegador';
