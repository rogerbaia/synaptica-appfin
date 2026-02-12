# Configuración Requerida de Supabase

Para corregir el error de "redirección a localhost" y permitir el acceso con Google desde el celular y la web, debes agregar las URLs de tu proyecto a la "Lista Blanca" de Supabase.

## Pasos

1.  Entra a tu proyecto en **Supabase**.
2.  Ve a **Authentication** (icono de usuarios) -> **URL Configuration**.
3.  En **Site URL**, asegúrate de que esté tu dominio principal (opcional, pero recomendado):
    *   `https://finanzas.aureasynaptica.com`
4.  En **Redirect URLs**, agrega las siguientes direcciones (una por línea):

```text
http://localhost:3000/dashboard
https://finanzas.aureasynaptica.com/dashboard
https://synaptica-appfin.vercel.app/dashboard
https://synaptica-appfin-rdk5hanxe-rogerio-martins-baias-projects.vercel.app/dashboard
```

> **Nota**: Es muy importante que incluyas `/dashboard` al final, ya que es la página a la que la aplicación intenta redirigir después del login.

## ¿Por qué pasa esto?
Supabase comprueba que la URL a la que quieres ir (ej. `finanzas.aureasynaptica.com/dashboard`) sea segura. Si no está en esta lista, por seguridad te envía a la URL por defecto (que actualmente es `localhost:3000`), causando el error en tu celular.
