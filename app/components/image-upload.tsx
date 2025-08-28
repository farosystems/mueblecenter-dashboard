"use client"

import React, { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  disabled?: boolean
  label?: string
}

export const ImageUpload = React.memo(({ images, onImagesChange, maxImages = 5, disabled = false, label }: ImageUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  


  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Solo se permiten archivos de imagen')
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('El archivo es demasiado grande. Máximo 5MB')
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `productos/${fileName}`

      // Subir archivo al bucket
      const { data, error } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remainingSlots = maxImages - images.length
    if (remainingSlots <= 0) {
      alert(`Ya tienes el máximo de ${maxImages} imágenes`)
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setIsUploading(true)

    try {
      const uploadPromises = filesToUpload.map(uploadImage)
      const uploadedUrls = await Promise.all(uploadPromises)
      const validUrls = uploadedUrls.filter(url => url !== null) as string[]
      
      onImagesChange([...images, ...validUrls])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al subir imagen'
      alert(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // Función helper para extraer el path del archivo de una URL de Supabase
  const extractFilePathFromUrl = (imageUrl: string): string => {
    try {
      // Las URLs de Supabase tienen formato: https://xxx.supabase.co/storage/v1/object/public/imagenes/productos/filename.jpg
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      
      // Buscar el índice de 'imagenes' en el path
      const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
      
      if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
        // Tomar todo después de 'imagenes' (incluyendo 'productos/filename.jpg')
        const filePath = pathParts.slice(imagenesIndex + 1).join('/')
        return filePath
      }
      
      // Fallback: extraer solo el nombre del archivo
      const fileName = pathParts[pathParts.length - 1]
      return `productos/${fileName}`
    } catch (error) {
      console.error('Error extrayendo path de URL:', error)
      // Fallback: extraer solo el nombre del archivo
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      return `productos/${fileName}`
    }
  }

  const removeImage = async (index: number) => {
    try {
      const imageUrl = images[index]
      
      if (!imageUrl) {
        console.error('No hay URL de imagen en el índice:', index)
        return
      }
      
      // Verificar si la imagen es de Supabase o externa
      const isSupabaseImage = imageUrl.includes('supabase.co')
      
      if (isSupabaseImage) {
        // Solo intentar eliminar si es una imagen de Supabase
        const filePath = extractFilePathFromUrl(imageUrl)
        console.log('Eliminando imagen de Supabase:', filePath)
        
        const { error } = await supabase.storage
          .from('imagenes')
          .remove([filePath])
        
        if (error) {
          console.error('Error eliminando imagen del storage:', error)
        } else {
          console.log('Imagen eliminada exitosamente del storage:', filePath)
        }
      } else {
        console.log('Imagen externa eliminada de la interfaz (no se puede eliminar del servidor externo):', imageUrl)
      }
      
      // Siempre eliminar de la lista local
      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    } catch (error) {
      console.error('Error al eliminar imagen:', error)
      // En caso de error, aún eliminamos de la interfaz
      const newImages = images.filter((_, i) => i !== index)
      onImagesChange(newImages)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset input value para permitir seleccionar el mismo archivo nuevamente
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Área de drag and drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          id="image-upload"
          disabled={disabled || isUploading}
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isUploading ? 'Subiendo...' : 'Arrastra imágenes aquí o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF hasta 5MB. Máximo {maxImages} imágenes
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Preview de imágenes */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            {label ? `${label} (${images.length}/${maxImages})` : `Imágenes (${images.length}/${maxImages})`}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.jpg'
                    }}
                  />
                </div>
                                 {!disabled && (
                   <button
                     type="button"
                     onClick={() => {
                       console.log('Botón de eliminar clickeado para índice:', index)
                       removeImage(index)
                     }}
                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-100 hover:bg-red-600 z-10"
                     title="Eliminar imagen"
                   >
                     <X className="h-3 w-3" />
                   </button>
                 )}
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay imágenes */}
      {images.length === 0 && !isUploading && (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{label ? `No hay ${label.toLowerCase()} subida` : 'No hay imágenes subidas'}</p>
        </div>
      )}
    </div>
  )
})
