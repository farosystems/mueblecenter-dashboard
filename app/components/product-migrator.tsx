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
  descripcion: string
  precio: number
  aplica_todos_plan?: boolean
  fk_id_categoria?: number
  fk_id_marca?: number
  _categoria_nombre?: string
  _marca_nombre?: string
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

      // Validar que las columnas requeridas existen
      const requiredColumns = ['descripcion', 'precio']
      const firstRow = data[0]
      const missingColumns = requiredColumns.filter(col => !(col in firstRow))
      
      if (missingColumns.length > 0) {
        alert(`El archivo Excel debe contener las siguientes columnas: ${missingColumns.join(', ')}`)
        return
      }

      // Obtener categorías y marcas válidas para validación
      const { data: categorias } = await supabase.from('categorias').select('id, descripcion')
      const { data: marcas } = await supabase.from('marcas').select('id, descripcion')
      
      const categoriasValidas = new Set(categorias?.map(c => c.id) || [])
      const marcasValidas = new Set(marcas?.map(m => m.id) || [])
      const categoriasMap = new Map(categorias?.map(c => [c.id, c.descripcion]) || [])
      const marcasMap = new Map(marcas?.map(m => [m.id, m.descripcion]) || [])

      // Procesar y limpiar los datos
      const processedData = data.map((row, index) => {
        const processed: ProductMigrationData = {
          descripcion: String(row.descripcion || '').trim(),
          precio: Number(row.precio) || 0,
          aplica_todos_plan: Boolean(row.aplica_todos_plan),
        }

        // Validar y procesar categoría
        if (row.fk_id_categoria) {
          const categoriaId = Number(row.fk_id_categoria)
          if (!isNaN(categoriaId) && categoriasValidas.has(categoriaId)) {
            processed.fk_id_categoria = categoriaId
            processed._categoria_nombre = categoriasMap.get(categoriaId)
          } else {
            processed._validation_errors = processed._validation_errors || []
            processed._validation_errors.push(`Categoría ID ${row.fk_id_categoria} no es válida`)
          }
        }

        // Validar y procesar marca
        if (row.fk_id_marca) {
          const marcaId = Number(row.fk_id_marca)
          if (!isNaN(marcaId) && marcasValidas.has(marcaId)) {
            processed.fk_id_marca = marcaId
            processed._marca_nombre = marcasMap.get(marcaId)
          } else {
            processed._validation_errors = processed._validation_errors || []
            processed._validation_errors.push(`Marca ID ${row.fk_id_marca} no es válida`)
          }
        }

        // Si hay un ID, incluirlo para actualización
        if (row.id) {
          const productId = Number(row.id)
          if (!isNaN(productId)) {
            processed.id = productId
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
      for (let i = 0; i < previewData.length; i++) {
        const product = previewData[i]
        setProgress(Math.round(((i + 1) / previewData.length) * 100))

        try {
          // Verificar si hay errores de validación previos
          if (product._validation_errors && product._validation_errors.length > 0) {
            result.errors.push(`Fila ${i + 1} (${product.descripcion}): ${product._validation_errors.join(', ')}`)
            continue
          }

          // Insertar o actualizar el producto
          let productData: any = {
            descripcion: product.descripcion,
            precio: product.precio,
            aplica_todos_plan: product.aplica_todos_plan || false,
            fk_id_categoria: product.fk_id_categoria || null,
            fk_id_marca: product.fk_id_marca || null,
            activo: true // Por defecto activo
          }

          let productId: number

          if (product.id) {
            // Actualizar producto existente
            const { data, error } = await supabase
              .from('productos')
              .update(productData)
              .eq('id', product.id)
              .select('id')
              .single()

            if (error) throw error
            productId = data.id
          } else {
            // Crear nuevo producto
            const { data, error } = await supabase
              .from('productos')
              .insert(productData)
              .select('id')
              .single()

            if (error) throw error
            productId = data.id
          }

          // Si el producto tiene aplica_todos_plan = TRUE, crear las asociaciones
          if (product.aplica_todos_plan) {
            // Primero eliminar asociaciones existentes para este producto
            await supabase
              .from('producto_planes_default')
              .delete()
              .eq('fk_id_producto', productId)

            // Obtener todos los planes activos que NO tengan categorías definidas
            const { data: planesDisponibles, error: planesError } = await supabase
              .from('planes_financiacion')
              .select(`
                id,
                nombre,
                activo
              `)
              .eq('activo', true)

            if (planesError) throw planesError

            // Filtrar planes que NO tienen categorías asociadas
            const { data: planesCategorias, error: planesCatError } = await supabase
              .from('planes_categorias')
              .select('fk_id_plan')

            if (planesCatError) throw planesCatError

            const planesConCategorias = planesCategorias.map(pc => pc.fk_id_plan)
            const planesSinCategorias = planesDisponibles.filter(plan => !planesConCategorias.includes(plan.id))

            // Crear las asociaciones
            const asociaciones = planesSinCategorias.map(plan => ({
              fk_id_producto: productId,
              fk_id_plan: plan.id,
              activo: true
            }))

            if (asociaciones.length > 0) {
              const { error: asociacionError } = await supabase
                .from('producto_planes_default')
                .insert(asociaciones)

              if (asociacionError) {
                console.warn(`Error al crear asociaciones para producto ${productId}:`, asociacionError)
              }
            }
          }

          result.success++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
          result.errors.push(`Fila ${i + 1} (${product.descripcion}): ${errorMsg}`)
        }
      }
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
                    <li><strong>descripcion</strong> (obligatorio): Nombre del producto</li>
                    <li><strong>precio</strong> (obligatorio): Precio del producto</li>
                    <li><strong>aplica_todos_plan</strong> (opcional): TRUE/FALSE - Si el producto se asocia a todos los planes</li>
                    <li><strong>fk_id_categoria</strong> (opcional): ID numérico de la categoría (se valida que exista)</li>
                    <li><strong>fk_id_marca</strong> (opcional): ID numérico de la marca (se valida que exista)</li>
                    <li><strong>id</strong> (opcional): Si se incluye, actualiza el producto existente</li>
                  </ul>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-blue-600">
                      <strong>Validaciones automáticas:</strong>
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-blue-700">
                      <li>Los IDs de categorías y marcas se verifican contra la base de datos</li>
                      <li>Si un producto tiene <code>aplica_todos_plan = TRUE</code>, se crean automáticamente las relaciones con todos los planes activos sin categorías específicas en <code>productos_planes_default</code></li>
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
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Todos los Planes</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.slice(0, 50).map((product, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${product._validation_errors?.length ? 'bg-red-25' : ''}`}>
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
                        {product.fk_id_categoria ? (
                          <div>
                            <div className="font-medium">ID: {product.fk_id_categoria}</div>
                            <div className="text-xs text-gray-500">{product._categoria_nombre}</div>
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
                      <td className="px-3 py-2 text-sm">
                        {product.id ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
                      <td colSpan={7} className="px-3 py-2 text-sm text-gray-500 text-center">
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
              <Button onClick={() => setIsDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}