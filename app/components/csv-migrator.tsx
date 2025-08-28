"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import type { Producto, Categoria, Marca } from "@/lib/supabase"
import * as XLSX from 'xlsx'

interface CsvMigratorProps {
  categorias: Categoria[]
  marcas: Marca[]
  productos: Producto[]
  onCreateProducto: (producto: Omit<Producto, 'id' | 'created_at' | 'categoria' | 'marca'>) => Promise<Producto | undefined>
  onUpdateProducto: (id: number, updates: Partial<Producto>) => Promise<Producto | undefined>
}

interface CsvRow {
  descripcion: string
  descripcion_detallada?: string
  precio: number
  categoria?: string
  marca?: string
  fk_id_categoria?: number | string
  fk_id_marca?: number | string
  destacado?: boolean
  aplica_todos_plan?: boolean
  aplica_solo_categoria?: boolean
  aplica_plan_especial?: boolean
  imagen?: string
  imagen_2?: string
  imagen_3?: string
  imagen_4?: string
  imagen_5?: string
}

interface MigrationResult {
  success: boolean
  message: string
  producto?: Producto
  error?: string
  skipped?: boolean
}

export function CsvMigrator({ categorias, marcas, productos, onCreateProducto, onUpdateProducto }: CsvMigratorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<MigrationResult[]>([])
  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [migrationErrors, setMigrationErrors] = useState<{row: number, product: string, error: string, data: any}[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setProgress(0)
    setResults([])
    setCsvData([])
    setValidationErrors([])
    setShowPreview(false)
    setShowErrorDialog(false)
    setMigrationErrors([])
  }

  const validateCsvStructure = (data: any[]): string[] => {
    const errors: string[] = []
    
    if (data.length === 0) {
      errors.push("El archivo CSV está vacío")
      return errors
    }

    const firstRow = data[0]
    const requiredColumns = ['descripcion', 'precio']
    
    for (const column of requiredColumns) {
      if (!(column in firstRow)) {
        errors.push(`Falta la columna requerida: "${column}"`)
      }
    }

    // Verificar columnas permitidas
    const allowedColumns = [
      'descripcion', 'descripcion_detallada', 'precio', 'categoria', 'marca',
      'fk_id_categoria', 'fk_id_marca',
      'destacado', 'aplica_todos_plan', 'aplica_solo_categoria', 'aplica_plan_especial',
      'imagen', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5'
    ]
    
    const extraColumns = Object.keys(firstRow).filter(col => !allowedColumns.includes(col))
    if (extraColumns.length > 0) {
      errors.push(`Columnas no permitidas: ${extraColumns.join(', ')}`)
    }

    return errors
  }

  const validateCsvData = (data: CsvRow[]): string[] => {
    const errors: string[] = []
    
    data.forEach((row, index) => {
      const rowNumber = index + 2 // +2 porque index empieza en 0 y la primera fila es el header
      
      if (!row.descripcion || row.descripcion.trim() === '') {
        errors.push(`Fila ${rowNumber}: La descripción es obligatoria`)
      }
      
      if (row.precio === undefined || row.precio === null || isNaN(row.precio) || row.precio < 0) {
        errors.push(`Fila ${rowNumber}: El precio debe ser un número mayor o igual a 0`)
      }
      
      // Validar categoría (por nombre o ID) - solo advertencia, no error
      if (row.categoria && !categorias.find(cat => cat.descripcion.toLowerCase() === row.categoria!.toLowerCase())) {
        console.warn(`Fila ${rowNumber}: La categoría "${row.categoria}" no existe, se dejará vacía`)
      }
      
      if (row.fk_id_categoria && !categorias.find(cat => cat.id === row.fk_id_categoria)) {
        console.warn(`Fila ${rowNumber}: La categoría con ID "${row.fk_id_categoria}" no existe, se dejará vacía`)
      }
      
      // Validar marca (por nombre o ID) - solo advertencia, no error
      if (row.marca && !marcas.find(marca => marca.descripcion.toLowerCase() === row.marca!.toLowerCase())) {
        console.warn(`Fila ${rowNumber}: La marca "${row.marca}" no existe, se dejará vacía`)
      }
      
      if (row.fk_id_marca && !marcas.find(marca => marca.id === row.fk_id_marca)) {
        console.warn(`Fila ${rowNumber}: La marca con ID "${row.fk_id_marca}" no existe, se dejará vacía`)
      }
    
      // Validación de booleanos eliminada - no se evalúa
    })
    
    return errors
  }

  const parseFile = (file: File): Promise<CsvRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const fileData = e.target?.result
          
          if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            // Procesar archivo Excel
            const workbook = XLSX.read(fileData, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
            
            if (jsonData.length < 2) {
              reject(new Error('El archivo Excel debe tener al menos una fila de encabezados y una fila de datos'))
              return
            }
            
            const headers = (jsonData[0] as string[]).map(h => h.trim().toLowerCase())
            const parsedData: CsvRow[] = []
            
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[]
              if (!row || row.length === 0) continue
              
              const rowData: any = {}
              
              headers.forEach((header, index) => {
                let value = row[index] || ''
                
                                 // Procesar valores booleanos primero (antes de convertir a string)
                 if (header.includes('aplica_') || header === 'destacado') {
                   // Si es un booleano nativo de Excel, usarlo directamente
                   if (typeof value === 'boolean') {
                     value = value.toString()
                   } else {
                     // Si es string, evaluar si es true/false
                     value = (value.toString().toLowerCase() === 'true' || value.toString().toLowerCase() === '1' || value.toString().toLowerCase() === 'si' || value.toString().toLowerCase() === 'yes').toString()
                   }
                 } else {
                   // Convertir a string si es necesario (solo para campos no booleanos)
                   if (typeof value === 'number') {
                     value = value.toString()
                   } else if (typeof value === 'boolean') {
                     value = value.toString()
                   } else if (value === null || value === undefined) {
                     value = ''
                   } else {
                     value = value.toString().trim()
                   }
                 }
                
                // Procesar precio
                if (header === 'precio') {
                  value = (parseFloat(value.toString().replace(/[^\d.-]/g, '')) || 0).toString()
                }
                
                // Procesar IDs de categoría y marca
                if (header === 'fk_id_categoria' || header === 'fk_id_marca') {
                  if (value && value !== '') {
                    const parsedId = parseInt(value.toString())
                    value = isNaN(parsedId) ? '' : parsedId.toString()
                  } else {
                    value = ''
                  }
                }
                
                rowData[header] = value
              })
              
              parsedData.push(rowData)
            }
            
            resolve(parsedData)
          } else {
            // Procesar archivo CSV
            const csv = fileData as string
            const lines = csv.split('\n').filter(line => line.trim() !== '')
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
            
            const parsedData: CsvRow[] = []
            
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim() === '') continue
              
              // Manejar valores que contienen comas dentro de comillas
              const values: string[] = []
              let currentValue = ''
              let insideQuotes = false
              
              for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j]
                
                if (char === '"') {
                  insideQuotes = !insideQuotes
                } else if (char === ',' && !insideQuotes) {
                  values.push(currentValue.trim())
                  currentValue = ''
                } else {
                  currentValue += char
                }
              }
              values.push(currentValue.trim()) // Agregar el último valor
              
              const row: any = {}
              
              headers.forEach((header, index) => {
                let value = values[index] || ''
                
                                 // Remover comillas si existen
                 value = value.replace(/^"|"$/g, '')
                 
                 // Procesar valores booleanos
                 if (header.includes('aplica_') || header === 'destacado') {
                   value = (value.toLowerCase() === 'true' || value.toLowerCase() === '1' || value.toLowerCase() === 'si' || value.toLowerCase() === 'yes').toString()
                 }
                
                // Procesar precio
                if (header === 'precio') {
                  value = (parseFloat(value.replace(/[^\d.-]/g, '')) || 0).toString()
                }
                
                // Procesar IDs de categoría y marca
                if (header === 'fk_id_categoria' || header === 'fk_id_marca') {
                  if (value && value !== '') {
                    const parsedId = parseInt(value)
                    value = isNaN(parsedId) ? '' : parsedId.toString()
                  } else {
                    value = ''
                  }
                }
                
                row[header] = value
              })
              
              parsedData.push(row)
            }
            
            resolve(parsedData)
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        reader.readAsBinaryString(file)
      } else {
        reader.readAsText(file)
      }
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validExtensions = ['.csv', '.xlsx', '.xls']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor selecciona un archivo CSV o Excel (.csv, .xlsx, .xls)')
      return
    }

    try {
      setIsProcessing(true)
      resetState()
      
      const data = await parseFile(file)
      
      // Validar estructura
      const structureErrors = validateCsvStructure(data)
      if (structureErrors.length > 0) {
        setValidationErrors(structureErrors)
        setIsProcessing(false)
        return
      }
      
      // Validar datos
      const dataErrors = validateCsvData(data)
      if (dataErrors.length > 0) {
        setValidationErrors(dataErrors)
        setIsProcessing(false)
        return
      }
      
      setCsvData(data)
      setShowPreview(true)
      setIsProcessing(false)
    } catch (error) {
      console.error('Error al procesar archivo:', error)
      setValidationErrors([`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`])
      setIsProcessing(false)
    }
  }

  const processMigration = async () => {
    if (csvData.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setResults([])
    setMigrationErrors([])

    const totalRows = csvData.length
    const newResults: MigrationResult[] = []

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]
      
      // Verificar si el producto ya existe (por descripción) - solo si skipDuplicates está activado
      if (skipDuplicates) {
        const productoExistente = productos.find(p => 
          p.descripcion.toLowerCase().trim() === row.descripcion.toLowerCase().trim()
        )

        if (productoExistente) {
          newResults.push({
            success: true,
            message: `Producto "${row.descripcion}" ya existe, se omitió`,
            skipped: true
          })
          setProgress(((i + 1) / totalRows) * 100)
          setResults([...newResults])
          continue
        }
      }
      
      try {
        // Encontrar categoría y marca (por nombre o ID)
        let categoriaId: number | undefined = undefined
        if (row.fk_id_categoria && row.fk_id_categoria !== '' && row.fk_id_categoria !== null) {
          const parsedId = parseInt(row.fk_id_categoria.toString())
          categoriaId = isNaN(parsedId) ? undefined : parsedId
        } else if (row.categoria) {
          const categoria = categorias.find(cat => cat.descripcion.toLowerCase() === row.categoria!.toLowerCase())
          categoriaId = categoria?.id || undefined
        }
        
        let marcaId: number | undefined = undefined
        if (row.fk_id_marca && row.fk_id_marca !== '' && row.fk_id_marca !== null) {
          const parsedId = parseInt(row.fk_id_marca.toString())
          marcaId = isNaN(parsedId) ? undefined : parsedId
        } else if (row.marca) {
          const marca = marcas.find(marca => marca.descripcion.toLowerCase() === row.marca!.toLowerCase())
          marcaId = marca?.id || undefined
        }

        // Si no se encontró categoría o marca, dejar como undefined (no asignar por defecto)
        // Solo validar que si se especificó un ID, sea válido
        if (categoriaId !== undefined && !categorias.find(cat => cat.id === categoriaId)) {
          throw new Error(`La categoría con ID "${categoriaId}" no existe en la base de datos. Verifica que la categoría exista o déjala vacía.`)
        }
        
        if (marcaId !== undefined && !marcas.find(marca => marca.id === marcaId)) {
          throw new Error(`La marca con ID "${marcaId}" no existe en la base de datos. Verifica que la marca exista o déjala vacía.`)
        }

        const productoData = {
          descripcion: row.descripcion,
          descripcion_detallada: row.descripcion_detallada || undefined,
          precio: row.precio,
          imagen: row.imagen || undefined,
          imagen_2: row.imagen_2 || undefined,
          imagen_3: row.imagen_3 || undefined,
          imagen_4: row.imagen_4 || undefined,
          imagen_5: row.imagen_5 || undefined,
          destacado: row.destacado || false,
          aplica_todos_plan: row.aplica_todos_plan || false,
          aplica_solo_categoria: row.aplica_solo_categoria || false,
          aplica_plan_especial: row.aplica_plan_especial || false,
          fk_id_categoria: categoriaId,
          fk_id_marca: marcaId,
        }

        const producto = await onCreateProducto(productoData)
        
        newResults.push({
          success: true,
          message: `Producto "${row.descripcion}" creado exitosamente`,
          producto
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        const rowNumber = i + 2 // +2 porque i empieza en 0 y la primera fila es el header
        
        // Analizar el tipo de error para dar mensajes más específicos
        let userFriendlyError = errorMessage
        
        if (errorMessage.includes('foreign key constraint')) {
          if (errorMessage.includes('fk_id_categoria')) {
            userFriendlyError = `La categoría especificada no existe en la base de datos. Verifica que la categoría "${row.categoria || row.fk_id_categoria}" exista o déjala vacía.`
          } else if (errorMessage.includes('fk_id_marca')) {
            userFriendlyError = `La marca especificada no existe en la base de datos. Verifica que la marca "${row.marca || row.fk_id_marca}" exista o déjala vacía.`
          } else {
            userFriendlyError = `Error de referencia: Una categoría o marca especificada no existe en la base de datos.`
          }
        } else if (errorMessage.includes('duplicate key')) {
          userFriendlyError = `El producto "${row.descripcion}" ya existe en la base de datos.`
        } else if (errorMessage.includes('null value')) {
          userFriendlyError = `Falta información obligatoria. Verifica que todos los campos requeridos estén completos.`
        }
        
        newResults.push({
          success: false,
          message: `Error al crear producto "${row.descripcion}"`,
          error: userFriendlyError
        })
        
        // Agregar error detallado para el popup
        setMigrationErrors(prev => [...prev, {
          row: rowNumber,
          product: row.descripcion,
          error: userFriendlyError,
          data: row
        }])
      }

      setProgress(((i + 1) / totalRows) * 100)
      setResults([...newResults])
    }

    setIsProcessing(false)
    
    // Mostrar popup de errores si hay errores de migración
    if (migrationErrors.length > 0) {
      setShowErrorDialog(true)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'descripcion',
      'descripcion_detallada',
      'precio',
      'categoria',
      'marca',
      'fk_id_categoria',
      'fk_id_marca',
      'destacado',
      'aplica_todos_plan',
      'aplica_solo_categoria',
      'aplica_plan_especial',
      'imagen',
      'imagen_2',
      'imagen_3',
      'imagen_4',
      'imagen_5'
    ]
    
    const exampleRow1 = [
      'Smartphone Samsung Galaxy',
      'Smartphone de última generación con cámara de alta resolución',
      '150000.00',
      'Electrónicos',
      'Samsung',
      '',
      '',
      'true',
      'true',
      'false',
      'false',
      'https://ejemplo.com/galaxy.jpg',
      'https://ejemplo.com/galaxy2.jpg',
      '',
      '',
      ''
    ]
    
    const exampleRow2 = [
      'Laptop HP Pavilion',
      'Laptop para trabajo y gaming',
      '250000.00',
      'Computación',
      'HP',
      '',
      '',
      'false',
      'false',
      'true',
      'false',
      'https://ejemplo.com/laptop.jpg',
      '',
      '',
      '',
      ''
    ]
    
    const exampleRow3 = [
      'Producto Premium',
      'Producto exclusivo con plan especial',
      '500000.00',
      'Premium',
      'Apple',
      '',
      '',
      'true',
      'false',
      'false',
      'true',
      'https://ejemplo.com/premium.jpg',
      '',
      '',
      '',
      ''
    ]
    
    // Crear archivo Excel
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow1, exampleRow2, exampleRow3])
    
    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 25 }, // descripcion
      { wch: 40 }, // descripcion_detallada
      { wch: 12 }, // precio
      { wch: 15 }, // categoria
      { wch: 15 }, // marca
      { wch: 15 }, // fk_id_categoria
      { wch: 15 }, // fk_id_marca
      { wch: 10 }, // destacado
      { wch: 18 }, // aplica_todos_plan
      { wch: 20 }, // aplica_solo_categoria
      { wch: 20 }, // aplica_plan_especial
      { wch: 30 }, // imagen
      { wch: 30 }, // imagen_2
      { wch: 30 }, // imagen_3
      { wch: 30 }, // imagen_4
      { wch: 30 }, // imagen_5
    ]
    worksheet['!cols'] = columnWidths
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
    
    // Generar archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_productos.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={resetState}>
            <Upload className="h-4 w-4 mr-2" />
            Migrar Archivos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Migrar Productos desde Archivos</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Instrucciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instrucciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 space-y-2">
                  <p>• <strong>Formatos soportados:</strong> CSV (.csv), Excel (.xlsx, .xls)</p>
                  <p>• <strong>Columnas obligatorias:</strong> descripcion, precio (puede ser 0)</p>
                  <p>• <strong>Columnas opcionales:</strong> descripcion_detallada, categoria, marca, fk_id_categoria, fk_id_marca, destacado, aplica_todos_plan, aplica_solo_categoria, aplica_plan_especial, imagen, imagen_2, imagen_3, imagen_4, imagen_5</p>
                  <p>• <strong>Booleanos:</strong> true/false, 1/0, si/no, yes/no</p>
                  <p>• <strong>Categorías y marcas:</strong> Si no se especifican, se dejan vacías (NULL). Si se especifican pero no existen, se genera un error.</p>
                  <p>• <strong>Lógica de booleanos:</strong> Solo uno puede estar activo a la vez</p>
                  <p>• <strong>Precios:</strong> Usar formato numérico (ej: 150000.00, puede ser 0)</p>
                  <p>• <strong>Imágenes:</strong> URLs completas o dejar vacío</p>
                  <p>• <strong>Excel:</strong> Se lee la primera hoja del archivo</p>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar Plantilla Excel
                </Button>
              </CardContent>
            </Card>

            {/* Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subir Archivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="mb-4"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                  <p className="text-sm text-gray-500">
                    Arrastra y suelta un archivo CSV o Excel aquí o haz clic para seleccionar
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Errores de validación */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <div key={index} className="text-sm">{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Vista previa */}
            {showPreview && csvData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Vista Previa ({csvData.length} productos)
                  </CardTitle>
                  {skipDuplicates && (
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const existentes = csvData.filter(row => 
                          productos.find(p => p.descripcion.toLowerCase().trim() === row.descripcion.toLowerCase().trim())
                        ).length
                        const nuevos = csvData.length - existentes
                        return `${nuevos} nuevos, ${existentes} existentes (se omitirán)`
                      })()}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-4">
                      {csvData.slice(0, 5).map((row, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium">{row.descripcion}</div>
                          <div className="text-sm text-gray-600">
                            Precio: {formatPrice(row.precio)}
                            {row.categoria && ` • Categoría: ${row.categoria}`}
                            {row.marca && ` • Marca: ${row.marca}`}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {row.aplica_todos_plan && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Todos los planes</span>
                            )}
                            {row.aplica_solo_categoria && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Solo categoría</span>
                            )}
                            {row.aplica_plan_especial && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Plan especial</span>
                            )}
                            {row.destacado && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">⭐ Destacado</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {csvData.length > 5 && (
                        <div className="text-center text-sm text-gray-500">
                          ... y {csvData.length - 5} productos más
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="skip-duplicates"
                        checked={skipDuplicates}
                        onCheckedChange={setSkipDuplicates}
                      />
                      <Label htmlFor="skip-duplicates" className="text-sm">
                        Omitir productos que ya existen
                      </Label>
                    </div>
                    <Button 
                      onClick={processMigration} 
                      disabled={isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? 'Procesando...' : 'Iniciar Migración'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progreso */}
            {isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progreso de Migración</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="mb-4" />
                  <div className="text-sm text-gray-600">
                    Procesando {Math.round(progress * csvData.length / 100)} de {csvData.length} productos
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultados */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Resultados de la Migración
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded ${
                          result.success && !result.skipped ? 'bg-green-50' : 
                          result.skipped ? 'bg-yellow-50' : 'bg-red-50'
                        }`}
                      >
                        {result.success && !result.skipped ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : result.skipped ? (
                          <span className="h-4 w-4 text-yellow-600">⏭️</span>
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm ${
                          result.success && !result.skipped ? 'text-green-800' : 
                          result.skipped ? 'text-yellow-800' : 'text-red-800'
                        }`}>
                          {result.message}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <div>✅ Creados: {results.filter(r => r.success && !r.skipped).length}</div>
                    <div>⏭️ Omitidos: {results.filter(r => r.skipped).length}</div>
                    <div>❌ Errores: {results.filter(r => !r.success).length}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de Errores de Migración */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg text-red-600">
              ❌ Errores de Migración
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Se encontraron {migrationErrors.length} errores durante la migración. 
                Revisa los detalles a continuación y corrige los problemas en tu archivo Excel.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Detalles de Errores:</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {migrationErrors.map((error, index) => (
                  <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-red-800">
                          Fila {error.row}: {error.product}
                        </div>
                        <div className="text-sm text-red-600 mt-1">
                          {error.error}
                        </div>
                        <div className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded">
                          <strong>Datos del registro:</strong><br/>
                          Categoría: {error.data.categoria || error.data.fk_id_categoria || 'No especificada'}<br/>
                          Marca: {error.data.marca || error.data.fk_id_marca || 'No especificada'}<br/>
                          Precio: {error.data.precio}<br/>
                          Booleanos: {[
                            error.data.aplica_todos_plan && 'Todos los planes',
                            error.data.aplica_solo_categoria && 'Solo categoría',
                            error.data.aplica_plan_especial && 'Plan especial'
                          ].filter(Boolean).join(', ') || 'Ninguno'}
                        </div>
                      </div>
                      <div className="ml-3 text-xs text-red-500 bg-red-100 px-2 py-1 rounded">
                        Fila {error.row}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Soluciones Comunes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Error de categoría/marca:</strong> Verifica que las categorías y marcas existan en el sistema</li>
                <li>• <strong>Error de foreign key:</strong> Asegúrate de que los IDs de categoría y marca sean válidos</li>
                <li>• <strong>Error de formato:</strong> Verifica que los precios sean números válidos</li>
                <li>• <strong>Error de duplicado:</strong> El producto ya existe en la base de datos</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowErrorDialog(false)}
              >
                Cerrar
              </Button>
              <Button 
                onClick={() => {
                  setShowErrorDialog(false)
                  // Opcional: descargar reporte de errores
                  const errorReport = migrationErrors.map(error => 
                    `Fila ${error.row}: ${error.product}\nError: ${error.error}\nDatos: Categoría=${error.data.categoria || error.data.fk_id_categoria || 'No especificada'}, Marca=${error.data.marca || error.data.fk_id_marca || 'No especificada'}, Precio=${error.data.precio}\n`
                  ).join('\n---\n')
                  
                  const blob = new Blob([errorReport], { type: 'text/plain' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'errores_migracion.txt'
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
              >
                Descargar Reporte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
