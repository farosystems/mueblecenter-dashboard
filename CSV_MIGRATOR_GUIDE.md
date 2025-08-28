# 📊 Guía del Migrador de Archivos de Productos

## 🎯 **Descripción General**

El migrador permite importar productos masivamente desde archivos CSV o Excel, incluyendo la configuración automática de los booleanos para planes de financiación.

## 📋 **Estructura del Archivo**

### **Columnas Obligatorias**
- `descripcion` - Nombre del producto
- `precio` - Precio en formato numérico (ej: 150000.00, puede ser 0)

### **Columnas Opcionales**
- `descripcion_detallada` - Descripción extendida del producto
- `categoria` - Nombre de la categoría (si no existe, se asigna automáticamente)
- `marca` - Nombre de la marca (si no existe, se asigna automáticamente)
- `fk_id_categoria` - ID de la categoría (si no existe, se asigna automáticamente)
- `fk_id_marca` - ID de la marca (si no existe, se asigna automáticamente)
- `destacado` - Si el producto es destacado (true/false, 1/0, si/no, yes/no)
- `aplica_todos_plan` - Aplica a todos los planes (true/false, 1/0, si/no, yes/no)
- `aplica_solo_categoria` - Aplica solo a planes de su categoría (true/false, 1/0, si/no, yes/no)
- `aplica_plan_especial` - Aplica a planes especiales (true/false, 1/0, si/no, yes/no)
- `imagen` - URL de la imagen principal
- `imagen_2` - URL de la segunda imagen
- `imagen_3` - URL de la tercera imagen
- `imagen_4` - URL de la cuarta imagen
- `imagen_5` - URL de la quinta imagen

## 🔧 **Lógica de los Booleanos**

### **Reglas Importantes:**
1. **Solo uno puede estar activo a la vez**
2. **Si ninguno está activo**, el producto no se asociará automáticamente a ningún plan
3. **Los booleanos determinan qué planes se asignan automáticamente al producto**

### **Comportamiento de cada booleano:**

#### `aplica_todos_plan = true`
- ✅ Se asocia automáticamente a TODOS los planes activos
- ✅ Incluye planes sin categoría
- ✅ Incluye planes con la categoría del producto (si tiene categoría)

#### `aplica_solo_categoria = true`
- ✅ Se asocia solo a planes que tengan la categoría del producto
- ❌ Requiere que el producto tenga una categoría asignada
- ❌ No se asocia a planes sin categoría

#### `aplica_plan_especial = true`
- ❌ NO se crean asociaciones automáticas
- ✅ El producto queda disponible para asignación manual a planes especiales

## 📝 **Ejemplo de Archivo**

```csv
descripcion,descripcion_detallada,precio,categoria,marca,fk_id_categoria,fk_id_marca,destacado,aplica_todos_plan,aplica_solo_categoria,aplica_plan_especial,imagen,imagen_2,imagen_3,imagen_4,imagen_5
Smartphone Samsung Galaxy,Smartphone de última generación con cámara de alta resolución,150000.00,Electrónicos,Samsung,,,true,true,false,false,https://ejemplo.com/galaxy.jpg,https://ejemplo.com/galaxy2.jpg,,,
Laptop HP Pavilion,Laptop para trabajo y gaming,250000.00,Computación,HP,,,false,false,true,false,https://ejemplo.com/laptop.jpg,,,,
Producto Premium,Producto exclusivo con plan especial,500000.00,Premium,Apple,,,true,false,false,true,https://ejemplo.com/premium.jpg,,,,
```

## 🚀 **Proceso de Migración**

### **1. Preparación**
- ✅ Asegúrate de que las categorías y marcas existan en el sistema
- ✅ Descarga la plantilla Excel para ver el formato correcto
- ✅ Prepara tu archivo CSV o Excel con los datos

### **2. Validación**
El sistema valida automáticamente:
- ✅ Estructura del archivo (columnas requeridas)
- ✅ Datos obligatorios (descripción, precio)
- ✅ Lógica de booleanos (solo uno activo)
- ✅ Formato de precios
- ⚠️ Categorías y marcas inexistentes (se asignan automáticamente, no generan error)

### **3. Vista Previa**
- ✅ Revisa los primeros 5 productos antes de migrar
- ✅ Verifica que los booleanos estén configurados correctamente
- ✅ Confirma que las categorías y marcas se detecten bien

### **4. Migración**
- ✅ Procesamiento progresivo con barra de progreso
- ✅ Creación automática de productos
- ✅ **Detección de duplicados**: Omite productos que ya existen (por descripción)
- ✅ Asignación automática de planes según los booleanos
- ✅ Reporte detallado: creados, omitidos y errores

## ⚠️ **Consideraciones Importantes**

### **Antes de Migrar:**
1. **Categorías y Marcas**: Si no existen, se asignan automáticamente (no generan error)
2. **Booleanos**: Solo uno puede estar activo por producto
3. **Precios**: Usar formato numérico sin símbolos de moneda (puede ser 0)
4. **Imágenes**: URLs completas y válidas
5. **Formato de archivo**: CSV (.csv) o Excel (.xlsx, .xls)
6. **Categorías/Marcas**: Puedes usar nombres (`categoria`, `marca`) o IDs (`fk_id_categoria`, `fk_id_marca`)

### **Durante la Migración:**
1. **No cerrar la ventana** durante el proceso
2. **Revisar errores** antes de continuar
3. **Verificar resultados** después de la migración

### **Después de la Migración:**
1. **Revisar productos creados** en la lista
2. **Verificar asociaciones automáticas** en la sección de productos por plan
3. **Ajustar manualmente** si es necesario

## 🔍 **Solución de Problemas**

### **Errores Comunes:**

#### "La categoría 'X' no existe"
- ⚠️ Se asigna automáticamente una categoría por defecto
- ✅ Crear la categoría antes de migrar si la necesitas específica

#### "La marca 'X' no existe"
- ⚠️ Se asigna automáticamente una marca por defecto
- ✅ Crear la marca antes de migrar si la necesitas específica

#### "La categoría con ID 'X' no existe"
- ⚠️ Se asigna automáticamente una categoría por defecto
- ✅ Verificar que el ID de categoría sea correcto

#### "La marca con ID 'X' no existe"
- ⚠️ Se asigna automáticamente una marca por defecto
- ✅ Verificar que el ID de marca sea correcto

#### "Solo uno de los booleanos puede estar activo"
- ✅ Revisar el CSV y corregir los valores booleanos
- ✅ Asegurar que solo uno sea true

#### "El precio debe ser un número mayor o igual a 0"
- ✅ Verificar formato de precios
- ✅ Remover símbolos de moneda y comas
- ✅ El precio puede ser 0

#### "Error al procesar el archivo Excel"
- ✅ Verificar que el archivo no esté corrupto
- ✅ Asegurar que la primera hoja contenga los datos
- ✅ Verificar que no haya celdas vacías en la primera fila (encabezados)

## 📊 **Estadísticas de Migración**

El sistema proporciona:
- ✅ Número total de productos procesados
- ✅ Productos creados exitosamente
- ✅ Productos omitidos (ya existían)
- ✅ Errores encontrados
- ✅ Detalles de cada resultado

## 🎯 **Casos de Uso**

### **Migración Masiva de Catálogo (usando nombres)**
```csv
descripcion,precio,categoria,marca,aplica_todos_plan
Producto 1,100000,Electrónicos,Samsung,true
Producto 2,200000,Electrónicos,LG,true
Producto 3,300000,Computación,HP,true
```

### **Migración Masiva de Catálogo (usando IDs)**
```csv
descripcion,precio,fk_id_categoria,fk_id_marca,aplica_todos_plan
Producto 1,100000,1,1,true
Producto 2,200000,1,2,true
Producto 3,300000,2,3,true
```

### **Productos con Planes Específicos**
```csv
descripcion,precio,categoria,marca,aplica_solo_categoria
Producto Premium 1,500000,Premium,Apple,true
Producto Premium 2,600000,Premium,Samsung,true
```

### **Productos para Planes Especiales**
```csv
descripcion,precio,categoria,marca,aplica_plan_especial
Producto Exclusivo 1,1000000,Exclusivo,Rolex,true
Producto Exclusivo 2,1200000,Exclusivo,Cartier,true
```

## 📊 **Formatos Soportados**

### **CSV (.csv)**
- ✅ Formato de texto plano separado por comas
- ✅ Soporte para valores entre comillas
- ✅ Compatible con Excel, Google Sheets, etc.

### **Excel (.xlsx, .xls)**
- ✅ Formato nativo de Microsoft Excel
- ✅ Soporte para múltiples hojas (se lee la primera)
- ✅ Formato de celdas preservado
- ✅ Mejor para usuarios que prefieren Excel

## 🔄 **Flujo Automático**

1. **Verificación de duplicados** → Se compara con productos existentes (por descripción)
2. **Creación del producto** → Se guarda en la base de datos (solo si no existe)
3. **Análisis de booleanos** → Se determina qué planes asignar
4. **Creación de asociaciones** → Se crean automáticamente en `producto_planes_default`
5. **Disponibilidad** → El producto aparece en la sección correspondiente

## ⚙️ **Opciones de Migración**

### **Omitir Duplicados (Recomendado)**
- ✅ **Activado por defecto**: Evita crear productos duplicados
- ✅ **Comparación por descripción**: Detecta productos existentes
- ✅ **Migración incremental**: Solo agrega productos nuevos
- ✅ **Seguro**: No modifica productos existentes

### **Forzar Migración Completa**
- ⚠️ **Desactivar la opción**: Crea todos los productos del archivo
- ⚠️ **Puede generar errores**: Si hay productos duplicados
- ⚠️ **Útil para**: Migraciones iniciales o archivos únicos

---

## 📞 **Soporte**

Si encuentras problemas con la migración:
1. Revisa los errores en la consola del navegador
2. Verifica el formato del archivo (CSV o Excel)
3. Confirma que las categorías y marcas existan
4. Revisa la lógica de los booleanos
5. Para archivos Excel, verifica que la primera hoja contenga los datos
