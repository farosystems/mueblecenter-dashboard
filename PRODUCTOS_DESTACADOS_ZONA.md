# Productos Destacados por Zona

## Descripción

Este módulo permite destacar productos específicos para cada zona/sucursal. Es útil para mostrar productos relevantes según la ubicación geográfica del cliente.

## Características

- ✅ Asignar productos destacados a zonas específicas
- ✅ **Buscador inteligente** de productos con vista previa
- ✅ Control de orden de visualización (prioridad)
- ✅ Activar/desactivar productos destacados sin eliminarlos
- ✅ Filtrado por zona
- ✅ Cambio rápido de orden (subir/bajar)
- ✅ Evita duplicados (un producto solo puede estar destacado una vez por zona)

## Instalación en Base de Datos

### 1. Ejecutar el script SQL

Ejecuta el siguiente archivo SQL en tu base de datos de Supabase:

```bash
create-productos-destacados-zona.sql
```

Este script creará:
- Tabla `productos_destacados_zona`
- Índices para optimización
- Políticas RLS (Row Level Security)
- Constraints para evitar duplicados

### 2. Verificar la instalación

Verifica que la tabla se creó correctamente:

```sql
SELECT * FROM productos_destacados_zona LIMIT 1;
```

## Uso

### Acceder al módulo

1. Inicia sesión en el dashboard
2. En el menú lateral, busca "Destacados por Zona" (ícono de estrella ⭐)
3. Haz clic para acceder al módulo

### Crear un producto destacado

1. Haz clic en el botón "Nuevo Destacado"
2. Completa el formulario:
   - **Zona**: Selecciona la zona donde se destacará el producto
   - **Producto**: Usa el **buscador inteligente** para encontrar el producto
     - 🔍 Escribe el código o nombre del producto
     - Se mostrarán hasta 50 resultados coincidentes con imagen y precio
     - Haz clic en el producto deseado para seleccionarlo
     - Se mostrará una vista previa con imagen, código y precio
     - Puedes borrar la selección con el botón X
   - **Orden**: Define la prioridad (0 = más alta, números mayores = menor prioridad)
   - **Activo**: Marca si el destacado estará activo
3. Haz clic en "Crear"

### Editar un producto destacado

1. En la tabla, haz clic en el botón "Editar" (ícono de lápiz)
2. Modifica los campos necesarios
3. Haz clic en "Actualizar"

### Cambiar el orden

Usa los botones de flecha arriba/abajo en la columna "Orden" para cambiar rápidamente la prioridad de visualización.

### Activar/Desactivar

Usa el switch en la columna "Estado" para activar o desactivar un producto destacado sin eliminarlo.

### Filtrar por zona

Usa el selector "Filtrar por zona" en la parte superior para ver solo los productos destacados de una zona específica.

### Eliminar un producto destacado

1. Haz clic en el botón "Eliminar" (ícono de papelera)
2. Confirma la eliminación

## Estructura de la Base de Datos

### Tabla: productos_destacados_zona

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | bigint | ID único (autoincremental) |
| created_at | timestamp | Fecha de creación |
| fk_id_producto | bigint | ID del producto (FK) |
| fk_id_zona | bigint | ID de la zona (FK) |
| orden | int | Orden de visualización (menor = mayor prioridad) |
| activo | boolean | Si el destacado está activo |

### Constraints

- **Primary Key**: id
- **Foreign Keys**:
  - fk_id_producto → productos(id) ON DELETE CASCADE
  - fk_id_zona → zonas(id) ON DELETE CASCADE
- **Unique Constraint**: (fk_id_producto, fk_id_zona) - Evita duplicados

### Índices

- productos_destacados_zona_producto_idx: Búsqueda por producto
- productos_destacados_zona_zona_idx: Búsqueda por zona
- productos_destacados_zona_activo_idx: Filtrado por estado activo

## API / Tipos TypeScript

### Interface ProductoDestacadoZona

```typescript
export interface ProductoDestacadoZona {
  id: number
  created_at: string
  fk_id_producto: number
  fk_id_zona: number
  orden: number
  activo: boolean
  producto?: Producto
  zona?: Zona
}
```

### Consulta de productos destacados

```typescript
// Obtener productos destacados por zona (ordenados por prioridad)
const { data, error } = await supabase
  .from('productos_destacados_zona')
  .select(`
    *,
    producto:fk_id_producto(*),
    zona:fk_id_zona(*)
  `)
  .eq('fk_id_zona', zonaId)
  .eq('activo', true)
  .order('orden', { ascending: true })
```

### Crear producto destacado

```typescript
const { data, error } = await supabase
  .from('productos_destacados_zona')
  .insert([{
    fk_id_producto: productoId,
    fk_id_zona: zonaId,
    orden: 0,
    activo: true
  }])
```

### Actualizar orden

```typescript
const { error } = await supabase
  .from('productos_destacados_zona')
  .update({ orden: nuevoOrden })
  .eq('id', destacadoId)
```

## Casos de Uso

### 1. Productos según ubicación geográfica
Destacar productos específicos de cada zona para adaptarse a las preferencias locales.

### 2. Promociones locales
Crear promociones específicas para ciertas zonas sin afectar otras.

### 3. Stock disponible
Destacar productos con mayor stock en cada sucursal.

### 4. Temporadas
Activar/desactivar productos destacados según la temporada sin perder la configuración.

## Notas Importantes

- ⚠️ Un producto solo puede estar destacado UNA vez por zona (evita duplicados)
- ⚠️ Al eliminar un producto, se eliminan automáticamente sus destacados (CASCADE)
- ⚠️ Al eliminar una zona, se eliminan automáticamente sus destacados (CASCADE)
- 💡 El orden "0" es la máxima prioridad
- 💡 Usar "activo: false" en lugar de eliminar para mantener el histórico

## Archivos Creados/Modificados

### Nuevos archivos:
1. `create-productos-destacados-zona.sql` - Script de creación de tabla
2. `app/components/productos-destacados-zona-section.tsx` - Componente UI
3. `PRODUCTOS_DESTACADOS_ZONA.md` - Esta documentación

### Archivos modificados:
1. `lib/supabase.ts` - Agregado interface ProductoDestacadoZona
2. `app/hooks/use-supabase-data.ts` - Agregado estado y funciones de carga
3. `app/dashboard.tsx` - Integrado el componente
4. `app/components/app-sidebar.tsx` - Agregado ítem al menú

## Soporte

Para problemas o preguntas, revisa:
1. Los logs de la consola del navegador
2. Los logs de Supabase
3. Verifica que el script SQL se ejecutó correctamente
4. Asegúrate de que las políticas RLS estén configuradas correctamente
