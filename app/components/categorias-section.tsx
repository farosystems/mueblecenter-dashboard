"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Categoria } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface CategoriasSectionProps {
  categorias: Categoria[]
  onCreateCategoria: (categoria: Omit<Categoria, 'id' | 'created_at'>) => Promise<Categoria | undefined>
  onUpdateCategoria: (id: number, updates: Partial<Categoria>) => Promise<Categoria | undefined>
  onDeleteCategoria: (id: number) => Promise<void>
}

export function CategoriasSection({ categorias, onCreateCategoria, onUpdateCategoria, onDeleteCategoria }: CategoriasSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [formData, setFormData] = useState({
    descripcion: "",
    logo: "",
  })
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const resetForm = () => {
    setFormData({
      descripcion: "",
      logo: "",
    })
    setEditingCategoria(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const categoriaData = {
      descripcion: formData.descripcion,
      logo: formData.logo || null,
    }

    try {
      console.log('Intentando guardar categoría:', { editingCategoria, categoriaData })
      if (editingCategoria) {
        await onUpdateCategoria(editingCategoria.id, categoriaData)
      } else {
        await onCreateCategoria(categoriaData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar categoría:', error)
      console.error('Payload enviado:', categoriaData)
    }
  }

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria)
    setFormData({
      descripcion: categoria.descripcion,
      logo: categoria.logo || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (categoria: Categoria) => {
    setCategoriaToDelete(categoria)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoriaToDelete) return
    try {
      await onDeleteCategoria(categoriaToDelete.id)
      setIsDeleteDialogOpen(false)
      setCategoriaToDelete(null)
    } catch (error) {
      console.error('Error al eliminar categoría:', error)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setCategoriaToDelete(null)
  }

  const uploadLogoToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 5MB')
      return
    }

    setIsUploadingLogo(true)
    
    try {
      const url = await uploadLogoToSupabase(file)
      setFormData({ ...formData, logo: url })
    } catch (error) {
      console.error('Error al subir logo:', error)
      alert('Error al subir el logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: "" })
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestión de Categorías</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (open) {
            setIsDialogOpen(true)
          }
          // No permitir cerrar con clic fuera o ESC
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{editingCategoria ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
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

              <div>
                <Label>Logo de la Categoría</Label>
                <div className="space-y-3">
                  {formData.logo ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Logo actual</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-gray-50 p-2">
                        <Image
                          src={formData.logo}
                          alt="Logo de la categoría"
                          width={100}
                          height={100}
                          className="w-20 h-20 object-contain mx-auto"
                        />
                      </div>
                      <p className="text-xs text-gray-500 break-all">{formData.logo}</p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      {isUploadingLogo ? (
                        <div className="space-y-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                          <p className="text-sm text-gray-600">Subiendo logo...</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            <label className="text-blue-500 hover:text-blue-600 cursor-pointer underline">
                              Selecciona un archivo de imagen
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoFileSelect}
                                className="hidden"
                                disabled={isUploadingLogo}
                              />
                            </label>
                          </p>
                          <p className="text-xs text-gray-400">
                            PNG, JPG, GIF hasta 5MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isUploadingLogo}>
                {isUploadingLogo ? "Subiendo..." : editingCategoria ? "Actualizar" : "Crear"} Categoría
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
            {categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell>{categoria.id}</TableCell>
                <TableCell>
                  {categoria.logo ? (
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                      <Image
                        src={categoria.logo}
                        alt={`Logo de ${categoria.descripcion}`}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{categoria.descripcion}</TableCell>
                <TableCell>{new Date(categoria.created_at).toLocaleDateString('es-AR')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(categoria)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(categoria)}>
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
              ¿Estás seguro de que quieres eliminar la categoría <strong>"{categoriaToDelete?.descripcion}"</strong>?
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <span className="font-medium text-yellow-800 text-sm">Atención</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Esta acción no se puede deshacer. La categoría será eliminada permanentemente.
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