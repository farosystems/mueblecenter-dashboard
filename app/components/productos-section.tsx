"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Plus, Edit, Trash2, Grid, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X, Bold, Italic, Underline, Type, Palette, CheckSquare, Square, Trash, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "./image-upload"
import { PriceUpdater } from "./price-updater"
import { ImageImporter } from "./image-importer"
import { ProductMigrator } from "./product-migrator"
import { DescripcionMigrator } from "./descripcion-migrator"
import { ImageMigratorByCode } from "./image-migrator-by-code"
import { Producto, Categoria, Marca, Presentacion, Linea, Tipo } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

interface ProductosSectionProps {
  productos: Producto[]
  categorias: Categoria[]
  marcas: Marca[]
  presentaciones: Presentacion[]
  lineas: Linea[]
  tipos: Tipo[]
  onCreateProducto: (producto: Omit<Producto, 'id' | 'created_at' | 'categoria' | 'marca'>) => Promise<Producto | undefined>
  onUpdateProducto: (id: number, producto: Partial<Producto>) => Promise<Producto | undefined>
  onDeleteProducto: (id: number) => Promise<void>
}

export const ProductosSection = React.memo(({
  productos,
  categorias,
  marcas,
  presentaciones,
  lineas,
  tipos,
  onCreateProducto,
  onUpdateProducto,
  onDeleteProducto
}: ProductosSectionProps) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPresentacion, setFilterPresentacion] = useState("all")
  const [filterLinea, setFilterLinea] = useState("all")
  const [filterTipo, setFilterTipo] = useState("all")
  const [filterDestacado, setFilterDestacado] = useState("all")
  const [filterEstado, setFilterEstado] = useState("all")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isImageMigratorByCodeOpen, setIsImageMigratorByCodeOpen] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const itemsPerPage = 15
  const [formData, setFormData] = useState({
    codigo: "",
    descripcion: "",
    descripcion_detallada: "",
    precio: "",
    presentacion_id: undefined as string | undefined,
    linea_id: undefined as string | undefined,
    tipo_id: undefined as string | undefined,
    fk_id_marca: undefined as string | undefined,
    imagenes: [] as string[],
    cucardas: "",
    destacado: false,
    activo: true,
    aplica_todos_plan: false,
    aplica_solo_categoria: false,
    aplica_plan_especial: false
  })

  // Filtrado de productos por búsqueda y filtros
  const filteredProductos = useMemo(() => {
    let filtered = productos

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(producto => {
        const codigo = producto.codigo?.toLowerCase() || ""
        const descripcion = producto.descripcion?.toLowerCase() || ""
        const descripcionDetallada = producto.descripcion_detallada?.toLowerCase() || ""
        const categoria = producto.categoria?.descripcion?.toLowerCase() || ""
        const marca = producto.marca?.descripcion?.toLowerCase() || ""
        const precio = producto.precio?.toString() || ""

        return (
          codigo.includes(term) ||
          descripcion.includes(term) ||
          descripcionDetallada.includes(term) ||
          categoria.includes(term) ||
          marca.includes(term) ||
          precio.includes(term)
        )
      })
    }

    // Filtro por presentación
    if (filterPresentacion !== "all") {
      filtered = filtered.filter(producto => 
        producto.presentacion_id?.toString() === filterPresentacion
      )
    }

    // Filtro por línea
    if (filterLinea !== "all") {
      filtered = filtered.filter(producto => 
        producto.linea_id?.toString() === filterLinea
      )
    }

    // Filtro por tipo
    if (filterTipo !== "all") {
      filtered = filtered.filter(producto => 
        producto.tipo_id?.toString() === filterTipo
      )
    }

    // Filtro por destacado
    if (filterDestacado !== "all") {
      const isDestacado = filterDestacado === "destacado"
      filtered = filtered.filter(producto => producto.destacado === isDestacado)
    }

    // Filtro por estado (activo/inactivo)
    if (filterEstado !== "all") {
      const isActive = filterEstado === "activo"
      filtered = filtered.filter(producto => producto.activo === isActive)
    }

    return filtered
  }, [productos, searchTerm, filterPresentacion, filterLinea, filterTipo, filterDestacado, filterEstado])

  // Funciones de paginación
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProductos = filteredProductos.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Resetear página cuando cambie la vista, el número de productos, el término de búsqueda o los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [viewMode, filteredProductos.length, searchTerm, filterPresentacion, filterLinea, filterTipo, filterDestacado, filterEstado])

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Componente de paginación
  const Pagination = () => {
    if (totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages = []
      const maxVisiblePages = 5
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        }
      }
      
      return pages
    }

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-700">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProductos.length)} de {filteredProductos.length} productos
            {searchTerm && ` (filtrados de ${productos.length} total)`}
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-sm text-gray-500">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page as number)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Función helper para obtener todas las imágenes de un producto (memoizada)
  const getAllProductImages = React.useCallback((producto: Producto): string[] => {
    return [
      producto.imagen,
      producto.imagen_2,
      producto.imagen_3,
      producto.imagen_4,
      producto.imagen_5
    ].filter(img => img) as string[]
  }, [])

  const formatPrice = React.useCallback((price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }, [])

  // Función debounced para actualizar la descripción detallada
  const updateDescripcionDetallada = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, descripcion_detallada: content }))
    }, 100)
  }, [])

  const resetForm = () => {
    setFormData({
      codigo: "",
      descripcion: "",
      descripcion_detallada: "",
      precio: "",
      presentacion_id: undefined,
      linea_id: undefined,
      tipo_id: undefined,
      fk_id_marca: undefined,
      imagenes: [],
      cucardas: "",
      destacado: false,
      activo: true,
      aplica_todos_plan: false,
      aplica_solo_categoria: false,
      aplica_plan_especial: false
    })
    setEditingProduct(null)
    setCurrentImageIndex(0)
  }

  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto)
    // Recopilar todas las URLs de imagen en un array, filtrando nulos/indefinidos/cadenas vacías
    const productImages = [
      producto.imagen,
      producto.imagen_2,
      producto.imagen_3,
      producto.imagen_4,
      producto.imagen_5,
    ].filter(Boolean) as string[];

    setFormData({
      codigo: producto.codigo || "",
      descripcion: producto.descripcion || "",
      descripcion_detallada: producto.descripcion_detallada || "",
      precio: producto.precio?.toString() || "",
      presentacion_id: producto.presentacion_id?.toString(),
      linea_id: producto.linea_id?.toString(),
      tipo_id: producto.tipo_id?.toString(),
      fk_id_marca: producto.fk_id_marca?.toString(),
      imagenes: productImages,
      cucardas: producto.cucardas || "",
      destacado: producto.destacado || false,
      activo: producto.activo ?? true,
      aplica_todos_plan: producto.aplica_todos_plan || false,
      aplica_solo_categoria: producto.aplica_solo_categoria || false,
      aplica_plan_especial: producto.aplica_plan_especial || false
    })
    setCurrentImageIndex(0)
    setTimeout(() => {
      setIsDialogOpen(true)
      // Inicializar el contenido del editor enriquecido después de que se renderice
      setTimeout(() => {
        const editor = document.getElementById('rich-editor')
        if (editor) {
          editor.innerHTML = producto.descripcion_detallada || ''
        }
      }, 150)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      // Si estamos editando, eliminar imágenes que ya no están en el array
      if (editingProduct) {
        const originalImages = [
          editingProduct.imagen,
          editingProduct.imagen_2,
          editingProduct.imagen_3,
          editingProduct.imagen_4,
          editingProduct.imagen_5
        ].filter(Boolean) as string[]

        const imagesToRemove = originalImages.filter(img => !formData.imagenes.includes(img))
        
        // Eliminar imágenes del storage que ya no están en el array
        for (const imageUrl of imagesToRemove) {
          try {
            // Verificar si la imagen es de Supabase o externa
            const isSupabaseImage = imageUrl.includes('supabase.co')
            
            if (isSupabaseImage) {
              const filePath = extractFilePathFromUrl(imageUrl)
              console.log('Eliminando imagen de Supabase:', { imageUrl, filePath })
              
              const { error } = await supabase.storage
                .from('imagenes')
                .remove([filePath])
              
              if (error) {
                console.error('Error eliminando imagen del storage:', error)
              } else {
                console.log('Imagen eliminada exitosamente del storage:', filePath)
              }
            } else {
              console.log('Imagen externa (no se puede eliminar del servidor externo):', imageUrl)
            }
          } catch (error) {
            console.error('Error al eliminar imagen:', error)
          }
        }
      }

          const productoData = {
        codigo: formData.codigo.trim() !== '' ? formData.codigo : undefined,
        descripcion: formData.descripcion,
        descripcion_detallada: formData.descripcion_detallada || undefined,
        precio: parseFloat(formData.precio),
        presentacion_id: formData.presentacion_id || undefined,
        linea_id: formData.linea_id || undefined,
        tipo_id: formData.tipo_id || undefined,
        fk_id_marca: formData.fk_id_marca ? parseInt(formData.fk_id_marca) : undefined,
        // Mapear el array de imágenes a los campos individuales de la base de datos
        // Asegurar que los campos se limpien cuando no hay imágenes
        imagen: formData.imagenes[0] && formData.imagenes[0].trim() !== '' ? formData.imagenes[0] : undefined,
        imagen_2: formData.imagenes[1] && formData.imagenes[1].trim() !== '' ? formData.imagenes[1] : undefined,
        imagen_3: formData.imagenes[2] && formData.imagenes[2].trim() !== '' ? formData.imagenes[2] : undefined,
        imagen_4: formData.imagenes[3] && formData.imagenes[3].trim() !== '' ? formData.imagenes[3] : undefined,
        imagen_5: formData.imagenes[4] && formData.imagenes[4].trim() !== '' ? formData.imagenes[4] : undefined,
        cucardas: formData.cucardas.trim() !== '' ? formData.cucardas : undefined,
        destacado: formData.destacado,
        activo: formData.activo,
        aplica_todos_plan: formData.aplica_todos_plan,
        aplica_solo_categoria: formData.aplica_solo_categoria,
        aplica_plan_especial: formData.aplica_plan_especial
      }

      console.log('Guardando producto con imágenes:', {
        imagenes: formData.imagenes,
        imagen: productoData.imagen,
        imagen_2: productoData.imagen_2,
        imagen_3: productoData.imagen_3,
        imagen_4: productoData.imagen_4,
        imagen_5: productoData.imagen_5
      })
      
      // Verificar si se están limpiando los campos
      const camposLimpios = Object.entries(productoData)
        .filter(([key, value]) => key.startsWith('imagen') && value === undefined)
        .map(([key]) => key)
      
      if (camposLimpios.length > 0) {
        console.log('✅ Campos de imagen que se van a limpiar en la BD:', camposLimpios)
      }


      
      if (editingProduct) {
        await onUpdateProducto(editingProduct.id, productoData)
      } else {
        await onCreateProducto(productoData)
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error al guardar producto:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClick = (producto: Producto) => {
    setProductToDelete(producto)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      // Eliminar registros relacionados en productos_planes_default
      await supabase
        .from('producto_planes_default')
        .delete()
        .eq('fk_id_producto', productToDelete.id)

      // Eliminar registros relacionados en stock_sucursales
      await supabase
        .from('stock_sucursales')
        .delete()
        .eq('fk_id_producto', productToDelete.id)

      // Eliminar todas las imágenes del producto del storage (incluye cucarda)
      const productImages = [
        productToDelete.imagen,
        productToDelete.imagen_2,
        productToDelete.imagen_3,
        productToDelete.imagen_4,
        productToDelete.imagen_5,
        productToDelete.cucardas
      ].filter(Boolean) as string[]

            for (const imageUrl of productImages) {
        try {
          // Verificar si la imagen es de Supabase o externa
          const isSupabaseImage = imageUrl.includes('supabase.co')
          
          if (isSupabaseImage) {
            const filePath = extractFilePathFromUrl(imageUrl)
            console.log('Eliminando imagen de Supabase del producto:', { imageUrl, filePath })
            
            const { error } = await supabase.storage
              .from('imagenes')
              .remove([filePath])
            
            if (error) {
              console.error('Error eliminando imagen del storage:', error)
            } else {
              console.log('Imagen eliminada exitosamente del storage:', filePath)
            }
          } else {
            console.log('Imagen externa del producto (no se puede eliminar del servidor externo):', imageUrl)
          }
        } catch (error) {
          console.error('Error al eliminar imagen:', error)
        }
      }

      await onDeleteProducto(productToDelete.id)
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  // Función para limpiar todas las imágenes de un producto
  const handleClearImages = async (producto: Producto) => {
    try {
      console.log('Limpiando todas las imágenes del producto:', producto.id)
      
      // Obtener todas las imágenes del producto (incluye cucarda)
      const productImages = [
        producto.imagen,
        producto.imagen_2,
        producto.imagen_3,
        producto.imagen_4,
        producto.imagen_5,
        producto.cucardas
      ].filter(Boolean) as string[]

      // Eliminar imágenes de Supabase storage si existen
      for (const imageUrl of productImages) {
        try {
          const isSupabaseImage = imageUrl.includes('supabase.co')
          
          if (isSupabaseImage) {
            const filePath = extractFilePathFromUrl(imageUrl)
            console.log('Eliminando imagen de Supabase:', filePath)
            
            const { error } = await supabase.storage
              .from('imagenes')
              .remove([filePath])
            
            if (error) {
              console.error('Error eliminando imagen del storage:', error)
            } else {
              console.log('Imagen eliminada exitosamente del storage:', filePath)
            }
          } else {
            console.log('Imagen externa (no se puede eliminar del servidor externo):', imageUrl)
          }
        } catch (error) {
          console.error('Error al eliminar imagen:', error)
        }
      }

      // Limpiar todos los campos de imagen en la base de datos (incluye cucarda)
      const updates = {
        imagen: undefined,
        imagen_2: undefined,
        imagen_3: undefined,
        imagen_4: undefined,
        imagen_5: undefined,
        cucardas: undefined
      }

      console.log('Limpiando campos de imagen en la BD:', updates)
      await onUpdateProducto(producto.id, updates)
      console.log('✅ Imágenes eliminadas exitosamente del producto:', producto.id)
      
    } catch (error) {
      console.error('Error al limpiar imágenes del producto:', error)
    }
  }

  // Función helper para extraer el path del archivo de una URL de Supabase
  const extractFilePathFromUrl = (imageUrl: string): string => {
    try {
      // Las URLs de Supabase tienen formato: https://xxx.supabase.co/storage/v1/object/public/imagenes/productos/filename.jpg
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      
      // Buscar el índice de 'imagenes' en el path
      const imagenesIndex = pathParts.findIndex(part => part === 'imagenes')
      if (imagenesIndex !== -1 && imagenesIndex + 2 < pathParts.length) {
        // Tomar todo después de 'imagenes' (incluyendo 'productos/filename.jpg' o 'cucardas/filename.jpg')
        const filePath = pathParts.slice(imagenesIndex + 1).join('/')
        return filePath
      }
      
      // Fallback: determinar si es cucarda o producto basándose en el nombre del archivo
      const fileName = pathParts[pathParts.length - 1]
      if (fileName.startsWith('cucarda_')) {
        return `cucardas/${fileName}`
      }
      return `productos/${fileName}`
    } catch (error) {
      console.error('Error extrayendo path de URL:', error)
      // Fallback: extraer solo el nombre del archivo
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      return `productos/${fileName}`
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setProductToDelete(null)
  }

  // Funciones para modo de selección múltiple
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedProducts(new Set())
  }

  const toggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProducts)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProducts(newSelection)
  }

  const selectAllProducts = () => {
    if (selectedProducts.size === currentProductos.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(currentProductos.map(p => p.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedProducts.size > 0) {
      setIsBulkDeleteDialogOpen(true)
    }
  }

  const confirmBulkDelete = async () => {
    try {
      for (const productId of selectedProducts) {
        const producto = productos.find(p => p.id === productId)
        if (producto) {
          // Eliminar registros relacionados en productos_planes_default
          await supabase
            .from('producto_planes_default')
            .delete()
            .eq('fk_id_producto', productId)

          // Eliminar registros relacionados en stock_sucursales
          await supabase
            .from('stock_sucursales')
            .delete()
            .eq('fk_id_producto', productId)

          // Eliminar todas las imágenes del producto del storage
          const productImages = [
            producto.imagen,
            producto.imagen_2,
            producto.imagen_3,
            producto.imagen_4,
            producto.imagen_5,
            producto.cucardas
          ].filter(Boolean) as string[]

          for (const imageUrl of productImages) {
            try {
              const isSupabaseImage = imageUrl.includes('supabase.co')
              if (isSupabaseImage) {
                const filePath = extractFilePathFromUrl(imageUrl)
                await supabase.storage.from('imagenes').remove([filePath])
              }
            } catch (error) {
              console.error('Error al eliminar imagen:', error)
            }
          }

          await onDeleteProducto(productId)
        }
      }
      setSelectedProducts(new Set())
      setIsSelectionMode(false)
      setIsBulkDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error al eliminar productos:', error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
        <CardTitle>Gestión de Productos</CardTitle>
        <div className="flex items-center space-x-2">
          {isSelectionMode && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <span className="text-blue-700 text-sm font-medium">
                {selectedProducts.size} seleccionados
              </span>
              {selectedProducts.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7"
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Eliminar ({selectedProducts.size})
                </Button>
              )}
            </div>
          )}
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            className="h-8"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {isSelectionMode ? "Salir de selección" : "Selección múltiple"}
          </Button>
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          <PriceUpdater productos={productos} onUpdateProducto={onUpdateProducto} />
              <ImageImporter productos={productos} onUpdateProducto={onUpdateProducto} />
          <ProductMigrator onMigrationComplete={() => {}} />
          <DescripcionMigrator
            productos={productos}
            onUpdateProducto={onUpdateProducto}
          />

          <Button
            onClick={() => setIsImageMigratorByCodeOpen(true)}
            variant="outline"
            className="mb-4"
          >
            <FileImage className="w-4 h-4 mr-2" />
            Migrar Imágenes por Código
          </Button>

          <Dialog open={isImageMigratorByCodeOpen} onOpenChange={setIsImageMigratorByCodeOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Migrar Imágenes por Código</DialogTitle>
              </DialogHeader>
              <ImageMigratorByCode
                productos={productos}
                onUpdateProducto={onUpdateProducto}
                onComplete={() => {
                  setIsImageMigratorByCodeOpen(false)
                  // Los datos se actualizarán automáticamente
                }}
              />
            </DialogContent>
          </Dialog>
                                              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (open) {
                      setIsDialogOpen(true)
                    }
                  }}>
                    <DialogTrigger asChild>
                  <Button onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                    // Limpiar el editor para nuevo producto
                    setTimeout(() => {
                      const editor = document.getElementById('rich-editor')
                      if (editor) {
                        editor.innerHTML = ''
                      }
                    }, 150)
                  }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Producto
                      </Button>
                    </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
                  <div>
                      <DialogHeader>
                        <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
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
                        <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codigo">Código (opcional)</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    disabled={isCreating}
                    placeholder="Código del producto"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    required
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                    disabled={isCreating}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="descripcion_detallada">Descripción Detallada (opcional)</Label>
                
                {/* Barra de herramientas de formato */}
                <div className="flex flex-wrap gap-2 p-2 border rounded-t-lg bg-gray-50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      document.execCommand('bold', false, undefined)
                    }}
                    disabled={isCreating}
                    title="Negrita"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      document.execCommand('italic', false, undefined)
                    }}
                    disabled={isCreating}
                    title="Cursiva"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      document.execCommand('underline', false, undefined)
                    }}
                    disabled={isCreating}
                    title="Subrayado"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                  
                  <div className="border-l mx-2" />
                  
                  <select
                    className="text-xs border rounded px-2 py-1"
                    onChange={(e) => {
                      document.execCommand('fontSize', false, e.target.value)
                    }}
                    disabled={isCreating}
                    title="Tamaño de fuente"
                    defaultValue="3"
                  >
                    <option value="1">Muy pequeño</option>
                    <option value="2">Pequeño</option>
                    <option value="3">Normal</option>
                    <option value="4">Grande</option>
                    <option value="5">Muy grande</option>
                    <option value="6">Extra grande</option>
                  </select>
                  
                  <select
                    className="text-xs border rounded px-2 py-1"
                    onChange={(e) => {
                      document.execCommand('fontName', false, e.target.value)
                    }}
                    disabled={isCreating}
                    title="Tipografía"
                    defaultValue="Arial"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                  </select>
                  
                  <input
                    type="color"
                    className="w-8 h-8 border rounded cursor-pointer"
                    onChange={(e) => {
                      document.execCommand('foreColor', false, e.target.value)
                    }}
                    disabled={isCreating}
                    title="Color de texto"
                  />
                  
                  <div className="border-l mx-2" />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                    onClick={() => {
                      const editor = document.getElementById('rich-editor')
                      if (editor) {
                        editor.innerHTML = ''
                        setFormData({ ...formData, descripcion_detallada: '' })
                      }
                    }}
                    disabled={isCreating}
                    title="Limpiar formato"
                  >
                    Limpiar
                  </Button>
                </div>
                
                {/* Editor de texto enriquecido */}
                <div
                  id="rich-editor"
                  contentEditable
                  className="min-h-[120px] p-3 border border-t-0 rounded-b-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0
                  }}
                  onInput={(e) => {
                    const content = e.currentTarget.innerHTML
                    updateDescripcionDetallada(content)
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const text = e.clipboardData?.getData('text/plain') || ''
                    document.execCommand('insertText', false, text)
                  }}
                  suppressContentEditableWarning={true}
                />
                
              </div>
              
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Jerarquía del Artículo</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="presentacion">Presentación</Label>
                  <Select
                    value={formData.presentacion_id}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        presentacion_id: value,
                        linea_id: undefined, // Reset línea cuando cambia presentación
                        tipo_id: undefined   // Reset tipo cuando cambia presentación
                      })
                    }}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar presentación" />
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
                  <Label htmlFor="linea">Línea</Label>
                  <Select
                    value={formData.linea_id}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        linea_id: value,
                        tipo_id: undefined // Reset tipo cuando cambia línea
                      })
                    }}
                    disabled={isCreating || !formData.presentacion_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar línea" />
                    </SelectTrigger>
                    <SelectContent>
                      {lineas
                        .filter(l => l.activo && l.presentacion_id === formData.presentacion_id)
                        .map((linea) => (
                          <SelectItem key={linea.id} value={linea.id}>
                            {linea.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo_id}
                    onValueChange={(value) => setFormData({ ...formData, tipo_id: value })}
                    disabled={isCreating || !formData.linea_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos
                        .filter(t => t.activo && t.linea_id === formData.linea_id)
                        .map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Información Adicional</div>
                <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Select
                    value={formData.fk_id_marca}
                    onValueChange={(value) => setFormData({ ...formData, fk_id_marca: value })}
                    disabled={isCreating}
                  >
                    <SelectTrigger>
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
                </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Cucarda</div>
                <div className="space-y-3">
                  <Label>Imagen de Cucarda (opcional)</Label>
                  
                  {/* Vista previa de la cucarda */}
                  {formData.cucardas && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Vista previa de cucarda</span>
                      </div>
                      
                      <div className="relative">
                        <div className="aspect-square w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border mx-auto">
                          <img
                            src={formData.cucardas}
                            alt="Cucarda"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.jpg'
                            }}
                          />
                        </div>
                        
                        {/* Botón eliminar cucarda */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={async () => {
                            // Eliminar cucarda del storage si es de Supabase
                            if (formData.cucardas.includes('supabase.co')) {
                              try {
                                const filePath = extractFilePathFromUrl(formData.cucardas)
                                console.log('Eliminando cucarda de Supabase:', filePath)
                                
                                const { error } = await supabase.storage
                                  .from('imagenes')
                                  .remove([filePath])
                                
                                if (error) {
                                  console.error('Error eliminando cucarda del storage:', error)
                                }
                              } catch (error) {
                                console.error('Error al eliminar cucarda:', error)
                              }
                            }
                            
                            // Limpiar cucarda
                            setFormData({ ...formData, cucardas: "" })
                          }}
                          disabled={isCreating}
                          title="Eliminar cucarda"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Sección de subida de cucarda */}
                  <div className="space-y-3">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                      onDrop={async (e) => {
                        e.preventDefault()
                        if (isCreating) return
                        
                        const files = e.dataTransfer.files
                        if (files.length === 0) return
                        
                        const file = files[0] // Solo una cucarda
                        
                        try {
                          if (!file.type.startsWith('image/')) {
                            throw new Error('Solo se permiten archivos de imagen')
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            throw new Error('El archivo es demasiado grande. Máximo 5MB')
                          }
                          
                          const fileExt = file.name.split('.').pop()
                          const fileName = `cucarda_${Math.random().toString(36).substring(2)}.${fileExt}`
                          const filePath = `cucardas/${fileName}`
                          
                          const { data, error } = await supabase.storage
                            .from('imagenes')
                            .upload(filePath, file, {
                              cacheControl: '3600',
                              upsert: false
                            })
                          
                          if (error) throw error
                          
                          const { data: { publicUrl } } = supabase.storage
                            .from('imagenes')
                            .getPublicUrl(filePath)
                          
                          setFormData({ ...formData, cucardas: publicUrl })
                        } catch (error) {
                          const errorMessage = error instanceof Error ? error.message : 'Error al subir cucarda'
                          alert(errorMessage)
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          if (isCreating) return
                          
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          try {
                            if (!file.type.startsWith('image/')) {
                              throw new Error('Solo se permiten archivos de imagen')
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              throw new Error('El archivo es demasiado grande. Máximo 5MB')
                            }
                            
                            const fileExt = file.name.split('.').pop()
                            const fileName = `cucarda_${Math.random().toString(36).substring(2)}.${fileExt}`
                            const filePath = `cucardas/${fileName}`
                            
                            const { data, error } = await supabase.storage
                              .from('imagenes')
                              .upload(filePath, file, {
                                cacheControl: '3600',
                                upsert: false
                              })
                            
                            if (error) throw error
                            
                            const { data: { publicUrl } } = supabase.storage
                              .from('imagenes')
                              .getPublicUrl(filePath)
                            
                            setFormData({ ...formData, cucardas: publicUrl })
                          } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Error al subir cucarda'
                            alert(errorMessage)
                          }
                          
                          e.target.value = ''
                        }}
                        className="hidden"
                        id="cucarda-upload"
                        disabled={isCreating}
                      />
                      <label htmlFor="cucarda-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center space-y-2">
                          <Plus className="h-8 w-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">
                            Arrastra cucarda aquí o haz clic para seleccionar
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF hasta 5MB
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Imágenes del Producto</Label>
                          {formData.imagenes.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('Eliminando todas las imágenes del formulario')
                                setFormData({ ...formData, imagenes: [] })
                                setCurrentImageIndex(0)
                              }}
                              disabled={isCreating}
                            >
                              Eliminar todas las imágenes
                            </Button>
                          )}
                        </div>
                        
                        {/* Vista previa de imágenes con navegación */}
                        {formData.imagenes.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>Vista previa de imágenes</span>
                              <span>{currentImageIndex + 1} de {formData.imagenes.length}</span>
                            </div>
                            
                            <div className="relative">
                              <div className="aspect-square w-full max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden border">
                                <img
                                  src={formData.imagenes[currentImageIndex]}
                                  alt={`Imagen ${currentImageIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.jpg'
                                  }}
                                />
                              </div>
                              
                              {/* Botón eliminar imagen actual */}
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2 h-8 w-8 p-0"
                                onClick={async () => {
                                  const imageUrl = formData.imagenes[currentImageIndex]
                                  
                                  // Eliminar imagen del storage si es de Supabase
                                  if (imageUrl.includes('supabase.co')) {
                                    try {
                                      const filePath = extractFilePathFromUrl(imageUrl)
                                      console.log('Eliminando imagen de Supabase:', filePath)
                                      
                                      const { error } = await supabase.storage
                                        .from('imagenes')
                                        .remove([filePath])
                                      
                                      if (error) {
                                        console.error('Error eliminando imagen del storage:', error)
                                      }
                                    } catch (error) {
                                      console.error('Error al eliminar imagen:', error)
                                    }
                                  }
                                  
                                  // Eliminar de la lista
                                  const newImages = formData.imagenes.filter((_, i) => i !== currentImageIndex)
                                  setFormData({ ...formData, imagenes: newImages })
                                  
                                  // Ajustar índice
                                  if (currentImageIndex >= newImages.length && newImages.length > 0) {
                                    setCurrentImageIndex(newImages.length - 1)
                                  } else if (newImages.length === 0) {
                                    setCurrentImageIndex(0)
                                  }
                                }}
                                disabled={isCreating}
                                title="Eliminar imagen actual"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              
                              {formData.imagenes.length > 1 && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                    onClick={() => {
                                      setCurrentImageIndex(prev => 
                                        prev === 0 ? formData.imagenes.length - 1 : prev - 1
                                      )
                                    }}
                                    disabled={isCreating}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                    onClick={() => {
                                      setCurrentImageIndex(prev => 
                                        prev === formData.imagenes.length - 1 ? 0 : prev + 1
                                      )
                                    }}
                                    disabled={isCreating}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                            
                            {formData.imagenes.length > 1 && (
                              <div className="flex justify-center space-x-1">
                                {formData.imagenes.map((_, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className={`w-2 h-2 rounded-full ${
                                      index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                                    onClick={() => setCurrentImageIndex(index)}
                                    disabled={isCreating}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Sección de subida de imágenes */}
                        <div className="space-y-3">
                          <Label>Subir nuevas imágenes</Label>
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                            onDrop={async (e) => {
                              e.preventDefault()
                              if (isCreating) return
                              
                              const files = e.dataTransfer.files
                              if (files.length === 0) return
                              
                              const remainingSlots = 5 - formData.imagenes.length
                              if (remainingSlots <= 0) {
                                alert('Ya tienes el máximo de 5 imágenes')
                                return
                              }
                              
                              const filesToUpload = Array.from(files).slice(0, remainingSlots)
                              
                              try {
                                const uploadPromises = filesToUpload.map(async (file) => {
                                  if (!file.type.startsWith('image/')) {
                                    throw new Error('Solo se permiten archivos de imagen')
                                  }
                                  if (file.size > 5 * 1024 * 1024) {
                                    throw new Error('El archivo es demasiado grande. Máximo 5MB')
                                  }
                                  
                                  const fileExt = file.name.split('.').pop()
                                  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                                  const filePath = `productos/${fileName}`
                                  
                                  const { data, error } = await supabase.storage
                                    .from('imagenes')
                                    .upload(filePath, file, {
                                      cacheControl: '3600',
                                      upsert: false
                                    })
                                  
                                  if (error) throw error
                                  
                                  const { data: { publicUrl } } = supabase.storage
                                    .from('imagenes')
                                    .getPublicUrl(filePath)
                                  
                                  return publicUrl
                                })
                                
                                const uploadedUrls = await Promise.all(uploadPromises)
                                setFormData({ ...formData, imagenes: [...formData.imagenes, ...uploadedUrls] })
                              } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'Error al subir imagen'
                                alert(errorMessage)
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                          >
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={async (e) => {
                                if (isCreating) return
                                
                                const files = e.target.files
                                if (!files || files.length === 0) return
                                
                                const remainingSlots = 5 - formData.imagenes.length
                                if (remainingSlots <= 0) {
                                  alert('Ya tienes el máximo de 5 imágenes')
                                  return
                                }
                                
                                const filesToUpload = Array.from(files).slice(0, remainingSlots)
                                
                                try {
                                  const uploadPromises = filesToUpload.map(async (file) => {
                                    if (!file.type.startsWith('image/')) {
                                      throw new Error('Solo se permiten archivos de imagen')
                                    }
                                    if (file.size > 5 * 1024 * 1024) {
                                      throw new Error('El archivo es demasiado grande. Máximo 5MB')
                                    }
                                    
                                    const fileExt = file.name.split('.').pop()
                                    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                                    const filePath = `productos/${fileName}`
                                    
                                    const { data, error } = await supabase.storage
                                      .from('imagenes')
                                      .upload(filePath, file, {
                                        cacheControl: '3600',
                                        upsert: false
                                      })
                                    
                                    if (error) throw error
                                    
                                    const { data: { publicUrl } } = supabase.storage
                                      .from('imagenes')
                                      .getPublicUrl(filePath)
                                    
                                    return publicUrl
                                  })
                                  
                                  const uploadedUrls = await Promise.all(uploadPromises)
                                  setFormData({ ...formData, imagenes: [...formData.imagenes, ...uploadedUrls] })
                                } catch (error) {
                                  const errorMessage = error instanceof Error ? error.message : 'Error al subir imagen'
                                  alert(errorMessage)
                                }
                                
                                e.target.value = ''
                              }}
                              className="hidden"
                              id="image-upload-simple"
                              disabled={isCreating}
                            />
                            <label htmlFor="image-upload-simple" className="cursor-pointer">
                              <div className="flex flex-col items-center space-y-2">
                                <Plus className="h-8 w-8 text-gray-400" />
                                <p className="text-sm font-medium text-gray-700">
                                  Arrastra imágenes aquí o haz clic para seleccionar
                                </p>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG, GIF hasta 5MB. Tienes {formData.imagenes.length}/5 imágenes
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Configuración</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="destacado"
                      checked={formData.destacado}
                      onCheckedChange={(checked) => setFormData({ ...formData, destacado: checked })}
                      disabled={isCreating}
                    />
                    <Label htmlFor="destacado">Destacado</Label>
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
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aplica_todos_plan"
                      checked={formData.aplica_todos_plan}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_todos_plan: checked })}
                      disabled={isCreating}
                    />
                    <Label htmlFor="aplica_todos_plan">Aplica a todos los planes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aplica_solo_categoria"
                      checked={formData.aplica_solo_categoria}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_solo_categoria: checked })}
                      disabled={isCreating}
                    />
                    <Label htmlFor="aplica_solo_categoria">Aplica solo a categoría</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aplica_plan_especial"
                      checked={formData.aplica_plan_especial}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_plan_especial: checked })}
                      disabled={isCreating}
                    />
                            <Label htmlFor="aplica_plan_especial">Aplica a plan especial</Label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Creando..." : editingProduct ? "Actualizar" : "Crear"} Producto
              </Button>
            </form>
                  </div>
          </DialogContent>
        </Dialog>
            </div>
        </div>
      </CardHeader>
        
        {/* Filtros */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterPresentacion} onValueChange={setFilterPresentacion}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las presentaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las presentaciones</SelectItem>
                  {presentaciones
                    .filter(p => p.activo)
                    .map((presentacion) => (
                      <SelectItem key={presentacion.id} value={presentacion.id}>
                        {presentacion.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Select value={filterLinea} onValueChange={setFilterLinea}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las líneas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las líneas</SelectItem>
                  {lineas
                    .filter(l => l.activo)
                    .map((linea) => (
                      <SelectItem key={linea.id} value={linea.id}>
                        {linea.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {tipos
                    .filter(t => t.activo)
                    .map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Select value={filterDestacado} onValueChange={setFilterDestacado}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Destacado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="destacado">Destacado</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
      <CardContent>
        {viewMode === 'table' ? (
            <>
          <Table>
            <TableHeader>
                          <TableRow>
              {isSelectionMode && (
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllProducts}
                    className="h-8 w-8 p-0"
                  >
                    {selectedProducts.size === currentProductos.length && currentProductos.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              )}
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Desc. Det.</TableHead>
              <TableHead>Imágenes</TableHead>
              <TableHead>Cucarda</TableHead>
              <TableHead>Presentación</TableHead>
              <TableHead>Línea</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Destacado</TableHead>
                    <TableHead>Activo</TableHead>
              <TableHead>Aplica Planes</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
                  {currentProductos.map((producto) => (
                <TableRow key={producto.id}>
                  {isSelectionMode && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductSelection(producto.id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedProducts.has(producto.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell>{producto.codigo || '-'}</TableCell>
                  <TableCell className="font-medium">{producto.descripcion}</TableCell>
                  <TableCell>
                    {producto.descripcion_detallada ? (
                        <div 
                          className="text-sm text-gray-600 max-w-[150px] truncate"
                          dangerouslySetInnerHTML={{
                            __html: producto.descripcion_detallada.length > 70 
                              ? `${producto.descripcion_detallada.substring(0, 70)}...` 
                              : producto.descripcion_detallada
                          }}
                        />
                    ) : (
                          <span className="text-gray-400 text-xs">Sin descripción</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {producto.imagen ? (
                        <>
                          <div className="w-12 h-12 border rounded overflow-hidden">
                            <img
                              src={producto.imagen}
                              alt={`${producto.descripcion} - Imagen principal`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg'
                              }}
                            />
                          </div>
                          {getAllProductImages(producto).length > 1 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              +{getAllProductImages(producto).length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin imágenes</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {producto.cucardas ? (
                      <div className="w-8 h-8 border rounded overflow-hidden">
                        <img
                          src={producto.cucardas}
                          alt={`${producto.descripcion} - Cucarda`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg'
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin cucarda</span>
                    )}
                  </TableCell>
                  <TableCell>{producto.presentacion?.nombre || '-'}</TableCell>
                  <TableCell>{producto.linea?.nombre || '-'}</TableCell>
                  <TableCell>{producto.tipo?.nombre || '-'}</TableCell>
                  <TableCell>{producto.marca?.descripcion || '-'}</TableCell>
                  <TableCell>{formatPrice(producto.precio)}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        producto.destacado ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {producto.destacado ? "Destacado" : "Normal"}
                    </span>
                  </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            producto.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {producto.activo ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {producto.aplica_todos_plan && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Todos
                        </span>
                      )}
                      {producto.aplica_solo_categoria && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Categoría
                        </span>
                      )}
                      {producto.aplica_plan_especial && (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          Especial
                        </span>
                      )}
                      {!producto.aplica_todos_plan && !producto.aplica_solo_categoria && !producto.aplica_plan_especial && (
                        <span className="text-gray-400 text-xs">Ninguno</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(producto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {getAllProductImages(producto).length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleClearImages(producto)}
                          title="Limpiar todas las imágenes"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(producto)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
              <Pagination />
            </>
        ) : (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {currentProductos.map((producto) => (
              <Card key={producto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-100 relative">
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductSelection(producto.id)}
                        className="h-8 w-8 p-0 bg-white bg-opacity-90 hover:bg-opacity-100"
                      >
                        {selectedProducts.has(producto.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {producto.imagen ? (
                      <img
                        src={producto.imagen}
                        alt={producto.descripcion}
                        className="w-full h-full object-cover"
                          loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                      />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <div className="text-gray-400 text-center">
                        <div className="text-2xl mb-2">📷</div>
                        <div className="text-xs">Sin imagen</div>
                      </div>
                    </div>
                  )}
                  {producto.cucardas && (
                    <div className={`absolute top-2 ${isSelectionMode ? 'left-12' : 'left-2'} transition-all duration-200`}>
                      <div className="w-8 h-8 border rounded-full overflow-hidden bg-white shadow-md">
                        <img
                          src={producto.cucardas}
                          alt="Cucarda"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {producto.destacado && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        ⭐
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm line-clamp-2 flex-1">
                        {producto.descripcion}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">#{producto.id}</span>
                    </div>
                    
                    <div className="text-lg font-bold text-green-600">
                      {formatPrice(producto.precio)}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 text-xs">
                      {producto.categoria && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {producto.categoria.descripcion}
                        </span>
                      )}
                      {producto.marca && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {producto.marca.descripcion}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 text-xs">
                      {producto.aplica_todos_plan && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                          Todos
                        </span>
                      )}
                      {producto.aplica_solo_categoria && (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                          Categoría
                        </span>
                      )}
                      {producto.aplica_plan_especial && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                          Especial
                        </span>
                      )}
                      {!producto.aplica_todos_plan && !producto.aplica_solo_categoria && !producto.aplica_plan_especial && (
                        <span className="bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-200">
                          Sin planes
                        </span>
                      )}
                    </div>
                    
                    {producto.descripcion_detallada && (
                      <div 
                        className="text-xs text-gray-600 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: producto.descripcion_detallada
                        }}
                      />
                    )}
                    
                    <div className="flex gap-1 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(producto)}
                        className="flex-1 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteClick(producto)}
                        className="flex-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
              <Pagination />
            </>
        )}
      </CardContent>
    </Card>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 text-sm">
              ¿Estás seguro de que quieres eliminar el producto <strong>"{productToDelete?.descripcion}"</strong>?
            </p>
          </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <span className="font-medium text-yellow-800 text-sm">Atención</span>
              </div>
              <p className="text-yellow-700 text-xs mt-1">
                Esta acción no se puede deshacer. El producto será eliminado permanentemente.
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

    {/* Diálogo de confirmación de borrado masivo */}
    <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación masiva</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-gray-700 text-sm">
              ¿Estás seguro de que quieres eliminar <strong>{selectedProducts.size}</strong> productos seleccionados?
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-yellow-600 text-lg mr-2">⚠️</span>
              <span className="font-medium text-yellow-800 text-sm">Atención</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Esta acción no se puede deshacer. Los productos serán eliminados permanentemente junto con todas sus imágenes.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
            <p className="text-red-800 text-xs font-medium mb-2">Productos a eliminar:</p>
            <div className="space-y-1">
              {Array.from(selectedProducts).map(productId => {
                const producto = productos.find(p => p.id === productId)
                return producto ? (
                  <div key={productId} className="text-red-700 text-xs">
                    #{producto.id} - {producto.descripcion}
                  </div>
                ) : null
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsBulkDeleteDialogOpen(false)} 
            size="sm"
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={confirmBulkDelete}
            size="sm"
          >
            Eliminar {selectedProducts.size} productos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
})
