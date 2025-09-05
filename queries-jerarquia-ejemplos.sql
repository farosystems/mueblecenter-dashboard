-- Ejemplos de consultas para trabajar con la nueva jerarquía de artículos
-- Estas consultas te ayudarán a entender cómo usar las nuevas tablas

-- 1. OBTENER TODOS LOS PRODUCTOS CON SU JERARQUÍA COMPLETA
SELECT 
    p.id,
    p.nombre as producto,
    p.precio,
    pr.nombre as presentacion,
    l.nombre as linea,
    t.nombre as tipo,
    c.nombre as categoria
FROM productos p
LEFT JOIN presentaciones pr ON p.presentacion_id = pr.id
LEFT JOIN lineas l ON p.linea_id = l.id
LEFT JOIN tipos t ON p.tipo_id = t.id
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.activo = true
ORDER BY pr.nombre, l.nombre, t.nombre, p.nombre;

-- 2. OBTENER PRODUCTOS POR PRESENTACIÓN
SELECT 
    p.nombre as producto,
    p.precio,
    l.nombre as linea,
    t.nombre as tipo
FROM productos p
JOIN presentaciones pr ON p.presentacion_id = pr.id
JOIN lineas l ON p.linea_id = l.id
JOIN tipos t ON p.tipo_id = t.id
WHERE pr.nombre = 'Muebles de Living'
AND p.activo = true;

-- 3. OBTENER LA ESTRUCTURA JERÁRQUICA COMPLETA (para menús)
SELECT 
    pr.id as presentacion_id,
    pr.nombre as presentacion,
    l.id as linea_id,
    l.nombre as linea,
    t.id as tipo_id,
    t.nombre as tipo,
    COUNT(p.id) as cantidad_productos
FROM presentaciones pr
LEFT JOIN lineas l ON pr.id = l.presentacion_id
LEFT JOIN tipos t ON l.id = t.linea_id
LEFT JOIN productos p ON t.id = p.tipo_id AND p.activo = true
WHERE pr.activo = true
AND (l.activo = true OR l.activo IS NULL)
AND (t.activo = true OR t.activo IS NULL)
GROUP BY pr.id, pr.nombre, l.id, l.nombre, t.id, t.nombre
ORDER BY pr.nombre, l.nombre, t.nombre;

-- 4. PRODUCTOS POR LÍNEA ESPECÍFICA
SELECT 
    p.nombre as producto,
    p.precio,
    t.nombre as tipo,
    c.nombre as categoria
FROM productos p
JOIN lineas l ON p.linea_id = l.id
JOIN tipos t ON p.tipo_id = t.id
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE l.nombre = 'Sillones'
AND p.activo = true;

-- 5. CONTAR PRODUCTOS POR CADA NIVEL DE JERARQUÍA
-- Por Presentación
SELECT 
    pr.nombre as presentacion,
    COUNT(p.id) as total_productos
FROM presentaciones pr
LEFT JOIN productos p ON pr.id = p.presentacion_id AND p.activo = true
GROUP BY pr.id, pr.nombre
ORDER BY total_productos DESC;

-- Por Línea
SELECT 
    pr.nombre as presentacion,
    l.nombre as linea,
    COUNT(p.id) as total_productos
FROM presentaciones pr
JOIN lineas l ON pr.id = l.presentacion_id
LEFT JOIN productos p ON l.id = p.linea_id AND p.activo = true
GROUP BY pr.id, pr.nombre, l.id, l.nombre
ORDER BY pr.nombre, total_productos DESC;

-- 6. BUSCAR PRODUCTOS CON FILTROS MÚLTIPLES
SELECT 
    p.nombre as producto,
    p.precio,
    pr.nombre as presentacion,
    l.nombre as linea,
    t.nombre as tipo
FROM productos p
JOIN presentaciones pr ON p.presentacion_id = pr.id
JOIN lineas l ON p.linea_id = l.id
JOIN tipos t ON p.tipo_id = t.id
WHERE p.activo = true
AND pr.nombre ILIKE '%living%'
AND p.precio BETWEEN 50000 AND 200000
ORDER BY p.precio;

-- 7. OBTENER JERARQUÍA DE UN PRODUCTO ESPECÍFICO (usando la función)
SELECT * FROM get_producto_jerarquia('UUID_DEL_PRODUCTO');

-- 8. PRODUCTOS SIN JERARQUÍA COMPLETA (para identificar datos que necesitan migración)
SELECT 
    p.id,
    p.nombre,
    CASE WHEN p.presentacion_id IS NULL THEN 'Falta Presentación' ELSE NULL END,
    CASE WHEN p.linea_id IS NULL THEN 'Falta Línea' ELSE NULL END,
    CASE WHEN p.tipo_id IS NULL THEN 'Falta Tipo' ELSE NULL END
FROM productos p
WHERE p.presentacion_id IS NULL 
OR p.linea_id IS NULL 
OR p.tipo_id IS NULL;

-- 9. CREAR UNA VISTA PARA FACILITAR CONSULTAS FRECUENTES
CREATE OR REPLACE VIEW productos_con_jerarquia AS
SELECT 
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.imagen_url,
    p.activo,
    p.created_at,
    p.updated_at,
    pr.id as presentacion_id,
    pr.nombre as presentacion,
    l.id as linea_id,
    l.nombre as linea,
    t.id as tipo_id,
    t.nombre as tipo,
    c.id as categoria_id,
    c.nombre as categoria
FROM productos p
LEFT JOIN presentaciones pr ON p.presentacion_id = pr.id
LEFT JOIN lineas l ON p.linea_id = l.id
LEFT JOIN tipos t ON p.tipo_id = t.id
LEFT JOIN categorias c ON p.categoria_id = c.id;

-- 10. USAR LA VISTA CREADA
SELECT * FROM productos_con_jerarquia 
WHERE presentacion = 'Muebles de Living'
AND activo = true;

-- 11. PROCEDIMIENTO PARA AGREGAR UN PRODUCTO CON JERARQUÍA
CREATE OR REPLACE FUNCTION agregar_producto_con_jerarquia(
    p_nombre VARCHAR,
    p_descripcion TEXT,
    p_precio DECIMAL,
    p_presentacion VARCHAR,
    p_linea VARCHAR,
    p_tipo VARCHAR,
    p_categoria VARCHAR DEFAULT NULL,
    p_imagen_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_presentacion_id UUID;
    v_linea_id UUID;
    v_tipo_id UUID;
    v_categoria_id UUID;
    v_producto_id UUID;
BEGIN
    -- Obtener o crear presentación
    SELECT id INTO v_presentacion_id FROM presentaciones WHERE nombre = p_presentacion;
    IF v_presentacion_id IS NULL THEN
        INSERT INTO presentaciones (nombre) VALUES (p_presentacion) RETURNING id INTO v_presentacion_id;
    END IF;
    
    -- Obtener o crear línea
    SELECT id INTO v_linea_id FROM lineas WHERE nombre = p_linea AND presentacion_id = v_presentacion_id;
    IF v_linea_id IS NULL THEN
        INSERT INTO lineas (nombre, presentacion_id) VALUES (p_linea, v_presentacion_id) RETURNING id INTO v_linea_id;
    END IF;
    
    -- Obtener o crear tipo
    SELECT id INTO v_tipo_id FROM tipos WHERE nombre = p_tipo AND linea_id = v_linea_id;
    IF v_tipo_id IS NULL THEN
        INSERT INTO tipos (nombre, linea_id) VALUES (p_tipo, v_linea_id) RETURNING id INTO v_tipo_id;
    END IF;
    
    -- Obtener o crear categoría si se proporciona
    IF p_categoria IS NOT NULL THEN
        SELECT id INTO v_categoria_id FROM categorias WHERE nombre = p_categoria;
        IF v_categoria_id IS NULL THEN
            INSERT INTO categorias (nombre) VALUES (p_categoria) RETURNING id INTO v_categoria_id;
        END IF;
    END IF;
    
    -- Crear el producto
    INSERT INTO productos (
        nombre, descripcion, precio, imagen_url,
        presentacion_id, linea_id, tipo_id, categoria_id
    ) VALUES (
        p_nombre, p_descripcion, p_precio, p_imagen_url,
        v_presentacion_id, v_linea_id, v_tipo_id, v_categoria_id
    ) RETURNING id INTO v_producto_id;
    
    RETURN v_producto_id;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso del procedimiento:
-- SELECT agregar_producto_con_jerarquia(
--     'Sillón Moderno 3 Cuerpos', 
--     'Sillón cómodo y elegante', 
--     150000.00, 
--     'Muebles de Living', 
--     'Sillones', 
--     'Sillones de 3 Cuerpos',
--     'Premium'
-- );