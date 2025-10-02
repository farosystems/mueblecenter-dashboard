-- ============================================
-- PASO 1: Ver los productos duplicados
-- ============================================
SELECT
  codigo,
  COUNT(*) as cantidad,
  STRING_AGG(id::text, ', ' ORDER BY id) as ids
FROM productos
WHERE codigo IS NOT NULL AND codigo != ''
GROUP BY codigo
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- ============================================
-- PASO 2: Ver los IDs específicos que se van a eliminar
-- (Mantiene solo el más reciente, elimina los demás)
-- ============================================
SELECT id, codigo
FROM (
  SELECT
    id,
    codigo,
    ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY id DESC) as rn
  FROM productos
  WHERE codigo IS NOT NULL AND codigo != ''
) sub
WHERE rn > 1
ORDER BY codigo, id;

-- ============================================
-- PASO 3: ELIMINAR - Ejecuta TODO este bloque de una vez
-- ============================================
BEGIN;

-- Eliminar asociaciones en producto_planes_default
DELETE FROM producto_planes_default
WHERE fk_id_producto IN (
  SELECT id
  FROM (
    SELECT
      id,
      codigo,
      ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY id DESC) as rn
    FROM productos
    WHERE codigo IS NOT NULL AND codigo != ''
  ) sub
  WHERE rn > 1
);

-- Eliminar asociaciones en producto_planes
DELETE FROM producto_planes
WHERE fk_id_producto IN (
  SELECT id
  FROM (
    SELECT
      id,
      codigo,
      ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY id DESC) as rn
    FROM productos
    WHERE codigo IS NOT NULL AND codigo != ''
  ) sub
  WHERE rn > 1
);

-- Eliminar registros de stock
DELETE FROM stock_sucursales
WHERE fk_id_producto IN (
  SELECT id
  FROM (
    SELECT
      id,
      codigo,
      ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY id DESC) as rn
    FROM productos
    WHERE codigo IS NOT NULL AND codigo != ''
  ) sub
  WHERE rn > 1
);

-- Eliminar productos duplicados
DELETE FROM productos
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      codigo,
      ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY id DESC) as rn
    FROM productos
    WHERE codigo IS NOT NULL AND codigo != ''
  ) sub
  WHERE rn > 1
);

COMMIT;
-- Si algo sale mal, en lugar de COMMIT ejecuta: ROLLBACK;

-- ============================================
-- PASO 4: Verificar que no queden duplicados
-- ============================================
SELECT
  codigo,
  COUNT(*) as cantidad
FROM productos
WHERE codigo IS NOT NULL AND codigo != ''
GROUP BY codigo
HAVING COUNT(*) > 1;
