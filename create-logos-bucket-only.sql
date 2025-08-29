-- Script para crear SOLO el bucket de logos
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear el bucket de logos si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos', 
  true,
  2097152, -- 2MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas de seguridad para el bucket logos
-- Política para permitir subir logos (solo usuarios autenticados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Permitir subir logos a usuarios autenticados'
    ) THEN
        CREATE POLICY "Permitir subir logos a usuarios autenticados" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'logos' AND 
          auth.role() = 'authenticated'
        );
    END IF;
END
$$;

-- Política para permitir ver logos (público)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Permitir ver logos públicamente'
    ) THEN
        CREATE POLICY "Permitir ver logos públicamente" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'logos'
        );
    END IF;
END
$$;

-- Política para permitir actualizar logos (solo usuarios autenticados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Permitir actualizar logos a usuarios autenticados'
    ) THEN
        CREATE POLICY "Permitir actualizar logos a usuarios autenticados" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'logos' AND 
          auth.role() = 'authenticated'
        );
    END IF;
END
$$;

-- Política para permitir eliminar logos (solo usuarios autenticados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Permitir eliminar logos a usuarios autenticados'
    ) THEN
        CREATE POLICY "Permitir eliminar logos a usuarios autenticados" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'logos' AND 
          auth.role() = 'authenticated'
        );
    END IF;
END
$$;

-- 3. Verificar que el bucket se creó correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'logos';

-- 4. Verificar las políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%logos%';