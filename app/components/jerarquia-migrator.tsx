"use client"

import React, { useState } from "react"
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import * as XLSX from 'xlsx'

interface JerarquiaMigratorProps {
  productos: any[]
  presentaciones: any[]
  lineas: any[]
  tipos: any[]
  onUpdateProducto: (id: number, updates: any) => Promise<any>
}

interface MigrationRow {
  // Datos originales del archivo
  producto_id?: number
  producto_descripcion?: string
  presentacion_id?: string
  presentacion_nombre?: string
  linea_id?: string
  linea_nombre?: string
  tipo_id?: string
  tipo_nombre?: string
  
  // Datos resueltos
  resolved_producto_id?: number
  resolved_presentacion_id?: string
  resolved_linea_id?: string
  resolved_tipo_id?: string
  
  row: number
  status: 'pending' | 'success' | 'error'
  error?: string
}

export function JerarquiaMigrator({ 
  productos, 
  presentaciones, 
  lineas, 
  tipos, 
  onUpdateProducto 
}: JerarquiaMigratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<MigrationRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{
    total: number
    success: number
    errors: number
    completed: boolean
  }>({
    total: 0,
    success: 0,
    errors: 0,
    completed: false
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResults({ total: 0, success: 0, errors: 0, completed: false })
    
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // Validar que tenga al menos headers
        if (jsonData.length < 2) {
          throw new Error('El archivo debe tener al menos una fila de datos además de los headers')
        }

        const headers = jsonData[0] as string[]
        const dataRows = jsonData.slice(1) as any[][]

        // Headers para identificar productos (al menos uno requerido)
        const productIdentifiers = ['producto_id', 'producto_descripcion']
        // Headers opcionales para jerarquía (pueden usar IDs o nombres)
        const hierarchyHeaders = [
          'presentacion_id', 'presentacion_nombre',
          'linea_id', 'linea_nombre', 
          'tipo_id', 'tipo_nombre'
        ]
        
        const headerMap = new Map<string, number>()
        headers.forEach((header, index) => {
          if (typeof header === 'string') {
            headerMap.set(header.toLowerCase().trim(), index)
          }
        })

        // Validar que al menos un identificador de producto esté presente
        const hasProductIdentifier = productIdentifiers.some(h => headerMap.has(h))
        if (!hasProductIdentifier) {
          throw new Error(`Debe incluir al menos una columna para identificar productos: ${productIdentifiers.join(' o ')}`)
        }

        // Procesar datos
        const processedData: MigrationRow[] = dataRows
          .map((row, index) => {
            const producto_id = row[headerMap.get('producto_id')!]
            const producto_descripcion = row[headerMap.get('producto_descripcion')!]
            
            // Validar que tenga al menos un identificador de producto
            if ((!producto_id || isNaN(Number(producto_id))) && (!producto_descripcion || String(producto_descripcion).trim() === '')) {
              return null // Saltar filas sin identificador válido
            }

            const migrationRow: MigrationRow = {
              // Datos originales
              producto_id: producto_id && !isNaN(Number(producto_id)) ? Number(producto_id) : undefined,
              producto_descripcion: producto_descripcion ? String(producto_descripcion).trim() : undefined,
              presentacion_id: row[headerMap.get('presentacion_id')!] ? String(row[headerMap.get('presentacion_id')!]).trim() : undefined,
              presentacion_nombre: row[headerMap.get('presentacion_nombre')!] ? String(row[headerMap.get('presentacion_nombre')!]).trim() : undefined,
              linea_id: row[headerMap.get('linea_id')!] ? String(row[headerMap.get('linea_id')!]).trim() : undefined,
              linea_nombre: row[headerMap.get('linea_nombre')!] ? String(row[headerMap.get('linea_nombre')!]).trim() : undefined,
              tipo_id: row[headerMap.get('tipo_id')!] ? String(row[headerMap.get('tipo_id')!]).trim() : undefined,
              tipo_nombre: row[headerMap.get('tipo_nombre')!] ? String(row[headerMap.get('tipo_nombre')!]).trim() : undefined,
              
              row: index + 2, // +2 porque empezamos desde 1 y saltamos headers
              status: 'pending' as const,
            }

            // Resolver IDs desde nombres si están disponibles
            if (migrationRow.presentacion_nombre && !migrationRow.presentacion_id) {
              const presentacion = findPresentacionByNombre(migrationRow.presentacion_nombre)
              migrationRow.resolved_presentacion_id = presentacion?.id
            } else if (migrationRow.presentacion_id) {
              migrationRow.resolved_presentacion_id = migrationRow.presentacion_id
            }

            if (migrationRow.linea_nombre && !migrationRow.linea_id) {
              const linea = findLineaByNombre(migrationRow.linea_nombre)
              migrationRow.resolved_linea_id = linea?.id
            } else if (migrationRow.linea_id) {
              migrationRow.resolved_linea_id = migrationRow.linea_id
            }

            if (migrationRow.tipo_nombre && !migrationRow.tipo_id) {
              const tipo = findTipoByNombre(migrationRow.tipo_nombre)
              migrationRow.resolved_tipo_id = tipo?.id
            } else if (migrationRow.tipo_id) {
              migrationRow.resolved_tipo_id = migrationRow.tipo_id
            }

            return migrationRow
          })
          .filter(Boolean) as MigrationRow[]

        setData(processedData)
        setResults(prev => ({ ...prev, total: processedData.length }))
        
      } catch (error) {
        console.error('Error procesando archivo:', error)
        alert(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }
    
    reader.readAsArrayBuffer(selectedFile)
  }

  // Función para buscar producto por descripción
  const findProductoByDescripcion = (descripcion: string) => {
    return productos.find(p => 
      p.descripcion && p.descripcion.toLowerCase().trim() === descripcion.toLowerCase().trim()
    )
  }

  // Funciones para buscar jerarquía por nombre
  const findPresentacionByNombre = (nombre: string) => {
    return presentaciones.find(p => 
      p.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    )
  }

  const findLineaByNombre = (nombre: string) => {
    return lineas.find(l => 
      l.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    )
  }

  const findTipoByNombre = (nombre: string) => {
    return tipos.find(t => 
      t.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    )
  }

  const processMigration = async () => {
    if (data.length === 0) return
    
    setIsProcessing(true)
    setProgress(0)
    
    let successCount = 0
    let errorCount = 0
    
    const updatedData = [...data]
    
    for (let i = 0; i < updatedData.length; i++) {
      const item = updatedData[i]
      
      try {
        // Resolver producto_id si no está presente pero sí descripción
        let productoId = item.resolved_producto_id || item.producto_id
        
        if (!productoId && item.producto_descripcion) {
          const producto = findProductoByDescripcion(item.producto_descripcion)
          if (producto) {
            productoId = producto.id
            item.resolved_producto_id = producto.id
          } else {
            throw new Error(`No se encontró producto con descripción: "${item.producto_descripcion}"`)
          }
        }

        if (!productoId) {
          throw new Error('No se pudo identificar el producto')
        }

        // Preparar updates solo con campos no vacíos
        const updates: any = {}
        
        if (item.resolved_presentacion_id) {
          updates.presentacion_id = item.resolved_presentacion_id
        }
        
        if (item.resolved_linea_id) {
          updates.linea_id = item.resolved_linea_id
        }
        
        if (item.resolved_tipo_id) {
          updates.tipo_id = item.resolved_tipo_id
        }

        // Solo hacer update si hay algo que actualizar
        if (Object.keys(updates).length > 0) {
          await onUpdateProducto(productoId, updates)
        }
        
        item.status = 'success'
        successCount++
        
      } catch (error) {
        item.status = 'error'
        item.error = error instanceof Error ? error.message : 'Error desconocido'
        errorCount++
      }
      
      // Actualizar progreso
      setProgress(((i + 1) / updatedData.length) * 100)
      setData([...updatedData])
    }
    
    setResults({
      total: updatedData.length,
      success: successCount,
      errors: errorCount,
      completed: true
    })
    
    setIsProcessing(false)
  }

  const downloadTemplate = () => {
    const template = [
      // Headers - se puede usar cualquier combinación
      ['producto_id', 'producto_descripcion', 'presentacion_id', 'presentacion_nombre', 'linea_id', 'linea_nombre', 'tipo_id', 'tipo_nombre'],
      // Ejemplo 1: Usando solo IDs
      ['1', '', 'uuid-presentacion-1', '', 'uuid-linea-1', '', 'uuid-tipo-1', ''],
      // Ejemplo 2: Usando solo nombres
      ['', 'Descripción Producto 2', '', 'Muebles', '', 'Living', '', 'Sillones'],
      // Ejemplo 3: Mezclando IDs y nombres
      ['3', '', 'uuid-presentacion-3', '', '', 'Comedor', '', 'Mesas'],
      // Ejemplo 4: Usando descripción del producto
      ['', 'Descripción Producto 4', '', 'Decoración', '', 'Iluminación', '', 'Lámparas'],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Jerarquia_Template')
    XLSX.writeFile(wb, 'plantilla_jerarquia_productos.xlsx')
  }

  const resetMigrator = () => {
    setFile(null)
    setData([])
    setProgress(0)
    setResults({ total: 0, success: 0, errors: 0, completed: false })
    // Limpiar input file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Migrar Jerarquía
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Migrador de Jerarquía de Productos</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información y plantilla */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Este migrador te permite actualizar la jerarquía (presentación, línea, tipo) de productos existentes usando un archivo Excel o CSV.</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Columnas disponibles:</Label>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium mb-1">Para identificar productos (al menos una):</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="destructive">producto_id</Badge>
                      <Badge variant="destructive">producto_descripcion</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Para jerarquía (opcionales, usar ID o nombre):</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">presentacion_id</Badge>
                      <Badge variant="outline">presentacion_nombre</Badge>
                      <Badge variant="secondary">linea_id</Badge>
                      <Badge variant="outline">linea_nombre</Badge>
                      <Badge variant="secondary">tipo_id</Badge>
                      <Badge variant="outline">tipo_nombre</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Puedes usar IDs (más rápido) o nombres (más legible). Si usas ambos para el mismo campo, se prioriza el ID.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar Plantilla
              </Button>
            </CardContent>
          </Card>

          {/* Upload de archivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subir Archivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
                
                {file && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Archivo cargado: <strong>{file.name}</strong> ({data.length} filas)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vista previa de datos */}
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Vista Previa de Datos</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={processMigration}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      {isProcessing ? 'Procesando...' : 'Procesar Migración'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetMigrator}
                      disabled={isProcessing}
                    >
                      Reiniciar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progreso */}
                {isProcessing && (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {/* Resultados */}
                {results.completed && (
                  <Alert className="mb-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Migración completada:</strong> {results.success} exitosos, {results.errors} errores de {results.total} total
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tabla de vista previa */}
                <div className="max-h-80 overflow-y-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 border-b">Fila</th>
                        <th className="text-left p-2 border-b">Producto</th>
                        <th className="text-left p-2 border-b">Presentación</th>
                        <th className="text-left p-2 border-b">Línea</th>
                        <th className="text-left p-2 border-b">Tipo</th>
                        <th className="text-left p-2 border-b">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 100).map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.row}</td>
                          <td className="p-2 font-mono text-xs">
                            {item.producto_id ? `ID: ${item.producto_id}` : ''}
                            {item.producto_descripcion ? `Desc: ${item.producto_descripcion}` : ''}
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {item.resolved_presentacion_id ? `✓ ${item.presentacion_nombre || item.presentacion_id}` : 
                             item.presentacion_nombre ? `❌ ${item.presentacion_nombre}` : 
                             item.presentacion_id || '-'}
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {item.resolved_linea_id ? `✓ ${item.linea_nombre || item.linea_id}` : 
                             item.linea_nombre ? `❌ ${item.linea_nombre}` : 
                             item.linea_id || '-'}
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {item.resolved_tipo_id ? `✓ ${item.tipo_nombre || item.tipo_id}` : 
                             item.tipo_nombre ? `❌ ${item.tipo_nombre}` : 
                             item.tipo_id || '-'}
                          </td>
                          <td className="p-2">
                            {item.status === 'pending' && <Badge variant="secondary">Pendiente</Badge>}
                            {item.status === 'success' && <Badge variant="default">Exitoso</Badge>}
                            {item.status === 'error' && (
                              <div className="space-y-1">
                                <Badge variant="destructive">Error</Badge>
                                {item.error && (
                                  <div className="text-xs text-red-600">{item.error}</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 100 && (
                    <div className="p-2 text-center text-sm text-muted-foreground border-t">
                      Mostrando primeros 100 de {data.length} registros
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