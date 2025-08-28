-- Script para configurar el bucket de imágenes en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear el bucket de imágenes si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas de seguridad para el bucket
-- Política para permitir subir archivos (solo usuarios autenticados)
CREATE POLICY "Permitir subir imágenes a usuarios autenticados" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'imagenes' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir ver archivos (público)
CREATE POLICY "Permitir ver imágenes públicamente" ON storage.objects
FOR SELECT USING (
  bucket_id = 'imagenes'
);

-- Política para permitir actualizar archivos (solo usuarios autenticados)
CREATE POLICY "Permitir actualizar imágenes a usuarios autenticados" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'imagenes' AND 
  auth.role() = 'authenticated'
);

-- Política para permitir eliminar archivos (solo usuarios autenticados)
CREATE POLICY "Permitir eliminar imágenes a usuarios autenticados" ON storage.objects
FOR DELETE USING (
  bucket_id = 'imagenes' AND 
  auth.role() = 'authenticated'
);

-- 3. Verificar que el bucket se creó correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'imagenes';

-- 4. Verificar las políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';
