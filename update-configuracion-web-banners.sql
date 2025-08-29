-- Script para actualizar la tabla configuracion_web para soportar 3 banners
-- Ejecutar después de crear la tabla inicial

-- Agregar campos adicionales para banner_2 y banner_3
ALTER TABLE public.configuracion_web 
ADD COLUMN IF NOT EXISTS banner_2 text null,
ADD COLUMN IF NOT EXISTS banner_3 text null;

-- Verificar la estructura actualizada
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'configuracion_web' 
  AND table_schema = 'public'
ORDER BY ordinal_position;