-- Agregar campo anticipo_minimo_fijo a la tabla planes_financiacion
ALTER TABLE public.planes_financiacion 
ADD COLUMN anticipo_minimo_fijo numeric(10,2) null;

-- Crear índice para mejorar el rendimiento de consultas por anticipo fijo
CREATE INDEX planes_financiacion_anticipo_minimo_fijo_idx ON public.planes_financiacion (anticipo_minimo_fijo) WHERE anticipo_minimo_fijo IS NOT NULL;

-- Agregar comentario al campo para documentación
COMMENT ON COLUMN public.planes_financiacion.anticipo_minimo_fijo IS 'Monto fijo mínimo de anticipo requerido para el plan (en pesos)';

