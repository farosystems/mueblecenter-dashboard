"use client"

import React, { useState } from "react"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import * as XLSX from 'xlsx'

interface ProductMigrationData {
  id?: number
  codigo?: string
  descripcion: string
  precio: number
  aplica_todos_plan?: boolean
  fk_id_presentacion?: string
  fk_id_linea?: string
  fk_id_tipo?: string
  presentacion_nombre?: string
  linea_nombre?: string
  tipo_nombre?: string
  fk_id_marca?: number
  imagen?: string
  _presentacion_nombre?: string
  _linea_nombre?: string
  _tipo_nombre?: string
  _marca_nombre?: string
  _stock?: { [key: string]: number }
  _validation_errors?: string[]
  [key: string]: any
}

interface MigrationResult {
  success: number
  errors: string[]
  skipped: number
}

interface ProductMigratorProps {
  onMigrationComplete?: () => void
}

export function ProductMigrator({ onMigrationComplete }: ProductMigratorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [previewData, setPreviewData] = useState<ProductMigrationData[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'result'>('upload')

  const resetDialog = () => {
    setFile(null)
    setIsProcessing(false)
    setProgress(0)
    setResult(null)
    setPreviewData([])
    setStep('upload')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.xlsx') && !uploadedFile.name.endsWith('.xls')) {
      alert('Por favor selecciona un archivo Excel válido (.xlsx o .xls)')
      return
    }

    setFile(uploadedFile)
    
    try {
      const buffer = await uploadedFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet) as ProductMigrationData[]

      if (data.length === 0) {
        alert('El archivo Excel está vacío o no tiene datos válidos')
        return
      }

      // Validar que las columnas requeridas existen (nuevos nombres)
      const requiredColumns = ['Artículo', 'Descripción', 'Precio']
      const firstRow = data[0]
      const missingColumns = requiredColumns.filter(col => !(col in firstRow) && !(col.toLowerCase() in firstRow))

      if (missingColumns.length > 0) {
        alert(`El archivo Excel debe contener las siguientes columnas: ${missingColumns.join(', ')}`)
        return
      }

      // Obtener presentaciones, líneas, tipos, marcas y zonas para validación
      const { data: presentaciones } = await supabase.from('presentaciones').select('id, nombre')
      const { data: lineas } = await supabase.from('lineas').select('id, nombre')
      const { data: tipos } = await supabase.from('tipos').select('id, nombre')
      const { data: marcas } = await supabase.from('marcas').select('id, descripcion')
      
      console.log('🔍 Obteniendo zonas de la base de datos...')
      
      let zonas = null
      let zonasError = null
      
      try {
        const result = await supabase.from('zonas').select('id, nombre')
        zonas = result.data
        zonasError = result.error
        
        console.log('📥 Resultado consulta zonas:', { zonas, zonasError })
        
        if (zonasError) {
          console.error('❌ Error al obtener zonas:', zonasError)
          // No detener la migración, crear zonas por defecto
          console.log('⚠️ Creando zonas por defecto para prueba')
          zonas = [
            { id: 1, nombre: 'Central' },
            { id: 2, nombre: 'Cardales' },
            { id: 3, nombre: 'Matheu' },
            { id: 4, nombre: 'Garin' },
            { id: 5, nombre: 'Maschwitz' },
            { id: 6, nombre: 'Capilla' }
          ]
        }
      } catch (error) {
        console.error('💥 Exception al obtener zonas:', error)
        // Crear zonas por defecto
        zonas = [
          { id: 1, nombre: 'Central' },
          { id: 2, nombre: 'Cardales' },
          { id: 3, nombre: 'Matheu' },
          { id: 4, nombre: 'Garin' },
          { id: 5, nombre: 'Maschwitz' },
          { id: 6, nombre: 'Capilla' }
        ]
      }
      
      const presentacionesValidasId = new Set(presentaciones?.map(p => p.id) || [])
      const lineasValidasId = new Set(lineas?.map(l => l.id) || [])
      const tiposValidosId = new Set(tipos?.map(t => t.id) || [])
      const marcasValidas = new Set(marcas?.map(m => m.id) || [])
      const presentacionesMapId = new Map(presentaciones?.map(p => [p.id, p.nombre]) || [])
      const presentacionesMapNombre = new Map(presentaciones?.map(p => [p.nombre.toLowerCase(), p.id]) || [])
      const lineasMapId = new Map(lineas?.map(l => [l.id, l.nombre]) || [])
      const lineasMapNombre = new Map(lineas?.map(l => [l.nombre.toLowerCase(), l.id]) || [])
      const tiposMapId = new Map(tipos?.map(t => [t.id, t.nombre]) || [])
      const tiposMapNombre = new Map(tipos?.map(t => [t.nombre.toLowerCase(), t.id]) || [])
      const marcasMap = new Map(marcas?.map(m => [m.id, m.descripcion]) || [])
      
      // Mapear zonas por nombre para el stock
      console.log('✅ Zonas obtenidas de la BD:', zonas)
      
      if (!zonas || zonas.length === 0) {
        console.error('❌ No se obtuvieron zonas de la base de datos')
        alert('No se encontraron zonas en la base de datos. Verifica que la tabla "zonas" tenga datos.')
        return
      }
      
      const zonasMap = new Map(zonas.map(z => {
        const nombreLower = z.nombre.toLowerCase().trim()
        console.log(`🗺️ Mapeando zona: "${z.nombre}" (ID: ${z.id}) -> "${nombreLower}"`)
        return [nombreLower, z.id]
      }))
      
      console.log('✅ Mapa de zonas creado:', Array.from(zonasMap.entries()))
      const zonasEsperadas = ['central', 'cardales', 'matheu', 'garin', 'maschwitz', 'capilla']
      
      console.log('🎯 Zonas esperadas en Excel:', zonasEsperadas)
      
      // Verificar qué zonas esperadas están disponibles
      zonasEsperadas.forEach(zona => {
        if (zonasMap.has(zona)) {
          console.log(`✅ Zona "${zona}" disponible con ID: ${zonasMap.get(zona)}`)
        } else {
          console.warn(`⚠️ Zona "${zona}" NO encontrada en la BD`)
        }
      })

      // Obtener productos existentes para verificar duplicados por código
      const { data: existingProducts } = await supabase
        .from('productos')
        .select('id, codigo, descripcion, presentacion_id, linea_id, tipo_id')

      const productsByCodigo = new Map(
        existingProducts
          ?.filter(p => p.codigo) // Solo productos que tienen código
          ?.map(p => [p.codigo.toLowerCase().trim(), { id: p.id, presentacion_id: p.presentacion_id, linea_id: p.linea_id, tipo_id: p.tipo_id }]) || []
      )

      // Mostrar todas las columnas disponibles en el Excel
      const columnasExcel = Object.keys(data[0] || {})
      console.log('Columnas disponibles en el Excel:', columnasExcel)
      console.log('Columnas en detalle:', columnasExcel.map((col, i) => `${i}: "${col}"`))

      // Procesar y limpiar los datos
      const processedData = data.map((row, index) => {
        console.log(`\n--- Procesando fila ${index + 1} ---`)
        console.log('Datos completos de la fila:', row)
        
        // Función helper para obtener el valor de una columna (con múltiples variaciones de nombre)
        const getValue = (variations: string[]) => {
          for (const variation of variations) {
            if (row[variation] !== undefined && row[variation] !== null) {
              return row[variation]
            }
          }
          return undefined
        }

        const processed: ProductMigrationData = {
          codigo: String(getValue(['Artículo', 'articulo', 'código', 'codigo']) || '').trim(),
          descripcion: String(getValue(['Descripción', 'descripcion', 'descripción']) || '').trim(),
          precio: Number(getValue(['Precio', 'precio']) || 0),
          aplica_todos_plan: Boolean(row.aplica_todos_plan),
          imagen: row.imagen ? String(row.imagen).trim() : undefined,
          presentacion_nombre: getValue(['Presentación', 'Presentacion', 'presentacion', 'presentación']) ?
            String(getValue(['Presentación', 'Presentacion', 'presentacion', 'presentación'])).trim() : undefined,
          linea_nombre: getValue(['Línea', 'Linea', 'linea', 'línea']) ?
            String(getValue(['Línea', 'Linea', 'linea', 'línea'])).trim() : undefined,
          tipo_nombre: getValue(['Tipo artículo', 'Tipo Artículo', 'Tipo', 'tipo', 'tipo_articulo']) ?
            String(getValue(['Tipo artículo', 'Tipo Artículo', 'Tipo', 'tipo', 'tipo_articulo'])).trim() : undefined,
          _marca_nombre: getValue(['Marca', 'marca']) ?
            String(getValue(['Marca', 'marca'])).trim() : undefined,
        }

        // Procesar imagen
        const imagenValue = getValue(['imagen', 'Imagen'])
        console.log(`Procesando imagen para producto ${index + 1}:`, imagenValue)
        if (imagenValue) {
          processed.imagen = String(imagenValue).trim()
          console.log(`  Imagen asignada: ${processed.imagen}`)
        } else {
          console.log(`  No se encontró campo imagen`)
        }

        // Procesar stock de sucursales
        const stockData: { [key: string]: number } = {}
        console.log(`Procesando stock para producto ${index + 1}:`, processed.descripcion)

        for (const zona of zonasEsperadas) {
          const variacionesNombre = [zona.charAt(0).toUpperCase() + zona.slice(1), zona, zona.toUpperCase()]
          let stockValue = null

          for (const variacion of variacionesNombre) {
            stockValue = getValue([variacion])
            if (stockValue !== undefined && stockValue !== null) {
              console.log(`  Zona ${zona}: encontrado como "${variacion}" = ${stockValue}`)
              break
            }
          }

          if (stockValue === null || stockValue === undefined) {
            console.log(`  Zona ${zona}: NO encontrado (probando: ${variacionesNombre.join(', ')})`)
            continue
          }

          // Incluir TODAS las zonas que vienen en el Excel, incluso si es 0
          // Solo omitir si es un string vacío
          if (stockValue === '') {
            console.log(`  Zona ${zona}: valor vacío, omitiendo`)
            continue
          }

          const stockNumerico = Number(stockValue)
          if (!isNaN(stockNumerico)) {
            stockData[zona] = stockNumerico
            console.log(`    Stock asignado para ${zona}: ${stockNumerico}`)
          } else {
            console.log(`  Zona ${zona}: valor inválido "${stockValue}", omitiendo`)
          }
        }
        processed._stock = stockData
        console.log(`Stock final para ${processed.descripcion}:`, processed._stock)

        // Validar y procesar presentación (por ID o nombre)
        console.log(`Procesando presentación - fk_id_presentacion: ${row.fk_id_presentacion}, presentacion_nombre: ${processed.presentacion_nombre}`)
        if (row.fk_id_presentacion) {
          const valorPresentacion = String(row.fk_id_presentacion).trim()
          console.log(`  Intentando como ID o nombre: "${valorPresentacion}"`)
          // Primero intentar como ID
          if (presentacionesValidasId.has(valorPresentacion)) {
            processed.fk_id_presentacion = valorPresentacion
            processed._presentacion_nombre = presentacionesMapId.get(valorPresentacion)
            console.log(`  ✓ Encontrado como ID: ${valorPresentacion} -> ${processed._presentacion_nombre}`)
          } else {
            // Si no es un ID válido, intentar como nombre
            const nombreLower = valorPresentacion.toLowerCase()
            const presentacionId = presentacionesMapNombre.get(nombreLower)
            if (presentacionId) {
              processed.fk_id_presentacion = presentacionId
              processed._presentacion_nombre = valorPresentacion
              console.log(`  ✓ Encontrado como nombre: "${valorPresentacion}" -> ID: ${presentacionId}`)
            } else {
              console.log(`  ✗ No encontrado ni como ID ni como nombre`)
              processed._validation_errors = processed._validation_errors || []
              processed._validation_errors.push(`Presentación "${valorPresentacion}" no existe (ni como ID ni como nombre)`)
            }
          }
        } else if (processed.presentacion_nombre) {
          console.log(`  Procesando presentacion_nombre: "${processed.presentacion_nombre}"`)
          const nombreLower = processed.presentacion_nombre.toLowerCase()
          const presentacionId = presentacionesMapNombre.get(nombreLower)
          if (presentacionId) {
            processed.fk_id_presentacion = presentacionId
            processed._presentacion_nombre = processed.presentacion_nombre
            console.log(`  ✓ Encontrado por nombre: "${processed.presentacion_nombre}" -> ID: ${presentacionId}`)
          } else {
            console.log(`  ✗ Presentación "${processed.presentacion_nombre}" no encontrada`)
            console.log(`  Presentaciones disponibles:`, Array.from(presentacionesMapNombre.keys()))
            processed._validation_errors = processed._validation_errors || []
            processed._validation_errors.push(`Presentación "${processed.presentacion_nombre}" no existe`)
          }
        }
        console.log(`  Resultado final - fk_id_presentacion: ${processed.fk_id_presentacion}, _presentacion_nombre: ${processed._presentacion_nombre}`)

        // Validar y procesar línea (por ID o nombre)
        if (row.fk_id_linea) {
          const valorLinea = String(row.fk_id_linea).trim()
          // Primero intentar como ID
          if (lineasValidasId.has(valorLinea)) {
            processed.fk_id_linea = valorLinea
            processed._linea_nombre = lineasMapId.get(valorLinea)
          } else {
            // Si no es un ID válido, intentar como nombre
            const nombreLower = valorLinea.toLowerCase()
            const lineaId = lineasMapNombre.get(nombreLower)
            if (lineaId) {
              processed.fk_id_linea = lineaId
              processed._linea_nombre = valorLinea
            } else {
              processed._validation_errors = processed._validation_errors || []
              processed._validation_errors.push(`Línea "${valorLinea}" no existe (ni como ID ni como nombre)`)
            }
          }
        } else if (processed.linea_nombre) {
          const nombreLower = processed.linea_nombre.toLowerCase()
          const lineaId = lineasMapNombre.get(nombreLower)
          if (lineaId) {
            processed.fk_id_linea = lineaId
            processed._linea_nombre = processed.linea_nombre
          } else {
            processed._validation_errors = processed._validation_errors || []
            processed._validation_errors.push(`Línea "${processed.linea_nombre}" no existe`)
          }
        }

        // Validar y procesar tipo (por ID o nombre)
        if (row.fk_id_tipo) {
          const valorTipo = String(row.fk_id_tipo).trim()
          // Primero intentar como ID
          if (tiposValidosId.has(valorTipo)) {
            processed.fk_id_tipo = valorTipo
            processed._tipo_nombre = tiposMapId.get(valorTipo)
          } else {
            // Si no es un ID válido, intentar como nombre
            const nombreLower = valorTipo.toLowerCase()
            const tipoId = tiposMapNombre.get(nombreLower)
            if (tipoId) {
              processed.fk_id_tipo = tipoId
              processed._tipo_nombre = valorTipo
            } else {
              processed._validation_errors = processed._validation_errors || []
              processed._validation_errors.push(`Tipo "${valorTipo}" no existe (ni como ID ni como nombre)`)
            }
          }
        } else if (processed.tipo_nombre) {
          const nombreLower = processed.tipo_nombre.toLowerCase()
          const tipoId = tiposMapNombre.get(nombreLower)
          if (tipoId) {
            processed.fk_id_tipo = tipoId
            processed._tipo_nombre = processed.tipo_nombre
          } else {
            processed._validation_errors = processed._validation_errors || []
            processed._validation_errors.push(`Tipo "${processed.tipo_nombre}" no existe`)
          }
        }

        // Validar y procesar marca (por nombre)
        if (processed._marca_nombre) {
          const marcaEncontrada = marcas?.find(m => 
            m.descripcion.toLowerCase() === processed._marca_nombre!.toLowerCase()
          )
          if (marcaEncontrada) {
            processed.fk_id_marca = marcaEncontrada.id
          } else {
            processed._validation_errors = processed._validation_errors || []
            processed._validation_errors.push(`Marca "${processed._marca_nombre}" no existe`)
          }
        }

        // Si hay un ID, incluirlo para actualización
        if (row.id) {
          const productId = Number(row.id)
          if (!isNaN(productId)) {
            processed.id = productId
          }
        } else {
          // Verificar si existe un producto con el mismo código
          if (processed.codigo) {
            const existingProductData = productsByCodigo.get(processed.codigo.toLowerCase().trim())
            if (existingProductData) {
              processed.id = existingProductData.id
            }
          }
        }

        return processed
      }).filter(item => item.descripcion && item.precio > 0)

      setPreviewData(processedData)
      setStep('preview')
    } catch (error) {
      console.error('Error al procesar el archivo:', error)
      alert('Error al leer el archivo Excel. Asegúrate de que el archivo no esté dañado.')
    }
  }

  const processMigration = async () => {
    if (previewData.length === 0) return

    setIsProcessing(true)
    setStep('processing')
    setProgress(0)

    const result: MigrationResult = {
      success: 0,
      errors: [],
      skipped: 0
    }

    try {
      // Pre-cargar todos los datos necesarios UNA SOLA VEZ
      console.log('🚀 Pre-cargando datos necesarios...')

      const codigosABuscar = [...new Set(
        previewData
          .filter(p => p.codigo && p.codigo.trim() !== '' && !p.id)
          .map(p => p.codigo.toLowerCase().trim())
      )]

      console.log(`🔍 Buscando ${codigosABuscar.length} códigos únicos en la base de datos...`)
      console.log(`📋 Primeros 5 códigos a buscar:`, codigosABuscar.slice(0, 5))

      // Buscar en lotes de 200 códigos para evitar URL demasiado larga
      const BATCH_SIZE_QUERY = 200
      const existingProductsData = []

      for (let i = 0; i < codigosABuscar.length; i += BATCH_SIZE_QUERY) {
        const batch = codigosABuscar.slice(i, i + BATCH_SIZE_QUERY)
        console.log(`🔎 Buscando lote ${Math.floor(i / BATCH_SIZE_QUERY) + 1}/${Math.ceil(codigosABuscar.length / BATCH_SIZE_QUERY)} (${batch.length} códigos)`)

        const { data, error } = await supabase
          .from('productos')
          .select('id, codigo, precio, aplica_todos_plan, presentacion_id, linea_id, tipo_id, descripcion, fk_id_marca, imagen')
          .in('codigo', batch)

        if (error) {
          console.error(`❌ Error al buscar lote:`, error)
        } else if (data) {
          existingProductsData.push(...data)
        }
      }

      console.log(`✅ Encontrados ${existingProductsData.length} productos existentes`)
      if (existingProductsData.length > 0) {
        console.log(`📋 Primeros 5 productos encontrados:`, existingProductsData.slice(0, 5).map(p => `${p.codigo} (ID: ${p.id})`))
      }

      const existingProductsMap = new Map(
        existingProductsData.map(p => [p.codigo.toLowerCase().trim(), p])
      )

      console.log(`🗺️ Mapa de productos existentes tiene ${existingProductsMap.size} entradas`)
      console.log(`🔑 Primeras 5 claves del mapa:`, Array.from(existingProductsMap.keys()).slice(0, 5))

      // Pre-cargar todos los stocks de los productos existentes
      const existingProductIds = [...new Set(existingProductsData?.map(p => p.id) || [])]
      const { data: allStocksData } = await supabase
        .from('stock_sucursales')
        .select('fk_id_producto, fk_id_zona, stock')
        .in('fk_id_producto', existingProductIds)

      const stocksByProduct = new Map()
      allStocksData?.forEach(stock => {
        if (!stocksByProduct.has(stock.fk_id_producto)) {
          stocksByProduct.set(stock.fk_id_producto, new Map())
        }
        stocksByProduct.get(stock.fk_id_producto).set(stock.fk_id_zona, stock.stock)
      })

      // Pre-cargar zonas
      const { data: zonasData } = await supabase.from('zonas').select('id, nombre')
      const zonasMapLocal = new Map(zonasData?.map(z => [z.nombre.toLowerCase().trim(), z.id]) || [])

      // Pre-cargar planes activos sin categorías (para aplica_todos_plan)
      const { data: planesDisponibles } = await supabase
        .from('planes_financiacion')
        .select('id, nombre, activo')
        .eq('activo', true)

      const { data: planesCategorias } = await supabase
        .from('planes_categorias')
        .select('fk_id_plan')

      const planesConCategorias = planesCategorias?.map(pc => pc.fk_id_plan) || []
      const planesSinCategorias = planesDisponibles?.filter(plan => !planesConCategorias.includes(plan.id)) || []

      console.log('✅ Datos pre-cargados. Iniciando migración...')

      // Agrupar productos por código para evitar condiciones de carrera
      const productsByCode = new Map<string, typeof previewData>()
      previewData.forEach(product => {
        const code = product.codigo?.toLowerCase().trim() || `_no_code_${Math.random()}`
        if (!productsByCode.has(code)) {
          productsByCode.set(code, [])
        }
        productsByCode.get(code)!.push(product)
      })

      console.log(`📦 Agrupados en ${productsByCode.size} códigos únicos`)

      // Procesar grupos de códigos en paralelo, pero productos del mismo código en secuencia
      const codeGroups = Array.from(productsByCode.values())
      const BATCH_SIZE = 50

      for (let batchStart = 0; batchStart < codeGroups.length; batchStart += BATCH_SIZE) {
        const batch = codeGroups.slice(batchStart, batchStart + BATCH_SIZE)
        setProgress(Math.round(((batchStart + batch.length) / codeGroups.length) * 100))

        // Procesar grupos en paralelo (cada grupo tiene productos del mismo código)
        await Promise.all(batch.map(async (productsGroup) => {
          // Pero productos del mismo código se procesan en secuencia
          for (const product of productsGroup) {
            const i = previewData.indexOf(product)

        try {
          // Verificar si hay errores de validación previos
          if (product._validation_errors && product._validation_errors.length > 0) {
            result.errors.push(`Fila ${i + 1} (${product.descripcion}): ${product._validation_errors.join(', ')}`)
            return
          }

          // Preparar datos base del producto
          let productData: any = {
            codigo: product.codigo || null,
            descripcion: product.descripcion,
            precio: product.precio,
            aplica_todos_plan: product.aplica_todos_plan || false,
            presentacion_id: product.fk_id_presentacion || null,
            linea_id: product.fk_id_linea || null,
            tipo_id: product.fk_id_tipo || null,
            fk_id_marca: product.fk_id_marca || null,
            activo: true
          }

          // Solo incluir imagen para productos nuevos si viene en el Excel
          if (product.imagen && product.imagen.trim() !== '') {
            productData.imagen = product.imagen
          }

          let productId: number
          let existingProduct = null

          if (product.id) {
            existingProduct = { id: product.id }
            productId = product.id
          } else if (product.codigo && product.codigo.trim() !== '') {
            // Usar datos pre-cargados en lugar de query
            const codigoNormalizado = product.codigo.toLowerCase().trim()
            console.log(`🔍 Buscando código: "${codigoNormalizado}" (original: "${product.codigo}")`)
            existingProduct = existingProductsMap.get(codigoNormalizado)
            if (existingProduct) {
              productId = existingProduct.id
              console.log(`✅ Producto existente encontrado: ${product.codigo} (ID: ${productId})`)
            } else {
              console.log(`❌ Producto NO encontrado en mapa. Creando nuevo: ${product.codigo}`)
              console.log(`🔑 El mapa tiene estas claves similares:`, Array.from(existingProductsMap.keys()).filter(k => k.includes(codigoNormalizado.substring(0, 3))).slice(0, 3))
            }
          } else {
            // Si no hay código, saltar este producto
            result.errors.push(`Fila ${i + 1}: Producto sin código válido`)
            return
          }

          if (existingProduct) {
            // Verificar si hay cambios en el producto
            console.log(`Verificando cambios en producto existente: ${product.codigo} - ${product.descripcion}`)

            // Preparar datos para actualización
            const updateData: any = {}
            let needsUpdate = false

            // Actualizar precio si es diferente
            if (product.precio !== existingProduct.precio) {
              updateData.precio = product.precio
              needsUpdate = true
              console.log(`Actualizando precio de ${existingProduct.precio} a ${product.precio}`)
            }

            // Actualizar aplica_todos_plan si es diferente
            if (product.aplica_todos_plan !== existingProduct.aplica_todos_plan) {
              updateData.aplica_todos_plan = product.aplica_todos_plan
              needsUpdate = true
              console.log(`Actualizando aplica_todos_plan de ${existingProduct.aplica_todos_plan} a ${product.aplica_todos_plan}`)
            }

            // Actualizar descripción si es diferente
            if (product.descripcion && product.descripcion.trim() && product.descripcion !== existingProduct.descripcion) {
              updateData.descripcion = product.descripcion
              needsUpdate = true
              console.log(`Actualizando descripción de "${existingProduct.descripcion}" a "${product.descripcion}"`)
            }

            // Actualizar presentación solo si viene en el Excel Y es diferente a la actual
            if (product.fk_id_presentacion !== undefined && product.fk_id_presentacion !== existingProduct.presentacion_id) {
              updateData.presentacion_id = product.fk_id_presentacion
              needsUpdate = true
              console.log(`Actualizando presentacion_id de ${existingProduct.presentacion_id} a ${product.fk_id_presentacion}`)
            }

            // Actualizar línea solo si viene en el Excel Y es diferente a la actual
            if (product.fk_id_linea !== undefined && product.fk_id_linea !== existingProduct.linea_id) {
              updateData.linea_id = product.fk_id_linea
              needsUpdate = true
              console.log(`Actualizando linea_id de ${existingProduct.linea_id} a ${product.fk_id_linea}`)
            }

            // Actualizar tipo solo si viene en el Excel Y es diferente a la actual
            if (product.fk_id_tipo !== undefined && product.fk_id_tipo !== existingProduct.tipo_id) {
              updateData.tipo_id = product.fk_id_tipo
              needsUpdate = true
              console.log(`Actualizando tipo_id de ${existingProduct.tipo_id} a ${product.fk_id_tipo}`)
            }

            // Actualizar marca solo si viene en el Excel Y es diferente a la actual
            if (product.fk_id_marca !== undefined && product.fk_id_marca !== existingProduct.fk_id_marca) {
              updateData.fk_id_marca = product.fk_id_marca
              needsUpdate = true
              console.log(`Actualizando fk_id_marca de ${existingProduct.fk_id_marca} a ${product.fk_id_marca}`)
            }

            // Actualizar producto si hay cambios
            if (needsUpdate) {
              const { error: updateError } = await supabase
                .from('productos')
                .update(updateData)
                .eq('id', productId)

              if (updateError) {
                console.error(`Error al actualizar producto:`, updateError)
                throw updateError
              }
            }

            // Siempre actualizar stock si viene en el Excel
            if (product._stock && Object.keys(product._stock).length > 0) {
              const stockRegistros = []

              for (const [nombreZona, cantidad] of Object.entries(product._stock)) {
                const zonaId = zonasMapLocal.get(nombreZona.toLowerCase().trim())
                if (zonaId) {
                  stockRegistros.push({
                    fk_id_producto: productId,
                    fk_id_zona: zonaId,
                    stock: cantidad,
                    stock_minimo: 0,
                    activo: true
                  })
                }
              }

              if (stockRegistros.length > 0) {
                // Primero eliminar stock existente para este producto
                await supabase
                  .from('stock_sucursales')
                  .delete()
                  .eq('fk_id_producto', productId)

                // Luego insertar los nuevos registros
                const { error: stockError } = await supabase
                  .from('stock_sucursales')
                  .insert(stockRegistros)

                if (stockError) {
                  console.error(`❌ Error al insertar stock para producto ${productId}:`, stockError)
                  throw stockError
                }
              }
            }

            // Si no hay cambios en el producto, omitir (pero el stock ya se procesó)
            if (!needsUpdate) {
              result.skipped++
              return // Saltar al siguiente producto
            }

          } else {
            // Crear nuevo producto
            console.log(`Creando nuevo producto: ${product.codigo} - ${product.descripcion}`)
            const { data, error } = await supabase
              .from('productos')
              .insert(productData)
              .select('id')
              .single()

            if (error) {
              console.error(`Error al crear producto:`, error)
              throw error
            }
            productId = data.id
            console.log(`Producto creado con ID: ${productId}`)

            // Agregar al mapa para evitar duplicados en el mismo batch
            if (product.codigo) {
              existingProductsMap.set(product.codigo.toLowerCase().trim(), {
                id: productId,
                codigo: product.codigo,
                precio: product.precio,
                aplica_todos_plan: product.aplica_todos_plan || false,
                presentacion_id: product.fk_id_presentacion || null,
                linea_id: product.fk_id_linea || null,
                tipo_id: product.fk_id_tipo || null,
                descripcion: product.descripcion,
                fk_id_marca: product.fk_id_marca || null,
                imagen: product.imagen || null
              })
            }

            // Crear registros de stock para productos nuevos
            if (product._stock && Object.keys(product._stock).length > 0) {
              const stockRegistros = []

              for (const [nombreZona, cantidad] of Object.entries(product._stock)) {
                const zonaId = zonasMapLocal.get(nombreZona.toLowerCase().trim())
                if (zonaId) {
                  stockRegistros.push({
                    fk_id_producto: productId,
                    fk_id_zona: zonaId,
                    stock: cantidad,
                    stock_minimo: 0,
                    activo: true
                  })
                }
              }

              if (stockRegistros.length > 0) {
                console.log(`Creando stock para nuevo producto ${productId}:`, stockRegistros)
                await supabase
                  .from('stock_sucursales')
                  .insert(stockRegistros)
              }
            }
          }

          // Manejar asociaciones con planes solo cuando sea necesario
          const shouldCreatePlanAssociations = existingProduct
            ? (product.aplica_todos_plan && !existingProduct.aplica_todos_plan) // Cambió de false a true
            : product.aplica_todos_plan // Producto nuevo con aplica_todos_plan = true

          if (shouldCreatePlanAssociations) {
            // Primero eliminar asociaciones existentes
            await supabase
              .from('producto_planes_default')
              .delete()
              .eq('fk_id_producto', productId)

            // Usar planes pre-cargados
            const asociaciones = planesSinCategorias.map(plan => ({
              fk_id_producto: productId,
              fk_id_plan: plan.id,
              activo: true
            }))

            if (asociaciones.length > 0) {
              await supabase
                .from('producto_planes_default')
                .insert(asociaciones)
            }
          } else if (existingProduct && !product.aplica_todos_plan && existingProduct.aplica_todos_plan) {
            // Si cambió de true a false, eliminar asociaciones
            console.log(`Eliminando asociaciones de planes para producto ${productId} (aplica_todos_plan cambió a false)`)
            await supabase
              .from('producto_planes_default')
              .delete()
              .eq('fk_id_producto', productId)
          }

          result.success++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
          result.errors.push(`Fila ${i + 1} (${product.descripcion}): ${errorMsg}`)
        }
          } // Fin del for de productos del mismo código
        })) // Fin del Promise.all de grupos
      } // Fin del for de batches

      console.log(`✅ Migración completada: ${result.success} exitosos, ${result.errors.length} errores, ${result.skipped} omitidos`)
    } catch (error) {
      result.errors.push(`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    setResult(result)
    setStep('result')
    setIsProcessing(false)

    if (onMigrationComplete) {
      onMigrationComplete()
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      setIsDialogOpen(open)
      if (!open) {
        resetDialog()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Migrar desde Excel
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Migración de Productos desde Excel
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Formato requerido del archivo Excel:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Artículo</strong> (obligatorio): Código único del producto</li>
                    <li><strong>Descripción</strong> (obligatorio): Nombre del producto</li>
                    <li><strong>Precio</strong> (obligatorio): Precio del producto</li>
                    <li><strong>Presentacion</strong> (opcional): Nombre de la presentación</li>
                    <li><strong>Línea</strong> (opcional): Nombre de la línea</li>
                    <li><strong>Tipo</strong> (opcional): Nombre del tipo</li>
                    <li><strong>Marca</strong> (opcional): Nombre de la marca</li>
                    <li><strong>Central</strong> (opcional): Stock para sucursal Central (número)</li>
                    <li><strong>Cardales</strong> (opcional): Stock para sucursal Cardales (número)</li>
                    <li><strong>Matheu</strong> (opcional): Stock para sucursal Matheu (número)</li>
                    <li><strong>Garin</strong> (opcional): Stock para sucursal Garin (número)</li>
                    <li><strong>Maschwitz</strong> (opcional): Stock para sucursal Maschwitz (número)</li>
                    <li><strong>Capilla</strong> (opcional): Stock para sucursal Capilla (número)</li>
                    <li><strong>imagen</strong> (opcional): URL de la imagen del producto</li>
                    <li><strong>aplica_todos_plan</strong> (opcional): TRUE/FALSE - Si el producto se asocia a todos los planes</li>
                  </ul>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-blue-600">
                      <strong>Validaciones automáticas:</strong>
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-blue-700">
                      <li>Los nombres de presentación, línea, tipo y marca se validan contra la base de datos</li>
                      <li><strong>Los productos existentes (mismo código) se actualizarán</strong> con los nuevos datos del Excel</li>
                      <li>Se actualizarán: precio, descripción, presentación, línea, tipo, marca, imagen y aplica_todos_plan</li>
                      <li>Si no existe un producto con ese código, se crea uno nuevo con el código asignado</li>
                      <li>Los valores de stock se crean como registros en <code>stock_sucursales</code> con stock_minimo = 0</li>
                      <li>Solo se crean registros de stock para valores mayores a 0</li>
                      <li>Si <code>aplica_todos_plan</code> cambia de FALSE a TRUE, se crean automáticamente las relaciones con todos los planes activos sin categorías específicas</li>
                      <li>Si <code>aplica_todos_plan</code> cambia de TRUE a FALSE, se eliminan las relaciones con planes</li>
                      <li>Los productos con errores de validación se mostrarán en rojo y no se procesarán</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label htmlFor="excel-file" className="block text-sm font-medium mb-2">
                  Seleccionar archivo Excel
                </label>
                <input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vista previa de datos</h3>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Volver
                </Button>
                <Button onClick={processMigration}>
                  Procesar Migración ({previewData.length} productos)
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Todos los Planes</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Presentación</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Línea</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Imagen</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock Sucursales</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.slice(0, 50).map((product, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${product._validation_errors?.length ? 'bg-red-25' : ''}`}>
                      <td className="px-3 py-2 text-sm text-gray-900 font-medium">{product.codigo || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{product.descripcion}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(product.precio)}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {product.aplica_todos_plan ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            SÍ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            NO
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {product.fk_id_presentacion ? (
                          <div>
                            <div className="font-medium">ID: {product.fk_id_presentacion}</div>
                            <div className="text-xs text-gray-500">{product._presentacion_nombre}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {product.fk_id_linea ? (
                          <div>
                            <div className="font-medium">ID: {product.fk_id_linea}</div>
                            <div className="text-xs text-gray-500">{product._linea_nombre}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {product.fk_id_tipo ? (
                          <div>
                            <div className="font-medium">ID: {product.fk_id_tipo}</div>
                            <div className="text-xs text-gray-500">{product._tipo_nombre}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {product.fk_id_marca ? (
                          <div>
                            <div className="font-medium">ID: {product.fk_id_marca}</div>
                            <div className="text-xs text-gray-500">{product._marca_nombre}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {product.imagen ? (
                          <div className="flex items-center space-x-2">
                            <img 
                              src={product.imagen} 
                              alt="Vista previa" 
                              className="w-8 h-8 object-cover rounded border"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg'
                              }}
                            />
                            <div className="text-xs text-gray-500 max-w-20 truncate">
                              {product.imagen}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {product.imagen ? (
                          <div className="flex items-center space-x-2">
                            <img 
                              src={product.imagen} 
                              alt="Vista previa" 
                              className="w-8 h-8 object-cover rounded border"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg'
                              }}
                            />
                            <div className="text-xs text-gray-500 max-w-20 truncate">
                              {product.imagen}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {product._stock && Object.keys(product._stock).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(product._stock).map(([zona, cantidad]) => (
                              <div key={zona} className="text-xs">
                                <span className="font-medium capitalize">{zona}:</span> {cantidad}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin stock</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {product.id ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Actualizar
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Crear
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {product._validation_errors && product._validation_errors.length > 0 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                            <div className="text-xs text-red-600">
                              {product._validation_errors.map((error, i) => (
                                <div key={i}>• {error}</div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Válido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {previewData.length > 50 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-2 text-sm text-gray-500 text-center">
                        ... y {previewData.length - 50} productos más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Procesando migración...</h3>
              <p className="text-sm text-gray-600">
                Por favor, no cierres esta ventana mientras se procesan los datos.
              </p>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500">{progress}% completado</p>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Resultado de la migración</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{result.success}</div>
                    <div className="text-sm text-gray-600">Exitosos</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                    <div className="text-sm text-gray-600">Errores</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                    <div className="text-sm text-gray-600">Omitidos</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Errores encontrados:</h4>
                <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
                  <ul className="space-y-1 text-sm">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-red-700">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={() => {
                setIsDialogOpen(false)
                window.location.reload()
              }}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}