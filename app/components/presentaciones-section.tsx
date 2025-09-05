"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Edit, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { SingleImageUpload } from "./single-image-upload"
import { Presentacion } from "@/lib/supabase"

interface PresentacionesSectionProps {
  presentaciones: Presentacion[]
  onCreatePresentacion: (presentacion: Omit<Presentacion, 'id' | 'created_at' | 'updated_at'>) => Promise<Presentacion | undefined>
  onUpdatePresentacion: (id: string, updates: Partial<Presentacion>) => Promise<Presentacion | undefined>
  onDeletePresentacion: (id: string) => Promise<void>
}

export function PresentacionesSection({ 
  presentaciones, 
  onCreatePresentacion, 
  onUpdatePresentacion, 
  onDeletePresentacion 
}: PresentacionesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [presentacionToDelete, setPresentacionToDelete] = useState<Presentacion | null>(null)
  const [editingPresentacion, setEditingPresentacion] = useState<Presentacion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    imagen: null as string | null,
    activo: true,
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      imagen: null,
      activo: true,
    })
    setEditingPresentacion(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingPresentacion) {
        await onUpdatePresentacion(editingPresentacion.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          imagen: formData.imagen,
          activo: formData.activo,
        })
        toast({
          title: "Presentación actualizada",
          description: "La presentación se ha actualizado correctamente.",
        })
      } else {
        await onCreatePresentacion({
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          imagen: formData.imagen,
          activo: formData.activo,
        })
        toast({
          title: "Presentación creada",
          description: "La presentación se ha creado correctamente.",
        })
      }

      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al guardar la presentación.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (presentacion: Presentacion) => {
    setEditingPresentacion(presentacion)
    setFormData({
      nombre: presentacion.nombre,
      descripcion: presentacion.descripcion || "",
      imagen: presentacion.imagen || null,
      activo: presentacion.activo,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!presentacionToDelete) return

    setIsLoading(true)
    try {
      await onDeletePresentacion(presentacionToDelete.id)
      toast({
        title: "Presentación eliminada",
        description: "La presentación se ha eliminado correctamente.",
      })
      setIsDeleteDialogOpen(false)
      setPresentacionToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al eliminar la presentación.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActivo = async (presentacion: Presentacion) => {
    try {
      await onUpdatePresentacion(presentacion.id, {
        activo: !presentacion.activo,
      })
      toast({
        title: "Estado actualizado",
        description: `La presentación se ha ${!presentacion.activo ? 'activado' : 'desactivado'} correctamente.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al cambiar el estado de la presentación.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Presentaciones de Artículos
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Presentación
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPresentacion ? "Editar Presentación" : "Nueva Presentación"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Muebles de Living"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción opcional de la presentación"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Imagen</Label>
                    <SingleImageUpload
                      image={formData.imagen}
                      onImageChange={(imagen) => setFormData({ ...formData, imagen })}
                      disabled={isLoading}
                      label="Imagen de la presentación"
                      folder="presentaciones"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="activo"
                      checked={formData.activo}
                      onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                    />
                    <Label htmlFor="activo">Activo</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Guardando..." : editingPresentacion ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {presentaciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay presentaciones registradas. Crea la primera presentación.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presentaciones.map((presentacion) => (
                  <TableRow key={presentacion.id}>
                    <TableCell>
                      {presentacion.imagen ? (
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={presentacion.imagen}
                            alt={presentacion.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.jpg'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          Sin imagen
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{presentacion.nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {presentacion.descripcion || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={presentacion.activo ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActivo(presentacion)}
                      >
                        {presentacion.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(presentacion.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(presentacion)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPresentacionToDelete(presentacion)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              ¿Estás seguro de que deseas eliminar la presentación "{presentacionToDelete?.nombre}"?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer. Se eliminarán también todas las líneas y tipos asociados.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setPresentacionToDelete(null)
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}