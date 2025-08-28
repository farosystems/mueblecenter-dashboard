"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, Upload, Link, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Marca } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

interface MarcasSectionProps {
  marcas: Marca[]
  onCreateMarca: (marca: Omit<Marca, 'id' | 'created_at'>) => Promise<Marca | undefined>
  onUpdateMarca: (id: number, updates: Partial<Marca>) => Promise<Marca | undefined>
  onDeleteMarca: (id: number) => Promise<void>
}

export function MarcasSection({ marcas, onCreateMarca, onUpdateMarca, onDeleteMarca }: MarcasSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [marcaToDelete, setMarcaToDelete] = useState<Marca | null>(null)
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null)
  const [formData, setFormData] = useState({
    descripcion: "",
    logo: "",
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')

  const resetForm = () => {
    setFormData({
      descripcion: "",
      logo: "",
    })
    setEditingMarca(null)
    setUploadMethod('file')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const marcaData = {
      descripcion: formData.descripcion,
      logo: formData.logo || undefined,
    }

    try {
      if (editingMarca) {
        await onUpdateMarca(editingMarca.id, marcaData)
      } else {
        await onCreateMarca(marcaData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar marca:', error)
    }
  }

  const handleEdit = (marca: Marca) => {
    setEditingMarca(marca)
    setFormData({
      descripcion: marca.descripcion,
      logo: marca.logo || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (marca: Marca) => {
    setMarcaToDelete(marca)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!marcaToDelete) return
    try {
      // Eliminar logo del storage si existe
      if (marcaToDelete.logo && marcaToDelete.logo.includes('supabase.co')) {
        try {
          const url = new URL(marcaToDelete.logo)
          const pathParts = url.pathname.split('/')
          const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
          
          if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
            const filePath = pathParts.slice(imagenesIndex + 1).join('/')
            
            const { error } = await supabase.storage
              .from('imagenes')
              .remove([filePath])
            
            if (error) {
              console.error('Error eliminando logo del storage:', error)
            } else {
              console.log('Logo eliminado exitosamente del storage:', filePath)
            }
          }
        } catch (error) {
          console.error('Error al eliminar logo:', error)
        }
      }

      await onDeleteMarca(marcaToDelete.id)
      setIsDeleteDialogOpen(false)
      setMarcaToDelete(null)
    } catch (error) {
      console.error('Error al eliminar marca:', error)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setMarcaToDelete(null)
  }

  // Función para subir logo
  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Solo se permiten archivos de imagen')
      }

      // Validar tamaño (máximo 2MB para logos)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('El archivo es demasiado grande. Máximo 2MB')
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `logos/${fileName}`

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
      console.error('Error uploading logo:', error)
      throw error
    }
  }

  // Manejar subida de archivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const logoUrl = await uploadLogo(file)
      if (logoUrl) {
        setFormData({ ...formData, logo: logoUrl })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al subir logo'
      alert(errorMessage)
    } finally {
      setIsUploading(false)
      // Reset input value
      e.target.value = ''
    }
  }

  // Manejar URL externa
  const handleUrlSubmit = (url: string) => {
    if (url.trim()) {
      setFormData({ ...formData, logo: url.trim() })
    }
  }

  // Eliminar logo
  const handleRemoveLogo = async () => {
    if (formData.logo && formData.logo.includes('supabase.co')) {
      try {
        // Extraer path del archivo de la URL
        const url = new URL(formData.logo)
        const pathParts = url.pathname.split('/')
        const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
        
        if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
          const filePath = pathParts.slice(imagenesIndex + 1).join('/')
          
          const { error } = await supabase.storage
            .from('imagenes')
            .remove([filePath])
          
          if (error) {
            console.error('Error eliminando logo del storage:', error)
          }
        }
      } catch (error) {
        console.error('Error al eliminar logo:', error)
      }
    }
    
    setFormData({ ...formData, logo: '' })
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestión de Marcas</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (open) {
            setIsDialogOpen(true)
          }
          // No permitir cerrar con clic fuera o ESC
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Marca
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{editingMarca ? "Editar Marca" : "Nueva Marca"}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-4"
                onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}
              >
                ✕
              </Button>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Logo de la Marca</Label>
                
                {/* Selector de método de carga */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={uploadMethod === 'file' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('file')}
                    className="flex items-center gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Archivo
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('url')}
                    className="flex items-center gap-1"
                  >
                    <Link className="h-4 w-4" />
                    URL
                  </Button>
                </div>

                {/* Vista previa del logo actual */}
                {formData.logo && (
                  <div className="relative">
                    <div className="w-32 h-32 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={handleRemoveLogo}
                      title="Eliminar logo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Subida por archivo */}
                {uploadMethod === 'file' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <div className="flex flex-col items-center space-y-2">
                          {isUploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          ) : (
                            <Upload className="h-6 w-6 text-gray-400" />
                          )}
                          <p className="text-sm font-medium text-gray-700">
                            {isUploading ? 'Subiendo...' : 'Haz clic para seleccionar logo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF hasta 2MB
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Subida por URL */}
                {uploadMethod === 'url' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="https://ejemplo.com/logo.png"
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-gray-500">
                      Ingresa la URL directa del logo desde internet
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isUploading}>
                {isUploading ? "Procesando..." : editingMarca ? "Actualizar" : "Crear"} Marca
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marcas.map((marca) => (
              <TableRow key={marca.id}>
                <TableCell>{marca.id}</TableCell>
                <TableCell>
                  {marca.logo ? (
                    <div className="w-12 h-12 border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={marca.logo}
                        alt={`Logo de ${marca.descripcion}`}
                        className="max-w-full max-h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 border rounded bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Sin logo</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{marca.descripcion}</TableCell>
                <TableCell>{new Date(marca.created_at).toLocaleDateString('es-AR')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(marca)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(marca)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Modal de confirmación de eliminación */}
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 text-sm">
              ¿Estás seguro de que quieres eliminar la marca <strong>"{marcaToDelete?.descripcion}"</strong>?
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <span className="font-medium text-yellow-800 text-sm">Atención</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Esta acción no se puede deshacer. La marca será eliminada permanentemente.
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleDeleteCancel} size="sm">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm} size="sm">
            Eliminar
          </Button>
        </div>
      </DialogContent>
         </Dialog>
   </>
  )
} 