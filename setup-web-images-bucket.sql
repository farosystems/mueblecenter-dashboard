-- Script para configurar las carpetas específicas en el bucket de imágenes
-- Ejecutar este script después de configurar el bucket principal

-- Nota: Las carpetas en Supabase Storage se crean automáticamente cuando se sube un archivo
-- No es necesario crear las carpetas explícitamente, pero aquí documentamos la estructura

-- Estructura de carpetas esperada en el bucket 'imagenes':
-- /imagenes_web/         <- Para imágenes de configuración web (banner, logos, etc.)
-- /productos/            <- Para imágenes de productos (ya existente)
-- /marcas/               <- Para imágenes de marcas (ya existente)

-- Las políticas del bucket 'imagenes' ya permiten el acceso a todas las carpetas
-- Verificar que existen las políticas necesarias:

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%imagenes%';

-- Si es necesario crear políticas específicas para imagenes_web, usar:
-- CREATE POLICY "Permitir subir imágenes web a usuarios autenticados" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'imagenes' AND 
--   (storage.foldername(name))[1] = 'imagenes_web' AND
--   auth.role() = 'authenticated'
-- );

-- Función helper para obtener la URL pública de una imagen en imagenes_web
CREATE OR REPLACE FUNCTION get_web_image_url(filename text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'https://your-project.supabase.co/storage/v1/object/public/imagenes/imagenes_web/' || filename;
END;
$$;