-- Script para agregar el campo cucardas a la tabla productos
-- Este campo almacenará la URL de la imagen de cucarda del producto

ALTER TABLE public.productos 
ADD COLUMN cucardas TEXT;

-- Agregar comentario al campo para documentación
COMMENT ON COLUMN public.productos.cucardas IS 'URL de la imagen de cucarda del producto (opcional)';

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'productos' 
AND column_name = 'cucardas';