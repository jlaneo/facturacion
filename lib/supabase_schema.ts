export const SUPABASE_SCHEMA_SQL = `
-- Habilitar la extensión pgcrypto si no está habilitada (necesaria para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    monthly_maintenance_fee NUMERIC(10, 2) DEFAULT 0,
    is_eu_vat_exempt BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios clientes" ON public.clients;
CREATE POLICY "Los usuarios pueden gestionar sus propios clientes" ON public.clients FOR ALL USING (auth.uid() = user_id);

-- 2. Tabla de Productos/Servicios
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios productos" ON public.products;
CREATE POLICY "Los usuarios pueden gestionar sus propios productos" ON public.products FOR ALL USING (auth.uid() = user_id);

-- 3. Tabla de Proveedores
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios proveedores" ON public.suppliers;
CREATE POLICY "Los usuarios pueden gestionar sus propios proveedores" ON public.suppliers FOR ALL USING (auth.uid() = user_id);

-- 4. Tabla de Tipos de Gasto
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus tipos de gasto" ON public.expense_categories;
CREATE POLICY "Los usuarios pueden gestionar sus tipos de gasto" ON public.expense_categories FOR ALL USING (auth.uid() = user_id);
-- Asegurar que el nombre de la categoría sea único por usuario
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_user_id_name_idx ON public.expense_categories (user_id, name);


-- 5. Tabla de Gastos
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios gastos" ON public.expenses;
CREATE POLICY "Los usuarios pueden gestionar sus propios gastos" ON public.expenses FOR ALL USING (auth.uid() = user_id);

-- 6. Tabla de Facturas de Venta
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propias facturas" ON public.invoices;
CREATE POLICY "Los usuarios pueden gestionar sus propias facturas" ON public.invoices FOR ALL USING (auth.uid() = user_id);
-- Asegurar que el número de factura sea único por usuario
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_id_invoice_number_idx ON public.invoices (user_id, invoice_number);


-- 7. Tabla de Facturas de Compra
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT NOT NULL,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus facturas de compra" ON public.purchase_invoices;
CREATE POLICY "Los usuarios pueden gestionar sus facturas de compra" ON public.purchase_invoices FOR ALL USING (auth.uid() = user_id);

-- 8. Tabla de Facturas Recurrentes
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    frequency TEXT NOT NULL,
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    items JSONB NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus facturas recurrentes" ON public.recurring_invoices;
CREATE POLICY "Los usuarios pueden gestionar sus facturas recurrentes" ON public.recurring_invoices FOR ALL USING (auth.uid() = user_id);

-- 9. Tabla de Ajustes de la Empresa
CREATE TABLE IF NOT EXISTS public.settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    commercial_name TEXT,
    tax_id TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    logo TEXT,
    iva NUMERIC(5, 2) NOT NULL,
    template_color TEXT
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios ajustes" ON public.settings;
CREATE POLICY "Los usuarios pueden gestionar sus propios ajustes" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- 10. Función para crear ajustes por defecto para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (user_id, name, commercial_name, tax_id, address, email, iva, template_color)
    VALUES (
        new.id,
        'Tu Nombre o Nombre Fiscal',
        'Tu Marca o Nombre Comercial',
        'Tu NIF/CIF',
        'Tu Dirección Fiscal',
        new.email,
        21.00,
        '#3b82f6'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Trigger para ejecutar la función cuando se crea un nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;
