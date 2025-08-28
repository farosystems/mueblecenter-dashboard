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
import type { Zona } from "@/lib/supabase"

interface ZonasSectionProps {
  zonas: Zona[]
  onCreateZona: (zona: Omit<Zona, 'id' | 'created_at'>) => Promise<Zona | undefined>
  onUpdateZona: (id: number, updates: Partial<Zona>) => Promise<Zona | undefined>
  onDeleteZona: (id: number) => Promise<void>
}

export function ZonasSection({ zonas, onCreateZona, onUpdateZona, onDeleteZona }: ZonasSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [zonaToDelete, setZonaToDelete] = useState<Zona | null>(null)
  const [editingZona, setEditingZona] = useState<Zona | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
    })
    setEditingZona(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const zonaData = {
      nombre: formData.nombre,
    }

    try {
      if (editingZona) {
        await onUpdateZona(editingZona.id, zonaData)
      } else {
        await onCreateZona(zonaData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar zona:', error)
    }
  }

  const handleEdit = (zona: Zona) => {
    setEditingZona(zona)
    setFormData({
      nombre: zona.nombre || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (zona: Zona) => {
    setZonaToDelete(zona)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!zonaToDelete) return
    try {
      await onDeleteZona(zonaToDelete.id)
      setIsDeleteDialogOpen(false)
      setZonaToDelete(null)
    } catch (error) {
      console.error('Error al eliminar zona:', error)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setZonaToDelete(null)
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestión de Zonas</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (open) {
            setIsDialogOpen(true)
          }
          // No permitir cerrar con clic fuera o ESC
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Zona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{editingZona ? "Editar Zona" : "Nueva Zona"}</DialogTitle>
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
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingZona ? "Actualizar" : "Crear"} Zona
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
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zonas.map((zona) => (
              <TableRow key={zona.id}>
                <TableCell>{zona.id}</TableCell>
                <TableCell className="font-medium">{zona.nombre}</TableCell>
                <TableCell>{new Date(zona.created_at).toLocaleDateString('es-AR')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(zona)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(zona)}>
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
              ¿Estás seguro de que quieres eliminar la zona <strong>"{zonaToDelete?.nombre}"</strong>?
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <span className="font-medium text-yellow-800 text-sm">Atención</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Esta acción no se puede deshacer. La zona será eliminada permanentemente.
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
