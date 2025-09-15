import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, X } from "lucide-react"
import * as XLSX from 'xlsx'

interface ImageImporterProps {
  onUpdateProducto: (id: number, updates: Partial<any>) => Promise<any>
  productos: any[]
}

interface ImportRow {
  ID: string
  Descripción: string
  imagen?: string
  imagen_2?: string
  imagen_3?: string
  imagen_4?: string
  imagen_5?: string
}

interface ProcessedRow {
  id: number
  descripcion: string
  imagenes: string[]
  found: boolean
}

export function ImageImporter({ onUpdateProducto, productos }: ImageImporterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentBatch, setCurrentBatch] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [results, setResults] = useState<{
    total: number
    success: number
    errors: number
    details: ProcessedRow[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Configuración de lotes
  const BATCH_SIZE = 10 // Procesar 10 productos por lote
  const BATCH_DELAY = 100 // Pausa de 100ms entre lotes

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
      if (fileExtension === 'xlsx' || fileExtension === 'csv') {
        setFile(selectedFile)
        setError(null)
        setResults(null)
      } else {
        setError('Por favor selecciona un archivo XLSX o CSV válido')
        setFile(null)
      }
    }
  }

  const processFile = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setCurrentBatch(0)
    setError(null)
    setResults(null)

    try {
      const data = await readFile(file)
      const processedRows = await processRows(data)
      
      // Calcular número total de lotes
      const totalBatches = Math.ceil(processedRows.length / BATCH_SIZE)
      setTotalBatches(totalBatches)
      
      // Actualizar productos en lotes
      let success = 0
      let errors = 0
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        setCurrentBatch(batchIndex + 1)
        
        // Calcular el rango del lote actual
        const startIndex = batchIndex * BATCH_SIZE
        const endIndex = Math.min(startIndex + BATCH_SIZE, processedRows.length)
        const currentBatch = processedRows.slice(startIndex, endIndex)
        
        // Procesar el lote actual
        for (let i = 0; i < currentBatch.length; i++) {
          const row = currentBatch[i]
          const globalIndex = startIndex + i
          setProgress(((globalIndex + 1) / processedRows.length) * 100)
          
          if (row.found) {
            try {
              const imagenes = row.imagenes.filter(img => img && img.trim() !== '')
              const updateData: any = {}
              
              // Mapear las imágenes a los campos correspondientes
              if (imagenes[0]) updateData.imagen = imagenes[0]
              if (imagenes[1]) updateData.imagen_2 = imagenes[1]
              if (imagenes[2]) updateData.imagen_3 = imagenes[2]
              if (imagenes[3]) updateData.imagen_4 = imagenes[3]
              if (imagenes[4]) updateData.imagen_5 = imagenes[4]
              
              await onUpdateProducto(row.id, updateData)
              success++
              row.found = true
            } catch (err) {
              errors++
              row.found = false
            }
          } else {
            errors++
          }
        }
        
        // Pausa entre lotes para evitar que la página se congele
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }

      setResults({
        total: processedRows.length,
        success,
        errors,
        details: processedRows
      })
    } catch (err) {
      setError('Error al procesar el archivo: ' + (err as Error).message)
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setCurrentBatch(0)
      setTotalBatches(0)
    }
  }

  const readFile = (file: File): Promise<ImportRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[]
          
          resolve(jsonData)
        } catch (err) {
          reject(err)
        }
      }
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.readAsBinaryString(file)
    })
  }

  const processRows = async (data: ImportRow[]): Promise<ProcessedRow[]> => {
    return data.map(row => {
      const id = parseInt(row.ID)
      const producto = productos.find(p => p.id === id)
      
      return {
        id,
        descripcion: row.Descripción,
        imagenes: [
          row.imagen || '',
          row.imagen_2 || '',
          row.imagen_3 || '',
          row.imagen_4 || '',
          row.imagen_5 || ''
        ],
        found: !!producto
      }
    })
  }

  const resetForm = () => {
    setFile(null)
    setError(null)
    setResults(null)
    setProgress(0)
    setCurrentBatch(0)
    setTotalBatches(0)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar Imágenes
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="image-importer-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importador de Imágenes
          </DialogTitle>
          <div id="image-importer-description" className="sr-only">
            Importa URLs de imágenes desde archivos XLSX o CSV para actualizar productos existentes
          </div>
          <div className="text-sm text-gray-600">
            Los productos se procesan en lotes de {BATCH_SIZE} para evitar que la página se congele
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Información sobre los campos requeridos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Campos requeridos para la importación:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div><strong>ID</strong> - ID del producto (obligatorio)</div>
              <div><strong>Descripción</strong> - Descripción del producto (obligatorio)</div>
              <div><strong>imagen</strong> - URL de la imagen principal (opcional)</div>
              <div><strong>imagen_2</strong> - URL de la segunda imagen (opcional)</div>
              <div><strong>imagen_3</strong> - URL de la tercera imagen (opcional)</div>
              <div><strong>imagen_4</strong> - URL de la cuarta imagen (opcional)</div>
              <div><strong>imagen_5</strong> - URL de la quinta imagen (opcional)</div>
            </div>
            <div className="mt-3 text-xs text-blue-600">
              <strong>Nota:</strong> El archivo debe ser XLSX o CSV. Los productos se identifican por su ID y deben existir en el sistema.
            </div>
          </div>

          {!results && (
            <>
              <div className="space-y-2">
                <Label htmlFor="file-input">Seleccionar archivo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                  {file && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {file && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {file.name.endsWith('.xlsx') ? (
                      <FileSpreadsheet className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {file.name}
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={processFile}
                disabled={!file || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Procesando...' : 'Importar Imágenes'}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Procesando archivo...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="text-xs text-gray-600 text-center">
                    Lote {currentBatch} de {totalBatches} ({BATCH_SIZE} productos por lote)
                  </div>
                </div>
              )}
            </>
          )}

          {results && (
            <div className="space-y-4">
              <Alert variant={results.errors === 0 ? "default" : "destructive"}>
                {results.errors === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  Procesamiento completado: {results.success} exitosos, {results.errors} errores de {results.total} registros
                </AlertDescription>
              </Alert>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {results.details.map((row, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border text-sm ${
                      row.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong>ID {row.id}</strong> - {row.descripcion}
                      </div>
                      {row.found ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    {!row.found && (
                      <div className="text-red-600 text-xs mt-1">
                        Producto no encontrado
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={resetForm} className="w-full">
                Importar otro archivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
