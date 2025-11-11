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
import { Input } from "@/components/ui/input"
import { ProductSearch } from "./product-search"
import { PlanSearch } from "./plan-search"
import type { Producto, PlanFinanciacion, ProductoPlan, Presentacion, Linea, Tipo, Marca } from "@/lib/supabase"

interface ProductosPlanSectionProps {
  productos: Producto[]
  planes: PlanFinanciacion[]
  productosPorPlan: ProductoPlan[]
  presentaciones: Presentacion[]
  lineas: Linea[]
  tipos: Tipo[]
  marcas: Marca[]
  onCreateProductoPlan: (productoPlan: Omit<ProductoPlan, 'id' | 'created_at' | 'producto' | 'plan'>) => Promise<ProductoPlan | undefined>
  onUpdateProductoPlan: (id: number, updates: Partial<ProductoPlan>) => Promise<ProductoPlan | undefined>
  onDeleteProductoPlan: (id: number) => Promise<void>
  onUpdateProducto: (id: number, updates: Partial<Producto>) => Promise<Producto | undefined>
  onCreateMultipleProductoPlan: (productoIds: number[], planId: number, activo: boolean, destacado: boolean, precio_promo?: number) => Promise<void>
}

export function ProductosPlanSection({
  productos,
  planes,
  productosPorPlan,
  presentaciones,
  lineas,
  tipos,
  marcas,
  onCreateProductoPlan,
  onUpdateProductoPlan,
  onDeleteProductoPlan,
  onUpdateProducto,
  onCreateMultipleProductoPlan,
}: ProductosPlanSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ProductoPlan | null>(null)
  const [editingItem, setEditingItem] = useState<ProductoPlan | null>(null)
  const [selectionType, setSelectionType] = useState<"producto" | "presentacion" | "linea" | "tipo" | "marca">("producto")
  const [formData, setFormData] = useState({
    productoId: "",
    presentacionId: "",
    lineaId: "",
    tipoId: "",
    marcaId: "",
    planId: "",
    activo: true,
    destacado: false,
    precio_promo: "",
  })
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanFinanciacion | null>(null)

  const resetForm = () => {
    setFormData({
      productoId: "",
      presentacionId: "",
      lineaId: "",
      tipoId: "",
      marcaId: "",
      planId: "",
      activo: true,
      destacado: false,
      precio_promo: "",
    })
    setSelectedProduct(null)
    setSelectedPlan(null)
    setEditingItem(null)
    setSelectionType("producto")
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

  const getProductosByFilter = () => {
    switch (selectionType) {
      case "presentacion":
        if (!formData.presentacionId) return []
        return productos.filter(p => p.presentacion_id === formData.presentacionId)
      case "linea":
        if (!formData.lineaId) return []
        return productos.filter(p => p.linea_id === formData.lineaId)
      case "tipo":
        if (!formData.tipoId) return []
        return productos.filter(p => p.tipo_id === formData.tipoId)
      case "marca":
        if (!formData.marcaId) return []
        return productos.filter(p => p.fk_id_marca?.toString() === formData.marcaId)
      case "producto":
      default:
        return selectedProduct ? [selectedProduct] : []
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const plan = planes.find((p) => p.id.toString() === formData.planId)

    if (!plan) {
      alert("Por favor selecciona un plan")
      return
    }

    // Modo edición - solo para productos individuales
    if (editingItem) {
      if (!selectedProduct) {
        alert("Por favor selecciona un producto")
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
        precio_promo: formData.precio_promo ? parseFloat(formData.precio_promo) : null,
      }

      try {
        await onUpdateProductoPlan(editingItem.id, itemData)

        // Si se marca como destacado y el producto no lo está ya, actualizar el producto
        if (formData.destacado && selectedProduct && !selectedProduct.destacado) {
          await onUpdateProducto(selectedProduct.id, { destacado: true })
        }

        setIsDialogOpen(false)
        resetForm()
      } catch (error) {
        console.error('Error al actualizar producto por plan:', error)
      }
      return
    }

    // Modo creación - puede ser individual o múltiple
    const productosToAssociate = getProductosByFilter()

    if (productosToAssociate.length === 0) {
      alert("Por favor selecciona al menos un producto o filtro válido")
      return
    }

    try {
      if (selectionType === "producto") {
        // Asociación individual
        const producto = productosToAssociate[0]

        // Validar que no se intente marcar como destacado un producto que ya lo está
        if (formData.destacado && producto.destacado) {
          alert("Este producto ya está marcado como destacado. No se puede marcar nuevamente.")
          return
        }

        const itemData = {
          fk_id_producto: producto.id,
          fk_id_plan: Number.parseInt(formData.planId),
          activo: formData.activo,
          destacado: formData.destacado,
          precio_promo: formData.precio_promo ? parseFloat(formData.precio_promo) : null,
        }

        await onCreateProductoPlan(itemData)

        // Si se marca como destacado y el producto no lo está ya, actualizar el producto
        if (formData.destacado && producto && !producto.destacado) {
          await onUpdateProducto(producto.id, { destacado: true })
        }
      } else {
        // Asociación múltiple
        const productoIds = productosToAssociate.map(p => p.id)
        await onCreateMultipleProductoPlan(
          productoIds,
          Number.parseInt(formData.planId),
          formData.activo,
          formData.destacado,
          formData.precio_promo ? parseFloat(formData.precio_promo) : undefined
        )

        alert(`Se asociaron ${productoIds.length} productos al plan seleccionado`)
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error al guardar producto por plan:', error)
    }
  }

  const handleEdit = (item: ProductoPlan) => {
    const producto = productos.find(p => p.id === item.fk_id_producto)
    const plan = planes.find(p => p.id === item.fk_id_plan)
    setEditingItem(item)
    setSelectedProduct(producto || null)
    setSelectedPlan(plan || null)
    setFormData({
      productoId: item.fk_id_producto.toString(),
      planId: item.fk_id_plan.toString(),
      activo: item.activo,
      destacado: item.destacado && !producto?.destacado, // Solo permitir destacado si el producto no lo está ya
      precio_promo: item.precio_promo ? item.precio_promo.toString() : "",
      presentacionId: "",
      lineaId: "",
      tipoId: "",
      marcaId: "",
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
                  <DialogContent className="max-w-4xl w-[90vw] p-6" showCloseButton={false}>
                    <DialogHeader className="mb-4">
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
            <form onSubmit={handleSubmit} className="space-y-4 pb-2">
              {!editingItem && (
                <div>
                  <Label htmlFor="selectionType">Tipo de Selección</Label>
                  <Select value={selectionType} onValueChange={(value: any) => setSelectionType(value)}>
                    <SelectTrigger className="max-w-full">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producto">Producto Individual</SelectItem>
                      <SelectItem value="presentacion">Por Presentación</SelectItem>
                      <SelectItem value="linea">Por Línea</SelectItem>
                      <SelectItem value="tipo">Por Tipo</SelectItem>
                      <SelectItem value="marca">Por Marca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectionType === "producto" && (
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
              )}

              {selectionType === "presentacion" && (
                <div>
                  <Label htmlFor="presentacion">Presentación</Label>
                  <Select value={formData.presentacionId} onValueChange={(value) => setFormData({ ...formData, presentacionId: value })}>
                    <SelectTrigger className="max-w-full">
                      <SelectValue placeholder="Seleccionar presentación" />
                    </SelectTrigger>
                    <SelectContent>
                      {presentaciones
                        .filter((p) => p.activo)
                        .map((presentacion) => (
                          <SelectItem key={presentacion.id} value={presentacion.id}>
                            {presentacion.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.presentacionId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Se asociarán {productos.filter(p => p.presentacion_id === formData.presentacionId).length} productos
                    </p>
                  )}
                </div>
              )}

              {selectionType === "linea" && (
                <div>
                  <Label htmlFor="linea">Línea</Label>
                  <Select value={formData.lineaId} onValueChange={(value) => setFormData({ ...formData, lineaId: value })}>
                    <SelectTrigger className="max-w-full">
                      <SelectValue placeholder="Seleccionar línea" />
                    </SelectTrigger>
                    <SelectContent>
                      {lineas
                        .filter((l) => l.activo)
                        .map((linea) => (
                          <SelectItem key={linea.id} value={linea.id}>
                            {linea.nombre} {linea.presentacion ? `(${linea.presentacion.nombre})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.lineaId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Se asociarán {productos.filter(p => p.linea_id === formData.lineaId).length} productos
                    </p>
                  )}
                </div>
              )}

              {selectionType === "tipo" && (
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipoId} onValueChange={(value) => setFormData({ ...formData, tipoId: value })}>
                    <SelectTrigger className="max-w-full">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos
                        .filter((t) => t.activo)
                        .map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre} {tipo.linea?.presentacion ? `(${tipo.linea.presentacion.nombre} - ${tipo.linea.nombre})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.tipoId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Se asociarán {productos.filter(p => p.tipo_id === formData.tipoId).length} productos
                    </p>
                  )}
                </div>
              )}

              {selectionType === "marca" && (
                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <Select value={formData.marcaId} onValueChange={(value) => setFormData({ ...formData, marcaId: value })}>
                    <SelectTrigger className="max-w-full">
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((marca) => (
                        <SelectItem key={marca.id} value={marca.id.toString()}>
                          {marca.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.marcaId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Se asociarán {productos.filter(p => p.fk_id_marca?.toString() === formData.marcaId).length} productos
                    </p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="plan">Plan de Financiación</Label>
                <PlanSearch
                  planes={planes}
                  onSelect={(plan) => {
                    setSelectedPlan(plan)
                    setFormData({ ...formData, planId: plan?.id.toString() || "" })
                  }}
                  placeholder="Buscar plan por nombre o cuotas..."
                  selectedPlan={selectedPlan}
                />
              </div>
              <div>
                <Label htmlFor="precio_promo">Precio Promocional (opcional)</Label>
                <Input
                  id="precio_promo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ingrese precio promocional"
                  value={formData.precio_promo}
                  onChange={(e) => setFormData({ ...formData, precio_promo: e.target.value })}
                  className="w-full max-w-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedProduct ? (
                    formData.precio_promo ? (
                      <>Precio normal: {formatPrice(selectedProduct.precio)} | Promo: {formatPrice(parseFloat(formData.precio_promo))}</>
                    ) : (
                      <>Precio normal: {formatPrice(selectedProduct.precio)}</>
                    )
                  ) : (
                    "Si se especifica, se usará este precio en lugar del precio normal del producto"
                  )}
                </p>
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
              <div className="pt-2 flex justify-center">
                <Button type="submit" className="w-auto px-8">
                  {editingItem ? "Actualizar" : "Crear"} Asociación
                </Button>
              </div>
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
              <TableHead>Precio Promo</TableHead>
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
              const precioAUsar = item.precio_promo || producto?.precio || 0
              const detalles = plan && producto ? calcularDetallesFinanciacion(precioAUsar, plan.cuotas, plan.recargo_porcentual, plan.recargo_fijo, plan.anticipo_minimo, plan.anticipo_minimo_fijo) : null

              return (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">
                    {item.producto?.descripcion || producto?.descripcion || getProductoNombre(item.fk_id_producto)}
                    {(item.producto?.destacado || producto?.destacado) && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        ⭐ Destacado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getPlanNombre(item.fk_id_plan)}</TableCell>
                  <TableCell>{producto ? formatPrice(producto.precio) : '-'}</TableCell>
                  <TableCell>
                    {item.precio_promo ? (
                      <div className="text-sm">
                        <div className="font-medium text-green-600">{formatPrice(item.precio_promo)}</div>
                        <div className="text-xs text-gray-500">
                          Ahorro: {formatPrice(producto ? producto.precio - item.precio_promo : 0)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
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
