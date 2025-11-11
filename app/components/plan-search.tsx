"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { PlanFinanciacion } from "@/lib/supabase"

interface PlanSearchProps {
  planes: PlanFinanciacion[]
  onSelect: (plan: PlanFinanciacion | null) => void
  placeholder?: string
  selectedPlan?: PlanFinanciacion | null
}

export function PlanSearch({ planes, onSelect, placeholder = "Buscar plan...", selectedPlan }: PlanSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [filteredPlans, setFilteredPlans] = useState<PlanFinanciacion[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filtrar planes basado en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPlans(planes.filter(p => p.activo).slice(0, 10)) // Mostrar solo los primeros 10 activos
    } else {
      const filtered = planes.filter(plan =>
        plan.activo && (
          plan.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plan.id.toString().includes(searchTerm) ||
          plan.cuotas.toString().includes(searchTerm)
        )
      ).slice(0, 10) // Limitar a 10 resultados
      setFilteredPlans(filtered)
    }
  }, [searchTerm, planes])

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

  const handleSelect = (plan: PlanFinanciacion) => {
    onSelect(plan)
    setSearchTerm(plan.nombre)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchTerm("")
    onSelect(null)
    setIsOpen(false)
    inputRef.current?.focus()
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
            {filteredPlans.length > 0 ? (
              filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => handleSelect(plan)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{plan.nombre}</div>
                    <div className="text-xs text-gray-500">
                      {plan.cuotas} cuotas - Recargo: {plan.recargo_porcentual}% + ${plan.recargo_fijo}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "No se encontraron planes" : "Escribe para buscar planes"}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
