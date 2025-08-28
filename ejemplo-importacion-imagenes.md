# Formato para Importación de Imágenes

## Estructura del archivo XLSX/CSV

El archivo debe contener las siguientes columnas en el orden especificado:

| Columna | Nombre | Tipo | Descripción | Ejemplo |
|---------|--------|------|-------------|---------|
| A | ID | Número | ID del producto existente | 007 |
| B | Descripción | Texto | Descripción del producto | HONGO CALEFACTOR EXTERIOR PULPO |
| C | imagen | URL | URL de la primera imagen | https://ejemplo.com/imagen1.jpg |
| D | imagen_2 | URL | URL de la segunda imagen | https://ejemplo.com/imagen2.jpg |
| E | imagen_3 | URL | URL de la tercera imagen | https://ejemplo.com/imagen3.jpg |
| F | imagen_4 | URL | URL de la cuarta imagen | https://ejemplo.com/imagen4.jpg |
| G | imagen_5 | URL | URL de la quinta imagen | https://ejemplo.com/imagen5.jpg |

## Ejemplo de datos

```
ID,Descripción,imagen,imagen_2,imagen_3,imagen_4,imagen_5
007,HONGO CALEFACTOR EXTERIOR PULPO,https://ejemplo.com/img1.jpg,https://ejemplo.com/img2.jpg,,,
008,OTRO PRODUCTO,https://ejemplo.com/producto1.jpg,,,,,
```

## Notas importantes

1. **ID**: Debe ser el ID exacto del producto que ya existe en la base de datos
2. **Descripción**: Se usa solo para verificación, no se actualiza en la base de datos
3. **URLs de imágenes**: Pueden estar vacías si no hay imagen para esa posición
4. **Formato**: El archivo puede ser XLSX o CSV
5. **Encabezados**: La primera fila debe contener los nombres de las columnas exactamente como se muestran arriba

## Proceso de importación

1. El sistema lee el archivo y busca productos por ID
2. Solo actualiza las URLs de imágenes que no estén vacías
3. Muestra un reporte de productos encontrados y no encontrados
4. Permite importar múltiples archivos consecutivamente

## Validaciones

- Solo se actualizan productos que existan en la base de datos
- Las URLs vacías no sobrescriben imágenes existentes
- Se valida que el archivo tenga el formato correcto
- Se muestra progreso en tiempo real durante la importación
