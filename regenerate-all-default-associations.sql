-- Script para regenerar todas las asociaciones por defecto basándose en los booleanos actuales
-- Este script elimina todas las asociaciones por defecto y las recrea según la lógica de booleanos

-- 1. Eliminar todas las asociaciones por defecto existentes
DELETE FROM producto_planes_default;

-- 2. Crear función para regenerar asociaciones
CREATE OR REPLACE FUNCTION regenerar_asociaciones_por_defecto()
RETURNS void AS $$
DECLARE
    producto_record RECORD;
    plan_record RECORD;
    planes_categoria_record RECORD;
    categorias_plan INTEGER[];
    incluir_plan BOOLEAN;
BEGIN
    -- Para cada producto
    FOR producto_record IN 
        SELECT id, fk_id_categoria, aplica_todos_plan, aplica_solo_categoria, aplica_plan_especial
        FROM productos
    LOOP
        -- Para cada plan activo
        FOR plan_record IN 
            SELECT id FROM planes_financiacion WHERE activo = true
        LOOP
            incluir_plan := false;
            
            -- Obtener categorías del plan
            SELECT array_agg(fk_id_categoria) INTO categorias_plan
            FROM planes_categorias 
            WHERE fk_id_plan = plan_record.id;
            
            -- Si el plan no tiene categorías, categorias_plan será NULL
            IF categorias_plan IS NULL THEN
                categorias_plan := ARRAY[]::INTEGER[];
            END IF;
            
            -- Lógica según booleanos
            IF producto_record.aplica_todos_plan THEN
                -- Aplica a todos los planes que NO tengan categoría definida
                incluir_plan := array_length(categorias_plan, 1) IS NULL OR array_length(categorias_plan, 1) = 0;
            ELSIF producto_record.aplica_solo_categoria AND producto_record.fk_id_categoria IS NOT NULL THEN
                -- Solo planes de su categoría
                incluir_plan := producto_record.fk_id_categoria = ANY(categorias_plan);
            END IF;
            
            -- Insertar asociación si corresponde
            IF incluir_plan THEN
                INSERT INTO producto_planes_default (fk_id_producto, fk_id_plan)
                VALUES (producto_record.id, plan_record.id);
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Ejecutar la función
SELECT regenerar_asociaciones_por_defecto();

-- 4. Verificar resultados
SELECT 
    p.id as producto_id,
    p.descripcion as producto_descripcion,
    p.fk_id_categoria as producto_categoria_id,
    c.descripcion as producto_categoria_nombre,
    p.aplica_todos_plan,
    p.aplica_solo_categoria,
    p.aplica_plan_especial,
    COUNT(ppd.fk_id_plan) as planes_asociados
FROM productos p
LEFT JOIN categorias c ON p.fk_id_categoria = c.id
LEFT JOIN producto_planes_default ppd ON p.id = ppd.fk_id_producto
GROUP BY p.id, p.descripcion, p.fk_id_categoria, c.descripcion, p.aplica_todos_plan, p.aplica_solo_categoria, p.aplica_plan_especial
ORDER BY p.id;

-- 5. Limpiar función
DROP FUNCTION regenerar_asociaciones_por_defecto();
