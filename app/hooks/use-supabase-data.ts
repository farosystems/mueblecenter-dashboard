"use client"

import { useState, useEffect } from 'react'
import { supabase, Producto, PlanFinanciacion, ProductoPlan, ProductoPlanDefault, Categoria, Marca, Zona, Configuracion, ConfiguracionZona, ConfiguracionWeb, PlanCategoria, StockSucursal, Presentacion, Linea, Tipo, ProductoDestacadoZona } from '@/lib/supabase'
import { testSupabaseConnection } from '@/lib/supabase-debug'
import { setupSupabaseAuth } from '@/lib/supabase-auth'
import { useUser } from '@clerk/nextjs'

export function useSupabaseData() {
  const { user, isLoaded } = useUser()
  const [productos, setProductos] = useState<Producto[]>([])
  const [planes, setPlanes] = useState<PlanFinanciacion[]>([])
  const [productosPorPlan, setProductosPorPlan] = useState<ProductoPlan[]>([])
  const [productosPorPlanDefault, setProductosPorPlanDefault] = useState<ProductoPlanDefault[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [planesCategorias, setPlanesCategorias] = useState<PlanCategoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([])
  const [lineas, setLineas] = useState<Linea[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [stockSucursales, setStockSucursales] = useState<StockSucursal[]>([])
  const [productosDestacadosZona, setProductosDestacadosZona] = useState<ProductoDestacadoZona[]>([])
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [configuracionZonas, setConfiguracionZonas] = useState<ConfiguracionZona[]>([])
  const [configuracionWeb, setConfiguracionWeb] = useState<ConfiguracionWeb | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar TODOS los productos en lotes
  const loadProductos = async () => {
    try {
      let allData: any[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true

      console.log('🔄 Cargando TODOS los productos...')

      while (hasMore) {
        const { data, error } = await supabase
          .from('productos')
          .select(`
            *,
            categoria:fk_id_categoria(*),
            marca:fk_id_marca(*),
            presentacion:presentacion_id(*),
            linea:linea_id(*),
            tipo:tipo_id(*)
          `)
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          from += batchSize
          console.log(`📦 Lote cargado: ${data.length} productos (Total: ${allData.length})`)

          if (data.length < batchSize) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      }

      console.log(`✅ TODOS los productos cargados: ${allData.length}`)
      setProductos(allData)
      return allData
    } catch (err) {
      setError('Error al cargar productos')
      console.error('Error loading productos:', err)
      return []
    }
  }

  // Cargar planes
  const loadPlanes = async () => {
    try {
      const { data, error } = await supabase
        .from('planes_financiacion')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlanes(data || [])
    } catch (err) {
      setError('Error al cargar planes')
      console.error('Error loading planes:', err)
    }
  }

  // Cargar relaciones planes-categorías
  const loadPlanesCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('planes_categorias')
        .select(`
          *,
          plan:fk_id_plan(*),
          categoria:fk_id_categoria(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlanesCategorias(data || [])
    } catch (err) {
      setError('Error al cargar relaciones planes-categorías')
      console.error('Error loading planes_categorias:', err)
    }
  }

  // Cargar productos por plan (carga ligera inicial)
  const loadProductosPorPlan = async () => {
    try {
      // Cargar primero los datos básicos
      const { data: planesData, error } = await supabase
        .from('producto_planes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error en query producto_planes:', error)
        throw error
      }

      // Cargar productos y planes relacionados
      const productosIds = [...new Set(planesData?.map(p => p.fk_id_producto) || [])]
      const planesIds = [...new Set(planesData?.map(p => p.fk_id_plan) || [])]

      const [{ data: productosData }, { data: planesFinData }] = await Promise.all([
        supabase.from('productos').select('id, codigo, descripcion, precio, destacado').in('id', productosIds),
        supabase.from('planes_financiacion').select('id, nombre, cuotas, recargo_porcentual, recargo_fijo, anticipo_minimo, anticipo_minimo_fijo').in('id', planesIds)
      ])

      // Crear mapas para búsqueda rápida
      const productosMap = new Map(productosData?.map(p => [p.id, p]) || [])
      const planesMap = new Map(planesFinData?.map(p => [p.id, p]) || [])

      // Combinar los datos
      const transformedData = planesData?.map(item => ({
        ...item,
        producto: productosMap.get(item.fk_id_producto),
        plan: planesMap.get(item.fk_id_plan)
      })) || []

      console.log(`✅ Productos por plan cargados: ${transformedData.length} registros`)
      setProductosPorPlan(transformedData)
    } catch (err) {
      setError('Error al cargar productos por plan')
      console.error('Error loading productos_plan:', err)
    }
  }

  // Cargar productos por plan por defecto (carga ligera inicial)
  const loadProductosPorPlanDefault = async () => {
    try {
      const { data, error } = await supabase
        .from('producto_planes_default')
        .select(`
          *,
          producto:fk_id_producto(*),
          plan:fk_id_plan(*)
        `)
        .order('created_at', { ascending: false })
        .limit(500) // Limitar carga inicial

      if (error) throw error
      setProductosPorPlanDefault(data || [])
    } catch (err) {
      setError('Error al cargar productos por plan por defecto')
      console.error('Error loading productos_planes_default:', err)
    }
  }

  // Cargar categorías
  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('descripcion', { ascending: true })

      if (error) throw error
      setCategorias(data || [])
    } catch (err) {
      setError('Error al cargar categorías')
      console.error('Error loading categorias:', err)
    }
  }

  // Cargar marcas
  const loadMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .order('descripcion', { ascending: true })

      if (error) throw error
      setMarcas(data || [])
    } catch (err) {
      setError('Error al cargar marcas')
      console.error('Error loading marcas:', err)
    }
  }

  // Cargar presentaciones
  const loadPresentaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('presentaciones')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw error
      setPresentaciones(data || [])
    } catch (err) {
      setError('Error al cargar presentaciones')
      console.error('Error loading presentaciones:', err)
    }
  }

  // Cargar líneas
  const loadLineas = async () => {
    try {
      const { data, error } = await supabase
        .from('lineas')
        .select(`
          *,
          presentacion:presentacion_id(*)
        `)
        .order('nombre', { ascending: true })

      if (error) throw error
      setLineas(data || [])
    } catch (err) {
      setError('Error al cargar líneas')
      console.error('Error loading lineas:', err)
    }
  }

  // Cargar tipos
  const loadTipos = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos')
        .select(`
          *,
          linea:linea_id(
            *,
            presentacion:presentacion_id(*)
          )
        `)
        .order('nombre', { ascending: true })

      if (error) throw error
      setTipos(data || [])
    } catch (err) {
      setError('Error al cargar tipos')
      console.error('Error loading tipos:', err)
    }
  }

  // Cargar zonas
  const loadZonas = async () => {
    try {
      const { data, error } = await supabase
        .from('zonas')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw error
      setZonas(data || [])
    } catch (err) {
      setError('Error al cargar zonas')
      console.error('Error loading zonas:', err)
    }
  }

  // Cargar stock por sucursales
  const loadStockSucursales = async () => {
    try {
      // Cargar todos los registros sin límite de 1000
      let allData: any[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('stock_sucursales')
          .select(`
            *,
            producto:fk_id_producto(*),
            zona:fk_id_zona(*)
          `)
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1)

        if (error) throw error
        
        if (data && data.length > 0) {
          allData = [...allData, ...data]
          from += batchSize
          hasMore = data.length === batchSize
        } else {
          hasMore = false
        }
      }

      console.log(`✅ Stock sucursales cargados: ${allData.length} registros`)
      setStockSucursales(allData)
    } catch (err) {
      setError('Error al cargar stock por sucursales')
      console.error('Error loading stock_sucursales:', err)
    }
  }

  // Cargar productos destacados por zona
  const loadProductosDestacadosZona = async () => {
    try {
      const { data, error } = await supabase
        .from('productos_destacados_zona')
        .select(`
          *,
          producto:fk_id_producto(*),
          zona:fk_id_zona(*)
        `)
        .order('orden', { ascending: true })

      if (error) throw error
      setProductosDestacadosZona(data || [])
    } catch (err) {
      setError('Error al cargar productos destacados por zona')
      console.error('Error loading productos_destacados_zona:', err)
    }
  }

  // Cargar configuración de zonas
  const loadConfiguracionZonas = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_zonas')
        .select(`
          *,
          zona:fk_id_zona(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setConfiguracionZonas(data || [])
    } catch (err) {
      setError('Error al cargar configuración de zonas')
      console.error('Error loading configuracion_zonas:', err)
    }
  }

  // Crear producto
  const createProducto = async (producto: Omit<Producto, 'id' | 'created_at' | 'categoria' | 'marca'>) => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([producto])
        .select()

      if (error) throw error

      // Crear asociaciones automáticas por defecto basadas en los booleanos
      if (data?.[0]) {
        const productoCreado = data[0] as Producto
        console.log('Producto creado, verificando asociaciones automáticas:', {
          id: productoCreado.id,
          aplica_todos_plan: productoCreado.aplica_todos_plan,
          aplica_solo_categoria: productoCreado.aplica_solo_categoria,
          aplica_plan_especial: productoCreado.aplica_plan_especial
        })

        // Solo crear asociaciones si alguno de los booleanos está activado
        if (productoCreado.aplica_todos_plan || productoCreado.aplica_solo_categoria) {
          try {
            await createDefaultAssociationsForProduct(productoCreado)
          } catch (associationError) {
            console.error('Error creando asociaciones automáticas:', associationError)
            // No lanzar el error para no fallar la creación del producto
          }
        } else {
          console.log('Producto no requiere asociaciones automáticas (solo plan especial o ninguno)')
        }
      }

      await loadProductos()
      return data?.[0]
    } catch (err) {
      setError('Error al crear producto')
      console.error('Error creating producto:', err)
      throw err
    }
  }

  // Actualizar producto
  const updateProducto = async (id: number, updates: Partial<Producto>) => {
    try {
      console.log('Actualizando producto:', { id, updates })

      // Obtener el producto actual antes de actualizarlo
      const { data: productoActual, error: fetchError } = await supabase
        .from('productos')
        .select('aplica_todos_plan, aplica_solo_categoria, aplica_plan_especial')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Convertir undefined a null para que Supabase limpie los campos
      const updatesForSupabase = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [
          key,
          value === undefined ? null : value
        ])
      )

      console.log('Updates para Supabase:', updatesForSupabase)

      const { data, error } = await supabase
        .from('productos')
        .update(updatesForSupabase)
        .eq('id', id)
        .select()

      if (error) throw error

      console.log('Producto actualizado exitosamente:', data?.[0])

      // Verificar si realmente cambiaron los booleanos de asociación comparando con el producto original
      const hasAssociationChanges =
        (updates.aplica_todos_plan !== undefined && updates.aplica_todos_plan !== productoActual.aplica_todos_plan) ||
        (updates.aplica_solo_categoria !== undefined && updates.aplica_solo_categoria !== productoActual.aplica_solo_categoria) ||
        (updates.aplica_plan_especial !== undefined && updates.aplica_plan_especial !== productoActual.aplica_plan_especial)

      if (hasAssociationChanges && data?.[0]) {
        const productoActualizado = data[0] as Producto
        console.log('Cambios REALES en asociaciones detectados, regenerando asociaciones por defecto para producto:', productoActualizado.id)
        console.log('Valores anteriores:', productoActual)
        console.log('Valores nuevos:', {
          aplica_todos_plan: productoActualizado.aplica_todos_plan,
          aplica_solo_categoria: productoActualizado.aplica_solo_categoria,
          aplica_plan_especial: productoActualizado.aplica_plan_especial
        })

        try {
          // Eliminar asociaciones por defecto existentes para este producto
          const { error: deleteError } = await supabase
            .from('producto_planes_default')
            .delete()
            .eq('fk_id_producto', id)

          if (deleteError) {
            console.error('Error eliminando asociaciones existentes:', deleteError)
          } else {
            console.log('Asociaciones por defecto existentes eliminadas para producto:', id)
          }

          // Crear nuevas asociaciones basadas en los booleanos actualizados
          if (productoActualizado.aplica_todos_plan || productoActualizado.aplica_solo_categoria) {
            await createDefaultAssociationsForProduct(productoActualizado)
          } else {
            console.log('Producto actualizado no requiere asociaciones automáticas (solo plan especial o ninguno)')
          }
        } catch (associationError) {
          console.error('Error regenerando asociaciones automáticas:', associationError)
          // No lanzar el error para no fallar la actualización del producto
        }
      } else {
        console.log('No hay cambios reales en los booleanos de asociación, no se regeneran asociaciones')
      }

      await loadProductos()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar producto')
      console.error('Error updating producto:', err)
      throw err
    }
  }

  // Eliminar producto
  const deleteProducto = async (id: number) => {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadProductos()
    } catch (err) {
      setError('Error al eliminar producto')
      console.error('Error deleting producto:', err)
      throw err
    }
  }

  // Obtener planes asociados a un producto
  const getPlanesAsociados = async (productoId: number) => {
    try {
      const { data, error } = await supabase
        .from('producto_planes')
        .select(`
          *,
          plan:fk_id_plan(*)
        `)
        .eq('fk_id_producto', productoId)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error getting planes asociados:', err)
      return []
    }
  }

  // Crear plan
  const createPlan = async (plan: Omit<PlanFinanciacion, 'id' | 'created_at' | 'updated_at' | 'categorias'>) => {
    try {
      const { data, error } = await supabase
        .from('planes_financiacion')
        .insert([plan])
        .select()

      if (error) throw error
      await loadPlanes()
      return data?.[0]
    } catch (err) {
      setError('Error al crear plan')
      console.error('Error creating plan:', err)
      throw err
    }
  }

  // Actualizar plan
  const updatePlan = async (id: number, updates: Partial<PlanFinanciacion>) => {
    try {
      const { data, error } = await supabase
        .from('planes_financiacion')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error

      // Si se está actualizando el estado 'activo' del plan, sincronizar con producto_planes_default
      if (updates.activo !== undefined) {
        console.log(`Sincronizando asociaciones del plan ${id} con estado activo: ${updates.activo}`)
        
        const { error: syncError } = await supabase
          .from('producto_planes_default')
          .update({ activo: updates.activo })
          .eq('fk_id_plan', id)

        if (syncError) {
          console.error('Error al sincronizar asociaciones:', syncError)
          // No lanzar error para no fallar la actualización del plan
        } else {
          console.log('Asociaciones sincronizadas exitosamente')
          // Recargar los datos de producto_planes_default
          await loadProductosPorPlanDefault()
        }
      }

      await loadPlanes()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar plan')
      console.error('Error updating plan:', err)
      throw err
    }
  }

  // Eliminar plan
  const deletePlan = async (id: number) => {
    try {
      const { error } = await supabase
        .from('planes_financiacion')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadPlanes()
    } catch (err) {
      setError('Error al eliminar plan')
      console.error('Error deleting plan:', err)
      throw err
    }
  }

  // Sincronizar estado activo de todas las asociaciones de un plan
  const syncPlanAssociationsStatus = async (planId: number, activo: boolean) => {
    try {
      console.log(`Sincronizando todas las asociaciones del plan ${planId} con estado: ${activo}`)
      
      const { error } = await supabase
        .from('producto_planes_default')
        .update({ activo })
        .eq('fk_id_plan', planId)

      if (error) throw error
      
      // Recargar los datos
      await loadProductosPorPlanDefault()
      
      console.log('Sincronización completada exitosamente')
      return true
    } catch (err) {
      setError('Error al sincronizar asociaciones del plan')
      console.error('Error syncing plan associations:', err)
      throw err
    }
  }

  // Crear categoría
  const createCategoria = async (categoria: Omit<Categoria, 'id' | 'created_at'>) => {
    try {
      console.log('Creando categoría con payload:', categoria)
      const { data, error } = await supabase
        .from('categorias')
        .insert([categoria])
        .select()

      if (error) {
        console.error('Error de Supabase:', error)
        throw error
      }
      await loadCategorias()
      return data?.[0]
    } catch (err) {
      setError('Error al crear categoría')
      console.error('Error creating categoria:', err)
      throw err
    }
  }

  // Actualizar categoría
  const updateCategoria = async (id: number, updates: Partial<Categoria>) => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadCategorias()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar categoría')
      console.error('Error updating categoria:', err)
      throw err
    }
  }

  // Eliminar categoría
  const deleteCategoria = async (id: number) => {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadCategorias()
    } catch (err) {
      setError('Error al eliminar categoría')
      console.error('Error deleting categoria:', err)
      throw err
    }
  }

  // Crear marca
  const createMarca = async (marca: Omit<Marca, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .insert([marca])
        .select()

      if (error) throw error
      await loadMarcas()
      return data?.[0]
    } catch (err) {
      setError('Error al crear marca')
      console.error('Error creating marca:', err)
      throw err
    }
  }

  // Actualizar marca
  const updateMarca = async (id: number, updates: Partial<Marca>) => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadMarcas()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar marca')
      console.error('Error updating marca:', err)
      throw err
    }
  }

  // Eliminar marca
  const deleteMarca = async (id: number) => {
    try {
      const { error } = await supabase
        .from('marcas')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadMarcas()
    } catch (err) {
      setError('Error al eliminar marca')
      console.error('Error deleting marca:', err)
      throw err
    }
  }

  // CRUD para Presentaciones
  const createPresentacion = async (presentacion: Omit<Presentacion, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('presentaciones')
        .insert([presentacion])
        .select()

      if (error) throw error
      await loadPresentaciones()
      return data?.[0]
    } catch (err) {
      setError('Error al crear presentación')
      console.error('Error creating presentacion:', err)
      throw err
    }
  }

  const updatePresentacion = async (id: string, updates: Partial<Presentacion>) => {
    try {
      const { data, error } = await supabase
        .from('presentaciones')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadPresentaciones()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar presentación')
      console.error('Error updating presentacion:', err)
      throw err
    }
  }

  const deletePresentacion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('presentaciones')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadPresentaciones()
      await loadLineas() // Recargar líneas porque pueden haber sido eliminadas en cascada
      await loadTipos() // Recargar tipos porque pueden haber sido eliminados en cascada
      await loadProductos() // Recargar productos porque pueden haber perdido referencia
    } catch (err) {
      setError('Error al eliminar presentación')
      console.error('Error deleting presentacion:', err)
      throw err
    }
  }

  // CRUD para Líneas
  const createLinea = async (linea: Omit<Linea, 'id' | 'created_at' | 'updated_at' | 'presentacion'>) => {
    try {
      const { data, error } = await supabase
        .from('lineas')
        .insert([linea])
        .select()

      if (error) throw error
      await loadLineas()
      return data?.[0]
    } catch (err) {
      setError('Error al crear línea')
      console.error('Error creating linea:', err)
      throw err
    }
  }

  const updateLinea = async (id: string, updates: Partial<Linea>) => {
    try {
      const { data, error } = await supabase
        .from('lineas')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadLineas()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar línea')
      console.error('Error updating linea:', err)
      throw err
    }
  }

  const deleteLinea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lineas')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadLineas()
      await loadTipos() // Recargar tipos porque pueden haber sido eliminados en cascada
      await loadProductos() // Recargar productos porque pueden haber perdido referencia
    } catch (err) {
      setError('Error al eliminar línea')
      console.error('Error deleting linea:', err)
      throw err
    }
  }

  // CRUD para Tipos
  const createTipo = async (tipo: Omit<Tipo, 'id' | 'created_at' | 'updated_at' | 'linea'>) => {
    try {
      const { data, error } = await supabase
        .from('tipos')
        .insert([tipo])
        .select()

      if (error) throw error
      await loadTipos()
      return data?.[0]
    } catch (err) {
      setError('Error al crear tipo')
      console.error('Error creating tipo:', err)
      throw err
    }
  }

  const updateTipo = async (id: string, updates: Partial<Tipo>) => {
    try {
      const { data, error } = await supabase
        .from('tipos')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadTipos()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar tipo')
      console.error('Error updating tipo:', err)
      throw err
    }
  }

  const deleteTipo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tipos')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadTipos()
      await loadProductos() // Recargar productos porque pueden haber perdido referencia
    } catch (err) {
      setError('Error al eliminar tipo')
      console.error('Error deleting tipo:', err)
      throw err
    }
  }

  // Crear zona
  const createZona = async (zona: Omit<Zona, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('zonas')
        .insert([zona])
        .select()

      if (error) throw error
      await loadZonas()
      return data?.[0]
    } catch (err) {
      setError('Error al crear zona')
      console.error('Error creating zona:', err)
      throw err
    }
  }

  // Actualizar zona
  const updateZona = async (id: number, updates: Partial<Zona>) => {
    try {
      const { data, error } = await supabase
        .from('zonas')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadZonas()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar zona')
      console.error('Error updating zona:', err)
      throw err
    }
  }

  // Eliminar zona
  const deleteZona = async (id: number) => {
    try {
      const { error } = await supabase
        .from('zonas')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadZonas()
    } catch (err) {
      setError('Error al eliminar zona')
      console.error('Error deleting zona:', err)
      throw err
    }
  }

  // Crear stock sucursal
  const createStockSucursal = async (stockSucursal: Omit<StockSucursal, 'id' | 'created_at' | 'updated_at' | 'producto' | 'zona'>) => {
    try {
      const { data, error } = await supabase
        .from('stock_sucursales')
        .insert([stockSucursal])
        .select()

      if (error) throw error
      await loadStockSucursales()
      return data?.[0]
    } catch (err) {
      setError('Error al crear stock sucursal')
      console.error('Error creating stock_sucursal:', err)
      throw err
    }
  }

  // Actualizar stock sucursal
  const updateStockSucursal = async (id: number, updates: Partial<StockSucursal>) => {
    try {
      const { data, error } = await supabase
        .from('stock_sucursales')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadStockSucursales()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar stock sucursal')
      console.error('Error updating stock_sucursal:', err)
      throw err
    }
  }

  // Eliminar stock sucursal
  const deleteStockSucursal = async (id: number) => {
    try {
      const { error } = await supabase
        .from('stock_sucursales')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadStockSucursales()
    } catch (err) {
      setError('Error al eliminar stock sucursal')
      console.error('Error deleting stock_sucursal:', err)
      throw err
    }
  }

  // Importar stock sucursales desde CSV/XLSX
  const importStockSucursales = async (data: any[]) => {
    try {
      console.log('Importando stock sucursales:', data)
      
      // Validar que los datos tienen los campos requeridos
      const validData = data.filter(item => 
        item.fk_id_producto && 
        item.fk_id_zona && 
        item.stock !== undefined
      )

      if (validData.length === 0) {
        throw new Error('No hay datos válidos para importar')
      }

      // Obtener todos los registros existentes de una vez
      const { data: existingRecords, error: fetchError } = await supabase
        .from('stock_sucursales')
        .select('id, fk_id_producto, fk_id_zona')

      if (fetchError) {
        console.error('Error obteniendo registros existentes:', fetchError)
        throw fetchError
      }

      // Crear un mapa para búsqueda rápida
      const existingMap = new Map()
      existingRecords?.forEach(record => {
        const key = `${record.fk_id_producto}-${record.fk_id_zona}`
        existingMap.set(key, record.id)
      })

      const toInsert: any[] = []
      const toUpdate: any[] = []

      // Clasificar datos en insertar vs actualizar
      validData.forEach(item => {
        const key = `${item.fk_id_producto}-${item.fk_id_zona}`
        const existingId = existingMap.get(key)
        
        if (existingId) {
          toUpdate.push({ ...item, id: existingId })
        } else {
          toInsert.push(item)
        }
      })

      let insertedCount = 0
      let updatedCount = 0

      // Insertar nuevos registros
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('stock_sucursales')
          .insert(toInsert)
        
        if (insertError) {
          console.error('Error insertando registros:', insertError)
          throw insertError
        }
        insertedCount = toInsert.length
      }

      // Actualizar registros existentes (uno por uno debido a limitaciones de Supabase)
      for (const item of toUpdate) {
        try {
          const { id, ...updateData } = item
          const { error: updateError } = await supabase
            .from('stock_sucursales')
            .update(updateData)
            .eq('id', id)
          
          if (updateError) {
            console.error('Error actualizando registro:', updateError)
            continue
          }
          updatedCount++
        } catch (error) {
          console.error('Error en actualización individual:', error)
          continue
        }
      }

      console.log(`Importación completada: ${insertedCount} nuevos, ${updatedCount} actualizados`)
      
      await loadStockSucursales()
      console.log(`Se procesaron ${insertedCount + updatedCount} registros de stock (${insertedCount} nuevos, ${updatedCount} actualizados)`)
      
      return {
        success: true,
        imported: insertedCount + updatedCount,
        inserted: insertedCount,
        updated: updatedCount,
        total: data.length
      }
    } catch (err) {
      setError('Error al importar stock sucursales')
      console.error('Error importing stock_sucursales:', err)
      throw err
    }
  }

  // Crear configuración de zona
  const createConfiguracionZona = async (configuracionZona: Omit<ConfiguracionZona, 'id' | 'created_at' | 'zona'>) => {
    try {
      const { data, error } = await supabase
        .from('configuracion_zonas')
        .insert([configuracionZona])
        .select()

      if (error) throw error
      await loadConfiguracionZonas()
      return data?.[0]
    } catch (err) {
      setError('Error al crear configuración de zona')
      console.error('Error creating configuracion_zona:', err)
      throw err
    }
  }

  // Actualizar configuración de zona
  const updateConfiguracionZona = async (id: number, updates: Partial<ConfiguracionZona>) => {
    try {
      const { data, error } = await supabase
        .from('configuracion_zonas')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadConfiguracionZonas()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar configuración de zona')
      console.error('Error updating configuracion_zona:', err)
      throw err
    }
  }

  // Eliminar configuración de zona
  const deleteConfiguracionZona = async (id: number) => {
    try {
      const { error } = await supabase
        .from('configuracion_zonas')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadConfiguracionZonas()
    } catch (err) {
      setError('Error al eliminar configuración de zona')
      console.error('Error deleting configuracion_zona:', err)
      throw err
    }
  }

  // Crear producto por plan
  const createProductoPlan = async (productoPlan: Omit<ProductoPlan, 'id' | 'created_at' | 'producto' | 'plan'>) => {
    try {
      const { data, error } = await supabase
        .from('producto_planes')
        .insert([productoPlan])
        .select()

      if (error) throw error
      await loadProductosPorPlan()
      return data?.[0]
    } catch (err) {
      setError('Error al crear producto por plan')
      console.error('Error creating producto_plan:', err)
      throw err
    }
  }

  // Crear múltiples productos por plan
  const createMultipleProductoPlan = async (productoIds: number[], planId: number, activo: boolean, destacado: boolean, precio_promo?: number) => {
    try {
      // Crear un array de asociaciones
      const associations = productoIds.map(productoId => ({
        fk_id_producto: productoId,
        fk_id_plan: planId,
        activo,
        destacado,
        precio_promo: precio_promo || null,
      }))

      // Insertar todas las asociaciones de una vez
      const { data, error } = await supabase
        .from('producto_planes')
        .insert(associations)
        .select()

      if (error) throw error
      await loadProductosPorPlan()
      console.log(`✅ Se crearon ${data?.length || 0} asociaciones de productos por plan`)
    } catch (err) {
      setError('Error al crear múltiples productos por plan')
      console.error('Error creating multiple producto_plan:', err)
      throw err
    }
  }

  // Actualizar producto por plan
  const updateProductoPlan = async (id: number, updates: Partial<ProductoPlan>) => {
    try {
      const { data, error } = await supabase
        .from('producto_planes')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadProductosPorPlan()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar producto por plan')
      console.error('Error updating producto_plan:', err)
      throw err
    }
  }

  // Eliminar producto por plan
  const deleteProductoPlan = async (id: number) => {
    try {
      const { error } = await supabase
        .from('producto_planes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadProductosPorPlan()
    } catch (err) {
      setError('Error al eliminar producto por plan')
      console.error('Error deleting producto_plan:', err)
      throw err
    }
  }

  // Crear asociación por defecto
  const createProductoPlanDefault = async (productoPlanDefault: Omit<ProductoPlanDefault, 'id' | 'created_at' | 'producto' | 'plan'>) => {
    try {
      const { data, error } = await supabase
        .from('producto_planes_default')
        .insert([productoPlanDefault])
        .select()

      if (error) throw error
      await loadProductosPorPlanDefault()
      return data?.[0]
    } catch (err) {
      setError('Error al crear asociación por defecto')
      console.error('Error creating producto_plan_default:', err)
      throw err
    }
  }

  // Actualizar asociación por defecto
  const updateProductoPlanDefault = async (id: number, productoPlanDefault: Partial<ProductoPlanDefault>) => {
    try {
      const { data, error } = await supabase
        .from('producto_planes_default')
        .update(productoPlanDefault)
        .eq('id', id)
        .select()

      if (error) throw error
      await loadProductosPorPlanDefault()
      return data?.[0]
    } catch (err) {
      setError('Error al actualizar asociación por defecto')
      console.error('Error updating producto_plan_default:', err)
      throw err
    }
  }

  // Eliminar asociación por defecto por ID
  const deleteProductoPlanDefault = async (id: number) => {
    try {
      const { error } = await supabase
        .from('producto_planes_default')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadProductosPorPlanDefault()
    } catch (err) {
      setError('Error al eliminar asociación por defecto')
      console.error('Error deleting producto_plan_default:', err)
      throw err
    }
  }

  // Crear asociaciones por defecto para un producto según los booleanos
  const createDefaultAssociationsForProduct = async (producto: Producto) => {
    try {
      console.log('Creando asociaciones por defecto para producto:', producto.id, 'con booleanos:', {
        aplica_todos_plan: producto.aplica_todos_plan,
        aplica_solo_categoria: producto.aplica_solo_categoria,
        aplica_plan_especial: producto.aplica_plan_especial
      })

      // Si solo aplica plan especial, no crear asociaciones por defecto
      if (producto.aplica_plan_especial && !producto.aplica_todos_plan && !producto.aplica_solo_categoria) {
        console.log('Producto solo aplica plan especial, no se crean asociaciones por defecto')
        return
      }

      // Obtener todos los planes activos
      const { data: todosLosPlanes, error: planesError } = await supabase
        .from('planes_financiacion')
        .select('id')
        .eq('activo', true)

      if (planesError) throw planesError

      // Obtener las categorías de cada plan
      const { data: planesCategorias, error: categoriasError } = await supabase
        .from('planes_categorias')
        .select('fk_id_plan, fk_id_categoria')

      if (categoriasError) throw categoriasError

      // Crear un mapa de planes con sus categorías
      const planesConCategorias = new Map()
      planesCategorias?.forEach(pc => {
        if (!planesConCategorias.has(pc.fk_id_plan)) {
          planesConCategorias.set(pc.fk_id_plan, [])
        }
        planesConCategorias.get(pc.fk_id_plan).push(pc.fk_id_categoria)
      })

      // Separar planes con y sin categorías
      const planesConCategoria = todosLosPlanes?.filter(plan => planesConCategorias.has(plan.id)) || []
      const planesSinCategoria = todosLosPlanes?.filter(plan => !planesConCategorias.has(plan.id)) || []

      let planesParaAsociar: any[] = []

      // Lógica según los booleanos
      if (producto.aplica_todos_plan) {
        // Aplica a todos los planes que NO tengan categoría definida
        // Y también a planes que SÍ tengan categoría definida si coincide con la categoría del producto
        console.log('Producto aplica a todos los planes:', producto.id)
        console.log('Planes sin categoría disponibles:', planesSinCategoria)
        
        let planesParaAsociarTodos = [...planesSinCategoria]
        
        // Si el producto tiene categoría, también incluir planes con esa categoría específica
        if (producto.fk_id_categoria) {
          console.log('Filtrando planes con categoría del producto:', producto.fk_id_categoria)
          console.log('Planes con categorías disponibles:', planesConCategoria.map(p => ({ id: p.id, categorias: planesConCategorias.get(p.id) })))
          
          const planesDeCategoria = planesConCategoria.filter(plan => {
            const categoriasDelPlan = planesConCategorias.get(plan.id) || []
            const incluyeCategoria = categoriasDelPlan.includes(producto.fk_id_categoria!)
            console.log(`Plan ${plan.id} tiene categorías: [${categoriasDelPlan.join(', ')}], incluye ${producto.fk_id_categoria}: ${incluyeCategoria}`)
            return incluyeCategoria
          })
          
          planesParaAsociarTodos = [...planesParaAsociarTodos, ...planesDeCategoria]
          console.log('Planes filtrados por categoría:', planesDeCategoria)
        }
        
        planesParaAsociar = planesParaAsociarTodos
        console.log('Total de planes para asociar (aplica_todos_plan):', planesParaAsociar.length)
      } else if (producto.aplica_solo_categoria && producto.fk_id_categoria) {
        // Aplica solo a planes de su categoría
        console.log('Filtrando planes para categoría del producto:', producto.fk_id_categoria)
        console.log('Planes con categorías disponibles:', planesConCategoria.map(p => ({ id: p.id, categorias: planesConCategorias.get(p.id) })))
        
        const planesDeCategoria = planesConCategoria.filter(plan => {
          const categoriasDelPlan = planesConCategorias.get(plan.id) || []
          const incluyeCategoria = categoriasDelPlan.includes(producto.fk_id_categoria!)
          console.log(`Plan ${plan.id} tiene categorías: [${categoriasDelPlan.join(', ')}], incluye ${producto.fk_id_categoria}: ${incluyeCategoria}`)
          return incluyeCategoria
        })
        planesParaAsociar = planesDeCategoria
        console.log('Planes filtrados por categoría:', planesDeCategoria)
      }

      console.log('Planes seleccionados para asociar:', planesParaAsociar)

      // Crear asociaciones por defecto
      if (planesParaAsociar.length > 0) {
        const defaultAssociations = planesParaAsociar.map(plan => ({
          fk_id_producto: producto.id,
          fk_id_plan: plan.id
        }))

        const { error } = await supabase
          .from('producto_planes_default')
          .insert(defaultAssociations)

        if (error) throw error
        console.log('Asociaciones por defecto creadas:', defaultAssociations.length)
      }

      await loadProductosPorPlanDefault()
    } catch (err) {
      setError('Error al crear asociaciones por defecto para el producto')
      console.error('Error creating default associations:', err)
      throw err
    }
  }

  // Obtener categorías de un plan
  const getCategoriasDePlan = async (planId: number) => {
    try {
      const { data, error } = await supabase
        .from('planes_categorias')
        .select(`
          *,
          categoria:fk_id_categoria(*)
        `)
        .eq('fk_id_plan', planId)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error getting categorias de plan:', err)
      return []
    }
  }

  // Cargar configuración general
  const loadConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setConfiguracion(data)
    } catch (err) {
      setError('Error al cargar configuración')
      console.error('Error loading configuracion:', err)
    }
  }

  // Actualizar configuración general
  const updateConfiguracion = async (updates: Partial<Pick<Configuracion, 'logo' | 'titulo' | 'subtitulo'>>) => {
    try {
      let { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code === 'PGRST116') {
        // Si no existe, crear el registro
        const { data: newData, error: insertError } = await supabase
          .from('configuracion')
          .insert([updates])
          .select()
          .single()

        if (insertError) throw insertError
        setConfiguracion(newData)
        return newData
      } else if (error) {
        throw error
      } else {
        // Si existe, actualizar
        const { data: updatedData, error: updateError } = await supabase
          .from('configuracion')
          .update(updates)
          .eq('id', data.id)
          .select()
          .single()

        if (updateError) throw updateError
        setConfiguracion(updatedData)
        return updatedData
      }
    } catch (err) {
      setError('Error al actualizar configuración')
      console.error('Error updating configuracion:', err)
      throw err
    }
  }

  // Cargar configuración web
  const loadConfiguracionWeb = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_web')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setConfiguracionWeb(data)
    } catch (err) {
      setError('Error al cargar configuración web')
      console.error('Error loading configuracion_web:', err)
    }
  }

  // Actualizar configuración web
  const updateConfiguracionWeb = async (updates: Partial<Pick<ConfiguracionWeb, 'banner' | 'banner_2' | 'banner_3'>>) => {
    try {
      let { data, error } = await supabase
        .from('configuracion_web')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code === 'PGRST116') {
        // Si no existe, crear el registro
        const { data: newData, error: insertError } = await supabase
          .from('configuracion_web')
          .insert([updates])
          .select()
          .single()

        if (insertError) throw insertError
        setConfiguracionWeb(newData)
        return newData
      } else if (error) {
        throw error
      } else {
        // Si existe, actualizar
        const { data: updatedData, error: updateError } = await supabase
          .from('configuracion_web')
          .update(updates)
          .eq('id', data.id)
          .select()
          .single()

        if (updateError) throw updateError
        setConfiguracionWeb(updatedData)
        return updatedData
      }
    } catch (err) {
      setError('Error al actualizar configuración web')
      console.error('Error updating configuracion_web:', err)
      throw err
    }
  }

  // Cargar todos los datos cuando el usuario esté autenticado
  useEffect(() => {
    if (isLoaded && user) {
      setLoading(true)
      
      // Configurar autenticación de Supabase con Clerk
      setupSupabaseAuth().then(authSuccess => {
        if (!authSuccess) {
          console.warn('⚠️ No se pudo configurar la autenticación de Supabase, intentando sin autenticación...')
        }
        
        // Probar conexión a Supabase
        testSupabaseConnection().then(isConnected => {
          if (!isConnected) {
            setError('No se pudo conectar a la base de datos')
            setLoading(false)
            return
          }
          
          Promise.all([
            loadProductos(),
            loadPlanes(),
            loadProductosPorPlan(),
            loadProductosPorPlanDefault(),
            loadCategorias(),
            loadPlanesCategorias(),
            loadMarcas(),
            loadPresentaciones(),
            loadLineas(),
            loadTipos(),
            loadZonas(),
            loadStockSucursales(),
            loadProductosDestacadosZona(),
            loadConfiguracion(),
            loadConfiguracionZonas(),
            loadConfiguracionWeb()
          ]).finally(() => setLoading(false))
        })
      })
    }
  }, [isLoaded, user])

  return {
    productos,
    planes,
    productosPorPlan,
    productosPorPlanDefault,
    categorias,
    marcas,
    presentaciones,
    lineas,
    tipos,
    zonas,
    stockSucursales,
    productosDestacadosZona,
    configuracionZonas,
    loading,
    error,
    createProducto,
    updateProducto,
    deleteProducto,
    getPlanesAsociados,
    createPlan,
    updatePlan,
    deletePlan,
    syncPlanAssociationsStatus,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    createMarca,
    updateMarca,
    deleteMarca,
    createPresentacion,
    updatePresentacion,
    deletePresentacion,
    createLinea,
    updateLinea,
    deleteLinea,
    createTipo,
    updateTipo,
    deleteTipo,
    createZona,
    updateZona,
    deleteZona,
    createStockSucursal,
    updateStockSucursal,
    deleteStockSucursal,
    importStockSucursales,
    createConfiguracionZona,
    updateConfiguracionZona,
    deleteConfiguracionZona,
    createProductoPlan,
    createMultipleProductoPlan,
    updateProductoPlan,
    deleteProductoPlan,
    createProductoPlanDefault,
    updateProductoPlanDefault,
    deleteProductoPlanDefault,
    createDefaultAssociationsForProduct,
    getCategoriasDePlan,
    configuracion,
    updateConfiguracion,
    configuracionWeb,
    updateConfiguracionWeb,
    refreshData: () => {
      setLoading(true)
      Promise.all([
        loadProductos(),
        loadPlanes(),
        loadProductosPorPlan(),
        loadProductosPorPlanDefault(),
        loadCategorias(),
        loadPlanesCategorias(),
        loadMarcas(),
        loadPresentaciones(),
        loadLineas(),
        loadTipos(),
        loadZonas(),
        loadStockSucursales(),
        loadProductosDestacadosZona(),
        loadConfiguracion(),
        loadConfiguracionZonas(),
        loadConfiguracionWeb()
      ]).finally(() => setLoading(false))
    }
  }
} 