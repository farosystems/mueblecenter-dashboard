import { createClient } from '@supabase/supabase-js'
import { useUser } from '@clerk/nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente de Supabase para operaciones autenticadas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

// Función para obtener un token de Supabase usando Clerk
export async function getSupabaseToken() {
  try {
    // Verificar que Clerk esté disponible
    if (typeof window === 'undefined' || !window.Clerk) {
      console.error('Clerk no está disponible en el cliente')
      return null
    }

    // Obtener el token de Clerk
    const token = await window.Clerk.session?.getToken({
      template: 'supabase'
    })
    
    if (!token) {
      console.error('No se pudo obtener el token de Clerk')
      return null
    }
    
    console.log('✅ Token de Clerk obtenido correctamente')
    return token
  } catch (error) {
    console.error('Error obteniendo token:', error)
    return null
  }
}

// Función para configurar la sesión de Supabase con Clerk
export async function setupSupabaseAuth() {
  try {
    const token = await getSupabaseToken()
    
    if (token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: token
      })
      
      if (error) {
        console.error('Error configurando sesión de Supabase:', error)
        return false
      }
      
      console.log('✅ Sesión de Supabase configurada correctamente')
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error en setupSupabaseAuth:', error)
    return false
  }
} 