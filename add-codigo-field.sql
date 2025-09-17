-- Script para agregar el campo codigo a la tabla productos
-- Este campo almacenará el código único del producto

-- Agregar el campo codigo a la tabla productos
ALTER TABLE public.productos
ADD COLUMN codigo TEXT NULL;

-- Agregar índice para búsquedas rápidas por código
CREATE INDEX idx_productos_codigo ON public.productos(codigo);

-- Agregar comentario al campo para documentación
COMMENT ON COLUMN public.productos.codigo IS 'Código único del producto (opcional, usado para identificación)';

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'productos'
AND column_name = 'codigo';