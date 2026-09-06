export type UserRole = 'admin' | 'cashier' | 'employee';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  email?: string;
  avatarUrl?: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  expectedCash: number;
  actualCash?: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  creditSales: number;
  cashWithdrawals: number;
  cashExpenses: number;
  notes?: string;
  status: 'open' | 'closed';
}

export interface SubGroup {
  id: string;
  name: string;
  utilityPercentage: number; // Porcentaje de utilidad preestablecido (ej: 40%)
  description?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  subGroupId: string;
  subGroupName?: string;
  supplierId?: string;
  supplierName?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock?: number;
  imageUrl?: string;
  description?: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  taxId: string; // CUIT / RUT / RFC / NIF
  phone: string;
  email: string;
  address: string;
  currentBalance: number; // Saldo deudor o acreedor en cuenta corriente
  notes?: string;
  createdAt: string;
}

export interface SupplierInvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  newUtilityPercentage?: number;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit';
  bankAccountId?: string;
  paymentStatus: 'paid' | 'pending';
  items: SupplierInvoiceItem[];
  notes?: string;
}

export interface SupplierMovement {
  id: string;
  supplierId: string;
  date: string;
  type: 'invoice' | 'payment';
  amount: number;
  balanceAfter: number;
  reference: string;
  notes?: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  discountPercentage: number; // Porcentaje de descuento automático
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  taxId: string; // DNI / CUIT / Documento
  phone: string;
  email: string;
  address: string;
  categoryId: string;
  creditLimit: number; // Límite de crédito asignado (solo modificable por admin)
  currentBalance: number; // Deuda actual
  createdAt: string;
  notes?: string;
}

export interface CustomerMovement {
  id: string;
  customerId: string;
  date: string;
  type: 'sale' | 'payment' | 'credit_adjustment';
  amount: number;
  balanceAfter: number;
  reference: string;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  document: string;
  taxId?: string; // alias CUIL / DNI
  position: string; // Cargo
  role?: string; // alias
  salary: number;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  isActive?: boolean;
  hireDate: string;
  notes?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'corriente' | 'ahorro';
  holderName: string;
  cbuOrAlias: string;
  balance: number;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  name: string;
  balance: number;
  updatedAt: string;
}

export type ExpenseCategory = 'sueldos' | 'servicios' | 'mantenimiento' | 'comisiones' | 'otros';

export interface FinancialMovement {
  id: string;
  date: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'expense' | 'sale_income' | 'supplier_payment' | 'customer_payment';
  originType: 'cash' | 'bank';
  originAccountId?: string;
  destinationType?: 'cash' | 'bank';
  destinationAccountId?: string;
  amount: number;
  category?: ExpenseCategory | 'internal_transfer' | 'ventas' | 'pago_proveedor' | 'cobro_cliente';
  employeeId?: string;
  employeeName?: string;
  description: string;
  performedByUserId: string;
  performedByUserName: string;
  reference?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  subGroupId?: string;
  subGroupName?: string;
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  totalCost: number;
}

export interface Sale {
  id: string;
  ticketNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerTaxId?: string;
  customerCategoryId?: string;
  discountPercentage: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  totalCost: number;
  paymentMethod: 'cash' | 'bank_card' | 'bank_transfer' | 'credit';
  bankAccountId?: string;
  shiftId?: string;
  cashierUserId: string;
  cashierName: string;
  status: 'completed' | 'cancelled';
  items: SaleItem[];
}
