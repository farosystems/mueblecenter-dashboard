-- Fix all table sequences to prevent duplicate key constraint violations
-- This script resets all sequences to the correct values based on existing data

DO $$ 
DECLARE
    r RECORD;
    seq_name TEXT;
    table_name TEXT;
    max_id INTEGER;
    new_seq_val INTEGER;
BEGIN
    -- List of tables with identity columns that may have sequence issues
    FOR r IN 
        SELECT t.table_name, c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND c.is_identity = 'YES'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('categorias', 'marcas', 'productos', 'planes_financiacion', 'zonas', 'stock_sucursales', 'configuracion_zonas', 'producto_planes', 'producto_planes_default', 'planes_categorias')
    LOOP
        table_name := r.table_name;
        seq_name := table_name || '_id_seq';
        
        -- Get max ID from table
        EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_name) INTO max_id;
        new_seq_val := max_id + 1;
        
        -- Check if sequence exists and reset it
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = seq_name) THEN
            EXECUTE format('SELECT setval(%L, %s)', seq_name, new_seq_val);
            RAISE NOTICE 'Reset sequence % to % (max_id: %)', seq_name, new_seq_val, max_id;
        ELSE
            RAISE NOTICE 'Sequence % not found for table %', seq_name, table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'All sequences have been reset!';
END $$;