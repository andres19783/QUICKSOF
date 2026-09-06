import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  SubGroup,
  Product,
  Supplier,
  SupplierInvoice,
  SupplierMovement,
  CustomerCategory,
  Customer,
  CustomerMovement,
  Employee,
  BankAccount,
  CashRegister,
  Shift,
  FinancialMovement,
  Sale,
  CartItem
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SUBGROUPS,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_CASH_REGISTER,
  INITIAL_SHIFTS,
  INITIAL_FINANCIAL_MOVEMENTS,
  INITIAL_SALES,
  INITIAL_SUPPLIER_INVOICES,
  INITIAL_CUSTOMER_MOVEMENTS,
  INITIAL_SUPPLIER_MOVEMENTS
} from '../services/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppContextType {
  // Auth & Roles (Connected to Database)
  currentUser: User | null;
  users: User[];
  usersCount: number;
  isFirstUserRegistrationRequired: boolean;
  isLoadingAuth: boolean;
  authError: string | null;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  registerFirstAdmin: (data: { username: string; password: string; name: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  createUser: (data: { username: string; password: string; name: string; role: 'cashier' | 'employee'; email?: string }) => Promise<{ success: boolean; error?: string }>;
  wipeAllDatabaseRecords: (adminCode: string, preserveAdmin?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isCashier: boolean;

  // SubGroups
  subGroups: SubGroup[];
  addSubGroup: (data: Omit<SubGroup, 'id' | 'createdAt'>) => void;
  updateSubGroup: (id: string, data: Partial<SubGroup>) => void;
  deleteSubGroup: (id: string) => boolean;

  // Products
  products: Product[];
  addProduct: (data: Omit<Product, 'id' | 'updatedAt'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => { success: boolean; error?: string };
  deleteProduct: (id: string) => boolean;

  // Suppliers & Purchasing
  suppliers: Supplier[];
  supplierInvoices: SupplierInvoice[];
  supplierMovements: SupplierMovement[];
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'currentBalance'>) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => boolean;
  recordSupplierInvoice: (invoice: Omit<SupplierInvoice, 'id'>) => void;
  recordSupplierPayment: (supplierId: string, amount: number, paymentMethod: 'cash' | 'bank', bankAccountId?: string, notes?: string) => void;

  // Employees
  employees: Employee[];
  addEmployee: (data: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => boolean;

  // Customers & Categories
  customerCategories: CustomerCategory[];
  customers: Customer[];
  customerMovements: CustomerMovement[];
  addCustomerCategory: (data: Omit<CustomerCategory, 'id'>) => void;
  updateCustomerCategory: (id: string, data: Partial<CustomerCategory>) => void;
  deleteCustomerCategory: (id: string) => boolean;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'currentBalance'>) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => { success: boolean; error?: string };
  deleteCustomer: (id: string) => boolean;
  recordCustomerPayment: (customerId: string, amount: number, paymentMethod: 'cash' | 'bank', bankAccountId?: string, notes?: string) => void;

  // Cash & Banks
  cashRegister: CashRegister;
  bankAccounts: BankAccount[];
  financialMovements: FinancialMovement[];
  addBankAccount: (data: Omit<BankAccount, 'id' | 'createdAt' | 'balance'>, initialBalance: number) => void;
  updateBankAccount: (id: string, data: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => boolean;
  recordFinancialMovement: (data: Omit<FinancialMovement, 'id' | 'date' | 'performedByUserId' | 'performedByUserName'>) => { success: boolean; error?: string };

  // Sales & POS
  sales: Sale[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  processSale: (
    customerId: string | undefined,
    paymentMethod: 'cash' | 'bank_card' | 'bank_transfer' | 'credit',
    bankAccountId?: string
  ) => { success: boolean; sale?: Sale; error?: string };

  // Shift / Turno & Arqueo
  currentShift: Shift | null;
  shifts: Shift[];
  openShift: (initialCash: number) => void;
  closeShift: (actualCash: number, notes?: string) => Shift | null;

  // Cloud & State Sync status
  isOnlineDb: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state: default dark as requested
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth (Connected to real database table 'users')
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('nexoconta_real_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nexoconta_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isCashier = currentUser?.role === 'cashier' || currentUser?.role === 'admin';
  const isFirstUserRegistrationRequired = users.length === 0;

  // Sincronizar usuarios reales desde la base de datos de Supabase o storage
  const syncUsersFromDatabase = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, password, name, role, email, avatar_url, created_at')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Error querying users table from Supabase:', error.message);
          // Usar caché si la consulta remota falla
        } else if (data) {
          const mappedUsers: User[] = data.map((u: any) => ({
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            password: u.password,
            email: u.email,
            avatarUrl: u.avatar_url
          }));
          setUsers(mappedUsers);
          localStorage.setItem('nexoconta_real_users', JSON.stringify(mappedUsers));

          // Si el usuario actual ya no existe o cambió, actualizarlo
          if (currentUser) {
            const fresh = mappedUsers.find(u => u.id === currentUser.id);
            if (fresh) {
              setCurrentUser(fresh);
              localStorage.setItem('nexoconta_user', JSON.stringify(fresh));
            } else {
              setCurrentUser(null);
              localStorage.removeItem('nexoconta_user');
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching users from DB:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    syncUsersFromDatabase();
  }, []);

  // Login validando estrictamente contra la base de datos real
  const login = async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password ? password.trim() : '';

    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, password, name, role, email, avatar_url')
          .eq('username', cleanUser)
          .limit(1);

        if (error) {
          throw new Error(`Error de base de datos: ${error.message}`);
        }

        if (data && data.length > 0) {
          const dbUser = data[0];
          // Verificar contraseña si la tabla la almacena
          if (dbUser.password && cleanPass && dbUser.password !== cleanPass) {
            return { success: false, error: 'Contraseña incorrecta para el usuario indicado.' };
          }

          const matchedUser: User = {
            id: dbUser.id,
            username: dbUser.username,
            name: dbUser.name,
            role: dbUser.role,
            password: dbUser.password,
            email: dbUser.email,
            avatarUrl: dbUser.avatar_url
          };

          setCurrentUser(matchedUser);
          localStorage.setItem('nexoconta_user', JSON.stringify(matchedUser));
          return { success: true };
        }
      }

      // Si no está conectado a Supabase en este instante o verificación local contra tabla real sincronizada
      const found = users.find(u => u.username.toLowerCase() === cleanUser);
      if (found) {
        if (found.password && cleanPass && found.password !== cleanPass) {
          return { success: false, error: 'Contraseña incorrecta para el usuario indicado.' };
        }
        setCurrentUser(found);
        localStorage.setItem('nexoconta_user', JSON.stringify(found));
        return { success: true };
      }

      return { success: false, error: 'Usuario no encontrado en la base de datos.' };
    } catch (err: any) {
      const msg = err.message || 'Error durante la autenticación.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Primer usuario (Admin automático) si la tabla de usuarios está completamente vacía
  const registerFirstAdmin = async (data: {
    username: string;
    password: string;
    name: string;
    email?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (users.length > 0) {
      return {
        success: false,
        error: 'El sistema ya cuenta con usuarios registrados. El autoregistro público está bloqueado.'
      };
    }

    setIsLoadingAuth(true);
    setAuthError(null);

    const newAdminId = `usr-${Date.now()}`;
    const newAdmin: User = {
      id: newAdminId,
      username: data.username.toLowerCase().trim(),
      password: data.password.trim(),
      name: data.name.trim(),
      role: 'admin', // Primer usuario creado es automáticamente Administrador
      email: data.email?.trim()
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('users').insert([
          {
            username: newAdmin.username,
            password: newAdmin.password,
            name: newAdmin.name,
            role: 'admin',
            email: newAdmin.email
          }
        ]);

        if (error) {
          throw new Error(`Error al insertar en Supabase: ${error.message}`);
        }
      }

      const updatedUsers = [newAdmin];
      setUsers(updatedUsers);
      localStorage.setItem('nexoconta_real_users', JSON.stringify(updatedUsers));
      setCurrentUser(newAdmin);
      localStorage.setItem('nexoconta_user', JSON.stringify(newAdmin));

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Error al crear el usuario administrador en la base de datos.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Registrar nuevos usuarios (una vez creado el primer admin, rol admin NO permitido)
  const createUser = async (data: {
    username: string;
    password: string;
    name: string;
    role: 'cashier' | 'employee';
    email?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    // REGLA CRÍTICA: El rol de usuario admin NO estará disponible para nuevos usuarios
    if ((data.role as string) === 'admin') {
      return {
        success: false,
        error: 'El rol Administrador no está disponible para nuevos usuarios. El sistema sólo admite el Administrador principal ya configurado.'
      };
    }

    const cleanUsername = data.username.toLowerCase().trim();
    if (!cleanUsername) {
      return { success: false, error: 'El nombre de usuario es requerido.' };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }
    if (!data.name.trim()) {
      return { success: false, error: 'El nombre completo es requerido.' };
    }

    // Verificar si ya existe el usuario
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `El usuario "${cleanUsername}" ya existe en la base de datos.` };
    }

    setIsLoadingAuth(true);
    setAuthError(null);

    const newUserId = `usr-${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      username: cleanUsername,
      password: data.password.trim(),
      name: data.name.trim(),
      role: data.role, // 'cashier' | 'employee'
      email: data.email?.trim() || undefined
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('users').insert([
          {
            username: newUser.username,
            password: newUser.password,
            name: newUser.name,
            role: newUser.role,
            email: newUser.email
          }
        ]);

        if (error) {
          throw new Error(`Error en Supabase: ${error.message}`);
        }
      }

      const updated = [...users, newUser];
      setUsers(updated);
      localStorage.setItem('nexoconta_real_users', JSON.stringify(updated));

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Error al registrar el nuevo usuario en la base de datos.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Vaciado total de las bases de datos: Exclusivo cuando el usuario Administrador está en turno
  const wipeAllDatabaseRecords = async (
    adminCode: string,
    preserveAdmin: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: 'Permiso denegado: únicamente el Usuario Administrador puede ejecutar el borrado de bases de datos.'
      };
    }

    // Condición estricta: El usuario Administrador DEBE estar en turno activo
    if (!currentShift) {
      return {
        success: false,
        error: 'Condición requerida: el Administrador debe tener un TURNO DE CAJA ABIERTO Y ACTIVO para autorizar el vaciado de las bases de datos.'
      };
    }

    const cleanCode = adminCode.trim();
    if (!cleanCode) {
      return {
        success: false,
        error: 'Debes ingresar el código / contraseña del Usuario Administrador para autenticar esta acción crítica.'
      };
    }

    // Validación contra el código/contraseña del usuario admin
    if (currentUser.password && currentUser.password !== cleanCode) {
      return {
        success: false,
        error: 'Código de Usuario Administrador inválido. La operación de borrado ha sido denegada.'
      };
    }

    setIsLoadingAuth(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Tablas a vaciar en Supabase respetando cascada de llaves foráneas
        const tablesToClear = [
          'sale_items',
          'sales',
          'customer_movements',
          'supplier_movements',
          'supplier_invoices',
          'financial_movements',
          'shifts',
          'products',
          'customers',
          'customer_categories',
          'suppliers',
          'sub_groups',
          'employees',
          'bank_accounts'
        ];

        for (const tbl of tablesToClear) {
          try {
            await supabase.from(tbl).delete().not('id', 'is', null);
          } catch (tblErr) {
            console.warn(`Aviso al vaciar tabla ${tbl}:`, tblErr);
          }
        }

        // Restablecer caja central a cero
        try {
          await supabase.from('cash_register').update({ balance: 0.00 }).not('id', 'is', null);
        } catch (cErr) {
          console.warn('Aviso restableciendo caja en Supabase:', cErr);
        }

        // Gestión de usuarios: conservar admin o vaciado absoluto
        if (preserveAdmin) {
          try {
            await supabase.from('users').delete().neq('id', currentUser.id);
          } catch (uErr) {
            console.warn('Aviso eliminando usuarios secundarios:', uErr);
          }
        } else {
          try {
            await supabase.from('users').delete().not('id', 'is', null);
          } catch (uErr) {
            console.warn('Aviso vaciando todos los usuarios:', uErr);
          }
        }
      }

      // Vaciar todos los registros del estado de la aplicación
      setSales([]);
      setFinancialMovements([]);
      setShifts([]);
      setProducts([]);
      setCustomers([]);
      setCustomerCategories([]);
      setSuppliers([]);
      setSupplierInvoices([]);
      setSupplierMovements([]);
      setCustomerMovements([]);
      setSubGroups([]);
      setEmployees([]);
      setBankAccounts([]);
      setCashRegister({ id: 'cash-default', name: 'Caja Efectivo Principal', balance: 0 });
      setCart([]);

      // Vaciar almacenamiento local (localStorage) de todos los registros operacionales
      localStorage.removeItem('nexoconta_sales');
      localStorage.removeItem('nexoconta_fin_movements');
      localStorage.removeItem('nexoconta_shifts');
      localStorage.removeItem('nexoconta_products');
      localStorage.removeItem('nexoconta_customers');
      localStorage.removeItem('nexoconta_categories');
      localStorage.removeItem('nexoconta_suppliers');
      localStorage.removeItem('nexoconta_sup_invoices');
      localStorage.removeItem('nexoconta_sup_movements');
      localStorage.removeItem('nexoconta_cust_movements');
      localStorage.removeItem('nexoconta_subgroups');
      localStorage.removeItem('nexoconta_employees');
      localStorage.removeItem('nexoconta_banks');
      localStorage.setItem('nexoconta_cash', JSON.stringify({ id: 'cash-default', name: 'Caja Efectivo Principal', balance: 0 }));

      if (preserveAdmin) {
        const remainingAdmin = [currentUser];
        setUsers(remainingAdmin);
        localStorage.setItem('nexoconta_real_users', JSON.stringify(remainingAdmin));
      } else {
        setUsers([]);
        localStorage.removeItem('nexoconta_real_users');
        localStorage.removeItem('nexoconta_user');
        setCurrentUser(null);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error durante el borrado de bases de datos:', err);
      return { success: false, error: err.message || 'Error al ejecutar el borrado en las bases de datos.' };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('nexoconta_user');
    setCurrentUser(null);
  };

  // SubGroups
  const [subGroups, setSubGroups] = useState<SubGroup[]>(() => {
    const saved = localStorage.getItem('nexoconta_subgroups');
    return saved ? JSON.parse(saved) : INITIAL_SUBGROUPS;
  });

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('nexoconta_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Suppliers & Invoices
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('nexoconta_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>(() => {
    const saved = localStorage.getItem('nexoconta_sup_invoices');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_INVOICES;
  });

  const [supplierMovements, setSupplierMovements] = useState<SupplierMovement[]>(() => {
    const saved = localStorage.getItem('nexoconta_sup_movements');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_MOVEMENTS;
  });

  // Customer categories & Customers
  const [customerCategories, setCustomerCategories] = useState<CustomerCategory[]>(() => {
    const saved = localStorage.getItem('nexoconta_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('nexoconta_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [customerMovements, setCustomerMovements] = useState<CustomerMovement[]>(() => {
    const saved = localStorage.getItem('nexoconta_cust_movements');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMER_MOVEMENTS;
  });

  // Employees
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('nexoconta_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  // Cash & Banks
  const [cashRegister, setCashRegister] = useState<CashRegister>(() => {
    const saved = localStorage.getItem('nexoconta_cash');
    return saved ? JSON.parse(saved) : INITIAL_CASH_REGISTER;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('nexoconta_banks');
    return saved ? JSON.parse(saved) : INITIAL_BANK_ACCOUNTS;
  });

  const [financialMovements, setFinancialMovements] = useState<FinancialMovement[]>(() => {
    const saved = localStorage.getItem('nexoconta_fin_movements');
    return saved ? JSON.parse(saved) : INITIAL_FINANCIAL_MOVEMENTS;
  });

  // Shifts
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem('nexoconta_shifts');
    return saved ? JSON.parse(saved) : INITIAL_SHIFTS;
  });

  const currentShift = shifts.find(s => currentUser && s.userId === currentUser.id && s.status === 'open') || null;

  // Sales & Cart
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('nexoconta_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [cart, setCart] = useState<CartItem[]>([]);

  // Sync to local storage for instant responsiveness & reliability
  useEffect(() => {
    localStorage.setItem('nexoconta_subgroups', JSON.stringify(subGroups));
  }, [subGroups]);

  useEffect(() => {
    localStorage.setItem('nexoconta_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('nexoconta_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('nexoconta_sup_invoices', JSON.stringify(supplierInvoices));
  }, [supplierInvoices]);

  useEffect(() => {
    localStorage.setItem('nexoconta_sup_movements', JSON.stringify(supplierMovements));
  }, [supplierMovements]);

  useEffect(() => {
    localStorage.setItem('nexoconta_categories', JSON.stringify(customerCategories));
  }, [customerCategories]);

  useEffect(() => {
    localStorage.setItem('nexoconta_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('nexoconta_cust_movements', JSON.stringify(customerMovements));
  }, [customerMovements]);

  useEffect(() => {
    localStorage.setItem('nexoconta_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('nexoconta_cash', JSON.stringify(cashRegister));
  }, [cashRegister]);

  useEffect(() => {
    localStorage.setItem('nexoconta_banks', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    localStorage.setItem('nexoconta_fin_movements', JSON.stringify(financialMovements));
  }, [financialMovements]);

  useEffect(() => {
    localStorage.setItem('nexoconta_shifts', JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem('nexoconta_sales', JSON.stringify(sales));
  }, [sales]);

  // Sincronización automática: asegurar que todas las ventas cobradas (efectivo, tarjeta, transferencia) figuren en Movimientos Financieros
  useEffect(() => {
    if (!sales || sales.length === 0) return;

    setFinancialMovements(prevMovements => {
      const existingRefs = new Set(prevMovements.map(m => m.reference).filter(Boolean));
      const missingMovements: FinancialMovement[] = [];

      sales.forEach(sale => {
        if (sale.status === 'completed' && sale.paymentMethod !== 'credit') {
          if (!existingRefs.has(sale.ticketNumber)) {
            const isCash = sale.paymentMethod === 'cash';
            const bank = !isCash && sale.bankAccountId ? bankAccounts.find(b => b.id === sale.bankAccountId) : null;
            const methodLabel = isCash
              ? 'Efectivo'
              : sale.paymentMethod === 'bank_card'
              ? 'Tarjeta'
              : 'Transferencia Bancaria';

            missingMovements.push({
              id: `mov-sale-${sale.id}`,
              date: sale.date,
              type: 'sale_income',
              originType: isCash ? 'cash' : 'bank',
              originAccountId: isCash ? undefined : sale.bankAccountId,
              destinationType: isCash ? 'cash' : 'bank',
              destinationAccountId: isCash ? undefined : sale.bankAccountId,
              amount: sale.totalAmount,
              category: 'ventas',
              description: `Cobro de venta Ticket ${sale.ticketNumber} con ${methodLabel}${bank ? ` en ${bank.bankName}` : ''} (${sale.customerName || 'Consumidor Final'})`,
              performedByUserId: sale.cashierUserId || currentUser?.id || 'admin',
              performedByUserName: sale.cashierName || currentUser?.name || 'Cajero',
              reference: sale.ticketNumber
            });
            existingRefs.add(sale.ticketNumber);
          }
        }
      });

      if (missingMovements.length > 0) {
        return [...missingMovements, ...prevMovements];
      }
      return prevMovements;
    });
  }, [sales, bankAccounts, currentUser]);

  // Try initial Supabase fetch if credentials provided
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const loadFromSupabase = async () => {
        try {
          const { data: prodData } = await supabase.from('products').select('*');
          if (prodData && prodData.length > 0) {
            // Map to local products if populated
            console.log('Supabase products loaded:', prodData.length);
          }
        } catch (err) {
          console.log('Supabase sync check:', err);
        }
      };
      loadFromSupabase();
    }
  }, []);

  // --- SUBGROUPS CRUD ---
  const addSubGroup = (data: Omit<SubGroup, 'id' | 'createdAt'>) => {
    const newSubGroup: SubGroup = {
      ...data,
      id: `sub-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSubGroups(prev => [...prev, newSubGroup]);
  };

  const updateSubGroup = (id: string, data: Partial<SubGroup>) => {
    setSubGroups(prev => prev.map(sg => {
      if (sg.id === id) {
        const updated = { ...sg, ...data };
        // Si cambió el porcentaje de utilidad, actualizar el precio de venta de los productos vinculados
        if (data.utilityPercentage !== undefined && data.utilityPercentage !== sg.utilityPercentage) {
          setProducts(currProds => currProds.map(p => {
            if (p.subGroupId === id) {
              const newSellingPrice = p.costPrice * (1 + data.utilityPercentage! / 100);
              return { ...p, sellingPrice: Math.round(newSellingPrice * 100) / 100 };
            }
            return p;
          }));
        }
        return updated;
      }
      return sg;
    }));
  };

  const deleteSubGroup = (id: string): boolean => {
    const hasProducts = products.some(p => p.subGroupId === id);
    if (hasProducts) {
      alert('No se puede eliminar el subgrupo porque tiene productos asociados.');
      return false;
    }
    setSubGroups(prev => prev.filter(sg => sg.id !== id));
    return true;
  };

  // --- PRODUCTS CRUD ---
  const addProduct = (data: Omit<Product, 'id' | 'updatedAt'>) => {
    const subGroup = subGroups.find(sg => sg.id === data.subGroupId);
    const supplier = suppliers.find(s => s.id === data.supplierId);

    // Calcular precio de venta con el margen del subgrupo si no está fijado manualmente
    let sellingPrice = data.sellingPrice;
    if (subGroup && (!sellingPrice || sellingPrice <= data.costPrice)) {
      sellingPrice = data.costPrice * (1 + subGroup.utilityPercentage / 100);
    }

    const newProd: Product = {
      ...data,
      sellingPrice: Math.round(sellingPrice * 100) / 100,
      subGroupName: subGroup ? subGroup.name : data.subGroupName,
      supplierName: supplier ? supplier.name : data.supplierName,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };

    setProducts(prev => [newProd, ...prev]);
  };

  const updateProduct = (id: string, data: Partial<Product>): { success: boolean; error?: string } => {
    const target = products.find(p => p.id === id);
    if (!target) return { success: false, error: 'Producto no encontrado' };

    // Regla estricta de negocio: El stock solo el user admin puede editar para disminuirlo
    if (data.stock !== undefined && data.stock < target.stock && !isAdmin) {
      return {
        success: false,
        error: 'Permiso denegado: Solo el usuario Administrador está facultado para disminuir el stock manualmente.'
      };
    }

    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        let costPrice = data.costPrice !== undefined ? data.costPrice : p.costPrice;
        let subGroupId = data.subGroupId || p.subGroupId;
        let subGroup = subGroups.find(sg => sg.id === subGroupId);
        let sellingPrice = data.sellingPrice !== undefined ? data.sellingPrice : p.sellingPrice;

        // Si se actualizó el costo y no se especificó venta, actualizar precio de venta con margen
        if (data.costPrice !== undefined && data.sellingPrice === undefined && subGroup) {
          sellingPrice = costPrice * (1 + subGroup.utilityPercentage / 100);
        }

        const supplier = suppliers.find(s => s.id === (data.supplierId || p.supplierId));

        return {
          ...p,
          ...data,
          stock: data.stock !== undefined ? Math.round(data.stock * 100) / 100 : p.stock,
          minStock: data.minStock !== undefined ? Math.round(data.minStock * 100) / 100 : p.minStock,
          costPrice,
          sellingPrice: Math.round(sellingPrice * 100) / 100,
          subGroupName: subGroup ? subGroup.name : p.subGroupName,
          supplierName: supplier ? supplier.name : p.supplierName,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    return { success: true };
  };

  const deleteProduct = (id: string): boolean => {
    if (!isAdmin) {
      alert('Solo el Administrador puede eliminar productos del catálogo.');
      return false;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    return true;
  };

  // --- SUPPLIERS & INVOICE REGISTRATION ---
  const addSupplier = (data: Omit<Supplier, 'id' | 'createdAt' | 'currentBalance'>) => {
    const newSup: Supplier = {
      ...data,
      id: `sup-${Date.now()}`,
      currentBalance: 0,
      createdAt: new Date().toISOString()
    };
    setSuppliers(prev => [...prev, newSup]);
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteSupplier = (id: string): boolean => {
    if (!isAdmin) {
      alert('Solo el Administrador puede eliminar proveedores.');
      return false;
    }
    setSuppliers(prev => prev.filter(s => s.id !== id));
    return true;
  };

  // Registrar factura de compra de proveedor:
  // Actualiza stock, registra el proveedor automáticamente en el producto,
  // actualiza precio de costo y venta con margen preestablecido del subgrupo,
  // e impacta en caja/banco o en cuenta corriente del proveedor.
  const recordSupplierInvoice = (invoiceData: Omit<SupplierInvoice, 'id'>) => {
    const invoiceId = `inv-${Date.now()}`;
    const newInvoice: SupplierInvoice = {
      ...invoiceData,
      id: invoiceId
    };

    setSupplierInvoices(prev => [newInvoice, ...prev]);

    // 1. Actualizar productos: registrar proveedor, costo, precio venta según subgrupo, y sumar stock
    setProducts(prevProds => {
      return prevProds.map(prod => {
        const item = invoiceData.items.find(i => i.productId === prod.id);
        if (item) {
          const subGroup = subGroups.find(sg => sg.id === prod.subGroupId);
          const utility = item.newUtilityPercentage ?? (subGroup ? subGroup.utilityPercentage : 35);
          const newSellingPrice = item.unitCost * (1 + utility / 100);

          return {
            ...prod,
            supplierId: invoiceData.supplierId,
            supplierName: invoiceData.supplierName,
            costPrice: item.unitCost,
            sellingPrice: Math.round(newSellingPrice * 100) / 100,
            stock: Math.round((prod.stock + item.quantity) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
        return prod;
      });
    });

    // 2. Impactar cuentas financieras o cuenta corriente
    if (invoiceData.paymentMethod === 'cash') {
      setCashRegister(prev => ({
        ...prev,
        balance: prev.balance - invoiceData.totalAmount,
        updatedAt: new Date().toISOString()
      }));

      // Movimiento financiero de egreso
      setFinancialMovements(prev => [
        {
          id: `mov-${Date.now()}`,
          date: invoiceData.date,
          type: 'supplier_payment',
          originType: 'cash',
          amount: invoiceData.totalAmount,
          category: 'pago_proveedor',
          description: `Pago en efectivo Factura ${invoiceData.invoiceNumber} a ${invoiceData.supplierName}`,
          performedByUserId: currentUser.id,
          performedByUserName: currentUser.name,
          reference: invoiceData.invoiceNumber
        },
        ...prev
      ]);
    } else if (invoiceData.paymentMethod === 'bank_transfer' && invoiceData.bankAccountId) {
      setBankAccounts(prev => prev.map(b => {
        if (b.id === invoiceData.bankAccountId) {
          return { ...b, balance: b.balance - invoiceData.totalAmount };
        }
        return b;
      }));

      setFinancialMovements(prev => [
        {
          id: `mov-${Date.now()}`,
          date: invoiceData.date,
          type: 'supplier_payment',
          originType: 'bank',
          originAccountId: invoiceData.bankAccountId,
          amount: invoiceData.totalAmount,
          category: 'pago_proveedor',
          description: `Transferencia bancaria Factura ${invoiceData.invoiceNumber} a ${invoiceData.supplierName}`,
          performedByUserId: currentUser.id,
          performedByUserName: currentUser.name,
          reference: invoiceData.invoiceNumber
        },
        ...prev
      ]);
    } else if (invoiceData.paymentMethod === 'credit') {
      // Impacta saldo acreedor en la cuenta corriente del proveedor
      setSuppliers(prev => prev.map(s => {
        if (s.id === invoiceData.supplierId) {
          const newBal = s.currentBalance - invoiceData.totalAmount; // Saldo deudor de la empresa (negativo)
          return { ...s, currentBalance: newBal };
        }
        return s;
      }));

      const targetSupplier = suppliers.find(s => s.id === invoiceData.supplierId);
      const currentBal = targetSupplier ? targetSupplier.currentBalance : 0;
      setSupplierMovements(prev => [
        {
          id: `sm-${Date.now()}`,
          supplierId: invoiceData.supplierId,
          date: invoiceData.date,
          type: 'invoice',
          amount: invoiceData.totalAmount,
          balanceAfter: currentBal - invoiceData.totalAmount,
          reference: invoiceData.invoiceNumber,
          notes: 'Compra a crédito en cuenta corriente'
        },
        ...prev
      ]);
    }
  };

  const recordSupplierPayment = (
    supplierId: string,
    amount: number,
    paymentMethod: 'cash' | 'bank',
    bankAccountId?: string,
    notes?: string
  ) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    if (paymentMethod === 'cash') {
      setCashRegister(prev => ({
        ...prev,
        balance: prev.balance - amount,
        updatedAt: new Date().toISOString()
      }));
    } else if (bankAccountId) {
      setBankAccounts(prev => prev.map(b => b.id === bankAccountId ? { ...b, balance: b.balance - amount } : b));
    }

    const newBalance = supplier.currentBalance + amount;
    setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, currentBalance: newBalance } : s));

    const ref = `PAGO-SUP-${Date.now().toString().slice(-4)}`;
    setSupplierMovements(prev => [
      {
        id: `sm-${Date.now()}`,
        supplierId,
        date: new Date().toISOString(),
        type: 'payment',
        amount,
        balanceAfter: newBalance,
        reference: ref,
        notes: notes || `Pago a cuenta corriente (${paymentMethod === 'cash' ? 'Efectivo' : 'Banco'})`
      },
      ...prev
    ]);

    setFinancialMovements(prev => [
      {
        id: `mov-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'supplier_payment',
        originType: paymentMethod,
        originAccountId: bankAccountId,
        amount,
        category: 'pago_proveedor',
        description: `Pago de deuda a proveedor ${supplier.name}. Ref: ${ref}`,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        reference: ref
      },
      ...prev
    ]);
  };

  // --- EMPLOYEES CRUD ---
  const addEmployee = (data: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...data,
      id: `emp-${Date.now()}`
    };
    setEmployees(prev => [...prev, newEmp]);
  };

  const updateEmployee = (id: string, data: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteEmployee = (id: string): boolean => {
    if (!isAdmin) {
      alert('Solo el Administrador puede eliminar registros de empleados.');
      return false;
    }
    setEmployees(prev => prev.filter(e => e.id !== id));
    return true;
  };

  // --- CUSTOMERS & CATEGORIES ---
  const addCustomerCategory = (data: Omit<CustomerCategory, 'id'>) => {
    const newCat: CustomerCategory = {
      ...data,
      id: `cat-${Date.now()}`
    };
    setCustomerCategories(prev => [...prev, newCat]);
  };

  const updateCustomerCategory = (id: string, data: Partial<CustomerCategory>) => {
    setCustomerCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCustomerCategory = (id: string): boolean => {
    const inUse = customers.some(c => c.categoryId === id);
    if (inUse) {
      alert('No se puede eliminar la categoría porque hay clientes asignados a ella.');
      return false;
    }
    setCustomerCategories(prev => prev.filter(c => c.id !== id));
    return true;
  };

  const addCustomer = (data: Omit<Customer, 'id' | 'createdAt' | 'currentBalance'>) => {
    const newCust: Customer = {
      ...data,
      id: `cli-${Date.now()}`,
      currentBalance: 0,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [...prev, newCust]);
  };

  const updateCustomer = (id: string, data: Partial<Customer>): { success: boolean; error?: string } => {
    const current = customers.find(c => c.id === id);
    if (!current) return { success: false, error: 'Cliente no encontrado' };

    // El límite de crédito solo puede ser modificado por el usuario admin
    if (data.creditLimit !== undefined && data.creditLimit !== current.creditLimit && !isAdmin) {
      return {
        success: false,
        error: 'Permiso denegado: El límite de crédito solo puede ser modificado por el usuario Administrador.'
      };
    }

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    return { success: true };
  };

  const deleteCustomer = (id: string): boolean => {
    if (!isAdmin) {
      alert('Solo el Administrador puede eliminar clientes.');
      return false;
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
    return true;
  };

  const recordCustomerPayment = (
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'bank',
    bankAccountId?: string,
    notes?: string
  ) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    if (paymentMethod === 'cash') {
      setCashRegister(prev => ({
        ...prev,
        balance: prev.balance + amount,
        updatedAt: new Date().toISOString()
      }));
    } else if (bankAccountId) {
      setBankAccounts(prev => prev.map(b => b.id === bankAccountId ? { ...b, balance: b.balance + amount } : b));
    }

    const newBalance = Math.max(0, cust.currentBalance - amount);
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, currentBalance: newBalance } : c));

    const ref = `REC-COBRO-${Date.now().toString().slice(-4)}`;
    setCustomerMovements(prev => [
      {
        id: `cm-${Date.now()}`,
        customerId,
        date: new Date().toISOString(),
        type: 'payment',
        amount,
        balanceAfter: newBalance,
        reference: ref,
        notes: notes || `Cobro en cuenta corriente (${paymentMethod === 'cash' ? 'Efectivo' : 'Banco'})`
      },
      ...prev
    ]);

    setFinancialMovements(prev => [
      {
        id: `mov-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'customer_payment',
        originType: paymentMethod,
        originAccountId: bankAccountId,
        amount,
        category: 'cobro_cliente',
        description: `Cobranza a cliente ${cust.name}. Ref: ${ref}`,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        reference: ref
      },
      ...prev
    ]);
  };

  // --- CASH & BANKS ---
  const addBankAccount = (data: Omit<BankAccount, 'id' | 'createdAt' | 'balance'>, initialBalance: number) => {
    const newBank: BankAccount = {
      ...data,
      id: `bank-${Date.now()}`,
      balance: initialBalance,
      createdAt: new Date().toISOString()
    };
    setBankAccounts(prev => [...prev, newBank]);
  };

  const updateBankAccount = (id: string, data: Partial<BankAccount>) => {
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };

  const deleteBankAccount = (id: string): boolean => {
    if (!isAdmin) {
      alert('Solo el Administrador puede eliminar cuentas bancarias.');
      return false;
    }
    setBankAccounts(prev => prev.filter(b => b.id !== id));
    return true;
  };

  // Operaciones: Transferencias, Depósitos, Extracción (solo admin), y Pago de Gastos
  const recordFinancialMovement = (
    data: Omit<FinancialMovement, 'id' | 'date' | 'performedByUserId' | 'performedByUserName'>
  ): { success: boolean; error?: string } => {
    // Extracción: solo admin facultado
    if (data.type === 'withdrawal' && !isAdmin) {
      return {
        success: false,
        error: 'Permiso denegado: Las extracciones de fondos solo pueden ser autorizadas por el usuario Administrador.'
      };
    }

    // Validar saldos
    if (data.originType === 'cash' && cashRegister.balance < data.amount) {
      return { success: false, error: 'Saldo insuficiente en caja efectivo.' };
    }

    if (data.originType === 'bank' && data.originAccountId) {
      const bank = bankAccounts.find(b => b.id === data.originAccountId);
      if (!bank || bank.balance < data.amount) {
        return { success: false, error: 'Saldo insuficiente en la cuenta bancaria de origen.' };
      }
    }

    // Ejecutar movimientos de balances
    if (data.type === 'transfer') {
      // Transferencia entre cuentas o caja a banco
      if (data.originType === 'cash') {
        setCashRegister(prev => ({ ...prev, balance: prev.balance - data.amount }));
      } else if (data.originAccountId) {
        setBankAccounts(prev => prev.map(b => b.id === data.originAccountId ? { ...b, balance: b.balance - data.amount } : b));
      }

      if (data.destinationType === 'cash') {
        setCashRegister(prev => ({ ...prev, balance: prev.balance + data.amount }));
      } else if (data.destinationAccountId) {
        setBankAccounts(prev => prev.map(b => b.id === data.destinationAccountId ? { ...b, balance: b.balance + data.amount } : b));
      }
    } else if (data.type === 'deposit') {
      // Depósito a banco (desde efectivo u origen externo)
      if (data.destinationAccountId) {
        setBankAccounts(prev => prev.map(b => b.id === data.destinationAccountId ? { ...b, balance: b.balance + data.amount } : b));
      }
      if (data.originType === 'cash') {
        setCashRegister(prev => ({ ...prev, balance: prev.balance - data.amount }));
      }
    } else if (data.type === 'withdrawal') {
      // Extracción (solo admin)
      if (data.originType === 'cash') {
        setCashRegister(prev => ({ ...prev, balance: prev.balance - data.amount }));
      } else if (data.originAccountId) {
        setBankAccounts(prev => prev.map(b => b.id === data.originAccountId ? { ...b, balance: b.balance - data.amount } : b));
      }
    } else if (data.type === 'expense') {
      // Pago de gastos: sueldos, servicios, mantenimiento, comisiones
      if (data.originType === 'cash') {
        setCashRegister(prev => ({ ...prev, balance: prev.balance - data.amount }));
        // Si hay un turno abierto y el pago fue en efectivo de caja, imputar a gastos del turno
        if (currentShift) {
          setShifts(prev => prev.map(s => s.id === currentShift.id ? {
            ...s,
            cashExpenses: s.cashExpenses + data.amount,
            expectedCash: s.expectedCash - data.amount
          } : s));
        }
      } else if (data.originAccountId) {
        setBankAccounts(prev => prev.map(b => b.id === data.originAccountId ? { ...b, balance: b.balance - data.amount } : b));
      }
    }

    const newMov: FinancialMovement = {
      ...data,
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      performedByUserId: currentUser.id,
      performedByUserName: currentUser.name
    };

    setFinancialMovements(prev => [newMov, ...prev]);
    return { success: true };
  };

  // --- CART & POS ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`El artículo ${product.name} no cuenta con stock disponible en este momento.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`No hay suficiente stock para añadir más unidades de ${product.name}.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          subtotal: product.sellingPrice
        }
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const cleanQty = Math.round(quantity * 100) / 100;
          if (cleanQty > item.product.stock) {
            alert(`Stock disponible máximo: ${item.product.stock.toFixed(2)}`);
            return item;
          }
          return {
            ...item,
            quantity: cleanQty,
            subtotal: Math.round(cleanQty * item.unitPrice * 100) / 100
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  const processSale = (
    customerId: string | undefined,
    paymentMethod: 'cash' | 'bank_card' | 'bank_transfer' | 'credit',
    bankAccountId?: string
  ): { success: boolean; sale?: Sale; error?: string } => {
    if (cart.length === 0) {
      return { success: false, error: 'El carrito de compras está vacío.' };
    }

    // Obtener cliente y categoría para aplicar descuento automático
    const customer = customers.find(c => c.id === customerId);
    let categoryDiscount = 0;
    if (customer) {
      const category = customerCategories.find(cat => cat.id === customer.categoryId);
      if (category) {
        categoryDiscount = category.discountPercentage;
      }
    }

    const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const discountAmount = Math.round((subtotal * (categoryDiscount / 100)) * 100) / 100;
    const totalAmount = subtotal - discountAmount;
    const totalCost = cart.reduce((acc, item) => acc + (item.product.costPrice * item.quantity), 0);

    // Validación de límite de crédito para compras en cuenta corriente
    if (paymentMethod === 'credit') {
      if (!customer) {
        return { success: false, error: 'Para comprar a crédito en cuenta corriente debes seleccionar un cliente registrado.' };
      }
      const newBalance = customer.currentBalance + totalAmount;
      if (newBalance > customer.creditLimit) {
        return {
          success: false,
          error: `Límite de crédito excedido. Límite: $${customer.creditLimit.toLocaleString()} | Deuda actual: $${customer.currentBalance.toLocaleString()} | Saldo restante: $${(customer.creditLimit - customer.currentBalance).toLocaleString()}`
        };
      }
    }

    // Descontar inventario
    setProducts(prevProds =>
      prevProds.map(p => {
        const cartItem = cart.find(ci => ci.product.id === p.id);
        if (cartItem) {
          return {
            ...p,
            stock: Math.max(0, Math.round((p.stock - cartItem.quantity) * 100) / 100),
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      })
    );

    const ticketNumber = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const saleItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      subGroupId: item.product.subGroupId,
      subGroupName: item.product.subGroupName,
      supplierId: item.product.supplierId,
      supplierName: item.product.supplierName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.product.costPrice,
      subtotal: item.subtotal,
      totalCost: item.product.costPrice * item.quantity
    }));

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      ticketNumber,
      date: new Date().toISOString(),
      customerId: customer ? customer.id : undefined,
      customerName: customer ? customer.name : 'Consumidor Final',
      customerTaxId: customer ? customer.taxId : undefined,
      customerCategoryId: customer ? customer.categoryId : undefined,
      discountPercentage: categoryDiscount,
      subtotal,
      discountAmount,
      totalAmount,
      totalCost,
      paymentMethod,
      bankAccountId,
      shiftId: currentShift ? currentShift.id : undefined,
      cashierUserId: currentUser.id,
      cashierName: currentUser.name,
      status: 'completed',
      items: saleItems
    };

    setSales(prev => [newSale, ...prev]);

    // Actualizar saldos según método de pago
    if (paymentMethod === 'cash') {
      setCashRegister(prev => ({ ...prev, balance: prev.balance + totalAmount }));
      // Si hay turno abierto, sumar venta en efectivo al turno
      if (currentShift) {
        setShifts(prev =>
          prev.map(s =>
            s.id === currentShift.id
              ? {
                  ...s,
                  cashSales: s.cashSales + totalAmount,
                  expectedCash: s.expectedCash + totalAmount
                }
              : s
          )
        );
      }

      // Registrar cobro de venta en movimientos financieros de tesorería
      const saleFinMov: FinancialMovement = {
        id: `mov-sale-${newSale.id}`,
        date: newSale.date,
        type: 'sale_income',
        originType: 'cash',
        destinationType: 'cash',
        amount: totalAmount,
        category: 'ventas',
        description: `Cobro de venta Ticket ${ticketNumber} en Efectivo (${customer ? customer.name : 'Consumidor Final'})`,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        reference: ticketNumber
      };
      setFinancialMovements(prev => [saleFinMov, ...prev]);

    } else if (paymentMethod === 'bank_card' || paymentMethod === 'bank_transfer') {
      if (bankAccountId) {
        setBankAccounts(prev =>
          prev.map(b => (b.id === bankAccountId ? { ...b, balance: b.balance + totalAmount } : b))
        );
      }
      if (currentShift) {
        setShifts(prev =>
          prev.map(s =>
            s.id === currentShift.id
              ? {
                  ...s,
                  cardSales: paymentMethod === 'bank_card' ? s.cardSales + totalAmount : s.cardSales,
                  transferSales: paymentMethod === 'bank_transfer' ? s.transferSales + totalAmount : s.transferSales
                }
              : s
          )
        );
      }

      const bank = bankAccounts.find(b => b.id === bankAccountId);
      const methodLabel = paymentMethod === 'bank_card' ? 'Tarjeta' : 'Transferencia Bancaria';
      const saleFinMov: FinancialMovement = {
        id: `mov-sale-${newSale.id}`,
        date: newSale.date,
        type: 'sale_income',
        originType: 'bank',
        originAccountId: bankAccountId,
        destinationType: 'bank',
        destinationAccountId: bankAccountId,
        amount: totalAmount,
        category: 'ventas',
        description: `Cobro de venta Ticket ${ticketNumber} con ${methodLabel}${bank ? ` en ${bank.bankName}` : ''} (${customer ? customer.name : 'Consumidor Final'})`,
        performedByUserId: currentUser.id,
        performedByUserName: currentUser.name,
        reference: ticketNumber
      };
      setFinancialMovements(prev => [saleFinMov, ...prev]);

    } else if (paymentMethod === 'credit' && customer) {
      // Sumar deuda a la cuenta corriente del cliente
      const newBalance = customer.currentBalance + totalAmount;
      setCustomers(prev => prev.map(c => (c.id === customer.id ? { ...c, currentBalance: newBalance } : c)));

      setCustomerMovements(prev => [
        {
          id: `cm-${Date.now()}`,
          customerId: customer.id,
          date: newSale.date,
          type: 'sale',
          amount: totalAmount,
          balanceAfter: newBalance,
          reference: ticketNumber,
          notes: `Venta POS a crédito con descuento del ${categoryDiscount}%`
        },
        ...prev
      ]);

      if (currentShift) {
        setShifts(prev =>
          prev.map(s =>
            s.id === currentShift.id
              ? {
                  ...s,
                  creditSales: s.creditSales + totalAmount
                }
              : s
          )
        );
      }
    }

    clearCart();
    return { success: true, sale: newSale };
  };

  // --- SHIFTS & CIERRE DE CAJA ---
  const openShift = (initialCash: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      openedAt: new Date().toISOString(),
      initialCash,
      expectedCash: initialCash,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      creditSales: 0,
      cashWithdrawals: 0,
      cashExpenses: 0,
      status: 'open'
    };
    setShifts(prev => [newShift, ...prev]);
  };

  const closeShift = (actualCash: number, notes?: string): Shift | null => {
    if (!currentShift) return null;

    let closedShift: Shift | null = null;

    setShifts(prev =>
      prev.map(s => {
        if (s.id === currentShift.id) {
          closedShift = {
            ...s,
            actualCash,
            closedAt: new Date().toISOString(),
            status: 'closed',
            notes: notes || s.notes
          };
          return closedShift;
        }
        return s;
      })
    );

    return closedShift;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        usersCount: users.length,
        isFirstUserRegistrationRequired,
        isLoadingAuth,
        authError,
        login,
        registerFirstAdmin,
        createUser,
        wipeAllDatabaseRecords,
        logout,
        isAdmin,
        isCashier,
        subGroups,
        addSubGroup,
        updateSubGroup,
        deleteSubGroup,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        suppliers,
        supplierInvoices,
        supplierMovements,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        recordSupplierInvoice,
        recordSupplierPayment,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        customerCategories,
        customers,
        customerMovements,
        addCustomerCategory,
        updateCustomerCategory,
        deleteCustomerCategory,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordCustomerPayment,
        cashRegister,
        bankAccounts,
        financialMovements,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        recordFinancialMovement,
        sales,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        processSale,
        currentShift,
        shifts,
        openShift,
        closeShift,
        isOnlineDb: isSupabaseConfigured,
        theme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
};
