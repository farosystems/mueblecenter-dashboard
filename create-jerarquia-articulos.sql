-- Script para crear la jerarquía de artículos: Presentacion -> Linea -> Tipo -> Articulo
-- Ejecutar en orden: primero crear tablas, luego migrar datos

-- 1. TABLA PRESENTACIONES (Nivel más alto)
CREATE TABLE IF NOT EXISTS presentaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA LINEAS (Pertenece a una Presentación)
CREATE TABLE IF NOT EXISTS lineas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  presentacion_id UUID NOT NULL REFERENCES presentaciones(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nombre, presentacion_id) -- Un mismo nombre de línea puede repetirse en diferentes presentaciones
);

-- 3. TABLA TIPOS (Pertenece a una Línea)
CREATE TABLE IF NOT EXISTS tipos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  linea_id UUID NOT NULL REFERENCES lineas(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nombre, linea_id) -- Un mismo nombre de tipo puede repetirse en diferentes líneas
);

-- 4. TABLA CATEGORIAS (Se mantiene como tabla independiente)
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AGREGAR COLUMNAS A LA TABLA PRODUCTOS EXISTENTE
DO $$
BEGIN
  -- Verificar y agregar columnas si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'presentacion_id') THEN
    ALTER TABLE productos ADD COLUMN presentacion_id UUID REFERENCES presentaciones(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'linea_id') THEN
    ALTER TABLE productos ADD COLUMN linea_id UUID REFERENCES lineas(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'tipo_id') THEN
    ALTER TABLE productos ADD COLUMN tipo_id UUID REFERENCES tipos(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'categoria_id') THEN
    ALTER TABLE productos ADD COLUMN categoria_id UUID REFERENCES categorias(id);
  END IF;
END $$;

-- 6. MIGRAR CATEGORÍAS EXISTENTES
INSERT INTO categorias (nombre, activo) 
SELECT DISTINCT categoria, true 
FROM productos 
WHERE categoria IS NOT NULL AND categoria != ''
ON CONFLICT (nombre) DO NOTHING;

-- Actualizar productos con categoria_id
UPDATE productos 
SET categoria_id = c.id 
FROM categorias c 
WHERE productos.categoria = c.nombre
AND productos.categoria_id IS NULL;

-- 7. CREAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lineas_presentacion ON lineas(presentacion_id);
CREATE INDEX IF NOT EXISTS idx_lineas_activo ON lineas(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_linea ON tipos(linea_id);
CREATE INDEX IF NOT EXISTS idx_tipos_activo ON tipos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_presentacion ON productos(presentacion_id);
CREATE INDEX IF NOT EXISTS idx_productos_linea ON productos(linea_id);
CREATE INDEX IF NOT EXISTS idx_productos_tipo ON productos(tipo_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_jerarquia ON productos(presentacion_id, linea_id, tipo_id);
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);
CREATE INDEX IF NOT EXISTS idx_presentaciones_activo ON presentaciones(activo);

-- 8. TRIGGERS PARA UPDATED_AT
CREATE TRIGGER IF NOT EXISTS update_presentaciones_updated_at 
  BEFORE UPDATE ON presentaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_lineas_updated_at 
  BEFORE UPDATE ON lineas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_tipos_updated_at 
  BEFORE UPDATE ON tipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_categorias_updated_at 
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. POLÍTICAS RLS PARA LAS NUEVAS TABLAS
ALTER TABLE presentaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Políticas para Presentaciones
CREATE POLICY "Presentaciones son visibles para todos" ON presentaciones
    FOR SELECT USING (true);
CREATE POLICY "Presentaciones pueden ser gestionadas por usuarios autenticados" ON presentaciones
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para Líneas
CREATE POLICY "Lineas son visibles para todos" ON lineas
    FOR SELECT USING (true);
CREATE POLICY "Lineas pueden ser gestionadas por usuarios autenticados" ON lineas
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para Tipos
CREATE POLICY "Tipos son visibles para todos" ON tipos
    FOR SELECT USING (true);
CREATE POLICY "Tipos pueden ser gestionadas por usuarios autenticados" ON tipos
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para Categorías
CREATE POLICY "Categorias son visibles para todos" ON categorias
    FOR SELECT USING (true);
CREATE POLICY "Categorias pueden ser gestionadas por usuarios autenticados" ON categorias
    FOR ALL USING (auth.role() = 'authenticated');

-- 10. DATOS DE EJEMPLO (OPCIONAL)
-- Insertar algunos datos de ejemplo para probar la jerarquía
INSERT INTO presentaciones (nombre, descripcion) VALUES 
('Muebles de Living', 'Muebles para sala de estar y living'),
('Muebles de Dormitorio', 'Muebles para dormitorios y habitaciones'),
('Muebles de Comedor', 'Muebles para comedores y cocinas')
ON CONFLICT (nombre) DO NOTHING;

-- Líneas para Living
INSERT INTO lineas (nombre, descripcion, presentacion_id) VALUES 
('Sillones', 'Sillones individuales y de múltiples cuerpos', (SELECT id FROM presentaciones WHERE nombre = 'Muebles de Living')),
('Mesas de Living', 'Mesas ratona, auxiliares y de centro', (SELECT id FROM presentaciones WHERE nombre = 'Muebles de Living')),
('Modulares', 'Muebles modulares para TV y entretenimiento', (SELECT id FROM presentaciones WHERE nombre = 'Muebles de Living'))
ON CONFLICT (nombre, presentacion_id) DO NOTHING;

-- Tipos para Sillones
INSERT INTO tipos (nombre, descripcion, linea_id) VALUES 
('Sillones de 1 Cuerpo', 'Sillones individuales', (SELECT id FROM lineas WHERE nombre = 'Sillones' AND presentacion_id = (SELECT id FROM presentaciones WHERE nombre = 'Muebles de Living'))),
('Sillones de 2 Cuerpos', 'Sillones para dos personas', (SELECT id FROM lineas WHERE nombre = 'Sillones' AND presentacion_id = (SELECT id FROM presentaciones WHERE nombre = 'Muebles de Living'))),
('Sillones de 3 Cuerpos', 'Sillones para tres personas', (SELECT id FROM lineas WHERE nombre = 'Sillones' AND presentacion_id = (SELECT id FROM presentaciones WHERE nombre = 'Muebles de Living')))
ON CONFLICT (nombre, linea_id) DO NOTHING;

-- Comentarios en las tablas
COMMENT ON TABLE presentaciones IS 'Presentaciones de artículos - Nivel más alto de la jerarquía';
COMMENT ON TABLE lineas IS 'Líneas de artículos - Pertenecen a una presentación';
COMMENT ON TABLE tipos IS 'Tipos de artículos - Pertenecen a una línea';
COMMENT ON TABLE categorias IS 'Categorías de productos - Tabla independiente mantenida';
COMMENT ON COLUMN productos.presentacion_id IS 'Referencia a la presentación del producto';
COMMENT ON COLUMN productos.linea_id IS 'Referencia a la línea del producto';
COMMENT ON COLUMN productos.tipo_id IS 'Referencia al tipo del producto';
COMMENT ON COLUMN productos.categoria_id IS 'Referencia a la categoría del producto';