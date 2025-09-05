-- Script opcional para agregar restricciones estrictas de jerarquía
-- EJECUTAR SOLO DESPUÉS de migrar todos los productos y asegurar que tengan la jerarquía completa

-- 1. HACER OBLIGATORIAS LAS REFERENCIAS JERÁRQUICAS
-- Solo ejecutar cuando todos los productos tengan presentacion_id, linea_id y tipo_id
ALTER TABLE productos 
ALTER COLUMN presentacion_id SET NOT NULL,
ALTER COLUMN linea_id SET NOT NULL,
ALTER COLUMN tipo_id SET NOT NULL;

-- 2. CONSTRAINT PARA ASEGURAR COHERENCIA JERÁRQUICA
-- Garantiza que la jerarquía sea coherente: tipo -> línea -> presentación
ALTER TABLE productos ADD CONSTRAINT check_jerarquia_coherente
CHECK (
  EXISTS (
    SELECT 1 
    FROM tipos t 
    JOIN lineas l ON t.linea_id = l.id 
    JOIN presentaciones p ON l.presentacion_id = p.id
    WHERE t.id = productos.tipo_id 
    AND l.id = productos.linea_id 
    AND p.id = productos.presentacion_id
  )
);

-- 3. FUNCIÓN PARA VALIDAR JERARQUÍA ANTES DE INSERT/UPDATE
CREATE OR REPLACE FUNCTION validar_jerarquia_producto()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar que tipo_id pertenezca a linea_id
  IF NOT EXISTS (
    SELECT 1 FROM tipos WHERE id = NEW.tipo_id AND linea_id = NEW.linea_id
  ) THEN
    RAISE EXCEPTION 'El tipo % no pertenece a la línea %', NEW.tipo_id, NEW.linea_id;
  END IF;
  
  -- Verificar que linea_id pertenezca a presentacion_id
  IF NOT EXISTS (
    SELECT 1 FROM lineas WHERE id = NEW.linea_id AND presentacion_id = NEW.presentacion_id
  ) THEN
    RAISE EXCEPTION 'La línea % no pertenece a la presentación %', NEW.linea_id, NEW.presentacion_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER PARA VALIDACIÓN AUTOMÁTICA
CREATE TRIGGER validate_producto_jerarquia 
  BEFORE INSERT OR UPDATE ON productos
  FOR EACH ROW 
  WHEN (NEW.presentacion_id IS NOT NULL AND NEW.linea_id IS NOT NULL AND NEW.tipo_id IS NOT NULL)
  EXECUTE FUNCTION validar_jerarquia_producto();

-- 5. FUNCIÓN PARA OBTENER LA JERARQUÍA COMPLETA DE UN PRODUCTO
CREATE OR REPLACE FUNCTION get_producto_jerarquia(producto_uuid UUID)
RETURNS TABLE (
  producto_id UUID,
  producto_nombre VARCHAR,
  presentacion_id UUID,
  presentacion_nombre VARCHAR,
  linea_id UUID,
  linea_nombre VARCHAR,
  tipo_id UUID,
  tipo_nombre VARCHAR,
  categoria_id UUID,
  categoria_nombre VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nombre,
    pr.id,
    pr.nombre,
    l.id,
    l.nombre,
    t.id,
    t.nombre,
    c.id,
    c.nombre
  FROM productos p
  LEFT JOIN presentaciones pr ON p.presentacion_id = pr.id
  LEFT JOIN lineas l ON p.linea_id = l.id
  LEFT JOIN tipos t ON p.tipo_id = t.id
  LEFT JOIN categorias c ON p.categoria_id = c.id
  WHERE p.id = producto_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_producto_jerarquia(UUID) IS 'Obtiene la jerarquía completa de un producto específico';