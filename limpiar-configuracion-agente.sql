-- Script para limpiar datos duplicados de configuración del agente
-- Ejecutar solo si ya existe la tabla con datos duplicados

-- 1. Eliminar todos los registros existentes
DELETE FROM configuracion_agente;

-- 2. Crear el índice único (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'configuracion_agente' 
        AND indexname = 'idx_configuracion_agente_activa'
    ) THEN
        CREATE UNIQUE INDEX idx_configuracion_agente_activa 
        ON configuracion_agente (activa) 
        WHERE activa = true;
    END IF;
END $$;

-- 3. Insertar configuración limpia
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
    habilita_consulta_disponibilidad,
    activa
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
    true,
    true
);

-- Verificar que solo hay un registro
SELECT COUNT(*) as total_registros FROM configuracion_agente;
SELECT * FROM configuracion_agente;