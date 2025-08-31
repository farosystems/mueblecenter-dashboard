-- Schema para configuración del agente en Supabase
-- Copia este script en tu panel de Supabase SQL Editor

CREATE TABLE configuracion_agente (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Configuración de horarios
    hora_inicio TIME NOT NULL DEFAULT '09:00:00',  -- Ej: 09:00 AM
    hora_fin TIME NOT NULL DEFAULT '18:00:00',     -- Ej: 06:00 PM
    
    -- Switches de funcionalidades (todos BOOLEAN)
    habilita_envios BOOLEAN NOT NULL DEFAULT true,
    habilita_planes_financiacion BOOLEAN NOT NULL DEFAULT true,
    habilita_promociones BOOLEAN NOT NULL DEFAULT true,
    habilita_stock_sucursales BOOLEAN NOT NULL DEFAULT true,
    habilita_producto_sustituto BOOLEAN NOT NULL DEFAULT true,
    
    -- Switches adicionales que podrían ser útiles para el agente
    habilita_consulta_precios BOOLEAN NOT NULL DEFAULT true,
    habilita_busqueda_productos BOOLEAN NOT NULL DEFAULT true,
    habilita_informacion_categorias BOOLEAN NOT NULL DEFAULT true,
    habilita_informacion_marcas BOOLEAN NOT NULL DEFAULT true,
    habilita_consulta_disponibilidad BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadatos
    nombre_configuracion VARCHAR(255) NOT NULL DEFAULT 'Configuración Principal',
    descripcion TEXT,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Limpiar registros duplicados si existen (solo en caso de que ya haya datos)
-- Eliminar todos los registros existentes para empezar limpio
DELETE FROM configuracion_agente;

-- Crear índice único para evitar múltiples configuraciones activas
CREATE UNIQUE INDEX idx_configuracion_agente_activa 
ON configuracion_agente (activa) 
WHERE activa = true;

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_configuracion_agente_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para updated_at
CREATE TRIGGER update_configuracion_agente_updated_at
    BEFORE UPDATE ON configuracion_agente
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracion_agente_updated_at();

-- Insertar configuración por defecto
INSERT INTO configuracion_agente (
    nombre_configuracion,
    descripcion,
    hora_inicio,
    hora_fin,
    habilita_envios,
    habilita_planes_financiacion,
    habilita_promociones,
    habilita_stock_sucursales,
    habilita_producto_sustituto,
    habilita_consulta_precios,
    habilita_busqueda_productos,
    habilita_informacion_categorias,
    habilita_informacion_marcas,
    habilita_consulta_disponibilidad
) VALUES (
    'Configuración Principal',
    'Configuración predeterminada del agente virtual',
    '09:00:00',
    '18:00:00',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true
);

-- Política de RLS (Row Level Security) - opcional, ajustar según necesidades
-- ALTER TABLE configuracion_agente ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "configuracion_agente_policy" ON configuracion_agente FOR ALL USING (true);