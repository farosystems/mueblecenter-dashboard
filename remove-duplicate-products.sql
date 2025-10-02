-- Script para eliminar productos duplicados manteniendo solo el más reciente
-- Este script identifica productos con el mismo código y elimina los duplicados,
-- manteniendo solo el registro más reciente (mayor ID)
-- IMPORTANTE: Elimina primero las relaciones en tablas relacionadas

BEGIN;

-- Ver los productos duplicados antes de eliminar (para verificar)
SELECT
  codigo,
  COUNT(*) as cantidad,
  STRING_AGG(id::text, ', ' ORDER BY id) as ids
FROM productos
WHERE codigo IS NOT NULL AND codigo != ''
GROUP BY codigo
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- Identificar los IDs de productos duplicados a eliminar (mantener solo el más reciente)
CREATE TEMP TABLE productos_a_eliminar AS
SELECT id
FROM (
  SELECT
    id,
    codigo,
    ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY id DESC) as rn
  FROM productos
  WHERE codigo IS NOT NULL AND codigo != ''
) sub
WHERE rn > 1;

-- Ver cuántos productos se van a eliminar
SELECT COUNT(*) as total_productos_a_eliminar FROM productos_a_eliminar;

-- 1. Eliminar asociaciones en producto_planes_default
DELETE FROM producto_planes_default
WHERE fk_id_producto IN (SELECT id FROM productos_a_eliminar);

-- 2. Eliminar asociaciones en producto_planes
DELETE FROM producto_planes
WHERE fk_id_producto IN (SELECT id FROM productos_a_eliminar);

-- 3. Eliminar registros de stock en stock_sucursales
DELETE FROM stock_sucursales
WHERE fk_id_producto IN (SELECT id FROM productos_a_eliminar);

-- 4. Ahora sí, eliminar los productos duplicados
DELETE FROM productos
WHERE id IN (SELECT id FROM productos_a_eliminar);

-- Verificar que no queden duplicados
SELECT
  codigo,
  COUNT(*) as cantidad
FROM productos
WHERE codigo IS NOT NULL AND codigo != ''
GROUP BY codigo
HAVING COUNT(*) > 1;

-- Si todo está bien, hacer commit
COMMIT;

-- Si algo salió mal, puedes hacer ROLLBACK; en lugar de COMMIT;
