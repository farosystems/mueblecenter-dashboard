-- Script para agregar campos de logo y título a configuracion_web
-- Ejecutar después de la tabla base

-- Agregar campos para logo y título personalizado
ALTER TABLE public.configuracion_web 
ADD COLUMN IF NOT EXISTS logo text null,
ADD COLUMN IF NOT EXISTS titulo text null,
ADD COLUMN IF NOT EXISTS subtitulo text null;

-- Verificar la estructura actualizada
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'configuracion_web' 
  AND table_schema = 'public'
ORDER BY ordinal_position;