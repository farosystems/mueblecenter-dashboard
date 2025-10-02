"use client"

import React, { useState, useRef } from "react"
import { Upload, FileImage, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { Producto } from "@/lib/supabase"

interface ImageMigratorByCodeProps {
  productos: Producto[]
  onUpdateProducto: (id: number, producto: Partial<Producto>) => Promise<Producto | undefined>
  onComplete: () => void
}

interface ImageFile {
  file: File
  codigo: string
  imageNumber: number
  status: 'pending' | 'processing' | 'success' | 'error'
  message?: string
  producto?: Producto
}

export const ImageMigratorByCode: React.FC<ImageMigratorByCodeProps> = ({
  productos,
  onUpdateProducto,
  onComplete
}) => {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Función para parsear el nombre del archivo y extraer código y número de imagen
  const parseFileName = (fileName: string): { codigo: string; imageNumber: number } | null => {
    try {
      // Remover la extensión del archivo
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))

      // Buscar el patrón: código_número
      const parts = nameWithoutExt.split('_')
      if (parts.length !== 2) {
        return null
      }

      const codigo = parts[0].trim()
      const imageNumber = parseInt(parts[1])

      // Validar que el número de imagen esté entre 1 y 5
      if (isNaN(imageNumber) || imageNumber < 1 || imageNumber > 5) {
        return null
      }

      return { codigo, imageNumber }
    } catch (error) {
      return null
    }
  }

  // Función para verificar si un producto no tiene imágenes
  const hasNoImages = (producto: Producto): boolean => {
    const hasImage1 = producto.imagen && producto.imagen.trim() !== ''
    const hasImage2 = producto.imagen_2 && producto.imagen_2.trim() !== ''
    const hasImage3 = producto.imagen_3 && producto.imagen_3.trim() !== ''
    const hasImage4 = producto.imagen_4 && producto.imagen_4.trim() !== ''
    const hasImage5 = producto.imagen_5 && producto.imagen_5.trim() !== ''

    return !hasImage1 && !hasImage2 && !hasImage3 && !hasImage4 && !hasImage5
  }

  // Manejar selección de archivos
  const handleFileSelection = (files: FileList) => {
    const newImageFiles: ImageFile[] = []
    const imagesByProduct = new Map<string, number[]>()

    Array.from(files).forEach(file => {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        newImageFiles.push({
          file,
          codigo: '',
          imageNumber: 0,
          status: 'error',
          message: 'No es un archivo de imagen válido'
        })
        return
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        newImageFiles.push({
          file,
          codigo: '',
          imageNumber: 0,
          status: 'error',
          message: 'Archivo demasiado grande (máximo 5MB)'
        })
        return
      }

      // Parsear nombre del archivo
      const parsed = parseFileName(file.name)
      if (!parsed) {
        newImageFiles.push({
          file,
          codigo: '',
          imageNumber: 0,
          status: 'error',
          message: 'Nombre de archivo inválido. Formato esperado: CODIGO_NUMERO.ext'
        })
        return
      }

      // Buscar el producto por código
      const producto = productos.find(p => p.codigo === parsed.codigo)
      if (!producto) {
        newImageFiles.push({
          file,
          codigo: parsed.codigo,
          imageNumber: parsed.imageNumber,
          status: 'error',
          message: `No se encontró producto con código: ${parsed.codigo}`
        })
        return
      }

      // Verificar que el producto no tenga imágenes
      console.log(`🔍 Verificando imágenes del producto ${parsed.codigo}:`, {
        imagen: producto.imagen,
        imagen_2: producto.imagen_2,
        imagen_3: producto.imagen_3,
        imagen_4: producto.imagen_4,
        imagen_5: producto.imagen_5
      })

      if (!hasNoImages(producto)) {
        console.log(`❌ Producto ${parsed.codigo} tiene imágenes, rechazando`)
        newImageFiles.push({
          file,
          codigo: parsed.codigo,
          imageNumber: parsed.imageNumber,
          status: 'error',
          message: 'El producto ya tiene imágenes cargadas',
          producto
        })
        return
      }

      console.log(`✅ Producto ${parsed.codigo} no tiene imágenes, aceptando`)

      // Verificar que no se excedan las 5 imágenes por producto
      if (!imagesByProduct.has(parsed.codigo)) {
        imagesByProduct.set(parsed.codigo, [])
      }

      const existingPositions = imagesByProduct.get(parsed.codigo)!
      if (existingPositions.includes(parsed.imageNumber)) {
        newImageFiles.push({
          file,
          codigo: parsed.codigo,
          imageNumber: parsed.imageNumber,
          status: 'error',
          message: `Ya existe una imagen para la posición ${parsed.imageNumber} de este producto`,
          producto
        })
        return
      }

      if (existingPositions.length >= 5) {
        newImageFiles.push({
          file,
          codigo: parsed.codigo,
          imageNumber: parsed.imageNumber,
          status: 'error',
          message: 'El producto ya tiene el máximo de 5 imágenes seleccionadas',
          producto
        })
        return
      }

      existingPositions.push(parsed.imageNumber)

      newImageFiles.push({
        file,
        codigo: parsed.codigo,
        imageNumber: parsed.imageNumber,
        status: 'pending',
        message: `Listo para migrar a posición ${parsed.imageNumber}`,
        producto
      })
    })

    setImageFiles(newImageFiles)
  }

  // Procesar migración
  const processMigration = async () => {
    setIsProcessing(true)
    setProgress(0)

    const validFiles = imageFiles.filter(f => f.status === 'pending' && f.producto)
    const totalFiles = validFiles.length

    if (totalFiles === 0) {
      setIsProcessing(false)
      return
    }

    // Agrupar archivos por producto
    const filesByProduct = new Map<number, ImageFile[]>()
    validFiles.forEach(imageFile => {
      if (imageFile.producto) {
        const productId = imageFile.producto.id
        if (!filesByProduct.has(productId)) {
          filesByProduct.set(productId, [])
        }
        filesByProduct.get(productId)!.push(imageFile)
      }
    })

    let processedFiles = 0

    // Procesar cada producto
    for (const [productId, productFiles] of filesByProduct) {
      const producto = productFiles[0].producto!

      try {
        // Subir todas las imágenes del producto
        const imageUpdates: Partial<Producto> = {}

        for (const imageFile of productFiles) {
          // Marcar como procesando
          setImageFiles(prev => prev.map(f =>
            f === imageFile ? { ...f, status: 'processing' as const } : f
          ))

          try {
            // Generar nombre único para el archivo
            const fileExt = imageFile.file.name.split('.').pop()
            const fileName = `${imageFile.codigo}_${imageFile.imageNumber}_${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `productos/${fileName}`

            // Subir a Supabase Storage
            const { data, error } = await supabase.storage
              .from('imagenes')
              .upload(filePath, imageFile.file, {
                cacheControl: '3600',
                upsert: false
              })

            if (error) throw error

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
              .from('imagenes')
              .getPublicUrl(filePath)

            // Asignar a la posición correcta
            const fieldName = imageFile.imageNumber === 1 ? 'imagen' : `imagen_${imageFile.imageNumber}`
            imageUpdates[fieldName as keyof Producto] = publicUrl

            // Marcar como exitoso
            setImageFiles(prev => prev.map(f =>
              f === imageFile ? {
                ...f,
                status: 'success' as const,
                message: `Subida exitosa a posición ${imageFile.imageNumber}`
              } : f
            ))

          } catch (error) {
            // Marcar como error
            setImageFiles(prev => prev.map(f =>
              f === imageFile ? {
                ...f,
                status: 'error' as const,
                message: `Error al subir: ${error instanceof Error ? error.message : 'Error desconocido'}`
              } : f
            ))
          }

          processedFiles++
          setProgress((processedFiles / totalFiles) * 100)
        }

        // Actualizar producto si hay imágenes para actualizar
        if (Object.keys(imageUpdates).length > 0) {
          await onUpdateProducto(productId, imageUpdates)
        }

      } catch (error) {
        console.error(`Error procesando producto ${producto.codigo}:`, error)

        // Marcar todos los archivos del producto como error
        productFiles.forEach(imageFile => {
          setImageFiles(prev => prev.map(f =>
            f === imageFile ? {
              ...f,
              status: 'error' as const,
              message: `Error en producto: ${error instanceof Error ? error.message : 'Error desconocido'}`
            } : f
          ))
        })
      }
    }

    setIsProcessing(false)
    setProgress(100)
  }

  // Limpiar lista
  const clearFiles = () => {
    setImageFiles([])
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validFiles = imageFiles.filter(f => f.status === 'pending').length
  const errorFiles = imageFiles.filter(f => f.status === 'error').length
  const successFiles = imageFiles.filter(f => f.status === 'success').length

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Migrador de Imágenes por Código
        </CardTitle>
        <p className="text-sm text-gray-600">
          Sube imágenes con formato: <code>CODIGO_NUMERO.ext</code> (ej: 21-17014_1.jpg)
          <br />
          Números válidos: 1-5 (máximo 5 imágenes por producto)
          <br />
          Solo se migrarán productos sin imágenes existentes.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Zona de carga */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          onDrop={(e) => {
            e.preventDefault()
            if (isProcessing) return
            const files = e.dataTransfer.files
            if (files.length > 0) {
              handleFileSelection(files)
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files)
              }
            }}
            className="hidden"
            disabled={isProcessing}
          />

          <div className="flex flex-col items-center space-y-4">
            <Upload className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formatos: JPG, PNG, GIF. Máximo 5MB por imagen.
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              variant="outline"
            >
              Seleccionar Imágenes
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        {imageFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{imageFiles.length}</div>
              <div className="text-sm text-blue-800">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{validFiles}</div>
              <div className="text-sm text-green-800">Válidos</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{errorFiles}</div>
              <div className="text-sm text-red-800">Errores</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{successFiles}</div>
              <div className="text-sm text-purple-800">Exitosos</div>
            </div>
          </div>
        )}

        {/* Barra de progreso */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Procesando imágenes...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Lista de archivos */}
        {imageFiles.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-medium text-gray-900">Archivos detectados:</h3>
            {imageFiles.map((imageFile, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  imageFile.status === 'success' ? 'bg-green-50 border-green-200' :
                  imageFile.status === 'error' ? 'bg-red-50 border-red-200' :
                  imageFile.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {imageFile.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {imageFile.status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  {imageFile.status === 'processing' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                  {imageFile.status === 'pending' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}

                  <div>
                    <div className="font-medium text-sm">{imageFile.file.name}</div>
                    <div className="text-xs text-gray-600">
                      {imageFile.codigo && `Código: ${imageFile.codigo}`}
                      {imageFile.imageNumber > 0 && ` | Posición: ${imageFile.imageNumber}`}
                      {imageFile.producto && ` | ${imageFile.producto.descripcion}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs ${
                    imageFile.status === 'success' ? 'text-green-700' :
                    imageFile.status === 'error' ? 'text-red-700' :
                    imageFile.status === 'processing' ? 'text-blue-700' :
                    'text-yellow-700'
                  }`}>
                    {imageFile.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-between">
          <Button
            onClick={clearFiles}
            variant="outline"
            disabled={isProcessing}
          >
            Limpiar Lista
          </Button>

          <div className="space-x-2">
            <Button
              onClick={onComplete}
              variant="outline"
              disabled={isProcessing}
            >
              Cerrar
            </Button>
            <Button
              onClick={processMigration}
              disabled={isProcessing || validFiles === 0}
              className="min-w-32"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                `Migrar ${validFiles} imágenes`
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}