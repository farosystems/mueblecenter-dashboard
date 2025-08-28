-- Actualizar productos destacados en la tabla producto_planes
-- Este script actualiza todas las asociaciones de productos que están marcados como destacados
-- en la tabla productos pero tienen destacado = false en producto_planes

-- Primero, mostrar qué productos se van a actualizar
SELECT 
    p.id as producto_id,
    p.descripcion as producto_nombre,
    p.destacado as producto_destacado,
    pp.id as asociacion_id,
    pp.destacado as asociacion_destacado,
    pl.nombre as plan_nombre
FROM productos p
INNER JOIN producto_planes pp ON p.id = pp.fk_id_producto
INNER JOIN planes_financiacion pl ON pp.fk_id_plan = pl.id
WHERE p.destacado = true 
AND pp.destacado = false;

-- Actualizar todas las asociaciones de productos destacados
UPDATE producto_planes 
SET destacado = true
WHERE fk_id_producto IN (
    SELECT id 
    FROM productos 
    WHERE destacado = true
);

-- Verificar el resultado de la actualización
SELECT 
    p.id as producto_id,
    p.descripcion as producto_nombre,
    p.destacado as producto_destacado,
    pp.id as asociacion_id,
    pp.destacado as asociacion_destacado,
    pl.nombre as plan_nombre
FROM productos p
INNER JOIN producto_planes pp ON p.id = pp.fk_id_producto
INNER JOIN planes_financiacion pl ON pp.fk_id_plan = pl.id
WHERE p.destacado = true
ORDER BY p.descripcion, pl.nombre;
