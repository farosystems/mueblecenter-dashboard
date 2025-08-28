-- Agregar campos adicionales de imagen a la tabla productos
ALTER TABLE public.productos 
ADD COLUMN imagen_2 text null,
ADD COLUMN imagen_3 text null,
ADD COLUMN imagen_4 text null,
ADD COLUMN imagen_5 text null;

-- Crear índices para mejorar el rendimiento de consultas por imágenes
CREATE INDEX productos_imagen_2_idx ON public.productos (imagen_2) WHERE imagen_2 IS NOT NULL;
CREATE INDEX productos_imagen_3_idx ON public.productos (imagen_3) WHERE imagen_3 IS NOT NULL;
CREATE INDEX productos_imagen_4_idx ON public.productos (imagen_4) WHERE imagen_4 IS NOT NULL;
CREATE INDEX productos_imagen_5_idx ON public.productos (imagen_5) WHERE imagen_5 IS NOT NULL;
