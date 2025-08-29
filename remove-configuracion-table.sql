-- Script para eliminar la tabla de configuración general de WhatsApp
-- MANTENER la tabla configuracion_zonas (WhatsApp por zonas)

-- Eliminar la tabla configuracion (WhatsApp general)
DROP TABLE IF EXISTS public.configuracion CASCADE;

-- Verificar que solo quede la tabla configuracion_zonas
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'configuracion%'
ORDER BY table_name;