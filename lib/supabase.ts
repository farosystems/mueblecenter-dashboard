import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las categorías
export interface Categoria {
  id: number
  descripcion: string
  logo?: string
  created_at: string
}

// Tipos para las marcas
export interface Marca {
  id: number
  descripcion: string
  logo?: string
  created_at: string
}

// Tipos para la jerarquía de productos
export interface Presentacion {
  id: string
  nombre: string
  descripcion?: string
  imagen?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Linea {
  id: string
  nombre: string
  descripcion?: string
  presentacion_id: string
  activo: boolean
  created_at: string
  updated_at: string
  presentacion?: Presentacion
}

export interface Tipo {
  id: string
  nombre: string
  descripcion?: string
  linea_id: string
  activo: boolean
  created_at: string
  updated_at: string
  linea?: Linea
}

// Tipos para los productos
export interface Producto {
  id: number
  created_at: string
  codigo?: string
  descripcion: string
  descripcion_detallada?: string
  precio: number
  imagen?: string
  imagen_2?: string
  imagen_3?: string
  imagen_4?: string
  imagen_5?: string
  cucardas?: string
  destacado?: boolean
  activo?: boolean
  aplica_todos_plan?: boolean
  aplica_solo_categoria?: boolean
  aplica_plan_especial?: boolean
  // Campos de jerarquía
  presentacion_id?: string
  linea_id?: string
  tipo_id?: string
  // Campos existentes
  fk_id_categoria?: number
  fk_id_marca?: number
  // Relaciones
  presentacion?: Presentacion
  linea?: Linea
  tipo?: Tipo
  categoria?: Categoria
  marca?: Marca
}

// Tipos para los planes de financiación
export interface PlanFinanciacion {
  id: number
  nombre: string
  cuotas: number
  recargo_porcentual?: number
  recargo_fijo?: number
  monto_minimo: number
  monto_maximo?: number
  anticipo_minimo?: number
  anticipo_minimo_fijo?: number
  activo: boolean
  created_at: string
  updated_at: string
  categorias?: PlanCategoria[]
}

// Tipo para la relación muchos a muchos entre planes y categorías
export interface PlanCategoria {
  id: number
  fk_id_plan: number
  fk_id_categoria: number
  created_at: string
  plan?: PlanFinanciacion
  categoria?: Categoria
}

// Tipos para productos por plan
export interface ProductoPlan {
  id: number
  fk_id_producto: number
  fk_id_plan: number
  activo: boolean
  destacado: boolean
  precio_promo?: number
  created_at: string
  producto?: Producto
  plan?: PlanFinanciacion
}

// Tipos para productos por plan por defecto (tabla oculta)
export interface ProductoPlanDefault {
  id: number
  fk_id_producto: number
  fk_id_plan: number
  activo: boolean
  created_at: string
  producto?: Producto
  plan?: PlanFinanciacion
}

// Tipo para las zonas
export interface Zona {
  id: number
  nombre: string | null
  created_at: string
}

// Tipo para la configuración general
export interface Configuracion {
  id: number
  created_at: string
  updated_at: string
  logo: string | null
  titulo: string | null
  subtitulo: string | null
}

// Tipo para la configuración de zonas
export interface ConfiguracionZona {
  id: number
  fk_id_zona: number
  telefono: string
  created_at: string
  zona?: Zona
}

// Tipo para la configuración web
export interface ConfiguracionWeb {
  id: number
  created_at: string
  updated_at: string
  banner: string | null
  banner_2: string | null
  banner_3: string | null
  banner_principal: string | null
  banner_link: string | null
  banner_2_link: string | null
  banner_3_link: string | null
  seccion_bienvenidos: boolean
}

// Tipo para stock por sucursales
export interface StockSucursal {
  id: number
  created_at: string
  updated_at: string
  fk_id_producto: number
  fk_id_zona: number
  stock: number
  stock_minimo: number | null
  activo: boolean
  producto?: Producto
  zona?: Zona
}

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

// Tipo para productos destacados por zona
export interface ProductoDestacadoZona {
  id: number
  created_at: string
  fk_id_producto: number
  fk_id_zona: number | null
  orden: number
  activo: boolean
  producto?: Producto
  zona?: Zona
} 