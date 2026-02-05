# 📊 Sistema de Gestión de Facturación

Aplicación web moderna para la gestión completa de facturación con importación inteligente mediante IA.

## ✨ Características

- 🤖 **Importación Inteligente con IA**: Extrae datos de facturas usando Google AI
- 📄 **Gestión de Facturas**: Creación, edición y eliminación de facturas de venta y compra
- 👥 **Gestión de Clientes y Proveedores**: Organiza toda tu información de contactos
- 📦 **Catálogo de Productos**: Administra tu inventario y precios
- 💰 **Control de Gastos**: Registra y categoriza gastos empresariales
- 📊 **Dashboard Analítico**: Visualiza métricas financieras en tiempo real
- 📱 **Diseño Responsivo**: Funciona perfectamente en móviles y escritorio
- 🔒 **Autenticación Segura**: Integración con Supabase Auth
- 📑 **Exportación PDF**: Genera facturas profesionales en PDF

## 🚀 Ejecutar Localmente

**Requisitos:** Node.js 16+

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   
   Crea un archivo `.env.local` con:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_key
   VITE_GEMINI_API_KEY=tu_gemini_api_key
   ```

3. **Ejecutar la aplicación:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   
   La aplicación estará disponible en `http://localhost:5173`

## 🛠️ Stack Tecnológico

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (Auth + Database)
- **IA**: Google Gemini API
- **PDF**: jsPDF + jsPDF-AutoTable
- **Gráficos**: Recharts

## 📦 Estructura del Proyecto

```
├── components/     # Componentes reutilizables
├── pages/          # Páginas de la aplicación
├── lib/            # Utilidades y configuración
├── context/        # Contextos de React
├── hooks/          # Custom hooks
└── types.ts        # Definiciones TypeScript
```

## 📝 Licencia

© 2026 neoSoporte - Todos los derechos reservados
