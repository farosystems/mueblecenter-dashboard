"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { Plus, Edit, Trash2, Star, ArrowUp, ArrowDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { ProductoDestacadoZona, Producto, Zona } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

interface ProductosDestacadosZonaSectionProps {
  productos: Producto[]
  zonas: Zona[]
  productosDestacados: ProductoDestacadoZona[]
  onRefresh: () => Promise<void>
}

export function ProductosDestacadosZonaSection({
  productos,
  zonas,
  productosDestacados,
  onRefresh
}: ProductosDestacadosZonaSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ProductoDestacadoZona | null>(null)
  const [editingItem, setEditingItem] = useState<ProductoDestacadoZona | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedZonaFilter, setSelectedZonaFilter] = useState<string>("all")
  const [searchProducto, setSearchProducto] = useState("")
  const [selectedProductos, setSelectedProductos] = useState<Producto[]>([])
  const [showProductosList, setShowProductosList] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    fk_id_zona: "",
    orden: "0",
    activo: true
  })

  // Cerrar lista de productos al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductosList(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const resetForm = () => {
    setFormData({
      fk_id_zona: "",
      orden: "0",
      activo: true
    })
    setEditingItem(null)
    setSearchProducto("")
    setSelectedProductos([])
    setShowProductosList(false)
  }

  const handleEdit = (item: ProductoDestacadoZona) => {
    setEditingItem(item)
    const producto = productos.find(p => p.id === item.fk_id_producto)
    setSelectedProductos(producto ? [producto] : [])
    setSearchProducto("")
    setFormData({
      fk_id_zona: item.fk_id_zona ? item.fk_id_zona.toString() : "all",
      orden: item.orden.toString(),
      activo: item.activo
    })
    setIsDialogOpen(true)
  }

  const handleToggleProducto = (producto: Producto) => {
    const isSelected = selectedProductos.some(p => p.id === producto.id)
    if (isSelected) {
      setSelectedProductos(selectedProductos.filter(p => p.id !== producto.id))
    } else {
      setSelectedProductos([...selectedProductos, producto])
    }
  }

  const handleRemoveProducto = (productoId: number) => {
    setSelectedProductos(selectedProductos.filter(p => p.id !== productoId))
  }

  // Filtrar productos por búsqueda
  const filteredProductos = useMemo(() => {
    if (!searchProducto.trim()) return productos.filter(p => p.activo)

    const term = searchProducto.toLowerCase().trim()
    return productos
      .filter(p => p.activo)
      .filter(p => {
        const codigo = p.codigo?.toLowerCase() || ""
        const descripcion = p.descripcion?.toLowerCase() || ""
        return codigo.includes(term) || descripcion.includes(term)
      })
      .slice(0, 50) // Limitar a 50 resultados
  }, [searchProducto, productos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.fk_id_zona) {
      alert('Debes seleccionar una zona')
      return
    }

    if (editingItem) {
      // Modo edición: solo permite un producto
      if (selectedProductos.length !== 1) {
        alert('Debes seleccionar un producto')
        return
      }
    } else {
      // Modo creación: permite múltiples productos
      if (selectedProductos.length === 0) {
        alert('Debes seleccionar al menos un producto')
        return
      }
    }

    setIsCreating(true)

    try {
      if (editingItem) {
        // Modo edición
        const data = {
          fk_id_producto: selectedProductos[0].id,
          fk_id_zona: formData.fk_id_zona === "all" ? null : parseInt(formData.fk_id_zona),
          orden: parseInt(formData.orden),
          activo: formData.activo
        }

        const { error } = await supabase
          .from('productos_destacados_zona')
          .update(data)
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        // Modo creación: crear un registro por cada producto seleccionado
        const dataArray = selectedProductos.map((producto, index) => ({
          fk_id_producto: producto.id,
          fk_id_zona: formData.fk_id_zona === "all" ? null : parseInt(formData.fk_id_zona),
          orden: parseInt(formData.orden) + index,
          activo: formData.activo
        }))

        const { error } = await supabase
          .from('productos_destacados_zona')
          .insert(dataArray)

        if (error) throw error
      }

      await onRefresh()
      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('Error al guardar producto destacado:', error)
      if (error.code === '23505') {
        alert('Uno o más productos ya están destacados en esta zona')
      } else {
        alert('Error al guardar: ' + error.message)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClick = (item: ProductoDestacadoZona) => {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from('productos_destacados_zona')
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error

      await onRefresh()
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error al eliminar:', error)
      alert('Error al eliminar el producto destacado')
    }
  }

  const handleChangeOrder = async (item: ProductoDestacadoZona, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? item.orden - 1 : item.orden + 1

    try {
      const { error } = await supabase
        .from('productos_destacados_zona')
        .update({ orden: newOrder })
        .eq('id', item.id)

      if (error) throw error
      await onRefresh()
    } catch (error) {
      console.error('Error al cambiar orden:', error)
    }
  }

  const handleToggleActivo = async (item: ProductoDestacadoZona) => {
    try {
      const { error } = await supabase
        .from('productos_destacados_zona')
        .update({ activo: !item.activo })
        .eq('id', item.id)

      if (error) throw error
      await onRefresh()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
    }
  }

  // Filtrar productos destacados por zona
  const filteredProductosDestacados = useMemo(() => {
    if (selectedZonaFilter === "all") {
      return productosDestacados
    }
    return productosDestacados.filter(
      item => item.fk_id_zona === null || item.fk_id_zona.toString() === selectedZonaFilter
    )
  }, [productosDestacados, selectedZonaFilter])

  // Ordenar por orden
  const sortedProductosDestacados = useMemo(() => {
    return [...filteredProductosDestacados].sort((a, b) => a.orden - b.orden)
  }, [filteredProductosDestacados])

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Productos Destacados por Zona</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Filtrar por zona:</Label>
                <Select value={selectedZonaFilter} onValueChange={setSelectedZonaFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las zonas</SelectItem>
                    {zonas.map((zona) => (
                      <SelectItem key={zona.id} value={zona.id.toString()}>
                        {zona.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (open) {
                  setIsDialogOpen(true)
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Destacado
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Editar Producto Destacado" : "Nuevo Producto Destacado"}
                    </DialogTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-4"
                      onClick={() => {
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                      disabled={isCreating}
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
                        disabled={isCreating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las zonas</SelectItem>
                          {zonas.map((zona) => (
                            <SelectItem key={zona.id} value={zona.id.toString()}>
                              {zona.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="producto">
                        {editingItem ? "Producto" : "Productos"}
                        {!editingItem && selectedProductos.length > 0 && (
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({selectedProductos.length} seleccionado{selectedProductos.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </Label>

                      {/* Productos seleccionados */}
                      {selectedProductos.length > 0 && (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
                          {selectedProductos.map((producto) => (
                            <div key={producto.id} className="flex items-center gap-2 p-2 bg-white border rounded min-w-0">
                              {producto.imagen && (
                                <img
                                  src={producto.imagen}
                                  alt={producto.descripcion}
                                  className="w-10 h-10 flex-shrink-0 object-cover rounded"
                                />
                              )}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="font-medium text-sm truncate">
                                  {producto.codigo && (
                                    <span className="text-gray-500 mr-2">{producto.codigo}</span>
                                  )}
                                  {producto.descripcion}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {new Intl.NumberFormat("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                  }).format(producto.precio)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0"
                                onClick={() => handleRemoveProducto(producto.id)}
                                disabled={isCreating}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Buscador */}
                      {!editingItem && (
                        <div className="relative" ref={searchRef}>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="producto"
                              placeholder="Buscar productos por código o descripción..."
                              value={searchProducto}
                              onChange={(e) => {
                                setSearchProducto(e.target.value)
                                setShowProductosList(true)
                              }}
                              onFocus={() => setShowProductosList(true)}
                              disabled={isCreating}
                              className="pl-10"
                            />
                          </div>

                          {showProductosList && searchProducto.trim() && (
                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                              {filteredProductos.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  No se encontraron productos
                                </div>
                              ) : (
                                filteredProductos.map((producto) => {
                                  const isSelected = selectedProductos.some(p => p.id === producto.id)
                                  return (
                                    <label
                                      key={producto.id}
                                      className="w-full p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3 cursor-pointer min-w-0"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleProducto(producto)}
                                        className="w-4 h-4 flex-shrink-0"
                                      />
                                      {producto.imagen && (
                                        <img
                                          src={producto.imagen}
                                          alt={producto.descripcion}
                                          className="w-10 h-10 flex-shrink-0 object-cover rounded"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="font-medium text-sm truncate">
                                          {producto.codigo && (
                                            <span className="text-gray-500 mr-2">{producto.codigo}</span>
                                          )}
                                          {producto.descripcion}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {new Intl.NumberFormat("es-AR", {
                                            style: "currency",
                                            currency: "ARS",
                                          }).format(producto.precio)}
                                        </p>
                                      </div>
                                    </label>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        {editingItem
                          ? (selectedProductos.length > 0 ? "Producto seleccionado" : "Selecciona un producto")
                          : (selectedProductos.length > 0
                              ? `${selectedProductos.length} producto${selectedProductos.length > 1 ? 's' : ''} seleccionado${selectedProductos.length > 1 ? 's' : ''}`
                              : "Busca y selecciona los productos a destacar"
                            )
                        }
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="orden">Orden de visualización inicial</Label>
                      <Input
                        id="orden"
                        type="number"
                        value={formData.orden}
                        onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                        disabled={isCreating}
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {editingItem
                          ? "Menor número = mayor prioridad"
                          : `Orden inicial (cada producto tendrá +1). Menor número = mayor prioridad`
                        }
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="activo"
                        checked={formData.activo}
                        onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                        disabled={isCreating}
                      />
                      <Label htmlFor="activo">Activo</Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={isCreating}>
                      {isCreating
                        ? "Guardando..."
                        : editingItem
                          ? "Actualizar"
                          : selectedProductos.length > 1
                            ? `Crear ${selectedProductos.length} destacados`
                            : "Crear destacado"
                      }
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Imagen</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProductosDestacados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No hay productos destacados
                    {selectedZonaFilter !== "all" && " para esta zona"}
                  </TableCell>
                </TableRow>
              ) : (
                sortedProductosDestacados.map((item) => {
                  const producto = productos.find(p => p.id === item.fk_id_producto)
                  const zona = zonas.find(z => z.id === item.fk_id_zona)

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{item.orden}</span>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => handleChangeOrder(item, 'up')}
                              disabled={item.orden === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => handleChangeOrder(item, 'down')}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {item.fk_id_zona === null ? (
                            <span className="text-blue-600">Todas las zonas</span>
                          ) : (
                            zona?.nombre
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {producto?.codigo && (
                          <span className="text-xs text-gray-500 mr-2">{producto.codigo}</span>
                        )}
                        <span>{producto?.descripcion}</span>
                      </TableCell>
                      <TableCell>
                        {producto?.imagen ? (
                          <div className="w-12 h-12 border rounded overflow-hidden">
                            <img
                              src={producto.imagen}
                              alt={producto.descripcion}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg'
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin imagen</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {producto && new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(producto.precio)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.activo}
                            onCheckedChange={() => handleToggleActivo(item)}
                          />
                          <span className={`text-xs ${item.activo ? 'text-green-600' : 'text-gray-400'}`}>
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
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
            <p className="text-gray-700 text-sm">
              ¿Estás seguro de que quieres eliminar este producto destacado?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <span className="font-medium text-yellow-800 text-sm">Atención</span>
              </div>
              <p className="text-yellow-700 text-xs mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              size="sm"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
