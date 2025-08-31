"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Clock, Bot, Save, Settings2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Tipo para la configuración del agente
export interface ConfiguracionAgente {
  id: string
  nombre_configuracion: string
  descripcion?: string
  hora_inicio: string
  hora_fin: string
  habilita_envios: boolean
  habilita_planes_financiacion: boolean
  habilita_promociones: boolean
  habilita_stock_sucursales: boolean
  habilita_producto_sustituto: boolean
  habilita_consulta_precios: boolean
  habilita_busqueda_productos: boolean
  habilita_informacion_categorias: boolean
  habilita_informacion_marcas: boolean
  habilita_consulta_disponibilidad: boolean
  activa: boolean
  created_at: string
  updated_at: string
}

interface ConfiguracionAgenteSectionProps {
  className?: string
}

export function ConfiguracionAgenteSection({ className }: ConfiguracionAgenteSectionProps) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionAgente | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Cargar configuración inicial
  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    try {
      // Intentar obtener configuración existente
      const { data, error } = await supabase
        .from('configuracion_agente')
        .select('*')
        .eq('activa', true)
        .maybeSingle()

      if (error) {
        // Error específico de múltiples filas - limpiar y crear nueva
        if (error.code === 'PGRST116' && error.message.includes('multiple')) {
          console.log('Múltiples configuraciones encontradas, limpiando...')
          await limpiarYCrearConfiguracion()
          return
        }
        console.error('Error cargando configuración:', error)
        toast.error('Error al cargar la configuración del agente')
        return
      }

      if (data) {
        setConfiguracion(data)
      } else {
        // No existe configuración, crear una por defecto
        await crearConfiguracionPorDefecto()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar la configuración del agente')
    } finally {
      setLoading(false)
    }
  }

  const limpiarYCrearConfiguracion = async () => {
    try {
      // Eliminar todas las configuraciones existentes
      await supabase
        .from('configuracion_agente')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todas

      // Crear configuración nueva
      await crearConfiguracionPorDefecto()
    } catch (error) {
      console.error('Error limpiando configuraciones:', error)
      toast.error('Error al limpiar configuraciones duplicadas')
    }
  }

  const crearConfiguracionPorDefecto = async () => {
    try {
      const configDefault = {
        nombre_configuracion: 'Configuración Principal',
        descripcion: 'Configuración predeterminada del agente virtual',
        hora_inicio: '09:00',
        hora_fin: '18:00',
        habilita_envios: true,
        habilita_planes_financiacion: true,
        habilita_promociones: true,
        habilita_stock_sucursales: true,
        habilita_producto_sustituto: true,
        habilita_consulta_precios: true,
        habilita_busqueda_productos: true,
        habilita_informacion_categorias: true,
        habilita_informacion_marcas: true,
        habilita_consulta_disponibilidad: true,
        activa: true
      }

      const { data, error } = await supabase
        .from('configuracion_agente')
        .insert([configDefault])
        .select()
        .single()

      if (error) {
        console.error('Error creando configuración por defecto:', error)
        toast.error('Error al crear la configuración por defecto')
        return
      }

      setConfiguracion(data)
    } catch (error) {
      console.error('Error en crearConfiguracionPorDefecto:', error)
    }
  }

  const handleSwitchChange = async (field: keyof ConfiguracionAgente, value: boolean) => {
    if (!configuracion) return
    
    const nuevaConfiguracion = {
      ...configuracion,
      [field]: value
    }
    
    setConfiguracion(nuevaConfiguracion)
    
    // Guardar cambio inmediatamente
    await guardarCambio(field, value)
  }

  const handleTimeChange = async (field: 'hora_inicio' | 'hora_fin', value: string) => {
    if (!configuracion) return
    
    const nuevaConfiguracion = {
      ...configuracion,
      [field]: value
    }
    
    setConfiguracion(nuevaConfiguracion)
    
    // Guardar cambio inmediatamente
    await guardarCambio(field, value)
  }

  const guardarCambio = async (field: string, value: boolean | string) => {
    if (!configuracion) return

    try {
      const { error } = await supabase
        .from('configuracion_agente')
        .update({ [field]: value })
        .eq('id', configuracion.id)

      if (error) {
        console.error('Error guardando cambio:', error)
        toast.error('Error al guardar el cambio')
        // Revertir cambio en caso de error
        cargarConfiguracion()
      } else {
        // Mostrar toast de éxito
        console.log('Guardado exitoso, mostrando toast')
        toast.success('Configuración guardada')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar el cambio')
      cargarConfiguracion()
    }
  }

  const guardarConfiguracion = async () => {
    if (!configuracion) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('configuracion_agente')
        .update({
          hora_inicio: configuracion.hora_inicio,
          hora_fin: configuracion.hora_fin,
          habilita_envios: configuracion.habilita_envios,
          habilita_planes_financiacion: configuracion.habilita_planes_financiacion,
          habilita_promociones: configuracion.habilita_promociones,
          habilita_stock_sucursales: configuracion.habilita_stock_sucursales,
          habilita_producto_sustituto: configuracion.habilita_producto_sustituto,
          habilita_consulta_precios: configuracion.habilita_consulta_precios,
          habilita_busqueda_productos: configuracion.habilita_busqueda_productos,
          habilita_informacion_categorias: configuracion.habilita_informacion_categorias,
          habilita_informacion_marcas: configuracion.habilita_informacion_marcas,
          habilita_consulta_disponibilidad: configuracion.habilita_consulta_disponibilidad,
        })
        .eq('id', configuracion.id)

      if (error) {
        console.error('Error guardando configuración:', error)
        toast.error('Error al guardar la configuración')
        return
      }

      toast.success('Configuración guardada exitosamente')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configuración del Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </CardContent>
      </Card>
    )
  }

  if (!configuracion) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configuración del Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No se pudo cargar la configuración.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configuración del Agente Virtual
          </CardTitle>
          <CardDescription>
            Configura las funcionalidades disponibles para el agente y su horario de operación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuración de Horarios */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-sm font-medium">Horario de Operación</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hora-inicio">Hora de Inicio</Label>
                <Input
                  id="hora-inicio"
                  type="time"
                  value={configuracion.hora_inicio}
                  onChange={(e) => handleTimeChange('hora_inicio', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora-fin">Hora de Fin</Label>
                <Input
                  id="hora-fin"
                  type="time"
                  value={configuracion.hora_fin}
                  onChange={(e) => handleTimeChange('hora_fin', e.target.value)}
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              El agente estará disponible de {configuracion.hora_inicio} a {configuracion.hora_fin}
            </p>
          </div>

          <Separator />

          {/* Configuración de Funcionalidades */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <h3 className="text-sm font-medium">Funcionalidades Disponibles</h3>
            </div>
            
            <div className="space-y-6">
              {/* Funcionalidades principales */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Funcionalidades Principales
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Card className={`p-4 transition-all ${configuracion.habilita_envios 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-envios" className="text-sm font-medium cursor-pointer">Habilitar Envíos</Label>
                      <Switch
                        id="habilita-envios"
                        checked={configuracion.habilita_envios}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_envios', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_planes_financiacion 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-planes" className="text-sm font-medium cursor-pointer">Planes de Financiación</Label>
                      <Switch
                        id="habilita-planes"
                        checked={configuracion.habilita_planes_financiacion}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_planes_financiacion', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_promociones 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-promociones" className="text-sm font-medium cursor-pointer">Habilitar Promociones</Label>
                      <Switch
                        id="habilita-promociones"
                        checked={configuracion.habilita_promociones}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_promociones', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_stock_sucursales 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-stock" className="text-sm font-medium cursor-pointer">Stock por Sucursales</Label>
                      <Switch
                        id="habilita-stock"
                        checked={configuracion.habilita_stock_sucursales}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_stock_sucursales', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_producto_sustituto 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-sustituto" className="text-sm font-medium cursor-pointer">Producto Sustituto</Label>
                      <Switch
                        id="habilita-sustituto"
                        checked={configuracion.habilita_producto_sustituto}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_producto_sustituto', checked)}
                      />
                    </div>
                  </Card>
                </div>
              </div>
              
              {/* Funcionalidades adicionales */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Consultas y Búsquedas
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Card className={`p-4 transition-all ${configuracion.habilita_consulta_precios 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-precios" className="text-sm font-medium cursor-pointer">Consulta de Precios</Label>
                      <Switch
                        id="habilita-precios"
                        checked={configuracion.habilita_consulta_precios}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_consulta_precios', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_busqueda_productos 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-busqueda" className="text-sm font-medium cursor-pointer">Búsqueda de Productos</Label>
                      <Switch
                        id="habilita-busqueda"
                        checked={configuracion.habilita_busqueda_productos}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_busqueda_productos', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_informacion_categorias 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-categorias" className="text-sm font-medium cursor-pointer">Info. de Categorías</Label>
                      <Switch
                        id="habilita-categorias"
                        checked={configuracion.habilita_informacion_categorias}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_informacion_categorias', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_informacion_marcas 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-marcas" className="text-sm font-medium cursor-pointer">Info. de Marcas</Label>
                      <Switch
                        id="habilita-marcas"
                        checked={configuracion.habilita_informacion_marcas}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_informacion_marcas', checked)}
                      />
                    </div>
                  </Card>
                  
                  <Card className={`p-4 transition-all ${configuracion.habilita_consulta_disponibilidad 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="habilita-disponibilidad" className="text-sm font-medium cursor-pointer">Consulta Disponibilidad</Label>
                      <Switch
                        id="habilita-disponibilidad"
                        checked={configuracion.habilita_consulta_disponibilidad}
                        onCheckedChange={(checked) => handleSwitchChange('habilita_consulta_disponibilidad', checked)}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información de guardado automático */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Los cambios se guardan automáticamente
            </p>
            <Button onClick={guardarConfiguracion} disabled={saving} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Todo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}