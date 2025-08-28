"use client"

import { useState } from "react"
import { Download, Check, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Producto } from "@/lib/supabase"
import * as XLSX from 'xlsx'

interface ExcelGeneratorProps {
  productos: Producto[]
}

export function ExcelGenerator({ productos }: ExcelGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProductos.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProductos.map(p => p.id)))
    }
  }

  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const generateExcel = () => {
    if (selectedProducts.size === 0) {
      alert("Por favor selecciona al menos un producto")
      return
    }

    // Filtrar productos seleccionados
    const productosSeleccionados = productos.filter(p => selectedProducts.has(p.id))

    // Crear datos para Excel
    const excelData = productosSeleccionados.map(producto => ({
      'ID': producto.id,
      'Descripción': producto.descripcion,
      'Precio': producto.precio,
      'Categoría': producto.categoria?.descripcion || 'Sin categoría',
      'Marca': producto.marca?.descripcion || 'Sin marca',
      'Destacado': producto.destacado ? 'Sí' : 'No',
      'Descripción Detallada': producto.descripcion_detallada || ''
    }))

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 8 },  // ID
      { wch: 40 }, // Descripción
      { wch: 12 }, // Precio
      { wch: 20 }, // Categoría
      { wch: 20 }, // Marca
      { wch: 10 }, // Destacado
      { wch: 50 }, // Descripción Detallada
    ]
    worksheet['!cols'] = columnWidths

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')

    // Generar nombre del archivo con fecha
    const fecha = new Date().toISOString().split('T')[0]
    const fileName = `productos_mundocuotas_${fecha}.xlsx`

    // Descargar archivo
    XLSX.writeFile(workbook, fileName)
    
    // Cerrar modal
    setIsOpen(false)
    setSelectedProducts(new Set())
    setSearchTerm("")
  }

  // Filtrar productos basado en el término de búsqueda
  const filteredProductos = productos.filter(producto => {
    const searchLower = searchTerm.toLowerCase()
    return (
      producto.descripcion.toLowerCase().includes(searchLower) ||
      producto.id.toString().includes(searchLower) ||
      producto.categoria?.descripcion.toLowerCase().includes(searchLower) ||
      producto.marca?.descripcion.toLowerCase().includes(searchLower) ||
      formatPrice(producto.precio).includes(searchLower)
    )
  })

  const isAllSelected = selectedProducts.size === filteredProductos.length && filteredProductos.length > 0
  const isIndeterminate = selectedProducts.size > 0 && selectedProducts.size < filteredProductos.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) {
        setIsOpen(true)
      }
      // No permitir cerrar con clic fuera o ESC
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Generar Plantilla Excel
        </Button>
      </DialogTrigger>
        <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Generar Plantilla de Excel</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {/* Header con selección y búsqueda - altura fija */}
            <div className="space-y-3 flex-shrink-0">
              {/* Barra de búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por ID, descripción, categoría, marca o precio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Contador y selección */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = isIndeterminate
                    }}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    {isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Label>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedProducts.size} de {filteredProductos.length} productos mostrados
                  {searchTerm && filteredProductos.length !== productos.length && (
                    <span className="text-blue-600 ml-1">
                      (de {productos.length} total)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de productos con scroll mejorado - área flexible */}
            <div className="flex-1 min-h-0 border rounded-lg relative">
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-2">
                  {filteredProductos.length > 0 ? (
                    <>
                      {filteredProductos.map((producto) => (
                        <div
                          key={producto.id}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border"
                        >
                          <Checkbox
                            id={`product-${producto.id}`}
                            checked={selectedProducts.has(producto.id)}
                            onCheckedChange={() => handleSelectProduct(producto.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{producto.descripcion}</div>
                            <div className="text-sm text-gray-500">
                              ID: {producto.id} • {formatPrice(producto.precio)}
                              {producto.categoria && ` • ${producto.categoria.descripcion}`}
                              {producto.marca && ` • ${producto.marca.descripcion}`}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {producto.destacado && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                Destacado
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Indicador de scroll cuando hay muchos productos */}
                      {filteredProductos.length > 8 && (
                        <div className="text-center py-2 text-xs text-gray-400 border-t border-dashed">
                          <span>↓ Desplázate para ver más productos ↓</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No se encontraron productos</p>
                      <p className="text-sm">
                        {searchTerm 
                          ? `No hay productos que coincidan con "${searchTerm}"`
                          : "No hay productos disponibles"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer con botones - altura fija */}
            <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
              <div className="text-sm text-gray-600">
                El archivo incluirá: ID, Descripción, Precio, Categoría, Marca, Destacado y Descripción Detallada
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsOpen(false)
                  setSelectedProducts(new Set())
                  setSearchTerm("")
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={generateExcel}
                  disabled={selectedProducts.size === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Generar Excel ({selectedProducts.size})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  )
} 