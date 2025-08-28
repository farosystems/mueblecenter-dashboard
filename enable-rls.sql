-- Habilitar RLS en la tabla productos (después de configurar Clerk)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Verificar que la política esté activa
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'productos'; 