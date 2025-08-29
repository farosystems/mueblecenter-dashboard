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

// Tipos para los productos
export interface Producto {
  id: number
  created_at: string
  descripcion: string
  descripcion_detallada?: string
  precio: number
  imagen?: string
  imagen_2?: string
  imagen_3?: string
  imagen_4?: string
  imagen_5?: string
  destacado?: boolean
  activo?: boolean
  aplica_todos_plan?: boolean
  aplica_solo_categoria?: boolean
  aplica_plan_especial?: boolean
  fk_id_categoria?: number
  fk_id_marca?: number
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