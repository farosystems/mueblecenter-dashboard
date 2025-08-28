-- Script para verificar y corregir asociaciones incorrectas en producto_planes_default
-- Basado en los booleanos de los productos

-- 1. Verificar asociaciones actuales problemáticas
SELECT 
  p.id as producto_id,
  p.descripcion as producto_descripcion,
  p.fk_id_categoria as producto_categoria_id,
  c.descripcion as producto_categoria_nombre,
  p.aplica_todos_plan,
  p.aplica_solo_categoria,
  p.aplica_plan_especial,
  ppd.fk_id_plan,
  pf.nombre as plan_nombre,
  array_agg(pc.fk_id_categoria) as categorias_del_plan
FROM productos p
LEFT JOIN categorias c ON p.fk_id_categoria = c.id
INNER JOIN producto_planes_default ppd ON p.id = ppd.fk_id_producto
INNER JOIN planes_financiacion pf ON ppd.fk_id_plan = pf.id
LEFT JOIN planes_categorias pc ON pf.id = pc.fk_id_plan
WHERE p.aplica_solo_categoria = true 
  AND p.fk_id_categoria IS NOT NULL
GROUP BY p.id, p.descripcion, p.fk_id_categoria, c.descripcion, p.aplica_todos_plan, p.aplica_solo_categoria, p.aplica_plan_especial, ppd.fk_id_plan, pf.nombre
HAVING NOT (p.fk_id_categoria = ANY(array_agg(pc.fk_id_categoria)))
ORDER BY p.id;

-- 2. Eliminar asociaciones incorrectas para productos que aplican solo a su categoría
DELETE FROM producto_planes_default 
WHERE fk_id_producto IN (
  SELECT DISTINCT p.id
  FROM productos p
  INNER JOIN producto_planes_default ppd ON p.id = ppd.fk_id_producto
  INNER JOIN planes_financiacion pf ON ppd.fk_id_plan = pf.id
  LEFT JOIN planes_categorias pc ON pf.id = pc.fk_id_plan
  WHERE p.aplica_solo_categoria = true 
    AND p.fk_id_categoria IS NOT NULL
  GROUP BY p.id, p.fk_id_categoria
  HAVING NOT (p.fk_id_categoria = ANY(array_agg(pc.fk_id_categoria)))
);

-- 3. Verificar que se eliminaron las asociaciones incorrectas
SELECT 
  p.id as producto_id,
  p.descripcion as producto_descripcion,
  p.fk_id_categoria as producto_categoria_id,
  c.descripcion as producto_categoria_nombre,
  COUNT(ppd.fk_id_plan) as planes_asociados
FROM productos p
LEFT JOIN categorias c ON p.fk_id_categoria = c.id
LEFT JOIN producto_planes_default ppd ON p.id = ppd.fk_id_producto
WHERE p.aplica_solo_categoria = true 
  AND p.fk_id_categoria IS NOT NULL
GROUP BY p.id, p.descripcion, p.fk_id_categoria, c.descripcion
ORDER BY p.id;

