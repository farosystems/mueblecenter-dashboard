"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductSearch } from "./product-search"
import type { Producto, PlanFinanciacion, ProductoPlan } from "@/lib/supabase"

interface ProductosPlanSectionProps {
  productos: Producto[]
  planes: PlanFinanciacion[]
  productosPorPlan: ProductoPlan[]
  onCreateProductoPlan: (productoPlan: Omit<ProductoPlan, 'id' | 'created_at' | 'producto' | 'plan'>) => Promise<ProductoPlan | undefined>
  onUpdateProductoPlan: (id: number, updates: Partial<ProductoPlan>) => Promise<ProductoPlan | undefined>
  onDeleteProductoPlan: (id: number) => Promise<void>
  onUpdateProducto: (id: number, updates: Partial<Producto>) => Promise<Producto | undefined>
}

export function ProductosPlanSection({
  productos,
  planes,
  productosPorPlan,
  onCreateProductoPlan,
  onUpdateProductoPlan,
  onDeleteProductoPlan,
  onUpdateProducto,
}: ProductosPlanSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ProductoPlan | null>(null)
  const [editingItem, setEditingItem] = useState<ProductoPlan | null>(null)
  const [formData, setFormData] = useState({
    productoId: "",
    planId: "",
    activo: true,
    destacado: false,
  })
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)

  const resetForm = () => {
    setFormData({
      productoId: "",
      planId: "",
      activo: true,
      destacado: false,
    })
    setSelectedProduct(null)
    setEditingItem(null)
  }

  const calcularFinanciacion = (precio: number, cuotas: number, interes: number) => {
    const tasaMensual = interes / 100 / 12
    const factor = Math.pow(1 + tasaMensual, cuotas)
    const cuotaMensual = (precio * tasaMensual * factor) / (factor - 1)
    const precioFinal = cuotaMensual * cuotas

    return {
      cuotaMensual: Math.round(cuotaMensual),
      precioFinal: Math.round(precioFinal),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const plan = planes.find((p) => p.id.toString() === formData.planId)

    if (!selectedProduct || !plan) {
      alert("Por favor selecciona un producto y un plan")
      return
    }

    // Validar que no se intente marcar como destacado un producto que ya lo está
    if (formData.destacado && selectedProduct.destacado) {
      alert("Este producto ya está marcado como destacado. No se puede marcar nuevamente.")
      return
    }

    const itemData = {
      fk_id_producto: selectedProduct.id,
      fk_id_plan: Number.parseInt(formData.planId),
      activo: formData.activo,
      destacado: formData.destacado,
    }

    try {
      if (editingItem) {
        await onUpdateProductoPlan(editingItem.id, itemData)
      } else {
        await onCreateProductoPlan(itemData)
      }

      // Si se marca como destacado y el producto no lo está ya, actualizar el producto
      if (formData.destacado && selectedProduct && !selectedProduct.destacado) {
        await onUpdateProducto(selectedProduct.id, { destacado: true })
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar producto por plan:', error)
    }
  }

  const handleEdit = (item: ProductoPlan) => {
    const producto = productos.find(p => p.id === item.fk_id_producto)
    setEditingItem(item)
    setSelectedProduct(producto || null)
    setFormData({
      productoId: item.fk_id_producto.toString(),
      planId: item.fk_id_plan.toString(),
      activo: item.activo,
      destacado: item.destacado && !producto?.destacado, // Solo permitir destacado si el producto no lo está ya
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (item: ProductoPlan) => {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      await onDeleteProductoPlan(itemToDelete.id)
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error al eliminar producto por plan:', error)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const getProductoNombre = (id: number) => {
    return productos.find((p) => p.id === id)?.descripcion || "Producto no encontrado"
  }

  const getPlanNombre = (id: number) => {
    return planes.find((p) => p.id === id)?.nombre || "Plan no encontrado"
  }

  const calcularCuotaMensual = (precio: number, cuotas: number, recargoPorcentual?: number, recargoFijo?: number, anticipoMinimo?: number, anticipoMinimoFijo?: number) => {
    const recargoPorcentualValue = recargoPorcentual || 0
    const recargoFijoValue = recargoFijo || 0
    const precioConRecargo = precio * (1 + recargoPorcentualValue / 100) + recargoFijoValue
    
    let montoAnticipo = 0
    
    // Calcular anticipo porcentual
    if (anticipoMinimo && anticipoMinimo > 0) {
      montoAnticipo += precioConRecargo * (anticipoMinimo / 100)
    }
    
    // Calcular anticipo fijo
    if (anticipoMinimoFijo && anticipoMinimoFijo > 0) {
      montoAnticipo += anticipoMinimoFijo
    }
    
    if (montoAnticipo > 0) {
      const montoFinanciar = precioConRecargo - montoAnticipo
      return Math.round(montoFinanciar / cuotas)
    }
    
    return Math.round(precioConRecargo / cuotas)
  }

  const calcularDetallesFinanciacion = (precio: number, cuotas: number, recargoPorcentual?: number, recargoFijo?: number, anticipoMinimo?: number, anticipoMinimoFijo?: number) => {
    const recargoPorcentualValue = recargoPorcentual || 0
    const recargoFijoValue = recargoFijo || 0
    const precioConRecargo = precio * (1 + recargoPorcentualValue / 100) + recargoFijoValue
    
    let montoAnticipo = 0
    let detallesAnticipo = {
      porcentual: 0,
      fijo: 0
    }
    
    // Calcular anticipo porcentual
    if (anticipoMinimo && anticipoMinimo > 0) {
      const anticipoPorcentual = precioConRecargo * (anticipoMinimo / 100)
      montoAnticipo += anticipoPorcentual
      detallesAnticipo.porcentual = anticipoPorcentual
    }
    
    // Calcular anticipo fijo
    if (anticipoMinimoFijo && anticipoMinimoFijo > 0) {
      montoAnticipo += anticipoMinimoFijo
      detallesAnticipo.fijo = anticipoMinimoFijo
    }
    
    if (montoAnticipo > 0) {
      const montoFinanciar = precioConRecargo - montoAnticipo
      const cuotaMensual = Math.round(montoFinanciar / cuotas)
      const totalCuotas = cuotaMensual * cuotas
      const totalFinal = montoAnticipo + totalCuotas
      
      return {
        precioConRecargo,
        montoAnticipo,
        montoFinanciar,
        cuotaMensual,
        totalCuotas,
        totalFinal,
        detallesAnticipo
      }
    }
    
    const cuotaMensual = Math.round(precioConRecargo / cuotas)
    const totalCuotas = cuotaMensual * cuotas
    
    return {
      precioConRecargo,
      montoAnticipo: 0,
      montoFinanciar: precioConRecargo,
      cuotaMensual,
      totalCuotas,
      totalFinal: totalCuotas,
      detallesAnticipo
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestión de Productos por Planes Especiales</CardTitle>
                                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  if (open) {
                    setIsDialogOpen(true)
                  }
                  // No permitir cerrar con clic fuera o ESC
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Asociación
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md" showCloseButton={false}>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? "Editar Asociación" : "Nueva Asociación"}</DialogTitle>
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
                <Label htmlFor="producto">Producto</Label>
                <ProductSearch
                  productos={productos}
                  onSelect={(producto) => {
                    setSelectedProduct(producto)
                    setFormData({ ...formData, productoId: producto?.id.toString() || "" })
                  }}
                  placeholder="Buscar producto por nombre o ID..."
                  selectedProduct={selectedProduct}
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan de Financiación</Label>
                <Select value={formData.planId} onValueChange={(value) => setFormData({ ...formData, planId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planes
                      .filter((p) => p.activo)
                      .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.nombre} - {plan.cuotas} cuotas ({plan.recargo_porcentual}% + ${plan.recargo_fijo})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="destacado"
                  checked={formData.destacado}
                  onCheckedChange={(checked) => setFormData({ ...formData, destacado: checked })}
                  disabled={selectedProduct?.destacado}
                />
                <Label htmlFor="destacado" className={selectedProduct?.destacado ? "text-gray-500" : ""}>
                  Destacar Producto
                  {selectedProduct?.destacado && (
                    <span className="ml-2 text-xs text-yellow-600 font-medium">
                      (Ya está destacado)
                    </span>
                  )}
                </Label>
              </div>
              {selectedProduct?.destacado && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-yellow-600 text-lg mr-2">⭐</span>
                    <span className="font-medium text-yellow-800 text-sm">Producto ya destacado</span>
                  </div>
                  <p className="text-yellow-700 text-xs mt-1">
                    Este producto ya está marcado como destacado en la tabla de productos.
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editingItem ? "Actualizar" : "Crear"} Asociación
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
              <TableHead>Producto</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Precio Original</TableHead>
              <TableHead>Anticipo</TableHead>
              <TableHead>Cuota Mensual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Destacado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productosPorPlan.map((item) => {
              const producto = productos.find(p => p.id === item.fk_id_producto)
              const plan = planes.find(p => p.id === item.fk_id_plan)
              const detalles = plan && producto ? calcularDetallesFinanciacion(producto.precio, plan.cuotas, plan.recargo_porcentual, plan.recargo_fijo, plan.anticipo_minimo, plan.anticipo_minimo_fijo) : null
              
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">
                    {getProductoNombre(item.fk_id_producto)}
                    {producto?.destacado && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        ⭐ Destacado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getPlanNombre(item.fk_id_plan)}</TableCell>
                  <TableCell>{producto ? formatPrice(producto.precio) : '-'}</TableCell>
                  <TableCell>
                    {detalles && detalles.montoAnticipo > 0 ? (
                      <div className="text-sm space-y-1">
                        {detalles.detallesAnticipo.porcentual > 0 && (
                          <div>
                            <div className="font-medium text-blue-600">{plan?.anticipo_minimo}%</div>
                            <div className="text-xs text-gray-500">
                              {formatPrice(detalles.detallesAnticipo.porcentual)}
                            </div>
                          </div>
                        )}
                        {detalles.detallesAnticipo.fijo > 0 && (
                          <div>
                            <div className="font-medium text-green-600">Fijo</div>
                            <div className="text-xs text-gray-500">
                              {formatPrice(detalles.detallesAnticipo.fijo)}
                            </div>
                          </div>
                        )}
                        {detalles.detallesAnticipo.porcentual > 0 && detalles.detallesAnticipo.fijo > 0 && (
                          <div className="text-xs font-medium text-gray-700 border-t pt-1">
                            Total: {formatPrice(detalles.montoAnticipo)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin anticipo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {detalles ? (
                      <div className="text-sm">
                        <div className="font-medium">{formatPrice(detalles.cuotaMensual)}</div>
                        <div className="text-xs text-gray-500">
                          Total: {formatPrice(detalles.totalFinal)}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        item.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        item.destacado ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.destacado ? "Destacado" : "Normal"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
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
              ¿Estás seguro de que quieres eliminar la asociación entre <strong>"{itemToDelete ? getProductoNombre(itemToDelete.fk_id_producto) : 'N/A'}"</strong> y <strong>"{itemToDelete ? getPlanNombre(itemToDelete.fk_id_plan) : 'N/A'}"</strong>?
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <span className="font-medium text-yellow-800 text-sm">Atención</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Esta acción no se puede deshacer. La asociación será eliminada permanentemente.
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
