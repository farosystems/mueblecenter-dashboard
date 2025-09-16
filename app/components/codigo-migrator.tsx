"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Upload } from "lucide-react"
import * as XLSX from 'xlsx'

interface CodigoMigratorProps {
  onProgress?: (message: string) => void
  onComplete?: () => void
}

interface ExcelRow {
  codigo?: string
  descripcion?: string
  nombre?: string
}

export const CodigoMigrator: React.FC<CodigoMigratorProps> = ({
  onProgress,
  onComplete
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{
    processed: number
    updated: number
    notFound: number
    errors: number
  } | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile)
      setResults(null)
    } else {
      alert("Por favor selecciona un archivo XLSX o CSV válido")
    }
  }

  const processFile = async () => {
    if (!file) {
      alert("Por favor selecciona un archivo primero")
      return
    }

    setIsProcessing(true)
    onProgress?.("Leyendo archivo...")

    try {
      let jsonData: ExcelRow[] = []

      if (file.name.endsWith('.xlsx')) {
        // Procesar archivo Excel
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        jsonData = XLSX.utils.sheet_to_json(worksheet)
      } else if (file.name.endsWith('.csv')) {
        // Procesar archivo CSV
        const text = await file.text()
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          if (values.length >= headers.length && values.some(v => v)) {
            const row: ExcelRow = {}
            headers.forEach((header, index) => {
              if (header === 'codigo') row.codigo = values[index]
              if (header === 'descripcion') row.descripcion = values[index]
              if (header === 'nombre') row.nombre = values[index]
            })
            jsonData.push(row)
          }
        }
      }

      if (jsonData.length === 0) {
        throw new Error("El archivo no contiene datos válidos")
      }

      onProgress?.("Procesando productos...")

      let processed = 0
      let updated = 0
      let notFound = 0
      let errors = 0

      // Obtener todos los productos existentes
      const { data: productos, error: productosError } = await supabase
        .from('productos')
        .select('id, descripcion')

      if (productosError) {
        console.error("Error fetching productos:", productosError)
        throw new Error(`Error al obtener productos: ${productosError.message}`)
      }

      if (!productos || productos.length === 0) {
        throw new Error("No se encontraron productos en la base de datos")
      }

      // Procesar cada fila del archivo
      for (const row of jsonData) {
        processed++

        try {
          if (!row.codigo || (!row.descripcion && !row.nombre)) {
            errors++
            continue
          }

          // Buscar producto por descripción
          const searchText = (row.descripcion || row.nombre || '').toLowerCase().trim()
          const producto = productos.find(p => {
            const desc = p.descripcion?.toLowerCase() || ''
            return desc.includes(searchText) || searchText.includes(desc)
          })

          if (producto) {
            // Actualizar el código del producto
            const { error } = await supabase
              .from('productos')
              .update({ codigo: row.codigo })
              .eq('id', producto.id)

            if (error) {
              console.error("Error updating product:", error)
              errors++
            } else {
              updated++
            }
          } else {
            notFound++
          }
        } catch (error) {
          console.error("Error processing row:", error)
          errors++
        }

        onProgress?.(`Procesado: ${processed}/${jsonData.length} - Actualizados: ${updated}`)
      }

      setResults({
        processed,
        updated,
        notFound,
        errors
      })

      onProgress?.("¡Migración completada!")
      onComplete?.()

    } catch (error) {
      console.error("Error processing file:", error)
      alert(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="excel-file">Archivo Excel (.xlsx) o CSV</Label>
        <Input
          id="excel-file"
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        <p className="text-sm text-gray-500 mt-1">
          El archivo debe contener columnas: "codigo", "descripcion" (o "nombre")
        </p>
      </div>

      <Button
        onClick={processFile}
        disabled={!file || isProcessing}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {isProcessing ? "Procesando..." : "Migrar Códigos"}
      </Button>

      {results && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Resultados de la migración:</h3>
          <ul className="text-sm space-y-1">
            <li>Filas procesadas: {results.processed}</li>
            <li className="text-green-600">Productos actualizados: {results.updated}</li>
            <li className="text-yellow-600">No encontrados: {results.notFound}</li>
            <li className="text-red-600">Errores: {results.errors}</li>
          </ul>
        </div>
      )}
    </div>
  )
}