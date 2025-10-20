-- Agregar campo precio_promo a la tabla producto_planes
ALTER TABLE public.producto_planes
ADD COLUMN precio_promo numeric(10,2);

-- Añadir comentario para documentar el campo
COMMENT ON COLUMN public.producto_planes.precio_promo IS 'Precio promocional especial para este producto en este plan de financiación';
