-- Fix marcas sequence to prevent duplicate key constraint violations
-- This script resets the sequence to the correct value based on existing data

-- First, let's see what we have
SELECT 'Current data' as info, COUNT(*) as count FROM marcas;
SELECT 'Max ID' as info, COALESCE(MAX(id), 0) as value FROM marcas;

-- Check current sequence value safely
DO $$ 
BEGIN
    IF (SELECT COUNT(*) FROM pg_sequences WHERE sequencename = 'marcas_id_seq') > 0 THEN
        PERFORM setval('marcas_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM marcas), 0) + 1, 1));
        RAISE NOTICE 'Sequence reset to: %', currval('marcas_id_seq');
    ELSE
        RAISE NOTICE 'Sequence marcas_id_seq not found';
    END IF;
END $$;

-- Show final state
SELECT 'Final sequence value' as info, CASE 
    WHEN (SELECT COUNT(*) FROM pg_sequences WHERE sequencename = 'marcas_id_seq') > 0 
    THEN currval('marcas_id_seq')::text
    ELSE 'Sequence not found'
END as value;