-- Migration: 20260905161100_new_migration.sql
-- Description: Esquema transaccional completo y limpio para Supabase (usuarios, inventario, CRM, caja/bancos, turnos y ventas)

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Usuarios del Sistema (login directo y roles)
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

-- 3. Tabla de Sub-Grupos de Productos (con porcentaje de utilidad configurado)
CREATE TABLE IF NOT EXISTS sub_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    utility_percentage NUMERIC(6,2) NOT NULL DEFAULT 35.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Proveedores
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

-- 5. Tabla de Productos e Inventario
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

-- 6. Tabla de Categorías de Clientes (con descuento comercial)
CREATE TABLE IF NOT EXISTS customer_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    description TEXT
);

-- 7. Tabla de Clientes (CRM y Cuentas Corrientes)
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

-- 8. Tabla de Empleados
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

-- 9. Caja Física y Cuentas Bancarias
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

-- 10. Turnos y Cierres de Caja (Arqueos)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- 11. Movimientos Financieros (Gastos, Extracciones, Transferencias)
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
    performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by_user_name TEXT NOT NULL,
    reference TEXT
);

-- 12. Ventas (Tickets POS)
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
    cashier_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cashier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled'))
);

-- 13. Artículos Vendidos
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

-- 14. Movimientos de Cuenta Corriente (Clientes y Proveedores)
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

-- 15. Facturas de Compra a Proveedores
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

-- 16. Vista de Reportes de Artículos Vendidos
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

-- 17. Configuración de Políticas de Seguridad (RLS)
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

-- Políticas de acceso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a users' AND tablename = 'users') THEN
        CREATE POLICY "Permitir acceso a users" ON users FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a sub_groups' AND tablename = 'sub_groups') THEN
        CREATE POLICY "Permitir acceso a sub_groups" ON sub_groups FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a suppliers' AND tablename = 'suppliers') THEN
        CREATE POLICY "Permitir acceso a suppliers" ON suppliers FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a products' AND tablename = 'products') THEN
        CREATE POLICY "Permitir acceso a products" ON products FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a customers' AND tablename = 'customers') THEN
        CREATE POLICY "Permitir acceso a customers" ON customers FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a customer_categories' AND tablename = 'customer_categories') THEN
        CREATE POLICY "Permitir acceso a customer_categories" ON customer_categories FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a employees' AND tablename = 'employees') THEN
        CREATE POLICY "Permitir acceso a employees" ON employees FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a cash_register' AND tablename = 'cash_register') THEN
        CREATE POLICY "Permitir acceso a cash_register" ON cash_register FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a bank_accounts' AND tablename = 'bank_accounts') THEN
        CREATE POLICY "Permitir acceso a bank_accounts" ON bank_accounts FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a shifts' AND tablename = 'shifts') THEN
        CREATE POLICY "Permitir acceso a shifts" ON shifts FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a financial_movements' AND tablename = 'financial_movements') THEN
        CREATE POLICY "Permitir acceso a financial_movements" ON financial_movements FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a sales' AND tablename = 'sales') THEN
        CREATE POLICY "Permitir acceso a sales" ON sales FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a sale_items' AND tablename = 'sale_items') THEN
        CREATE POLICY "Permitir acceso a sale_items" ON sale_items FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a customer_movements' AND tablename = 'customer_movements') THEN
        CREATE POLICY "Permitir acceso a customer_movements" ON customer_movements FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a supplier_movements' AND tablename = 'supplier_movements') THEN
        CREATE POLICY "Permitir acceso a supplier_movements" ON supplier_movements FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acceso a supplier_invoices' AND tablename = 'supplier_invoices') THEN
        CREATE POLICY "Permitir acceso a supplier_invoices" ON supplier_invoices FOR ALL USING (true);
    END IF;
END $$;
