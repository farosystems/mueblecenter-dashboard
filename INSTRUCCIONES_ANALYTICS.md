# Sistema de Estadísticas - Instrucciones de Uso

## Configuración Completada

Se ha implementado un sistema completo de estadísticas que incluye:

1. **Tablas en Supabase** (`analytics_events` y `analytics_daily_metrics`)
2. **Tipos TypeScript** para eventos y métricas
3. **Componente de dashboard** con filtros de fecha y visualizaciones
4. **Integración en el menú lateral** del admin

---

## Paso 1: Ejecutar la Migración en Supabase

Antes de usar el sistema, debes ejecutar la migración SQL en tu base de datos Supabase:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo: `supabase/migrations/create_analytics_tables.sql`
4. Ejecuta la query
5. Verifica que se crearon las tablas `analytics_events` y `analytics_daily_metrics`

---

## Paso 2: Registrar Eventos desde el Frontend

Desde tu proyecto de frontend (que comparte la misma base de datos), puedes registrar eventos usando el cliente de Supabase.

### Ejemplo de código para el frontend:

```typescript
// utils/analytics.ts o similar
import { createClient } from '@supabase/supabase-js'

// Usa las mismas credenciales de Supabase que en el backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Función helper para registrar eventos
export async function trackEvent(
  eventType: string,
  eventData?: Record<string, any>,
  productoId?: number,
  zonaId?: number
) {
  try {
    // Generar o recuperar session_id del localStorage
    let sessionId = localStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('analytics_session_id', sessionId)
    }

    await supabase.from('analytics_events').insert({
      event_type: eventType,
      event_data: eventData,
      session_id: sessionId,
      fk_id_producto: productoId,
      fk_id_zona: zonaId,
      // user_id se puede agregar si tienes autenticación
      // ip_address y user_agent se pueden capturar del lado del servidor
    })
  } catch (error) {
    console.error('Error tracking event:', error)
  }
}
```

### Ejemplos de uso en tu frontend:

#### 1. Registrar visita a la página principal
```typescript
// En tu página principal (home)
useEffect(() => {
  trackEvent('page_view', { page: 'home' })
}, [])
```

#### 2. Registrar click en botón de WhatsApp de un producto
```typescript
// En el componente del producto
const handleWhatsAppClick = (producto: Producto) => {
  trackEvent(
    'whatsapp_click',
    { producto_nombre: producto.descripcion },
    producto.id
  )

  // Luego abrir WhatsApp
  window.open(`https://wa.me/...`)
}
```

#### 3. Registrar agregar a lista de compras
```typescript
// En tu componente de lista de compras
const handleAddToShoppingList = (producto: Producto) => {
  trackEvent(
    'shopping_list_add',
    { producto_nombre: producto.descripcion },
    producto.id
  )

  // Luego agregar a la lista
  // ...
}
```

#### 4. Registrar visualización de producto
```typescript
// En la página de detalle del producto
useEffect(() => {
  if (producto) {
    trackEvent(
      'product_view',
      { producto_nombre: producto.descripcion },
      producto.id
    )
  }
}, [producto])
```

#### 5. Registrar búsqueda
```typescript
// En tu componente de búsqueda
const handleSearch = (query: string, resultsCount: number) => {
  trackEvent(
    'search',
    {
      query,
      results_count: resultsCount
    }
  )
}
```

---

## Tipos de Eventos Disponibles

Los siguientes tipos de eventos están predefinidos en el sistema:

- `page_view` - Visitas a páginas
- `whatsapp_click` - Clicks en botones de WhatsApp
- `shopping_list_add` - Agregar producto a lista de compras
- `shopping_list_remove` - Remover producto de lista de compras
- `product_view` - Visualización de detalles de producto
- `search` - Búsquedas realizadas
- `plan_view` - Visualización de planes de financiación
- `category_view` - Visualización de categorías
- `brand_view` - Visualización de marcas

Puedes agregar más tipos según necesites.

---

## Paso 3: Ver las Estadísticas en el Admin

1. Inicia sesión en el admin
2. Haz click en **"Estadísticas"** en el menú lateral
3. Selecciona el filtro de fecha:
   - **Hoy**: Eventos de hoy
   - **Ayer**: Eventos de ayer
   - **Últimos 7 días**: Eventos de la última semana
   - **Últimos 30 días**: Eventos del último mes
   - **Personalizado**: Selecciona fechas específicas

4. Verás:
   - Total de eventos registrados
   - Usuarios únicos
   - Sesiones únicas
   - Desglose de eventos por tipo
   - Top 10 productos más populares
   - Actividad por fecha

---

## Capturas Adicionales (Opcional)

### Capturar IP Address y User Agent desde el servidor

Si quieres capturar la IP y el User Agent, puedes crear un API endpoint en Next.js:

```typescript
// app/api/analytics/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Usa la service key para server-side
)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  const userAgent = request.headers.get('user-agent')

  try {
    await supabase.from('analytics_events').insert({
      ...body,
      ip_address: ip,
      user_agent: userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
```

Y desde el frontend:

```typescript
export async function trackEvent(
  eventType: string,
  eventData?: Record<string, any>,
  productoId?: number
) {
  let sessionId = localStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('analytics_session_id', sessionId)
  }

  await fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: eventType,
      event_data: eventData,
      session_id: sessionId,
      fk_id_producto: productoId,
    })
  })
}
```

---

## Resumen

1. ✅ Ejecuta la migración SQL en Supabase
2. ✅ Agrega la función `trackEvent()` en tu frontend
3. ✅ Llama a `trackEvent()` en los lugares donde quieras medir eventos
4. ✅ Visualiza las estadísticas en el admin

El sistema está listo para usar y es completamente escalable.
