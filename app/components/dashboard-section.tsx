"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, CreditCard, Link2, TrendingUp } from "lucide-react"
import type { Producto, PlanFinanciacion, ProductoPlan } from "@/lib/supabase"

interface DashboardSectionProps {
  productos: Producto[]
  planes: PlanFinanciacion[]
  productosPorPlan: ProductoPlan[]
}

export function DashboardSection({ productos, planes, productosPorPlan }: DashboardSectionProps) {
  const productosDestacados = productos.filter((p) => p.destacado).length
  const planesActivos = planes.filter((p) => p.activo).length
  const asociacionesActivas = productosPorPlan.filter((p) => p.activo).length
  const valorTotalProductos = productos.reduce((acc, p) => acc + p.precio, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Resumen general</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Destacados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosDestacados}</div>
            <p className="text-xs text-muted-foreground">de {productos.length} productos totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes Activos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planesActivos}</div>
            <p className="text-xs text-muted-foreground">de {planes.length} planes totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asociaciones Activas</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asociacionesActivas}</div>
            <p className="text-xs text-muted-foreground">de {productosPorPlan.length} asociaciones totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(valorTotalProductos)}</div>
            <p className="text-xs text-muted-foreground">valor total del catálogo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Caros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productos
                .sort((a, b) => b.precio - a.precio)
                .slice(0, 5)
                .map((producto) => (
                  <div key={producto.id} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{producto.descripcion}</span>
                    <span className="text-sm text-muted-foreground">{formatPrice(producto.precio)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planes Más Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {planes.map((plan) => {
                const usos = productosPorPlan.filter((p) => p.fk_id_plan === plan.id).length
                return (
                  <div key={plan.id} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{plan.nombre}</span>
                    <span className="text-sm text-muted-foreground">{usos} productos</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
