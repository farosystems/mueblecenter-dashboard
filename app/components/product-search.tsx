"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Producto } from "@/lib/supabase"

interface ProductSearchProps {
  productos: Producto[]
  onSelect: (producto: Producto) => void
  placeholder?: string
  selectedProduct?: Producto | null
}

export function ProductSearch({ productos, onSelect, placeholder = "Buscar producto...", selectedProduct }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtrar productos basado en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(productos.slice(0, 10)) // Mostrar solo los primeros 10
    } else {
      const filtered = productos.filter(producto =>
        producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.id.toString().includes(searchTerm)
      ).slice(0, 10) // Limitar a 10 resultados
      setFilteredProducts(filtered)
    }
  }, [searchTerm, productos])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (producto: Producto) => {
    onSelect(producto)
    setSearchTerm(producto.descripcion)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchTerm("")
    onSelect(null as any)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto shadow-lg border">
          <div className="p-1">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => handleSelect(producto)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{producto.descripcion}</div>
                    <div className="text-xs text-gray-500">ID: {producto.id}</div>
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    {formatPrice(producto.precio)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "No se encontraron productos" : "Escribe para buscar productos"}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
} 