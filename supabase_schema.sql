-- =============================================================================
-- ESQUEMA TRANSACCIONAL COMPLETO PARA SUPABASE / POSTGRESQL
-- Sistema Contable, Inventario, CRM, Empleados, Caja y Bancos, Turnos y Ventas
-- Listo para ejecutar en el SQL Editor de Supabase
-- =============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE USUARIOS DEL SISTEMA
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'admin123',
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'employee')),
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA DE SUB-GRUPOS DE PRODUCTOS (Con porcentaje de utilidad preestablecido)
CREATE TABLE IF NOT EXISTS sub_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    utility_percentage NUMERIC(6,2) NOT NULL DEFAULT 35.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT,
    sub_group_id UUID REFERENCES sub_groups(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    stock NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_stock NUMERIC(10,2) DEFAULT 5.00,
    image_url TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE CATEGORÍAS DE CLIENTES (Con % de descuento)
CREATE TABLE IF NOT EXISTS customer_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    description TEXT
);

-- 6. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    category_id UUID REFERENCES customer_categories(id) ON DELETE SET NULL,
    credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document TEXT NOT NULL,
    position TEXT NOT NULL,
    salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    hire_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

-- 8. TABLA DE CAJA FÍSICA Y CUENTAS BANCARIAS
CREATE TABLE IF NOT EXISTS cash_register (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'Caja Efectivo Principal',
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('corriente', 'ahorro')),
    holder_name TEXT NOT NULL,
    cbu_or_alias TEXT,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABLA DE TURNOS Y CIERRES DE CAJA
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_name TEXT NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_cash NUMERIC(12,2),
    cash_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    card_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    transfer_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_withdrawals NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- 10. MOVIMIENTOS FINANCIEROS (Gastos, Transferencias, Extracciones)
CREATE TABLE IF NOT EXISTS financial_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdrawal', 'expense', 'sale_income', 'supplier_payment', 'customer_payment')),
    origin_type TEXT NOT NULL CHECK (origin_type IN ('cash', 'bank')),
    origin_account_id UUID,
    destination_type TEXT CHECK (destination_type IN ('cash', 'bank')),
    destination_account_id UUID,
    amount NUMERIC(12,2) NOT NULL,
    category TEXT,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    employee_name TEXT,
    description TEXT NOT NULL,
    performed_by_user_id UUID REFERENCES users(id),
    performed_by_user_name TEXT NOT NULL,
    reference TEXT
);

-- 11. TABLA DE VENTAS (TICKETS)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_tax_id TEXT,
    customer_category_id UUID REFERENCES customer_categories(id) ON DELETE SET NULL,
    discount_percentage NUMERIC(5,2) DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_card', 'bank_transfer', 'credit')),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    cashier_user_id UUID REFERENCES users(id),
    cashier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled'))
);

-- 12. TABLA DE ITEMS DE VENTA
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    sub_group_id UUID,
    sub_group_name TEXT,
    supplier_id UUID,
    supplier_name TEXT,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    cost_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL
);

-- 13. MOVIMIENTOS DE CUENTA CORRIENTE (Clientes y Proveedores)
CREATE TABLE IF NOT EXISTS customer_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sale', 'payment', 'credit_adjustment')),
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    reference TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS supplier_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'payment')),
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    reference TEXT,
    notes TEXT
);

-- 14. FACTURAS DE COMPRA A PROVEEDORES
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit')),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending')),
    notes TEXT
);

-- VISTAS ANALÍTICAS (DB Square / Reporting)
CREATE OR REPLACE VIEW view_sold_items_summary AS
SELECT 
    si.product_id,
    si.product_name,
    si.sku,
    si.sub_group_name,
    si.supplier_name,
    SUM(si.quantity) AS total_quantity,
    SUM(si.subtotal) AS total_revenue,
    SUM(si.total_cost) AS total_cost,
    SUM(si.subtotal - si.total_cost) AS gross_profit,
    s.date::date AS sale_date
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.status = 'completed'
GROUP BY si.product_id, si.product_name, si.sku, si.sub_group_name, si.supplier_name, s.date::date;

-- SEGURIDAD (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura pública autenticada (o anon para applet configurado)
CREATE POLICY "Permitir acceso a usuarios autorizados" ON users FOR ALL USING (true);
CREATE POLICY "Permitir acceso a subgrupos" ON sub_groups FOR ALL USING (true);
CREATE POLICY "Permitir acceso a proveedores" ON suppliers FOR ALL USING (true);
CREATE POLICY "Permitir acceso a productos" ON products FOR ALL USING (true);
CREATE POLICY "Permitir acceso a clientes" ON customers FOR ALL USING (true);
CREATE POLICY "Permitir acceso a categorías" ON customer_categories FOR ALL USING (true);
CREATE POLICY "Permitir acceso a empleados" ON employees FOR ALL USING (true);
CREATE POLICY "Permitir acceso a caja" ON cash_register FOR ALL USING (true);
CREATE POLICY "Permitir acceso a bancos" ON bank_accounts FOR ALL USING (true);
CREATE POLICY "Permitir acceso a turnos" ON shifts FOR ALL USING (true);
CREATE POLICY "Permitir acceso a movimientos financieros" ON financial_movements FOR ALL USING (true);
CREATE POLICY "Permitir acceso a ventas" ON sales FOR ALL USING (true);
CREATE POLICY "Permitir acceso a items de venta" ON sale_items FOR ALL USING (true);
CREATE POLICY "Permitir acceso a movimientos de clientes" ON customer_movements FOR ALL USING (true);
CREATE POLICY "Permitir acceso a movimientos de proveedores" ON supplier_movements FOR ALL USING (true);
CREATE POLICY "Permitir acceso a facturas de proveedores" ON supplier_invoices FOR ALL USING (true);
