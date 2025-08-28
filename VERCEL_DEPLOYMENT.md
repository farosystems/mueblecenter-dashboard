# Configuración para Vercel

## Variables de Entorno Requeridas

Configura las siguientes variables de entorno en tu proyecto de Vercel:

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Clerk URLs
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Clerk JWT Template for Supabase
```
CLERK_JWT_TEMPLATE_NAME=supabase
```

## Configuración del JWT Template en Clerk

1. Ve a tu dashboard de Clerk
2. Navega a JWT Templates
3. Crea un nuevo template llamado "supabase"
4. Usa el siguiente contenido:

```json
{
  "aud": "authenticated",
  "exp": "{{exp}}",
  "iat": "{{iat}}",
  "iss": "{{iss}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email}}",
  "phone": "{{user.primary_phone_number.phone_number}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "email": "{{user.primary_email_address.email}}",
    "email_verified": "{{user.primary_email_address.verification.status}}",
    "phone_verified": "{{user.primary_phone_number.verification.status}}",
    "sub": "{{user.id}}"
  },
  "role": "authenticated"
}
```

## Configuración de Supabase

1. Ve a tu proyecto de Supabase
2. Navega a Authentication > Settings
3. En "JWT Settings", configura:
   - JWT Secret: Usa el mismo secret que Clerk
   - JWT Expiry: 3600 (1 hora)
   - Enable Row Level Security (RLS): Activado

## Configuración de RLS en Supabase

Ejecuta el siguiente SQL en tu base de datos de Supabase:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_financiacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso autenticado
CREATE POLICY "Allow authenticated users to read productos" ON productos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read planes" ON planes_financiacion
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read producto_planes" ON producto_planes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read categoria" ON categoria
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read marcas" ON marcas
  FOR SELECT USING (auth.role() = 'authenticated');
```

## Verificación

Después de configurar todo:

1. El middleware debería redirigir automáticamente a `/sign-in` si no estás autenticado
2. Después del login exitoso, deberías ser redirigido a `/dashboard`
3. Los datos deberían cargar correctamente desde Supabase

## Solución de Problemas en Vercel

### Si se queda en "Redirigiendo al login...":

1. **Verifica las variables de entorno** en tu proyecto de Vercel:
   - Asegúrate de que `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` esté configurada
   - Asegúrate de que `CLERK_SECRET_KEY` esté configurada
   - Verifica que las URLs de Clerk estén correctas

2. **Verifica la configuración de Clerk**:
   - Ve a tu dashboard de Clerk
   - En "Domains", agrega tu dominio de Vercel (ej: `tu-app.vercel.app`)
   - Asegúrate de que el dominio esté verificado

3. **Verifica los logs de Vercel**:
   - Ve a tu proyecto en Vercel
   - Navega a "Functions" > "middleware.ts"
   - Revisa los logs para ver si hay errores

4. **Reinicia el deployment**:
   - En Vercel, ve a tu proyecto
   - Haz clic en "Redeploy" para forzar un nuevo deployment

### Variables de entorno críticas para Vercel:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
``` 