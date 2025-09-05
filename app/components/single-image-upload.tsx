"use client"

import React, { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SingleImageUploadProps {
  image: string | null
  onImageChange: (image: string | null) => void
  disabled?: boolean
  label?: string
  folder?: string
}

export const SingleImageUpload = React.memo(({ 
  image, 
  onImageChange, 
  disabled = false, 
  label = "Imagen",
  folder = "presentaciones"
}: SingleImageUploadProps) => {
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
      const filePath = `${folder}/${fileName}`

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

    const file = files[0] // Solo tomar el primer archivo
    setIsUploading(true)

    try {
      const uploadedUrl = await uploadImage(file)
      if (uploadedUrl) {
        onImageChange(uploadedUrl)
      }
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
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      
      const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
      
      if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
        const filePath = pathParts.slice(imagenesIndex + 1).join('/')
        return filePath
      }
      
      const fileName = pathParts[pathParts.length - 1]
      return `${folder}/${fileName}`
    } catch (error) {
      console.error('Error extrayendo path de URL:', error)
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      return `${folder}/${fileName}`
    }
  }

  const removeImage = async () => {
    if (!image) return

    try {
      const isSupabaseImage = image.includes('supabase.co')
      
      if (isSupabaseImage) {
        const filePath = extractFilePathFromUrl(image)
        console.log('Eliminando imagen de Supabase:', filePath)
        
        const { error } = await supabase.storage
          .from('imagenes')
          .remove([filePath])
        
        if (error) {
          console.error('Error eliminando imagen del storage:', error)
        } else {
          console.log('Imagen eliminada exitosamente del storage:', filePath)
        }
      }
      
      onImageChange(null)
    } catch (error) {
      console.error('Error al eliminar imagen:', error)
      onImageChange(null)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Vista previa de imagen existente */}
      {image && (
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={image}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.jpg'
              }}
            />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
              title="Eliminar imagen"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Área de drag and drop */}
      {!image && (
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
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            id={`single-image-upload-${folder}`}
            disabled={disabled || isUploading}
          />
          <label htmlFor={`single-image-upload-${folder}`} className="cursor-pointer">
            <div className="flex flex-col items-center space-y-2">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isUploading ? 'Subiendo...' : `Arrastra ${label.toLowerCase()} aquí o haz clic`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF hasta 5MB
                </p>
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Mensaje cuando no hay imagen */}
      {!image && !isUploading && (
        <div className="text-center py-4 text-gray-500">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay {label.toLowerCase()}</p>
        </div>
      )}
    </div>
  )
})