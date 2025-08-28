# Solución para Error en Vercel

## Error: "Application error: a client-side exception has occurred"

### Paso 1: Verificar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Navega a "Settings" > "Environment Variables"
3. Asegúrate de que tengas estas variables configuradas:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Paso 2: Verificar Configuración de Clerk

1. Ve a tu dashboard de Clerk
2. Navega a "Domains"
3. Agrega tu dominio de Vercel: `dashboard-administrador-mundocuotas-beta.vercel.app`
4. Asegúrate de que el dominio esté verificado

### Paso 3: Verificar Logs de Vercel

1. En Vercel, ve a tu proyecto
2. Navega a "Functions" > "middleware.ts"
3. Revisa los logs para ver errores específicos

### Paso 4: Redeploy

1. En Vercel, ve a tu proyecto
2. Haz clic en "Redeploy" para forzar un nuevo deployment

### Paso 5: Verificar en el Navegador

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca errores específicos que te ayuden a identificar el problema

### Posibles Causas del Error:

1. **Variables de entorno faltantes**: Clerk no puede inicializarse
2. **Dominio no configurado en Clerk**: La autenticación falla
3. **Problema con Supabase**: Las variables de Supabase no están configuradas
4. **Error en el middleware**: El middleware está causando un error

### Solución Temporal:

Si el problema persiste, puedes:

1. **Deshabilitar temporalmente el middleware**:
   - Renombra `middleware.ts` a `middleware.ts.bak`
   - Haz un redeploy
   - Verifica si la aplicación carga sin el middleware

2. **Verificar la conexión a Supabase**:
   - Asegúrate de que las variables de Supabase estén configuradas
   - Verifica que la base de datos esté accesible

### Comandos para Debugging:

```bash
# Verificar variables de entorno localmente
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Verificar si Clerk está funcionando
curl -I https://api.clerk.com/v1/me
```

### Contacto de Soporte:

Si el problema persiste, proporciona:
1. Los logs de Vercel
2. Los errores de la consola del navegador
3. Las variables de entorno configuradas (sin valores sensibles) 