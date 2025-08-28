-- Agregar campo destacado a la tabla producto_planes existente
ALTER TABLE public.producto_planes 
ADD COLUMN destacado boolean NOT NULL DEFAULT false;

-- Crear índice para el campo destacado
CREATE INDEX producto_planes_destacado_idx ON public.producto_planes (destacado);
