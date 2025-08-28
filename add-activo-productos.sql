-- Agregar campo activo a la tabla productos
DO $$ 
BEGIN 
    -- Verificar si la columna activo ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' 
        AND column_name = 'activo'
    ) THEN
        -- Agregar la columna activo con valor por defecto true
        ALTER TABLE productos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
        
        -- Crear un índice para mejorar el rendimiento de consultas por estado activo
        CREATE INDEX idx_productos_activo ON productos(activo);
        
        RAISE NOTICE 'Campo activo agregado exitosamente a la tabla productos';
    ELSE
        RAISE NOTICE 'El campo activo ya existe en la tabla productos';
    END IF;
END $$;
