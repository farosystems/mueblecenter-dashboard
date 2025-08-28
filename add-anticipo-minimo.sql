-- Agregar campo anticipo_minimo a la tabla planes_financiacion
ALTER TABLE public.planes_financiacion 
ADD COLUMN anticipo_minimo numeric(5,2) null;

-- Crear índice para mejorar el rendimiento de consultas por anticipo
CREATE INDEX planes_financiacion_anticipo_minimo_idx ON public.planes_financiacion (anticipo_minimo) WHERE anticipo_minimo IS NOT NULL;

-- Agregar comentario al campo para documentación
COMMENT ON COLUMN public.planes_financiacion.anticipo_minimo IS 'Porcentaje mínimo de anticipo requerido para el plan (0-100)';

