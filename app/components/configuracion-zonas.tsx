"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Zona, ConfiguracionZona } from "@/lib/supabase"

interface ConfiguracionZonasProps {
  zonas: Zona[]
  configuracionZonas: ConfiguracionZona[]
  onCreateConfiguracionZona: (configuracionZona: Omit<ConfiguracionZona, 'id' | 'created_at' | 'zona'>) => Promise<ConfiguracionZona | undefined>
  onUpdateConfiguracionZona: (id: number, updates: Partial<ConfiguracionZona>) => Promise<ConfiguracionZona | undefined>
  onDeleteConfiguracionZona: (id: number) => Promise<void>
}

export function ConfiguracionZonas({ 
  zonas, 
  configuracionZonas, 
  onCreateConfiguracionZona, 
  onUpdateConfiguracionZona, 
  onDeleteConfiguracionZona 
}: ConfiguracionZonasProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [configuracionToDelete, setConfiguracionToDelete] = useState<ConfiguracionZona | null>(null)
  const [editingConfiguracion, setEditingConfiguracion] = useState<ConfiguracionZona | null>(null)
  const [formData, setFormData] = useState({
    fk_id_zona: "",
    telefono: "",
  })

  const resetForm = () => {
    setFormData({
      fk_id_zona: "",
      telefono: "",
    })
    setEditingConfiguracion(null)
  }

  const formatNumber = (number: string) => {
    // Remover todos los caracteres no numéricos
    const cleanNumber = number.replace(/\D/g, "")
    
    // Si empieza con 0, removerlo
    if (cleanNumber.startsWith("0")) {
      return cleanNumber.substring(1)
    }
    
    // Si empieza con 54, mantenerlo
    if (cleanNumber.startsWith("54")) {
      return cleanNumber
    }
    
    // Si no empieza con 54, agregarlo
    return `54${cleanNumber}`
  }

  const handleNumberChange = (value: string) => {
    const formatted = formatNumber(value)
    setFormData({ ...formData, telefono: formatted })
  }

  const getDisplayNumber = (number: string) => {
    if (!number) return "No configurado"
    
    // Formatear para mostrar: +54 9 11 1234-5678
    const formatted = number.replace(/(\d{2})(\d{1})(\d{2})(\d{4})(\d{4})/, "+$1 $2 $3 $4-$5")
    return formatted
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const configuracionData = {
      fk_id_zona: parseInt(formData.fk_id_zona),
      telefono: formData.telefono,
    }

    try {
      if (editingConfiguracion) {
        await onUpdateConfiguracionZona(editingConfiguracion.id, configuracionData)
      } else {
        await onCreateConfiguracionZona(configuracionData)
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar configuración de zona:', error)
    }
  }

  const handleEdit = (configuracion: ConfiguracionZona) => {
    setEditingConfiguracion(configuracion)
    setFormData({
      fk_id_zona: configuracion.fk_id_zona.toString(),
      telefono: configuracion.telefono,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (configuracion: ConfiguracionZona) => {
    setConfiguracionToDelete(configuracion)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!configuracionToDelete) return
    try {
      await onDeleteConfiguracionZona(configuracionToDelete.id)
      setIsDeleteDialogOpen(false)
      setConfiguracionToDelete(null)
    } catch (error) {
      console.error('Error al eliminar configuración de zona:', error)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setConfiguracionToDelete(null)
  }

  // Obtener zonas que no tienen configuración asignada
  const zonasDisponibles = zonas.filter(zona => 
    !configuracionZonas.some(config => config.fk_id_zona === zona.id)
  )

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Configuración de WhatsApp por Zona
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (open) {
              setIsDialogOpen(true)
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={zonasDisponibles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Configuración
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>
                  {editingConfiguracion ? "Editar Configuración" : "Nueva Configuración"}
                </DialogTitle>
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
                  <Label htmlFor="zona">Zona</Label>
                  <Select
                    value={formData.fk_id_zona}
                    onValueChange={(value) => setFormData({ ...formData, fk_id_zona: value })}
                    disabled={!!editingConfiguracion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {(editingConfiguracion ? zonas : zonasDisponibles).map((zona) => (
                        <SelectItem key={zona.id} value={zona.id.toString()}>
                          {zona.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="telefono">Número de WhatsApp</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="Ej: 91112345678"
                    value={formData.telefono}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ingresa el número sin el código de país (+54). Se formateará automáticamente.
                  </p>
                </div>
                {formData.telefono && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Número formateado:</p>
                    <p className="text-lg font-mono">{getDisplayNumber(formData.telefono)}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={!formData.fk_id_zona || !formData.telefono}>
                  {editingConfiguracion ? "Actualizar" : "Crear"} Configuración
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
                <TableHead>Número de WhatsApp</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuracionZonas.map((configuracion) => (
                <TableRow key={configuracion.id}>
                  <TableCell className="font-medium">{configuracion.zona?.nombre}</TableCell>
                  <TableCell>{getDisplayNumber(configuracion.telefono)}</TableCell>
                  <TableCell>{new Date(configuracion.created_at).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(configuracion)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(configuracion)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configuracionZonas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                    No hay configuraciones de zona. Crea una nueva configuración para asociar números de WhatsApp a zonas específicas.
                  </TableCell>
                </TableRow>
              )}
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
                ¿Estás seguro de que quieres eliminar la configuración para la zona <strong>"{configuracionToDelete?.zona?.nombre}"</strong>?
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <span className="font-medium text-yellow-800 text-sm">Atención</span>
              </div>
              <p className="text-yellow-700 text-xs mt-1">
                Esta acción no se puede deshacer. La configuración será eliminada permanentemente.
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
