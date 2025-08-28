-- Agregar campo fk_id_categoria a la tabla planes_financiacion
ALTER TABLE public.planes_financiacion 
ADD COLUMN fk_id_categoria bigint null;

-- Crear índice para mejorar el rendimiento de consultas por categoría
CREATE INDEX planes_financiacion_fk_id_categoria_idx ON public.planes_financiacion (fk_id_categoria) WHERE fk_id_categoria IS NOT NULL;

-- Agregar foreign key constraint
ALTER TABLE public.planes_financiacion 
ADD CONSTRAINT planes_financiacion_fk_id_categoria_fkey 
FOREIGN KEY (fk_id_categoria) REFERENCES public.categorias (id) ON DELETE SET NULL;

-- Agregar comentario al campo para documentación
COMMENT ON COLUMN public.planes_financiacion.fk_id_categoria IS 'Categoría asociada al plan de financiación (opcional)';

