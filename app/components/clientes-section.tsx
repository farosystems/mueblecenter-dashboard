"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Mail, MapPin, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Zona } from "@/lib/supabase"

// Tipos de datos
export interface Cliente {
  id: string
  nombre: string
  email: string
  fk_id_zona: string
  estado: 'interesado' | 'en_proceso' | 'cerrado' | 'inactivo'
  created_at: string
  updated_at: string
}

interface ClientesSectionProps {
  clientes: Cliente[]
  zonas: Zona[]
  onCreateCliente?: (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdateCliente?: (id: string, cliente: Partial<Cliente>) => Promise<void>
  onDeleteCliente?: (id: string) => Promise<void>
}

// Configuración de estados con colores
const estadosConfig = {
  interesado: {
    label: "Interesado",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  en_proceso: {
    label: "En Proceso",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  cerrado: {
    label: "Cerrado",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  inactivo: {
    label: "Inactivo",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
}

const ITEMS_PER_PAGE = 10

export function ClientesSection({ 
  clientes = [], 
  zonas = [],
  onCreateCliente,
  onUpdateCliente,
  onDeleteCliente 
}: ClientesSectionProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZona, setSelectedZona] = useState<string>("all")
  const [selectedEstado, setSelectedEstado] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Filtrado de clientes
  const filteredClientes = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchesSearch = 
        cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesZona = selectedZona === "all" || cliente.fk_id_zona === selectedZona
      const matchesEstado = selectedEstado === "all" || cliente.estado === selectedEstado

      return matchesSearch && matchesZona && matchesEstado
    })
  }, [clientes, searchTerm, selectedZona, selectedEstado])

  // Paginación
  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedClientes = filteredClientes.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset página cuando cambian los filtros
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    handleFilterChange()
  }

  const handleZonaChange = (value: string) => {
    setSelectedZona(value)
    handleFilterChange()
  }

  const handleEstadoChange = (value: string) => {
    setSelectedEstado(value)
    handleFilterChange()
  }

  const getZonaNombre = (zonaId: string) => {
    const zona = zonas.find(z => z.id === zonaId)
    return zona?.nombre || "Sin zona"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes del agente y su información de contacto
          </p>
        </div>
        <Button onClick={() => console.log("Crear cliente")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interesados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {clientes.filter(c => c.estado === 'interesado').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {clientes.filter(c => c.estado === 'en_proceso').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {clientes.filter(c => c.estado === 'cerrado').length}
            </div>
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
            {/* Búsqueda por texto */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Filtro por zona */}
            <div className="w-full md:w-48">
              <Select value={selectedZona} onValueChange={handleZonaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las zonas</SelectItem>
                  {zonas.map((zona) => (
                    <SelectItem key={zona.id} value={zona.id}>
                      {zona.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} 
            {searchTerm || selectedZona !== "all" || selectedEstado !== "all" ? ' filtrados' : ' en total'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8" />
                        <p>No se encontraron clientes</p>
                        <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="font-medium">{cliente.nombre}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{cliente.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getZonaNombre(cliente.fk_id_zona)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={estadosConfig[cliente.estado].color}
                        >
                          {estadosConfig[cliente.estado].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(cliente.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
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
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredClientes.length)} de {filteredClientes.length} clientes
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
                    const pageNum = i + 1
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
                  })}
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