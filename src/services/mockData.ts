import { 
  User, 
  SubGroup, 
  Product, 
  Supplier, 
  CustomerCategory, 
  Customer, 
  Employee, 
  BankAccount, 
  CashRegister, 
  Shift,
  FinancialMovement,
  Sale,
  SupplierInvoice,
  CustomerMovement,
  SupplierMovement
} from '../types';

// Colecciones iniciales completamente vacías para operar 100% con la base de datos real en Supabase
export const INITIAL_USERS: User[] = [];
export const INITIAL_SUBGROUPS: SubGroup[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_CATEGORIES: CustomerCategory[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];
export const INITIAL_CASH_REGISTER: CashRegister = {
  id: 'caja-principal',
  name: 'Caja Efectivo Principal',
  balance: 0,
  updatedAt: new Date().toISOString()
};
export const INITIAL_SHIFTS: Shift[] = [];
export const INITIAL_FINANCIAL_MOVEMENTS: FinancialMovement[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_SUPPLIER_INVOICES: SupplierInvoice[] = [];
export const INITIAL_CUSTOMER_MOVEMENTS: CustomerMovement[] = [];
export const INITIAL_SUPPLIER_MOVEMENTS: SupplierMovement[] = [];
