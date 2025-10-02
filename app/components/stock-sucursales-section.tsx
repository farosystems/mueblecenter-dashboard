import React, { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Search, Filter, Upload, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import * as XLSX from 'xlsx'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { StockSucursal, Producto, Zona } from "@/lib/supabase"

interface StockSucursalesSectionProps {
  stockSucursales: StockSucursal[]
  productos: Producto[]
  zonas: Zona[]
  onCreateStockSucursal: (stockSucursal: Omit<StockSucursal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdateStockSucursal: (id: number, stockSucursal: Partial<StockSucursal>) => Promise<void>
  onDeleteStockSucursal: (id: number) => Promise<void>
  onImportStockSucursales: (data: any[]) => Promise<void>
}

export const StockSucursalesSection = React.memo(({
  stockSucursales,
  productos,
  zonas,
  onCreateStockSucursal,
  onUpdateStockSucursal,
  onDeleteStockSucursal,
  onImportStockSucursales
}: StockSucursalesSectionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingStockSucursal, setEditingStockSucursal] = useState<StockSucursal | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [stockSucursalToDelete, setStockSucursalToDelete] = useState<StockSucursal | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterProducto, setFilterProducto] = useState("all")
  const [filterZona, setFilterZona] = useState("all")
  const [filterActivo, setFilterActivo] = useState<string>("all")
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [formData, setFormData] = useState({
    fk_id_producto: undefined as string | undefined,
    fk_id_zona: undefined as string | undefined,
    stock: 0,
    stock_minimo: 0,
    activo: true
  })

  const resetForm = () => {
    setFormData({
      fk_id_producto: undefined,
      fk_id_zona: undefined,
      stock: 0,
      stock_minimo: 0,
      activo: true
    })
    setEditingStockSucursal(null)
  }

  const handleEdit = (stockSucursal: StockSucursal) => {
    setEditingStockSucursal(stockSucursal)
    setFormData({
      fk_id_producto: stockSucursal.fk_id_producto.toString(),
      fk_id_zona: stockSucursal.fk_id_zona.toString(),
      stock: stockSucursal.stock,
      stock_minimo: stockSucursal.stock_minimo || 0,
      activo: stockSucursal.activo
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fk_id_producto || !formData.fk_id_zona) {
      console.error("Debe seleccionar un producto y una zona")
      return
    }
    
    setIsCreating(true)

    try {
      const stockSucursalData = {
        fk_id_producto: parseInt(formData.fk_id_producto),
        fk_id_zona: parseInt(formData.fk_id_zona),
        stock: formData.stock,
        stock_minimo: formData.stock_minimo,
        activo: formData.activo
      }

      if (editingStockSucursal) {
        await onUpdateStockSucursal(editingStockSucursal.id, stockSucursalData)
      } else {
        await onCreateStockSucursal(stockSucursalData)
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error al guardar stock:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClick = (stockSucursal: StockSucursal) => {
    setStockSucursalToDelete(stockSucursal)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (stockSucursalToDelete) {
      await onDeleteStockSucursal(stockSucursalToDelete.id)
      setIsDeleteDialogOpen(false)
      setStockSucursalToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setStockSucursalToDelete(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV')
      return
    }

    setSelectedFile(file)
  }

  const handleFileImport = async () => {
    if (!selectedFile) return

    setIsImporting(true)
    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // Procesar los datos del archivo
      const processedData = await processImportedData(jsonData as any[][])
      
      if (processedData.length === 0) {
        alert('No se encontraron datos válidos para importar')
        return
      }

      // Llamar a la función de importación
      await onImportStockSucursales(processedData)
      
      const totalRows = jsonData.length - 1 // -1 por el header
      const errors = totalRows - processedData.length
      
      let message = `Importación completada exitosamente. Se procesaron ${processedData.length} registros.`
      if (errors > 0) {
        message += `\n\nSe omitieron ${errors} filas con errores. Revisa la consola para más detalles.`
      }
      
      alert(message)
      setIsImportDialogOpen(false)
      setSelectedFile(null)
    } catch (error) {
      console.error('Error al importar archivo:', error)
      alert('Error al procesar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsImporting(false)
    }
  }

  const processImportedData = async (data: any[][]): Promise<Omit<StockSucursal, 'id' | 'created_at' | 'updated_at'>[]> => {
    if (data.length < 2) {
      throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos')
    }

    const headers = data[0].map(h => h?.toString().toLowerCase().trim())
    const rows = data.slice(1)

    const processedData: Omit<StockSucursal, 'id' | 'created_at' | 'updated_at'>[] = []
    const errorRows: string[] = []
    let processedCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 porque empezamos desde la fila 2 (después de headers)
      
      if (!row || row.every(cell => !cell && cell !== 0)) continue // Saltar filas vacías

      try {
        // Buscar índices de las columnas
        const productoIndex = headers.findIndex(h => 
          h.includes('producto') || h.includes('descripcion')
        )
        const zonaIndex = headers.findIndex(h => 
          h.includes('zona') || h.includes('sucursal')
        )
        const stockIndex = headers.findIndex(h => 
          h.includes('stock') && !h.includes('minimo') && !h.includes('mínimo')
        )
        const stockMinimoIndex = headers.findIndex(h => 
          h.includes('stock') && (h.includes('minimo') || h.includes('mínimo'))
        )
        const activoIndex = headers.findIndex(h => 
          h.includes('activo') || h.includes('estado')
        )

        if (productoIndex === -1 || zonaIndex === -1 || stockIndex === -1) {
          errorRows.push(`Fila ${rowNumber}: Faltan columnas obligatorias (Producto, Zona, Stock)`)
          continue
        }

        const productoNombre = row[productoIndex]?.toString().trim()
        const zonaNombre = row[zonaIndex]?.toString().trim()
        const stock = parseInt(row[stockIndex]?.toString() || '0')
        const stockMinimo = stockMinimoIndex !== -1 ? parseInt(row[stockMinimoIndex]?.toString() || '0') : 0
        const activo = activoIndex !== -1 ? 
          (row[activoIndex]?.toString().toLowerCase() === 'true' || row[activoIndex]?.toString().toLowerCase() === 'activo') 
          : true

        if (!productoNombre || !zonaNombre) {
          errorRows.push(`Fila ${rowNumber}: Producto o zona vacíos`)
          continue
        }

        // Buscar IDs de producto y zona (por ID o por nombre)
        let producto = productos.find(p => p.id.toString() === productoNombre.toString())
        if (!producto) {
          producto = productos.find(p => 
            p.descripcion.toLowerCase().includes(productoNombre.toLowerCase())
          )
        }

        let zona = zonas.find(z => z.id.toString() === zonaNombre.toString())
        if (!zona) {
          zona = zonas.find(z => 
            z.nombre?.toLowerCase().includes(zonaNombre.toLowerCase())
          )
        }

        if (!producto) {
          errorRows.push(`Fila ${rowNumber}: No se encontró producto "${productoNombre}"`)
          continue
        }

        if (!zona) {
          errorRows.push(`Fila ${rowNumber}: No se encontró zona "${zonaNombre}"`)
          continue
        }

        processedData.push({
          fk_id_producto: producto.id,
          fk_id_zona: zona.id,
          stock,
          stock_minimo: stockMinimo,
          activo
        })
        processedCount++

      } catch (error) {
        errorRows.push(`Fila ${rowNumber}: Error procesando datos - ${error instanceof Error ? error.message : 'Error desconocido'}`)
        continue
      }
    }

    // Mostrar resumen de errores si los hay
    if (errorRows.length > 0) {
      console.warn(`Se encontraron ${errorRows.length} errores en la importación:`)
      errorRows.forEach(error => console.warn(error))
      
      // Si hay muchos errores, mostrar solo los primeros 5
      const errorsToShow = errorRows.slice(0, 5)
      const moreErrors = errorRows.length > 5 ? ` y ${errorRows.length - 5} más...` : ''
      
      if (processedData.length === 0) {
        throw new Error(`No se pudieron procesar las filas:\n${errorsToShow.join('\n')}${moreErrors}`)
      } else {
        console.warn(`Se procesaron ${processedCount} registros correctamente, ${errorRows.length} con errores`)
      }
    }

    return processedData
  }

  const downloadTemplate = () => {
    const template = `Producto,Zona,Stock,Stock Mínimo,Activo
${productos.length > 0 ? productos[0].descripcion : 'Producto Ejemplo'},${zonas.length > 0 ? zonas[0].nombre : 'Zona Ejemplo'},100,10,true
${productos.length > 1 ? productos[1].descripcion : 'Producto Ejemplo 2'},${zonas.length > 1 ? zonas[1].nombre : 'Zona Ejemplo 2'},50,5,true`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = 'template-stock-sucursales.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Función para manejar cambios de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Crear mapas para búsquedas rápidas O(1)
  const productosMap = React.useMemo(() => {
    return new Map(productos.map(p => [p.id, p]))
  }, [productos])

  const zonasMap = React.useMemo(() => {
    return new Map(zonas.map(z => [z.id, z]))
  }, [zonas])

  // Filtrar datos con búsquedas optimizadas
  const filteredData = React.useMemo(() => {
    const searchLower = searchTerm.toLowerCase()

    return stockSucursales.filter(item => {
      const producto = productosMap.get(item.fk_id_producto)
      const zona = zonasMap.get(item.fk_id_zona)

      const matchesSearch = searchTerm === "" ||
        producto?.descripcion.toLowerCase().includes(searchLower) ||
        zona?.nombre?.toLowerCase().includes(searchLower)

      const matchesProducto = filterProducto === "all" || item.fk_id_producto.toString() === filterProducto
      const matchesZona = filterZona === "all" || item.fk_id_zona.toString() === filterZona
      const matchesActivo = filterActivo === "all" ||
        (filterActivo === "active" && item.activo) ||
        (filterActivo === "inactive" && !item.activo)

      return matchesSearch && matchesProducto && matchesZona && matchesActivo
    })
  }, [stockSucursales, searchTerm, filterProducto, filterZona, filterActivo, productosMap, zonasMap])

  // Calcular paginación
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Resetear página actual cuando cambien los filtros
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterProducto, filterZona, filterActivo])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock por Sucursales</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              setIsImportDialogOpen(open)
              if (!open) {
                setSelectedFile(null)
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Importar Stock desde Archivo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Seleccionar archivo</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos soportados: Excel (.xlsx, .xls) y CSV.<br/>
                      El archivo debe contener columnas: Producto (ID o nombre), Zona (ID o nombre), Stock, Stock Mínimo (opcional), Activo (opcional).
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Archivo seleccionado: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  {selectedFile && (
                    <div className="border-t pt-4">
                      <Button
                        onClick={handleFileImport}
                        disabled={isImporting}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isImporting ? "Importando..." : "Comenzar Importación"}
                      </Button>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <Label>¿No tienes un archivo?</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                      className="w-full mt-2"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar plantilla CSV
                    </Button>
                  </div>

                  {isImporting && (
                    <div className="text-center py-4 border-t">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Procesando archivo...</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setIsDialogOpen(false)
                resetForm()
              } else {
                setIsDialogOpen(true)
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  resetForm()
                  setIsDialogOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingStockSucursal ? "Editar Stock" : "Nuevo Stock"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="producto">Producto</Label>
                    <Select
                      value={formData.fk_id_producto}
                      onValueChange={(value) => setFormData({ ...formData, fk_id_producto: value })}
                      disabled={isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map((producto) => (
                          <SelectItem key={producto.id} value={producto.id.toString()}>
                            {producto.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="zona">Zona/Sucursal</Label>
                    <Select
                      value={formData.fk_id_zona}
                      onValueChange={(value) => setFormData({ ...formData, fk_id_zona: value })}
                      disabled={isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {zonas.map((zona) => (
                          <SelectItem key={zona.id} value={zona.id.toString()}>
                            {zona.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      disabled={isCreating}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                    <Input
                      id="stock_minimo"
                      type="number"
                      min="0"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                      disabled={isCreating}
                      className="mt-1"
                    />
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
                    {isCreating ? "Guardando..." : editingStockSucursal ? "Actualizar" : "Crear"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por producto o zona..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={filterProducto} onValueChange={setFilterProducto}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {productos.map((producto) => (
                      <SelectItem key={producto.id} value={producto.id.toString()}>
                        {producto.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={filterZona} onValueChange={setFilterZona}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por zona" />
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
              <div className="flex items-center space-x-2">
                <Select value={filterActivo} onValueChange={setFilterActivo}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Producto</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Zona/Sucursal</TableHead>
                <TableHead>Stock Actual</TableHead>
                <TableHead>Stock Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Actualización</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => {
                const producto = productosMap.get(item.fk_id_producto)
                const zona = zonasMap.get(item.fk_id_zona)

                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm text-gray-600">
                      #{item.fk_id_producto}
                    </TableCell>
                    <TableCell className="font-medium">
                      {producto?.descripcion || `Producto ${item.fk_id_producto}`}
                    </TableCell>
                    <TableCell>{zona?.nombre || `Zona ${item.fk_id_zona}`}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        item.stock <= (item.stock_minimo || 0) ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.stock}
                      </span>
                    </TableCell>
                    <TableCell>{item.stock_minimo || 0}</TableCell>
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
                      {new Date(item.updated_at).toLocaleDateString('es-AR')}
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

          {/* Controles de paginación */}
          {filteredData.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Mostrar</span>
                  <Select value={pageSize.toString()} onValueChange={(value) => {
                    setPageSize(parseInt(value))
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">por página</span>
                </div>
                <span className="text-sm text-gray-600">
                  {filteredData.length > 0 
                    ? `Mostrando ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} de ${filteredData.length} registros`
                    : 'No hay registros'
                  }
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber
                    if (totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i
                    } else {
                      pageNumber = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-700 text-sm">
                ¿Estás seguro de que quieres eliminar este registro de stock?
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <span className="font-medium text-yellow-800 text-sm">Atención</span>
              </div>
              <p className="text-yellow-700 text-xs mt-1">
                Esta acción no se puede deshacer. El registro será eliminado permanentemente.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleDeleteCancel} size="sm">
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
})