-- Agregar campo activo a la tabla producto_planes_default (solo si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'producto_planes_default' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE public.producto_planes_default 
        ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
        
        -- Crear índice para mejorar el rendimiento de consultas por activo
        CREATE INDEX producto_planes_default_activo_idx ON public.producto_planes_default (activo);
        
        -- Actualizar registros existentes para que estén activos por defecto
        UPDATE public.producto_planes_default SET activo = true WHERE activo IS NULL;
        
        RAISE NOTICE 'Campo activo agregado exitosamente a producto_planes_default';
    ELSE
        RAISE NOTICE 'El campo activo ya existe en producto_planes_default';
    END IF;
END $$;
