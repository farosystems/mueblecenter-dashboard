-- Script de configuración para Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- Habilitar la extensión uuid-ossp si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  imagen_url TEXT,
  categoria VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de planes de financiación
CREATE TABLE IF NOT EXISTS planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  cuotas INTEGER NOT NULL,
  interes DECIMAL(5,2) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos por plan
CREATE TABLE IF NOT EXISTS productos_plan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes(id) ON DELETE CASCADE,
  precio_final DECIMAL(10,2) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_planes_activo ON planes(activo);
CREATE INDEX IF NOT EXISTS idx_productos_plan_activo ON productos_plan(activo);
CREATE INDEX IF NOT EXISTS idx_productos_plan_producto ON productos_plan(producto_id);
CREATE INDEX IF NOT EXISTS idx_productos_plan_plan ON productos_plan(plan_id);

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planes_updated_at BEFORE UPDATE ON planes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_plan_updated_at BEFORE UPDATE ON productos_plan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_plan ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas (ajusta según tus necesidades)
-- Para productos
CREATE POLICY "Productos son visibles para todos" ON productos
    FOR SELECT USING (true);

CREATE POLICY "Productos pueden ser creados por usuarios autenticados" ON productos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Productos pueden ser actualizados por usuarios autenticados" ON productos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Productos pueden ser eliminados por usuarios autenticados" ON productos
    FOR DELETE USING (auth.role() = 'authenticated');

-- Para planes
CREATE POLICY "Planes son visibles para todos" ON planes
    FOR SELECT USING (true);

CREATE POLICY "Planes pueden ser creados por usuarios autenticados" ON planes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Planes pueden ser actualizados por usuarios autenticados" ON planes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Planes pueden ser eliminados por usuarios autenticados" ON planes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Para productos_plan
CREATE POLICY "Productos_plan son visibles para todos" ON productos_plan
    FOR SELECT USING (true);

CREATE POLICY "Productos_plan pueden ser creados por usuarios autenticados" ON productos_plan
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Productos_plan pueden ser actualizados por usuarios autenticados" ON productos_plan
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Productos_plan pueden ser eliminados por usuarios autenticados" ON productos_plan
    FOR DELETE USING (auth.role() = 'authenticated');

-- Datos de ejemplo (opcional)
INSERT INTO productos (nombre, descripcion, precio, categoria, activo) VALUES
('iPhone 15 Pro', 'El último iPhone con características avanzadas', 999999.99, 'Smartphones', true),
('Samsung Galaxy S24', 'Flagship de Samsung con IA integrada', 899999.99, 'Smartphones', true),
('MacBook Air M3', 'Laptop ultraportátil con chip M3', 1499999.99, 'Computadoras', true),
('iPad Pro 12.9', 'Tablet profesional con pantalla Liquid Retina XDR', 1299999.99, 'Tablets', true);

INSERT INTO planes (nombre, descripcion, cuotas, interes, activo) VALUES
('Plan 3 Cuotas', 'Financiación en 3 cuotas sin interés', 3, 0.00, true),
('Plan 6 Cuotas', 'Financiación en 6 cuotas con interés bajo', 6, 15.00, true),
('Plan 12 Cuotas', 'Financiación en 12 cuotas con interés moderado', 12, 25.00, true),
('Plan 18 Cuotas', 'Financiación extendida en 18 cuotas', 18, 35.00, true);

-- Comentarios sobre las tablas
COMMENT ON TABLE productos IS 'Catálogo de productos disponibles para financiación';
COMMENT ON TABLE planes IS 'Planes de financiación disponibles';
COMMENT ON TABLE productos_plan IS 'Relación entre productos y planes de financiación con precios finales'; 