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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Presentacion, Linea } from "@/lib/supabase"

interface LineasSectionProps {
  lineas: Linea[]
  presentaciones: Presentacion[]
  onCreateLinea: (linea: Omit<Linea, 'id' | 'created_at' | 'updated_at' | 'presentacion'>) => Promise<Linea | undefined>
  onUpdateLinea: (id: string, updates: Partial<Linea>) => Promise<Linea | undefined>
  onDeleteLinea: (id: string) => Promise<void>
}

export function LineasSection({ 
  lineas, 
  presentaciones,
  onCreateLinea, 
  onUpdateLinea, 
  onDeleteLinea 
}: LineasSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [lineaToDelete, setLineaToDelete] = useState<Linea | null>(null)
  const [editingLinea, setEditingLinea] = useState<Linea | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    presentacion_id: "",
    activo: true,
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      presentacion_id: "",
      activo: true,
    })
    setEditingLinea(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.presentacion_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar una presentación.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      if (editingLinea) {
        await onUpdateLinea(editingLinea.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          presentacion_id: formData.presentacion_id,
          activo: formData.activo,
        })
        toast({
          title: "Línea actualizada",
          description: "La línea se ha actualizado correctamente.",
        })
      } else {
        await onCreateLinea({
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          presentacion_id: formData.presentacion_id,
          activo: formData.activo,
        })
        toast({
          title: "Línea creada",
          description: "La línea se ha creado correctamente.",
        })
      }

      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al guardar la línea.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (linea: Linea) => {
    setEditingLinea(linea)
    setFormData({
      nombre: linea.nombre,
      descripcion: linea.descripcion || "",
      presentacion_id: linea.presentacion_id,
      activo: linea.activo,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!lineaToDelete) return

    setIsLoading(true)
    try {
      await onDeleteLinea(lineaToDelete.id)
      toast({
        title: "Línea eliminada",
        description: "La línea se ha eliminado correctamente.",
      })
      setIsDeleteDialogOpen(false)
      setLineaToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al eliminar la línea.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActivo = async (linea: Linea) => {
    try {
      await onUpdateLinea(linea.id, {
        activo: !linea.activo,
      })
      toast({
        title: "Estado actualizado",
        description: `La línea se ha ${!linea.activo ? 'activado' : 'desactivado'} correctamente.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al cambiar el estado de la línea.",
        variant: "destructive",
      })
    }
  }

  // Obtener nombre de presentación
  const getPresentacionNombre = (presentacionId: string) => {
    const presentacion = presentaciones.find(p => p.id === presentacionId)
    return presentacion?.nombre || "N/A"
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Líneas de Artículos
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Línea
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingLinea ? "Editar Línea" : "Nueva Línea"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="presentacion">Presentación *</Label>
                    <Select 
                      value={formData.presentacion_id} 
                      onValueChange={(value) => setFormData({ ...formData, presentacion_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una presentación" />
                      </SelectTrigger>
                      <SelectContent>
                        {presentaciones
                          .filter(p => p.activo)
                          .map((presentacion) => (
                            <SelectItem key={presentacion.id} value={presentacion.id}>
                              {presentacion.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Sillones"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción opcional de la línea"
                      rows={3}
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
                      {isLoading ? "Guardando..." : editingLinea ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lineas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay líneas registradas. Crea la primera línea.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((linea) => (
                  <TableRow key={linea.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">
                        {getPresentacionNombre(linea.presentacion_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{linea.nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {linea.descripcion || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={linea.activo ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActivo(linea)}
                      >
                        {linea.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(linea.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(linea)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLineaToDelete(linea)
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
              ¿Estás seguro de que deseas eliminar la línea "{lineaToDelete?.nombre}"?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer. Se eliminarán también todos los tipos asociados a esta línea.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setLineaToDelete(null)
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