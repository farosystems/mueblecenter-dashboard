-- Deshabilitar RLS en la tabla productos (temporalmente para pruebas)
ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;

-- Si quieres habilitarlo después, usa:
-- ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY; 