'use client'

import { useState, useEffect } from 'react'
import { supabase, type AnalyticsEvent, type DateFilter, type AnalyticsSummary } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, TrendingUp, Users, MousePointer, ShoppingCart, Search, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function EstadisticasSection() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  // Función para obtener el rango de fechas basado en el filtro
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateFilter) {
      case 'today':
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          startDate: yesterday,
          endDate: today
        }
      case 'last_7_days':
        const last7Days = new Date(today)
        last7Days.setDate(last7Days.getDate() - 7)
        return {
          startDate: last7Days,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case 'last_30_days':
        const last30Days = new Date(today)
        last30Days.setDate(last30Days.getDate() - 30)
        return {
          startDate: last30Days,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case 'custom':
        return {
          startDate: customStartDate || today,
          endDate: customEndDate || new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      default:
        return { startDate: today, endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    }
  }

  // Cargar estadísticas
  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()

      // Obtener eventos en el rango de fechas
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*, producto:fk_id_producto(id, descripcion)')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Procesar datos para el resumen
      const eventsByType: Record<string, number> = {}
      const uniqueUsers = new Set<string>()
      const uniqueSessions = new Set<string>()
      const productCounts: Record<number, { name: string; count: number }> = {}
      const eventsByDate: Record<string, number> = {}

      events?.forEach((event: any) => {
        // Contar por tipo de evento
        eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1

        // Contar usuarios únicos
        if (event.user_id) uniqueUsers.add(event.user_id)

        // Contar sesiones únicas
        if (event.session_id) uniqueSessions.add(event.session_id)

        // Contar productos más vistos
        if (event.fk_id_producto && event.producto) {
          if (!productCounts[event.fk_id_producto]) {
            productCounts[event.fk_id_producto] = {
              name: event.producto.descripcion,
              count: 0
            }
          }
          productCounts[event.fk_id_producto].count++
        }

        // Contar eventos por fecha
        const eventDate = format(new Date(event.created_at), 'yyyy-MM-dd')
        eventsByDate[eventDate] = (eventsByDate[eventDate] || 0) + 1
      })

      // Preparar top productos
      const topProducts = Object.entries(productCounts)
        .map(([id, data]) => ({
          producto_id: parseInt(id),
          producto_nombre: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Preparar eventos por fecha
      const eventsByDateArray = Object.entries(eventsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setSummary({
        totalEvents: events?.length || 0,
        uniqueUsers: uniqueUsers.size,
        uniqueSessions: uniqueSessions.size,
        eventsByType,
        topProducts,
        eventsByDate: eventsByDateArray
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos cuando cambia el filtro
  useEffect(() => {
    loadAnalytics()
  }, [dateFilter, customStartDate, customEndDate])

  // Obtener nombre amigable del tipo de evento
  const getEventTypeName = (type: string): string => {
    const names: Record<string, string> = {
      page_view: 'Visitas a la web',
      whatsapp_click: 'Clicks en WhatsApp',
      shopping_list_add: 'Agregados a lista de compras',
      shopping_list_remove: 'Removidos de lista de compras',
      product_view: 'Visualizaciones de productos',
      search: 'Búsquedas',
      plan_view: 'Visualizaciones de planes',
      category_view: 'Visualizaciones de categorías',
      brand_view: 'Visualizaciones de marcas'
    }
    return names[type] || type
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Estadísticas</h2>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona el período de tiempo para ver las estadísticas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select
                value={dateFilter}
                onValueChange={(value) => setDateFilter(value as DateFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="last_7_days">Últimos 7 días</SelectItem>
                  <SelectItem value="last_30_days">Últimos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Fecha inicio</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Fecha fin</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <Button onClick={loadAnalytics} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de métricas */}
      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEvents.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Eventos registrados en el período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Únicos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.uniqueUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Usuarios diferentes que interactuaron</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sesiones Únicas</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.uniqueSessions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Sesiones de navegación únicas</p>
              </CardContent>
            </Card>
          </div>

          {/* Eventos por tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos por Tipo</CardTitle>
              <CardDescription>Desglose de acciones realizadas por los usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(summary.eventsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {type === 'whatsapp_click' && <MousePointer className="h-4 w-4 text-green-600" />}
                      {type === 'shopping_list_add' && <ShoppingCart className="h-4 w-4 text-blue-600" />}
                      {type === 'product_view' && <Eye className="h-4 w-4 text-purple-600" />}
                      {type === 'search' && <Search className="h-4 w-4 text-orange-600" />}
                      <span className="font-medium">{getEventTypeName(type)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-64 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / summary.totalEvents) * 100}%` }}
                        />
                      </div>
                      <span className="font-bold text-lg min-w-[60px] text-right">{count.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Productos más vistos */}
          {summary.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Populares</CardTitle>
                <CardDescription>Top 10 productos con más interacciones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.topProducts.map((product, index) => (
                    <div key={product.producto_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-gray-400 w-6">{index + 1}</span>
                        <span className="font-medium">{product.producto_nombre}</span>
                      </div>
                      <span className="font-bold text-lg">{product.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eventos por fecha */}
          {summary.eventsByDate.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Actividad por Fecha</CardTitle>
                <CardDescription>Distribución de eventos a lo largo del tiempo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.eventsByDate.map((item) => (
                    <div key={item.date} className="flex items-center justify-between">
                      <span className="font-medium">
                        {format(new Date(item.date), 'PPP', { locale: es })}
                      </span>
                      <span className="font-bold">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !summary && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No hay datos disponibles para el período seleccionado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
