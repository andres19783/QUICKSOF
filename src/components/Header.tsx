import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/exportUtils';
import { 
  LogOut, 
  Moon, 
  Sun, 
  Shield, 
  UserCheck, 
  Database, 
  Clock, 
  DollarSign, 
  X,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  onOpenCloseShiftModal: () => void;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCloseShiftModal, onOpenSupabaseModal }) => {
  const { 
    currentUser, 
    users, 
    login, 
    logout, 
    isAdmin, 
    cashRegister, 
    currentShift,
    isOnlineDb,
    theme,
    toggleTheme
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 border-b border-[#1F1F23] px-4 md:px-6 flex items-center justify-between bg-[#0F0F12] text-[#E4E4E7] shrink-0">
      <div className="flex items-center gap-3 md:gap-4">
        <h2 className="font-semibold text-sm md:text-base tracking-tight hidden sm:block">
          AI QuickStock &bull; Contable, Inventarios & CRM
        </h2>
        
        {currentShift ? (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>TURNO ACTIVO</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">
              (Inició: {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[11px] font-bold rounded-full border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>SIN TURNO ACTIVO</span>
          </div>
        )}

        <button
          onClick={onOpenSupabaseModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Ver o configurar conexión a Supabase (jhxybbyeajqilxodgrzx)"
        >
          <Database className={`w-3 h-3 ${isOnlineDb ? 'text-emerald-400' : 'text-emerald-500/80'}`} />
          <span className="hidden md:inline">{isOnlineDb ? 'Supabase Conectado' : 'Supabase (jhxybbyeajqilxodgrzx)'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {/* Saldo en Caja */}
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Saldo en Caja</p>
          <p className="text-sm font-mono font-bold text-emerald-400">
            {formatCurrency(cashRegister.balance)}
          </p>
        </div>

        <div className="h-7 w-[1px] bg-[#1F1F23] hidden sm:block"></div>

        {/* Botón Arqueo / Cerrar Caja */}
        {currentShift && (
          <button
            onClick={onOpenCloseShiftModal}
            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5"
            title="Cerrar turno y efectuar arqueo de caja"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CERRAR CAJA</span>
          </button>
        )}

        {/* Selector de Tema */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-[#16161A] border border-[#27272A] text-zinc-300 hover:text-white transition-colors"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Perfil & Logout */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#16161A] transition-colors border border-transparent hover:border-zinc-800"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                {currentUser.username.slice(0, 2)}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-zinc-200 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                  ROL: {currentUser.role.toUpperCase()}
                </p>
              </div>
            </button>

            {/* Menú desplegable */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#16161A] border border-[#27272A] rounded-xl shadow-2xl z-50 p-2 text-xs">
                <div className="p-2 border-b border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{currentUser.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">@{currentUser.username}</p>
                  </div>
                  <button onClick={() => setShowUserMenu(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 transition-colors font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
