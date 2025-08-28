# Funcionalidad de Upload de Imágenes

## Descripción

Se ha implementado una nueva funcionalidad para subir imágenes de productos directamente al bucket de Supabase, reemplazando el sistema anterior de URLs manuales.

## Características

### ✅ Funcionalidades Implementadas

1. **Drag & Drop**: Arrastra y suelta imágenes directamente en el área de upload
2. **Selección de archivos**: Haz clic para seleccionar imágenes desde tu computadora
3. **Preview en tiempo real**: Ve las imágenes subidas inmediatamente
4. **Múltiples imágenes**: Hasta 5 imágenes por producto
5. **Validación de archivos**: Solo acepta imágenes (JPG, PNG, GIF, WebP) hasta 5MB
6. **Eliminación individual**: Elimina imágenes específicas con un clic
7. **Integración completa**: Funciona tanto en alta como en edición de productos

### 🎨 Interfaz de Usuario

- **Área de drag & drop** con feedback visual
- **Grid de preview** con miniaturas de las imágenes
- **Indicadores de progreso** durante la subida
- **Botones de eliminación** que aparecen al hacer hover
- **Contador de imágenes** (X/5)

## Configuración Requerida

### 1. Configurar el Bucket en Supabase

Ejecuta el script `setup-images-bucket.sql` en el SQL Editor de Supabase:

```sql
-- Crear bucket de imágenes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;
```

### 2. Políticas de Seguridad

El script también configura las políticas necesarias:
- **Subir**: Solo usuarios autenticados
- **Ver**: Público
- **Actualizar/Eliminar**: Solo usuarios autenticados

## Uso

### En Alta de Productos

1. Haz clic en "Nuevo Producto"
2. En la sección "Imágenes del Producto":
   - Arrastra imágenes al área punteada, o
   - Haz clic para seleccionar archivos
3. Las imágenes se subirán automáticamente y aparecerán en el preview
4. Puedes eliminar imágenes haciendo hover y clic en la X roja
5. Completa el resto del formulario y guarda

### En Edición de Productos

1. Haz clic en "Editar" en cualquier producto
2. Las imágenes existentes se cargarán automáticamente
3. Puedes:
   - Agregar nuevas imágenes
   - Eliminar imágenes existentes
   - Reorganizar el orden (la primera será la imagen principal)
4. Guarda los cambios

## Estructura de Archivos

```
app/components/
├── image-upload.tsx          # Componente principal de upload
└── productos-section.tsx     # Componente modificado de productos

setup-images-bucket.sql       # Script de configuración
IMAGENES_UPLOAD.md           # Esta documentación
```

## Componente ImageUpload

### Props

```typescript
interface ImageUploadProps {
  images: string[]              // Array de URLs de imágenes
  onImagesChange: (images: string[]) => void  // Callback cuando cambian las imágenes
  maxImages?: number           // Máximo de imágenes (default: 5)
  disabled?: boolean           // Deshabilitar el componente
}
```

### Funcionalidades Internas

- **Validación de archivos**: Tipo y tamaño
- **Generación de nombres únicos**: Evita conflictos
- **Subida a Supabase**: Usa el bucket 'imagenes'
- **Manejo de errores**: Muestra alertas informativas
- **Estados de carga**: Spinner durante la subida

## Consideraciones Técnicas

### Límites
- **Tamaño máximo**: 5MB por imagen
- **Formato**: JPG, PNG, GIF, WebP
- **Cantidad**: Máximo 5 imágenes por producto
- **Bucket**: 'imagenes' en Supabase Storage

### Seguridad
- Solo usuarios autenticados pueden subir/eliminar
- Las imágenes son públicas para visualización
- Validación tanto en frontend como backend

### Rendimiento
- Subida asíncrona de múltiples archivos
- Preview inmediato después de la subida
- Optimización de imágenes con cache control

## Migración desde URLs Manuales

Los productos existentes con URLs de imágenes seguirán funcionando normalmente. Al editar un producto:

1. Las URLs existentes se cargarán en el componente
2. Puedes agregar nuevas imágenes subidas
3. Las URLs antiguas se mantendrán hasta que las elimines

## Solución de Problemas

### Error: "Solo se permiten archivos de imagen"
- Verifica que el archivo sea una imagen válida
- Formatos soportados: JPG, PNG, GIF, WebP

### Error: "El archivo es demasiado grande"
- Comprime la imagen o usa una de menor resolución
- Límite: 5MB por archivo

### Error: "No se pudo subir la imagen"
- Verifica la conexión a internet
- Asegúrate de estar autenticado
- Revisa que el bucket 'imagenes' esté configurado

### Las imágenes no se muestran
- Verifica que las políticas de Supabase estén configuradas
- Asegúrate de que el bucket sea público
- Revisa la consola del navegador para errores

## Próximas Mejoras

- [ ] Compresión automática de imágenes
- [ ] Redimensionamiento automático
- [ ] Galería de imágenes con zoom
- [ ] Arrastrar para reordenar imágenes
- [ ] Vista previa antes de subir
