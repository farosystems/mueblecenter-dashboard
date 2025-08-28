-- Agregar campos booleanos a la tabla productos
ALTER TABLE public.productos 
ADD COLUMN aplica_todos_plan boolean NOT NULL DEFAULT false,
ADD COLUMN aplica_solo_categoria boolean NOT NULL DEFAULT false,
ADD COLUMN aplica_plan_especial boolean NOT NULL DEFAULT false;

-- Crear índices para mejorar el rendimiento de consultas por estos campos
CREATE INDEX productos_aplica_todos_plan_idx ON public.productos (aplica_todos_plan);
CREATE INDEX productos_aplica_solo_categoria_idx ON public.productos (aplica_solo_categoria);
CREATE INDEX productos_aplica_plan_especial_idx ON public.productos (aplica_plan_especial);

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.productos.aplica_todos_plan IS 'Indica si el producto aplica a todos los planes de financiación';
COMMENT ON COLUMN public.productos.aplica_solo_categoria IS 'Indica si el producto aplica solo a planes de su categoría';
COMMENT ON COLUMN public.productos.aplica_plan_especial IS 'Indica si el producto aplica a planes especiales';

