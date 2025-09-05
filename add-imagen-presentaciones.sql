-- Agregar campo imagen a la tabla presentaciones
ALTER TABLE presentaciones 
ADD COLUMN IF NOT EXISTS imagen TEXT;

-- Crear índice para optimizar consultas por imagen
CREATE INDEX IF NOT EXISTS idx_presentaciones_imagen ON presentaciones(imagen);