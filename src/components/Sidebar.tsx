import React from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  Package, 
  Truck, 
  Users, 
  UserCircle, 
  Landmark, 
  ShoppingCart, 
  Clock, 
  FileSpreadsheet, 
  Scale,
  Archive,
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ActiveTab = 
  | 'dashboard'
  | 'subgroups'
  | 'products'
  | 'suppliers'
  | 'employees'
  | 'customers'
  | 'cashbank'
  | 'pos'
  | 'shift'
  | 'solditems'
  | 'balance'
  | 'backup';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen
}) => {
  const { currentUser, currentShift, isAdmin } = useApp();

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart, badge: 'Ventas' },
    { id: 'subgroups', label: '1. Sub-Grupos & Márgenes', icon: FolderTree },
    { id: 'products', label: '2. Productos & Stock', icon: Package },
    { id: 'suppliers', label: '3. Proveedores & Compras', icon: Truck },
    { id: 'employees', label: '4. Registro de Empleados', icon: Users },
    { id: 'customers', label: '5. CRM Clientes & Crédito', icon: UserCircle },
    { id: 'cashbank', label: '6. Caja & Cuentas Bancos', icon: Landmark },
    { id: 'shift', label: '8. Turno & Cierre de Caja', icon: Clock, badge: currentShift ? 'En vivo' : undefined },
    { id: 'solditems', label: '9. Artículos Vendidos', icon: FileSpreadsheet },
    { id: 'balance', label: '10. Balance & Margen Neto', icon: Scale },
    { id: 'backup', label: '11. Respaldo (Backup BD)', icon: Archive, badge: 'CSV', adminOnly: true }
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Botón flotante móvil para desplegar barra lateral */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3.5 bg-emerald-500 text-black rounded-full shadow-2xl flex items-center justify-center font-bold"
        aria-label="Abrir Menú"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop para mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
        ></div>
      )}

      <aside
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-40
          w-72 bg-[#0F0F12] border-r border-[#1F1F23] flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-[#1F1F23] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-emerald-500/20 text-lg">
              Ω
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">AI QuickStock</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest block uppercase">Contable &bull; Stock &bull; POS</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-[#52525B] font-semibold mb-2 px-3 pt-2">
            Módulos del Sistema
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group
                  ${isActive
                    ? 'bg-[#1C1C21] text-emerald-400 border border-[#27272A] shadow-sm'
                    : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-zinc-200'
                  }
                `}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`w-1 h-4 rounded-full transition-all ${isActive ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-zinc-700'}`}></div>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#27272A] text-zinc-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card footer */}
        {currentUser && (
          <div className="p-3 border-t border-[#1F1F23] bg-[#0A0A0B]/60">
            <div className="flex items-center gap-3 p-2.5 bg-[#16161A] rounded-xl border border-[#27272A]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                {currentUser.username.slice(0, 2)}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-bold text-zinc-200 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-emerald-400 font-mono">
                  {isAdmin ? '★ Administrador' : 'Operador / Cajero'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
