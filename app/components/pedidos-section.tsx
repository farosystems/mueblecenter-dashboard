"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, ShoppingCart, User, DollarSign, Filter, ChevronLeft, ChevronRight, Eye, Edit } from "lucide-react"

// Tipos de datos
export interface Pedido {
  id: string
  fk_id_cliente: string
  estado: 'pendiente' | 'anulado' | 'cumplido'
  total: number
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  nombre: string
  email: string
}

interface PedidosSectionProps {
  pedidos: Pedido[]
  clientes: Cliente[]
  onCreatePedido?: (pedido: Omit<Pedido, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdatePedido?: (id: string, pedido: Partial<Pedido>) => Promise<void>
  onDeletePedido?: (id: string) => Promise<void>
  onViewPedidoDetails?: (pedidoId: string) => void
}

// Configuración de estados con colores
const estadosConfig = {
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "⏳",
  },
  anulado: {
    label: "Anulado",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "❌",
  },
  cumplido: {
    label: "Cumplido",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "✅",
  },
}

const ITEMS_PER_PAGE = 10

export function PedidosSection({ 
  pedidos = [], 
  clientes = [],
  onCreatePedido,
  onUpdatePedido,
  onDeletePedido,
  onViewPedidoDetails
}: PedidosSectionProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<'id' | 'cliente'>('id')
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Filtrado de pedidos
  const filteredPedidos = useMemo(() => {
    return pedidos.filter((pedido) => {
      let matchesSearch = true
      
      if (searchTerm) {
        if (searchType === 'id') {
          matchesSearch = pedido.id.toLowerCase().includes(searchTerm.toLowerCase())
        } else if (searchType === 'cliente') {
          const cliente = clientes.find(c => c.id === pedido.fk_id_cliente)
          matchesSearch = cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || false
        }
      }
      
      const matchesEstado = selectedEstado === "all" || pedido.estado === selectedEstado

      return matchesSearch && matchesEstado
    })
  }, [pedidos, searchTerm, searchType, selectedEstado, clientes])

  // Paginación
  const totalPages = Math.ceil(filteredPedidos.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedPedidos = filteredPedidos.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset página cuando cambian los filtros
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    handleFilterChange()
  }

  const handleSearchTypeChange = (value: 'id' | 'cliente') => {
    setSearchType(value)
    setSearchTerm("")
    handleFilterChange()
  }

  const handleEstadoChange = (value: string) => {
    setSelectedEstado(value)
    handleFilterChange()
  }

  const getClienteNombre = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    return cliente?.nombre || "Cliente no encontrado"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount)
  }

  const getTotalByEstado = (estado: 'pendiente' | 'anulado' | 'cumplido') => {
    return pedidos
      .filter(p => p.estado === estado)
      .reduce((sum, pedido) => sum + pedido.total, 0)
  }

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case 'id':
        return "Buscar por ID del pedido..."
      case 'cliente':
        return "Buscar por nombre del cliente..."
      default:
        return "Buscar..."
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los pedidos realizados por los clientes
          </p>
        </div>
        <Button onClick={() => console.log("Crear pedido")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pedidos.reduce((sum, p) => sum + p.total, 0))} en total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <div className="text-lg">⏳</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pedidos.filter(p => p.estado === 'pendiente').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(getTotalByEstado('pendiente'))}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplidos</CardTitle>
            <div className="text-lg">✅</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {pedidos.filter(p => p.estado === 'cumplido').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(getTotalByEstado('cumplido'))}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anulados</CardTitle>
            <div className="text-lg">❌</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {pedidos.filter(p => p.estado === 'anulado').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(getTotalByEstado('anulado'))} perdidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Tipo de búsqueda */}
            <div className="w-full md:w-48">
              <Select value={searchType} onValueChange={handleSearchTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Buscar por ID</SelectItem>
                  <SelectItem value="cliente">Buscar por Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda por texto */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={getSearchPlaceholder()}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div className="w-full md:w-48">
              <Select value={selectedEstado} onValueChange={handleEstadoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(estadosConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            {filteredPedidos.length} pedido{filteredPedidos.length !== 1 ? 's' : ''} 
            {searchTerm || selectedEstado !== "all" ? ' filtrados' : ' en total'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPedidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8" />
                        <p>No se encontraron pedidos</p>
                        <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell>
                        <div className="font-mono text-sm font-medium">
                          #{pedido.id.slice(-8).toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getClienteNombre(pedido.fk_id_cliente)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${estadosConfig[pedido.estado].color} gap-1`}
                        >
                          <span>{estadosConfig[pedido.estado].icon}</span>
                          {estadosConfig[pedido.estado].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{formatCurrency(pedido.total)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(pedido.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onViewPedidoDetails?.(pedido.id)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredPedidos.length)} de {filteredPedidos.length} pedidos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else {
                      const start = Math.max(1, currentPage - 2)
                      const end = Math.min(totalPages, start + 4)
                      pageNum = start + i
                      if (pageNum > end) return null
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8"
                      >
                        {pageNum}
                      </Button>
                    )
                  }).filter(Boolean)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}