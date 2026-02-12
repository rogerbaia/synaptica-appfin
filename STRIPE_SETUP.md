# 🏦 Guía de Configuración Stripe para Synaptica

Sigue estos pasos para activar tu cuenta y comenzar a recibir pagos reales.

## 1. Crear Cuenta
1. Ve a [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Regístrate con tu correo (`rogerbaia@hotmail.com`).

## 2. Activar Pagos (KYC)
Stripe te pedirá información para verificar tu identidad y depositarte el dinero. Ten a la mano:
- **Dirección Comercial**: Puede ser tu domicilio particular si eres persona física.
- **RFC (México)**: Es obligatorio para facturación.
- **CLABE Interbancaria**: Donde Stripe te depositará las ganancias (suelen tardar 2-5 días hábiles).
- **Identificación Oficial**: INE o Pasaporte (a veces piden foto).

> **Tip**: En "Descripción del negocio", pon algo como: *"Software SaaS de finanzas personales llamado Synaptica, cobramos suscripciones mensuales de $5 y $15 USD"* así aprueban más rápido.

## 3. Obtener las Llaves (API Keys)
Una vez dentro del Dashboard:
1. Ve a la esquina superior derecha "Desarrolladores" (Developers).
2. Clic en **Claves de API** (API Keys).
3. Verás dos llaves importantes:
   - **Clave Publicable (Publishable Key)**: Empieza con `pk_live_...`
   - **Clave Secreta (Secret Key)**: Empieza con `sk_live_...`

## 4. Conectar con Synaptica
Cuando tengas esas claves, avísame y haremos el cambio en el código:
1. Crearemos un archivo `.env.local` (seguro).
2. Pegaremos las claves ahí.
3. Desactivaremos el "Modo Simulación" en `paymentService.ts`.

---
**Nota**: Mientras validan tus documentos, Stripe te permite estar en **"Modo de Prueba" (Test Mode)**. Puedes usar las claves `pk_test_...` y `sk_test_...` para hacer pruebas reales sin usar dinero de verdad.
