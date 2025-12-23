/**
 * ARCHIVO DE EJEMPLO PARA EL FRONTEND
 *
 * Copia este archivo a tu proyecto frontend (puedes nombrarlo utils/analytics.ts o lib/analytics.ts)
 * y úsalo para registrar eventos de analytics.
 */

import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase (usa las mismas credenciales que en el backend)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Tipos de eventos disponibles
 */
export type EventType =
  | 'page_view'                 // Visita a una página
  | 'whatsapp_click'            // Click en botón de WhatsApp
  | 'shopping_list_add'         // Agregar a lista de compras
  | 'shopping_list_remove'      // Remover de lista de compras
  | 'product_view'              // Visualización de producto
  | 'search'                    // Búsqueda realizada
  | 'plan_view'                 // Visualización de plan
  | 'category_view'             // Visualización de categoría
  | 'brand_view'                // Visualización de marca

/**
 * Interfaz para los parámetros del evento
 */
interface TrackEventParams {
  eventType: EventType
  eventData?: Record<string, any>
  productoId?: number
  zonaId?: number
  userId?: string
}

/**
 * Genera o recupera el ID de sesión del navegador
 */
function getOrCreateSessionId(): string {
  const SESSION_KEY = 'analytics_session_id'

  // Verificar si estamos en el navegador
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem(SESSION_KEY)

  if (!sessionId) {
    // Generar un ID único de sesión
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

/**
 * Función principal para registrar eventos de analytics
 *
 * @param params - Parámetros del evento
 * @returns Promise<void>
 *
 * @example
 * // Registrar una visita a la página
 * trackEvent({
 *   eventType: 'page_view',
 *   eventData: { page: 'home' }
 * })
 *
 * @example
 * // Registrar click en WhatsApp
 * trackEvent({
 *   eventType: 'whatsapp_click',
 *   eventData: { producto_nombre: producto.descripcion },
 *   productoId: producto.id
 * })
 */
export async function trackEvent({
  eventType,
  eventData = {},
  productoId,
  zonaId,
  userId
}: TrackEventParams): Promise<void> {
  try {
    // Obtener o crear session ID
    const sessionId = getOrCreateSessionId()

    // Insertar evento en Supabase
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: eventType,
        event_data: eventData,
        session_id: sessionId,
        user_id: userId,
        fk_id_producto: productoId,
        fk_id_zona: zonaId,
      })

    if (error) {
      console.error('Error tracking event:', error)
    }
  } catch (error) {
    // No lanzar error para no interrumpir la experiencia del usuario
    console.error('Error in trackEvent:', error)
  }
}

/**
 * Funciones helper para eventos comunes
 */

// Registrar visita a página
export function trackPageView(page: string, additionalData?: Record<string, any>) {
  return trackEvent({
    eventType: 'page_view',
    eventData: { page, ...additionalData }
  })
}

// Registrar click en WhatsApp
export function trackWhatsAppClick(productoId: number, productoNombre: string) {
  return trackEvent({
    eventType: 'whatsapp_click',
    eventData: { producto_nombre: productoNombre },
    productoId
  })
}

// Registrar agregar a lista de compras
export function trackShoppingListAdd(productoId: number, productoNombre: string) {
  return trackEvent({
    eventType: 'shopping_list_add',
    eventData: { producto_nombre: productoNombre },
    productoId
  })
}

// Registrar remover de lista de compras
export function trackShoppingListRemove(productoId: number, productoNombre: string) {
  return trackEvent({
    eventType: 'shopping_list_remove',
    eventData: { producto_nombre: productoNombre },
    productoId
  })
}

// Registrar visualización de producto
export function trackProductView(productoId: number, productoNombre: string) {
  return trackEvent({
    eventType: 'product_view',
    eventData: { producto_nombre: productoNombre },
    productoId
  })
}

// Registrar búsqueda
export function trackSearch(query: string, resultsCount: number) {
  return trackEvent({
    eventType: 'search',
    eventData: {
      query,
      results_count: resultsCount,
      timestamp: new Date().toISOString()
    }
  })
}

// Registrar visualización de plan
export function trackPlanView(planId: number, planNombre: string) {
  return trackEvent({
    eventType: 'plan_view',
    eventData: {
      plan_id: planId,
      plan_nombre: planNombre
    }
  })
}

/**
 * EJEMPLOS DE USO EN COMPONENTES
 */

/*

// EJEMPLO 1: Registrar visita a página principal
// En tu página principal (app/page.tsx o pages/index.tsx)
import { useEffect } from 'react'
import { trackPageView } from '@/lib/analytics'

export default function HomePage() {
  useEffect(() => {
    trackPageView('home')
  }, [])

  return <div>...</div>
}

// EJEMPLO 2: Click en botón de WhatsApp
// En tu componente de producto
import { trackWhatsAppClick } from '@/lib/analytics'

function ProductCard({ producto }) {
  const handleWhatsAppClick = () => {
    // Registrar evento
    trackWhatsAppClick(producto.id, producto.descripcion)

    // Abrir WhatsApp
    const mensaje = `Hola! Me interesa el producto: ${producto.descripcion}`
    window.open(`https://wa.me/5491234567890?text=${encodeURIComponent(mensaje)}`)
  }

  return (
    <button onClick={handleWhatsAppClick}>
      Consultar por WhatsApp
    </button>
  )
}

// EJEMPLO 3: Agregar/remover de lista de compras
// En tu componente de lista de compras
import { trackShoppingListAdd, trackShoppingListRemove } from '@/lib/analytics'

function ShoppingList() {
  const addToList = (producto) => {
    // Registrar evento
    trackShoppingListAdd(producto.id, producto.descripcion)

    // Agregar a la lista (tu lógica)
    // ...
  }

  const removeFromList = (producto) => {
    // Registrar evento
    trackShoppingListRemove(producto.id, producto.descripcion)

    // Remover de la lista (tu lógica)
    // ...
  }

  return <div>...</div>
}

// EJEMPLO 4: Visualización de producto
// En la página de detalle del producto
import { useEffect } from 'react'
import { trackProductView } from '@/lib/analytics'

function ProductDetailPage({ producto }) {
  useEffect(() => {
    if (producto) {
      trackProductView(producto.id, producto.descripcion)
    }
  }, [producto])

  return <div>...</div>
}

// EJEMPLO 5: Búsqueda
// En tu componente de búsqueda
import { trackSearch } from '@/lib/analytics'

function SearchBar() {
  const handleSearch = async (query: string) => {
    // Realizar búsqueda (tu lógica)
    const results = await searchProducts(query)

    // Registrar evento
    trackSearch(query, results.length)

    // Mostrar resultados
    // ...
  }

  return <input onChange={e => handleSearch(e.target.value)} />
}

// EJEMPLO 6: Hook personalizado para páginas
// Crear un hook para trackear visitas automáticamente
import { useEffect } from 'react'
import { trackPageView } from '@/lib/analytics'

export function usePageView(pageName: string) {
  useEffect(() => {
    trackPageView(pageName)
  }, [pageName])
}

// Uso:
function AboutPage() {
  usePageView('about')
  return <div>...</div>
}

*/
