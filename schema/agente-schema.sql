-- Schema para las tablas del módulo Agente
-- Base de datos: Supabase PostgreSQL

-- ========================================
-- TABLA: clientes
-- ========================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    fk_id_zona UUID NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'interesado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_cliente_zona FOREIGN KEY (fk_id_zona) REFERENCES public.zonas(id) ON DELETE RESTRICT,
    
    -- Check constraint para estados válidos
    CONSTRAINT chk_cliente_estado CHECK (estado IN ('interesado', 'en_proceso', 'cerrado', 'inactivo'))
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_clientes_zona ON public.clientes(fk_id_zona);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);

-- ========================================
-- TABLA: pedidos
-- ========================================
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fk_id_cliente UUID NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (fk_id_cliente) REFERENCES public.clientes(id) ON DELETE CASCADE,
    
    -- Check constraint para estados válidos
    CONSTRAINT chk_pedido_estado CHECK (estado IN ('pendiente', 'anulado', 'cumplido')),
    
    -- Check constraint para total no negativo
    CONSTRAINT chk_pedido_total CHECK (total >= 0)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(fk_id_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos(created_at);

-- ========================================
-- TABLA: detalle_pedido (tabla oculta)
-- ========================================
CREATE TABLE IF NOT EXISTS public.detalle_pedido (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fk_id_pedido UUID NOT NULL,
    fk_id_producto UUID NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (fk_id_pedido) REFERENCES public.pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (fk_id_producto) REFERENCES public.productos(id) ON DELETE RESTRICT,
    
    -- Check constraints
    CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_precio_unitario CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_subtotal CHECK (subtotal >= 0),
    
    -- Constraint único para evitar duplicados de producto por pedido
    CONSTRAINT uk_pedido_producto UNIQUE (fk_id_pedido, fk_id_producto)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_detalle_pedido ON public.detalle_pedido(fk_id_pedido);
CREATE INDEX IF NOT EXISTS idx_detalle_producto ON public.detalle_pedido(fk_id_producto);

-- ========================================
-- TRIGGERS para updated_at
-- ========================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para clientes
DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para pedidos
DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER update_pedidos_updated_at
    BEFORE UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para detalle_pedido
DROP TRIGGER IF EXISTS update_detalle_pedido_updated_at ON public.detalle_pedido;
CREATE TRIGGER update_detalle_pedido_updated_at
    BEFORE UPDATE ON public.detalle_pedido
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCIÓN para calcular total del pedido
-- ========================================

-- Función que recalcula el total de un pedido basado en sus detalles
CREATE OR REPLACE FUNCTION calcular_total_pedido(pedido_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    nuevo_total DECIMAL(12,2);
BEGIN
    -- Calcular la suma de todos los subtotales del pedido
    SELECT COALESCE(SUM(subtotal), 0)
    INTO nuevo_total
    FROM public.detalle_pedido
    WHERE fk_id_pedido = pedido_id;
    
    -- Actualizar el total en la tabla pedidos
    UPDATE public.pedidos
    SET total = nuevo_total,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = pedido_id;
    
    RETURN nuevo_total;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS para recalcular total automáticamente
-- ========================================

-- Función trigger para recalcular total cuando se modifica detalle_pedido
CREATE OR REPLACE FUNCTION trigger_recalcular_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT y UPDATE, usar NEW.fk_id_pedido
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM calcular_total_pedido(NEW.fk_id_pedido);
        RETURN NEW;
    END IF;
    
    -- Para DELETE, usar OLD.fk_id_pedido
    IF TG_OP = 'DELETE' THEN
        PERFORM calcular_total_pedido(OLD.fk_id_pedido);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular total automáticamente
DROP TRIGGER IF EXISTS trigger_detalle_pedido_total ON public.detalle_pedido;
CREATE TRIGGER trigger_detalle_pedido_total
    AFTER INSERT OR UPDATE OR DELETE ON public.detalle_pedido
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalcular_total_pedido();

-- ========================================
-- RLS (Row Level Security) Policies
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.clientes;
CREATE POLICY "Enable all operations for authenticated users" ON public.clientes
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para pedidos
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.pedidos;
CREATE POLICY "Enable all operations for authenticated users" ON public.pedidos
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para detalle_pedido
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.detalle_pedido;
CREATE POLICY "Enable all operations for authenticated users" ON public.detalle_pedido
    FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- COMENTARIOS EN LAS TABLAS
-- ========================================

COMMENT ON TABLE public.clientes IS 'Tabla de clientes del agente';
COMMENT ON COLUMN public.clientes.id IS 'Identificador único del cliente';
COMMENT ON COLUMN public.clientes.nombre IS 'Nombre completo del cliente';
COMMENT ON COLUMN public.clientes.email IS 'Email único del cliente';
COMMENT ON COLUMN public.clientes.fk_id_zona IS 'Referencia a la zona/sucursal del cliente';
COMMENT ON COLUMN public.clientes.estado IS 'Estado del cliente: interesado, en_proceso, cerrado, inactivo';

COMMENT ON TABLE public.pedidos IS 'Tabla de pedidos realizados por los clientes';
COMMENT ON COLUMN public.pedidos.id IS 'Identificador único del pedido';
COMMENT ON COLUMN public.pedidos.fk_id_cliente IS 'Referencia al cliente que realizó el pedido';
COMMENT ON COLUMN public.pedidos.estado IS 'Estado del pedido: pendiente, anulado, cumplido';
COMMENT ON COLUMN public.pedidos.total IS 'Total del pedido calculado automáticamente';

COMMENT ON TABLE public.detalle_pedido IS 'Tabla de detalle de productos por pedido (tabla oculta)';
COMMENT ON COLUMN public.detalle_pedido.id IS 'Identificador único del detalle';
COMMENT ON COLUMN public.detalle_pedido.fk_id_pedido IS 'Referencia al pedido';
COMMENT ON COLUMN public.detalle_pedido.fk_id_producto IS 'Referencia al producto';
COMMENT ON COLUMN public.detalle_pedido.cantidad IS 'Cantidad del producto en el pedido';
COMMENT ON COLUMN public.detalle_pedido.precio_unitario IS 'Precio unitario del producto al momento del pedido';
COMMENT ON COLUMN public.detalle_pedido.subtotal IS 'Subtotal de la línea (cantidad * precio_unitario)';