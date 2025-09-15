"use client"

import { useState, useRef } from "react"
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import type { Producto } from "@/lib/supabase"
import * as XLSX from 'xlsx'

interface PriceUpdaterProps {
  productos: Producto[]
  onUpdateProducto: (id: number, updates: Partial<Producto>) => Promise<Producto | undefined>
}

interface ExcelRow {
  'Descripción': string
  'Precio': number
  'Categoría'?: string
  'Marca'?: string
  'Destacado'?: string
  'Descripción Detallada'?: string
}

interface UpdateResult {
  success: boolean
  message: string
  productoId?: number
  oldPrice?: number
  newPrice?: number
}

interface PreviewRow {
  productoId: number
  descripcion: string
  oldPrice: number
  newPrice: number
  isValid: boolean
  errorMessage?: string
}

export function PriceUpdater({ productos, onUpdateProducto }: PriceUpdaterProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [results, setResults] = useState<UpdateResult[]>([])
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const validateExcelStructure = (data: any[]): string | null => {
    if (data.length === 0) {
      return "El archivo Excel está vacío"
    }

    const firstRow = data[0]
    const requiredColumns = ['Descripción', 'Precio']
    
    for (const column of requiredColumns) {
      if (!(column in firstRow)) {
        return `Falta la columna requerida: "${column}". Las columnas obligatorias son: Descripción, Precio`
      }
    }

    // Verificar que no haya columnas extrañas
    const allowedColumns = [
      'Descripción', 'Precio',
      'Categoría', 'Marca', 'Destacado', 'Descripción Detallada'
    ]
    
    const extraColumns = Object.keys(firstRow).filter(col => !allowedColumns.includes(col))
    if (extraColumns.length > 0) {
      return `Columnas no permitidas encontradas: ${extraColumns.join(', ')}. Solo se permiten: ${allowedColumns.join(', ')}`
    }

    return null
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setResults([])
    setPreviewData([])
    setValidationError(null)
    setShowPreview(false)

    try {
      const data = await readExcelFile(file)
      const validationError = validateExcelStructure(data)
      
      if (validationError) {
        setValidationError(validationError)
        setIsProcessing(false)
        return
      }

      // Generar vista previa en lotes más pequeños para evitar problemas de memoria
      const previewRows: PreviewRow[] = []
      const batchSize = 25 // Reducir a 25 filas por lote
      setTotalItems(data.length)
      setProgress(0)
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        
        for (const row of batch) {
          const previewRow = generatePreviewRow(row)
          previewRows.push(previewRow)
        }
        
        // Actualizar el estado en lotes para mostrar progreso
        setPreviewData([...previewRows])
        setProgress(Math.min(((i + batchSize) / data.length) * 100, 100))
        
        // Pausa más larga para permitir que el navegador respire
        if (i + batchSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      setPreviewData(previewRows)
      setShowPreview(true)

      // Mostrar toast de éxito
      const validCount = previewRows.filter(r => r.isValid).length
      const errorCount = previewRows.filter(r => !r.isValid).length
      
      toast({
        title: "📄 Archivo procesado",
        description: `${validCount} productos válidos, ${errorCount} con errores. Revisa la vista previa.`,
        variant: validCount > 0 ? "default" : "destructive",
      })

    } catch (error) {
      setValidationError(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const readExcelFile = (file: File): Promise<ExcelRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[]
          
          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.readAsArrayBuffer(file)
    })
  }

  const generatePreviewRow = (row: ExcelRow): PreviewRow => {
    let newPrice = row['Precio']
    const descripcion = row['Descripción']

    // Validar que el producto existe por descripción
    const producto = productos.find(p => p.descripcion === descripcion)
    if (!producto) {
      return {
        productoId: 0,
        descripcion,
        oldPrice: 0,
        newPrice: 0,
        isValid: false,
        errorMessage: `Producto con descripción "${descripcion}" no encontrado`
      }
    }

    // Convertir precio a número si es necesario
    if (typeof newPrice === 'string') {
      // Remover símbolos de moneda y separadores de miles
      const cleanPrice = newPrice.replace(/[^\d,.-]/g, '').replace(',', '.')
      newPrice = parseFloat(cleanPrice)
    }

    // Validar que el precio es un número válido
    if (typeof newPrice !== 'number' || isNaN(newPrice) || newPrice <= 0) {
      return {
        productoId: producto.id,
        descripcion,
        oldPrice: producto.precio,
        newPrice: 0,
        isValid: false,
        errorMessage: `Precio inválido: ${row['Precio']}`
      }
    }

    // Aplicar redondeo hacia arriba al múltiplo de 100 más cercano
    newPrice = Math.ceil(newPrice / 100) * 100

    return {
      productoId: producto.id,
      descripcion,
      oldPrice: producto.precio,
      newPrice,
      isValid: true
    }
  }

  const processRow = async (row: ExcelRow): Promise<UpdateResult> => {
    try {
      let newPrice = row['Precio']
      const descripcion = row['Descripción']

      // Validar que el producto existe por descripción
      const producto = productos.find(p => p.descripcion === descripcion)
      if (!producto) {
        return {
          success: false,
          message: `Producto con descripción "${descripcion}" no encontrado`,
          productoId: 0
        }
      }

      // Convertir precio a número si es necesario
      if (typeof newPrice === 'string') {
        // Remover símbolos de moneda y separadores de miles
        const cleanPrice = newPrice.replace(/[^\d,.-]/g, '').replace(',', '.')
        newPrice = parseFloat(cleanPrice)
      }

      // Validar que el precio es un número válido
      if (typeof newPrice !== 'number' || isNaN(newPrice) || newPrice <= 0) {
        return {
          success: false,
          message: `Precio inválido para producto "${descripcion}": ${row['Precio']}`,
          productoId: producto.id,
          oldPrice: producto.precio
        }
      }

      // Aplicar redondeo hacia arriba al múltiplo de 100 más cercano
      newPrice = Math.ceil(newPrice / 100) * 100

      // Actualizar el precio
      await onUpdateProducto(producto.id, { precio: newPrice })

      return {
        success: true,
        message: `Precio actualizado: ${formatPrice(producto.precio)} → ${formatPrice(newPrice)}`,
        productoId: producto.id,
        oldPrice: producto.precio,
        newPrice
      }

    } catch (error) {
      return {
        success: false,
        message: `Error al procesar producto "${row['Descripción']}": ${error instanceof Error ? error.message : 'Error desconocido'}`,
        productoId: 0
      }
    }
  }

  const handleConfirmUpdate = async () => {
    setIsUpdating(true)
    setResults([])

    try {
      // Filtrar solo las filas válidas
      const validRows = previewData.filter(row => row.isValid)
      
      if (validRows.length === 0) {
        toast({
          title: "Sin productos válidos",
          description: "No hay productos válidos para actualizar",
          variant: "destructive",
        })
        setIsUpdating(false)
        return
      }

      // Procesar en lotes más pequeños para evitar problemas de memoria
      const batchSize = 5 // Reducir a 5 productos por lote
      setTotalItems(validRows.length)
      setProgress(0)
      
      let successCount = 0
      let errorCount = 0
      const recentResults: UpdateResult[] = [] // Solo mantener los últimos resultados
      
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize)
        
        // Procesar el lote actual
        for (const row of batch) {
          try {
            const result = await onUpdateProducto(row.productoId, { precio: row.newPrice })
            
            const updateResult = {
              success: !!result,
              message: result 
                ? `Precio actualizado: ${formatPrice(row.oldPrice)} → ${formatPrice(row.newPrice)}`
                : `Error al actualizar producto ${row.productoId}`,
              productoId: row.productoId,
              oldPrice: row.oldPrice,
              newPrice: row.newPrice
            }
            
            if (updateResult.success) {
              successCount++
            } else {
              errorCount++
            }
            
            // Mantener solo los últimos 20 resultados para evitar problemas de memoria
            recentResults.push(updateResult)
            if (recentResults.length > 20) {
              recentResults.shift() // Remover el más antiguo
            }
            
          } catch (error) {
            errorCount++
            const errorResult = {
              success: false,
              message: `Error al actualizar producto ${row.productoId}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
              productoId: row.productoId,
              oldPrice: row.oldPrice,
              newPrice: row.newPrice
            }
            
            recentResults.push(errorResult)
            if (recentResults.length > 20) {
              recentResults.shift()
            }
          }
        }
        
        // Actualizar solo los resultados recientes y el progreso
        setResults([...recentResults])
        setProgress(Math.min(((i + batchSize) / validRows.length) * 100, 100))
        
        // Pausa más larga entre lotes para dar tiempo al navegador
        if (i + batchSize < validRows.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      // Crear resumen final sin mantener todos los resultados en memoria
      const finalResults: UpdateResult[] = [
        {
          success: true,
          message: `✅ Actualización completada: ${successCount} exitosos, ${errorCount} errores`,
          productoId: 0
        },
        ...recentResults.slice(-10) // Solo mostrar los últimos 10 resultados
      ]
      
      setResults(finalResults)
      setShowPreview(false)
      
      // Mostrar resumen usando los contadores ya calculados
      if (errorCount === 0) {
        toast({
          title: "✅ Actualización exitosa",
          description: `Todos los precios se actualizaron correctamente (${successCount} productos)`,
          variant: "default",
        })
      } else {
        toast({
          title: "⚠️ Actualización parcial",
          description: `Se actualizaron ${successCount} productos. ${errorCount} errores encontrados.`,
          variant: "destructive",
        })
      }

    } catch (error) {
      setValidationError(`Error al actualizar precios: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setResults([])
    setPreviewData([])
    setValidationError(null)
    setShowPreview(false)
    setProgress(0)
    setTotalItems(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    // Crear datos de ejemplo para la plantilla
    const templateData = productos.slice(0, 3).map(producto => ({
      'Descripción': producto.descripcion,
      'Precio': producto.precio,
      'Categoría': producto.categoria?.descripcion || 'Sin categoría',
      'Marca': producto.marca?.descripcion || 'Sin marca',
      'Destacado': producto.destacado ? 'Sí' : 'No',
      'Descripción Detallada': producto.descripcion_detallada || ''
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    
    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 40 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 50 }
    ]
    worksheet['!cols'] = columnWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla')
    XLSX.writeFile(workbook, 'plantilla_actualizacion_precios.xlsx')
    
    toast({
      title: "📥 Plantilla descargada",
      description: "Se descargó la plantilla 'plantilla_actualizacion_precios.xlsx'",
      variant: "default",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) {
        setIsOpen(true)
      }
      // No permitir cerrar con clic fuera o ESC
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Actualizar Precios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Actualizar Precios desde Excel</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Instrucciones */}
                     <Alert>
             <AlertCircle className="h-4 w-4" />
             <AlertDescription>
               <strong>Columnas obligatorias:</strong> Descripción, Precio<br/>
               <strong>Importante:</strong> Usa la columna "Precio" (sin formato) para los nuevos valores, NO "Precio Formateado".<br/>
               <strong>Redondeo automático:</strong> Los precios se redondearán automáticamente hacia arriba al múltiplo de 100 más cercano.<br/>
               Solo se actualizarán los precios de los productos que coincidan exactamente por descripción.
             </AlertDescription>
           </Alert>

          {/* Botones de acción */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Upload className="h-4 w-4" />
              Descargar Plantilla
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isProcessing ? 'Procesando...' : 'Seleccionar Archivo'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Error de validación */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Indicador de progreso */}
          {(isProcessing || isUpdating) && totalItems > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{isProcessing ? 'Procesando archivo...' : 'Actualizando precios...'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-gray-500">
                Procesando {Math.round((progress / 100) * totalItems)} de {totalItems} elementos
              </div>
            </div>
          )}

                     {/* Vista Previa */}
           {showPreview && previewData.length > 0 && (
             <div className="flex-1 overflow-y-auto border rounded-lg">
               <div className="p-4">
                 <h3 className="font-medium mb-3">Vista previa de cambios:</h3>
                 
                 {/* Mostrar solo los primeros 10 y últimos 5 resultados para evitar problemas de memoria */}
                 <div className="space-y-2">
                   {previewData.slice(0, 10).map((row, index) => (
                     <div
                       key={index}
                       className={`flex items-start space-x-2 p-3 rounded border ${
                         row.isValid 
                           ? 'bg-blue-50 border-blue-200' 
                           : 'bg-red-50 border-red-200'
                       }`}
                     >
                       {row.isValid ? (
                         <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                       ) : (
                         <X className="h-4 w-4 text-red-600 mt-0.5" />
                       )}
                       <div className="flex-1 text-sm">
                         <div className="font-medium">
                           Producto ID: {row.productoId} - {row.descripcion}
                         </div>
                         {row.isValid ? (
                           <div className="text-gray-600">
                             Precio actual: {formatPrice(row.oldPrice)} → Nuevo precio: {formatPrice(row.newPrice)}
                           </div>
                         ) : (
                           <div className="text-red-600">
                             Error: {row.errorMessage}
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                   
                   {previewData.length > 15 && (
                     <div className="text-center text-gray-500 text-sm py-2">
                       ... y {previewData.length - 15} productos más ...
                     </div>
                   )}
                   
                   {previewData.length > 15 && previewData.slice(-5).map((row, index) => (
                     <div
                       key={`last-${index}`}
                       className={`flex items-start space-x-2 p-3 rounded border ${
                         row.isValid 
                           ? 'bg-blue-50 border-blue-200' 
                           : 'bg-red-50 border-red-200'
                       }`}
                     >
                       {row.isValid ? (
                         <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                       ) : (
                         <X className="h-4 w-4 text-red-600 mt-0.5" />
                       )}
                       <div className="flex-1 text-sm">
                         <div className="font-medium">
                           Producto ID: {row.productoId} - {row.descripcion}
                         </div>
                         {row.isValid ? (
                           <div className="text-gray-600">
                             Precio actual: {formatPrice(row.oldPrice)} → Nuevo precio: {formatPrice(row.newPrice)}
                           </div>
                         ) : (
                           <div className="text-red-600">
                             Error: {row.errorMessage}
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                   <div className="text-sm text-gray-700">
                     <strong>Resumen:</strong> {previewData.filter(r => r.isValid).length} productos válidos, {previewData.filter(r => !r.isValid).length} con errores
                   </div>
                 </div>
               </div>
             </div>
           )}

           {/* Resultados */}
           {results.length > 0 && (
             <div className="flex-1 overflow-y-auto border rounded-lg">
               <div className="p-4">
                 <h3 className="font-medium mb-3">Resultados de la actualización:</h3>
                 <div className="space-y-2">
                   {results.map((result, index) => (
                     <div
                       key={index}
                       className={`flex items-start space-x-2 p-2 rounded ${
                         result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                       }`}
                     >
                       {result.success ? (
                         <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                       ) : (
                         <X className="h-4 w-4 text-red-600 mt-0.5" />
                       )}
                       <div className="flex-1 text-sm">
                         <div className="font-medium">
                           {result.productoId === 0 ? 'Resumen' : `Producto ID: ${result.productoId}`}
                         </div>
                         <div className="text-gray-600">{result.message}</div>
                         {result.oldPrice && result.newPrice && result.productoId !== 0 && (
                           <div className="text-xs text-gray-500">
                             {formatPrice(result.oldPrice)} → {formatPrice(result.newPrice)}
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           )}

           {/* Footer */}
           <div className="flex justify-end pt-4 border-t space-x-2">
             {showPreview && previewData.filter(r => r.isValid).length > 0 && (
               <Button 
                 onClick={handleConfirmUpdate}
                 disabled={isUpdating}
                 className="bg-green-600 hover:bg-green-700"
               >
                 {isUpdating ? 'Actualizando...' : 'Confirmar Cambios'}
               </Button>
             )}
             <Button onClick={handleClose} variant="outline">
               Cerrar
             </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 