-- Script para corregir asociaciones de productos con aplica_todos_plan
-- Estos productos deben asociarse SOLO con planes que NO tengan categoría definida

-- 1. Eliminar todas las asociaciones por defecto de productos con aplica_todos_plan
DELETE FROM producto_planes_default 
WHERE fk_id_producto IN (
  SELECT id FROM productos WHERE aplica_todos_plan = true
);

-- 2. Crear nuevas asociaciones correctas para productos con aplica_todos_plan
INSERT INTO producto_planes_default (fk_id_producto, fk_id_plan)
SELECT 
  p.id as fk_id_producto,
  pf.id as fk_id_plan
FROM productos p
CROSS JOIN planes_financiacion pf
WHERE p.aplica_todos_plan = true
  AND pf.activo = true
  AND pf.id NOT IN (
    -- Excluir planes que tienen categorías definidas
    SELECT DISTINCT fk_id_plan 
    FROM planes_categorias
  );

-- 3. Verificar resultados
SELECT 
  p.id as producto_id,
  p.descripcion as producto_descripcion,
  p.fk_id_categoria as producto_categoria_id,
  c.descripcion as producto_categoria_nombre,
  p.aplica_todos_plan,
  p.aplica_solo_categoria,
  p.aplica_plan_especial,
  COUNT(ppd.fk_id_plan) as planes_asociados,
  STRING_AGG(pf.nombre, ', ') as planes_asociados_nombres
FROM productos p
LEFT JOIN categorias c ON p.fk_id_categoria = c.id
LEFT JOIN producto_planes_default ppd ON p.id = ppd.fk_id_producto
LEFT JOIN planes_financiacion pf ON ppd.fk_id_plan = pf.id
WHERE p.aplica_todos_plan = true
GROUP BY p.id, p.descripcion, p.fk_id_categoria, c.descripcion, p.aplica_todos_plan, p.aplica_solo_categoria, p.aplica_plan_especial
ORDER BY p.id;

