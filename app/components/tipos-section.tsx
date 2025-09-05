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
import { Presentacion, Linea, Tipo } from "@/lib/supabase"

interface TiposSectionProps {
  tipos: Tipo[]
  lineas: Linea[]
  presentaciones: Presentacion[]
  onCreateTipo: (tipo: Omit<Tipo, 'id' | 'created_at' | 'updated_at' | 'linea'>) => Promise<Tipo | undefined>
  onUpdateTipo: (id: string, updates: Partial<Tipo>) => Promise<Tipo | undefined>
  onDeleteTipo: (id: string) => Promise<void>
}

export function TiposSection({ 
  tipos, 
  lineas,
  presentaciones,
  onCreateTipo, 
  onUpdateTipo, 
  onDeleteTipo 
}: TiposSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tipoToDelete, setTipoToDelete] = useState<Tipo | null>(null)
  const [editingTipo, setEditingTipo] = useState<Tipo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    presentacion_id: "",
    linea_id: "",
    activo: true,
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      presentacion_id: "",
      linea_id: "",
      activo: true,
    })
    setEditingTipo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.linea_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar una línea.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      if (editingTipo) {
        await onUpdateTipo(editingTipo.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          linea_id: formData.linea_id,
          activo: formData.activo,
        })
        toast({
          title: "Tipo actualizado",
          description: "El tipo se ha actualizado correctamente.",
        })
      } else {
        await onCreateTipo({
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          linea_id: formData.linea_id,
          activo: formData.activo,
        })
        toast({
          title: "Tipo creado",
          description: "El tipo se ha creado correctamente.",
        })
      }

      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al guardar el tipo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (tipo: Tipo) => {
    const linea = lineas.find(l => l.id === tipo.linea_id)
    setEditingTipo(tipo)
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || "",
      presentacion_id: linea?.presentacion_id || "",
      linea_id: tipo.linea_id,
      activo: tipo.activo,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!tipoToDelete) return

    setIsLoading(true)
    try {
      await onDeleteTipo(tipoToDelete.id)
      toast({
        title: "Tipo eliminado",
        description: "El tipo se ha eliminado correctamente.",
      })
      setIsDeleteDialogOpen(false)
      setTipoToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al eliminar el tipo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActivo = async (tipo: Tipo) => {
    try {
      await onUpdateTipo(tipo.id, {
        activo: !tipo.activo,
      })
      toast({
        title: "Estado actualizado",
        description: `El tipo se ha ${!tipo.activo ? 'activado' : 'desactivado'} correctamente.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al cambiar el estado del tipo.",
        variant: "destructive",
      })
    }
  }

  // Obtener líneas filtradas por presentación
  const getLineasByPresentacion = (presentacionId: string) => {
    return lineas.filter(l => l.presentacion_id === presentacionId && l.activo)
  }

  // Obtener información completa
  const getLineaNombre = (lineaId: string) => {
    const linea = lineas.find(l => l.id === lineaId)
    return linea?.nombre || "N/A"
  }

  const getPresentacionNombre = (lineaId: string) => {
    const linea = lineas.find(l => l.id === lineaId)
    const presentacion = presentaciones.find(p => p.id === linea?.presentacion_id)
    return presentacion?.nombre || "N/A"
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Tipos de Artículos
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTipo ? "Editar Tipo" : "Nuevo Tipo"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="presentacion">Presentación *</Label>
                    <Select 
                      value={formData.presentacion_id} 
                      onValueChange={(value) => {
                        setFormData({ 
                          ...formData, 
                          presentacion_id: value,
                          linea_id: "" // Reset línea cuando cambia presentación
                        })
                      }}
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
                    <Label htmlFor="linea">Línea *</Label>
                    <Select 
                      value={formData.linea_id} 
                      onValueChange={(value) => setFormData({ ...formData, linea_id: value })}
                      disabled={!formData.presentacion_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una línea" />
                      </SelectTrigger>
                      <SelectContent>
                        {getLineasByPresentacion(formData.presentacion_id).map((linea) => (
                          <SelectItem key={linea.id} value={linea.id}>
                            {linea.nombre}
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
                      placeholder="Ej: Sillones de 3 Cuerpos"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción opcional del tipo"
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
                      {isLoading ? "Guardando..." : editingTipo ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tipos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay tipos registrados. Crea el primer tipo.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Línea</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getPresentacionNombre(tipo.linea_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getLineaNombre(tipo.linea_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tipo.nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {tipo.descripcion || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tipo.activo ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActivo(tipo)}
                      >
                        {tipo.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tipo.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(tipo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTipoToDelete(tipo)
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
              ¿Estás seguro de que deseas eliminar el tipo "{tipoToDelete?.nombre}"?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer. Todos los productos asociados a este tipo perderán la referencia.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setTipoToDelete(null)
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