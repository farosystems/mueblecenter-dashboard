"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Categoria } from "@/lib/supabase"

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
  })

  const resetForm = () => {
    setFormData({
      descripcion: "",
    })
    setEditingCategoria(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const categoriaData = {
      descripcion: formData.descripcion,
    }

    try {
      if (editingCategoria) {
        await onUpdateCategoria(editingCategoria.id, categoriaData)
      } else {
        await onCreateCategoria(categoriaData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar categoría:', error)
    }
  }

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria)
    setFormData({
      descripcion: categoria.descripcion,
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
              <Button type="submit" className="w-full">
                {editingCategoria ? "Actualizar" : "Crear"} Categoría
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
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell>{categoria.id}</TableCell>
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