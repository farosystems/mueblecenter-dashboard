"use client"

import React, { useState } from "react"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Producto } from "@/lib/supabase"
import * as XLSX from 'xlsx'

interface DescripcionMigratorProps {
  productos: Producto[]
  onUpdateProducto: (id: number, producto: Partial<Producto>) => Promise<Producto | undefined>
}

interface MigrationRow {
  id?: number
  descripcion?: string
  descripcion_detallada?: string
}

interface MigrationResult {
  success: number
  errors: number
  details: string[]
}

export function DescripcionMigrator({ productos, onUpdateProducto }: DescripcionMigratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [previewData, setPreviewData] = useState<MigrationRow[]>([])
  const [allData, setAllData] = useState<MigrationRow[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const parseCSV = (content: string): MigrationRow[] => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows: MigrationRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: MigrationRow = {}

      headers.forEach((header, index) => {
        const value = values[index]
        if (value && value.length > 0) {
          const lowerHeader = header.toLowerCase()
          if (lowerHeader === 'id' || lowerHeader === 'producto_id') {
            row.id = parseInt(value)
          } else if (lowerHeader === 'descripcion' || lowerHeader === 'descripción') {
            row.descripcion = value
          } else if (lowerHeader === 'descripcion_detallada' || lowerHeader === 'descripción_detallada' || 
                    lowerHeader === 'descripcion detallada' || lowerHeader === 'descripción detallada') {
            row.descripcion_detallada = value
          }
        }
      })

      if (row.id || row.descripcion) {
        rows.push(row)
      }
    }

    return rows
  }

  const parseXLSX = (file: File): Promise<MigrationRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          if (jsonData.length < 2) {
            resolve([])
            return
          }

          const headers = jsonData[0].map((h: any) => String(h).trim().toLowerCase())
          const rows: MigrationRow[] = []

          for (let i = 1; i < jsonData.length; i++) {
            const values = jsonData[i]
            const row: MigrationRow = {}

            headers.forEach((header, index) => {
              const value = values[index]
              if (value !== undefined && value !== null && String(value).trim().length > 0) {
                const cleanValue = String(value).trim()
                if (header === 'id' || header === 'producto_id') {
                  row.id = parseInt(cleanValue)
                } else if (header === 'descripcion' || header === 'descripción') {
                  row.descripcion = cleanValue
                } else if (header === 'descripcion_detallada' || header === 'descripción_detallada' || 
                          header === 'descripcion detallada' || header === 'descripción detallada') {
                  row.descripcion_detallada = cleanValue
                }
              }
            })

            if (row.id || row.descripcion) {
              rows.push(row)
            }
          }

          resolve(rows)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsProcessing(true)
      setResult(null)
      setPreviewData([])
      setAllData([])
      setShowPreview(false)

      let parsedData: MigrationRow[] = []

      if (file.name.endsWith('.csv')) {
        const content = await file.text()
        parsedData = parseCSV(content)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsedData = await parseXLSX(file)
      } else {
        throw new Error('Formato de archivo no soportado. Use CSV o XLSX.')
      }

      if (parsedData.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo.')
      }

      setAllData(parsedData) // Guardar todos los datos
      setPreviewData(parsedData.slice(0, 10)) // Mostrar solo las primeras 10 filas para preview
      setShowPreview(true)
    } catch (error) {
      setResult({
        success: 0,
        errors: 1,
        details: [`Error al procesar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      })
    } finally {
      setIsProcessing(false)
      event.target.value = ''
    }
  }

  const executeMigration = async (data: MigrationRow[]) => {
    setIsProcessing(true)
    setProgress(0)
    const results: MigrationResult = {
      success: 0,
      errors: 0,
      details: []
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      setProgress(((i + 1) / data.length) * 100)

      try {
        let producto: Producto | undefined

        // Buscar producto por ID o por descripción
        if (row.id) {
          producto = productos.find(p => p.id === row.id)
        } else if (row.descripcion) {
          producto = productos.find(p => p.descripcion?.toLowerCase().trim() === row.descripcion?.toLowerCase().trim())
        }

        if (!producto) {
          results.errors++
          results.details.push(`Fila ${i + 2}: Producto no encontrado (ID: ${row.id || 'N/A'}, Descripción: "${row.descripcion || 'N/A'}")`)
          continue
        }

        if (!row.descripcion_detallada) {
          results.errors++
          results.details.push(`Fila ${i + 2}: No se proporcionó descripción detallada para producto ID ${producto.id}`)
          continue
        }

        // Actualizar la descripción detallada
        const updated = await onUpdateProducto(producto.id, {
          descripcion_detallada: row.descripcion_detallada
        })

        if (updated) {
          results.success++
          results.details.push(`✅ Producto ID ${producto.id}: Descripción detallada actualizada`)
        } else {
          results.errors++
          results.details.push(`❌ Error al actualizar producto ID ${producto.id}`)
        }

      } catch (error) {
        results.errors++
        results.details.push(`❌ Error en fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }

      // Pequeña pausa para evitar saturar la base de datos
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    setResult(results)
    setProgress(100)
    setIsProcessing(false)
    setShowPreview(false)
  }

  const handleConfirmMigration = () => {
    if (allData.length > 0) {
      executeMigration(allData)
    }
  }

  const resetState = () => {
    setResult(null)
    setPreviewData([])
    setAllData([])
    setShowPreview(false)
    setProgress(0)
    setIsProcessing(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        resetState()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Migrar Descripciones
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Migrar Descripciones Detalladas desde Archivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instrucciones */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sube un archivo CSV o XLSX con las siguientes columnas:
              <br />
              <strong>• id</strong> (opcional): ID del producto
              <br />
              <strong>• descripcion</strong> (opcional): Descripción del producto para buscar por nombre
              <br />
              <strong>• descripcion_detallada</strong>: Nueva descripción detallada
              <br /><br />
              <em>Nota: Debe incluir al menos 'id' o 'descripcion' para identificar el producto.</em>
            </AlertDescription>
          </Alert>

          {/* Upload */}
          {!showPreview && !result && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Seleccionar archivo CSV o XLSX
                    </span>
                  </label>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  CSV, XLSX hasta 10MB
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Vista Previa (mostrando {previewData.length} de {allData.length} filas totales)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción Detallada</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, index) => {
                        const producto = row.id 
                          ? productos.find(p => p.id === row.id)
                          : productos.find(p => p.descripcion?.toLowerCase().trim() === row.descripcion?.toLowerCase().trim())
                        
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.id || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.descripcion || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {row.descripcion_detallada || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {producto ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Encontrado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  No encontrado
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleConfirmMigration} disabled={isProcessing}>
                    Confirmar Migración ({allData.length} filas)
                  </Button>
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Seleccionar otro archivo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {isProcessing && progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Procesando...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados de la Migración</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{result.success}</div>
                      <div className="text-sm text-gray-600">Exitosos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                      <div className="text-sm text-gray-600">Errores</div>
                    </div>
                  </div>
                  
                  {result.details.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Detalles:</h4>
                      <div className="max-h-64 overflow-y-auto bg-gray-50 p-3 rounded text-sm">
                        {result.details.map((detail, index) => (
                          <div key={index} className="mb-1">
                            {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}