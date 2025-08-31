-- Check for duplicate entries or sequence issues in categorias table

-- 1. Check current sequence value vs max ID
SELECT 
    'Current sequence value' as info,
    currval('categorias_id_seq') as sequence_value
UNION ALL
SELECT 
    'Max ID in table' as info,
    COALESCE(MAX(id), 0) as sequence_value
FROM categorias
UNION ALL  
SELECT 
    'Next sequence value' as info,
    nextval('categorias_id_seq') as sequence_value;

-- Reset sequence after the check
SELECT setval('categorias_id_seq', COALESCE((SELECT MAX(id) FROM categorias), 1), false);

-- 2. Check for any duplicate IDs (shouldn't happen but let's verify)
SELECT id, COUNT(*) 
FROM categorias 
GROUP BY id 
HAVING COUNT(*) > 1;

-- 3. Check for any gaps in sequence
SELECT 
    id,
    id - LAG(id) OVER (ORDER BY id) as gap
FROM categorias
WHERE id - LAG(id) OVER (ORDER BY id) > 1;

-- 4. Show all current categorias
SELECT * FROM categorias ORDER BY id;