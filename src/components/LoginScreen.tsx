import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Shield, 
  Lock, 
  User, 
  UserPlus, 
  Key, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Users
} from 'lucide-react';
import { supabaseUrl } from '../lib/supabase';

interface LoginScreenProps {
  onOpenSupabaseConfig?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOpenSupabaseConfig }) => {
  const { 
    isFirstUserRegistrationRequired, 
    login, 
    registerFirstAdmin, 
    createUser,
    isLoadingAuth, 
    authError,
    usersCount
  } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Estados para nuevo usuario secundario (Cajero / Empleado)
  const [newUserName, setNewUserName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'cashier' | 'employee'>('cashier');

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!username.trim()) {
      setFormError('Ingresa tu nombre de usuario.');
      return;
    }
    if (!password) {
      setFormError('Ingresa tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(username.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Credenciales inválidas.');
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!newUsername.trim() || !newPassword || !newUserName.trim()) {
      setFormError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (newPassword.length < 4) {
      setFormError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if ((newUserRole as string) === 'admin') {
      setFormError('El rol Administrador no está disponible para nuevos usuarios.');
      return;
    }

    setIsSubmitting(true);
    const res = await createUser({
      username: newUsername.trim(),
      password: newPassword,
      name: newUserName.trim(),
      role: newUserRole,
      email: newUserEmail.trim() || undefined
    });
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'No se pudo registrar el nuevo usuario.');
    } else {
      setSuccessMsg(`Usuario "${newUsername}" creado con éxito. Iniciando sesión...`);
      setTimeout(async () => {
        await login(newUsername.trim(), newPassword);
      }, 1000);
    }
  };

  const handleFirstAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username.trim() || !password || !adminName.trim()) {
      setFormError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (password.length < 4) {
      setFormError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setIsSubmitting(true);
    const res = await registerFirstAdmin({
      username: username.trim(),
      password,
      name: adminName.trim(),
      email: adminEmail.trim() || undefined
    });
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'No se pudo crear el usuario administrador.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-[#121215] border border-zinc-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
            {isFirstUserRegistrationRequired ? (
              <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
            ) : (
              <Shield className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            AI QuickStock
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Sistema Contable, Inventario, CRM & Facturación IA
          </p>
        </div>

        {/* Database connectivity pill */}
        <div className="mb-6 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-zinc-400 truncate">
              BD Supabase: <span className="text-emerald-400 font-mono font-medium">jhxybbyeajqilxodgrzx</span>
            </span>
          </div>
          {onOpenSupabaseConfig && (
            <button
              onClick={onOpenSupabaseConfig}
              className="text-[11px] text-zinc-300 hover:text-white underline font-semibold shrink-0 cursor-pointer"
            >
              Configurar
            </button>
          )}
        </div>

        {/* Dynamic Mode: First User Admin setup VS Standard Database Login */}
        {isFirstUserRegistrationRequired ? (
          <div>
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs mb-5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Inicialización del Sistema: Primer Administrador
                </p>
                <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
                  La tabla de usuarios de la base de datos está vacía. El primer usuario registrado será asignado automáticamente con privilegios de <strong>Administrador General</strong>.
                  Una vez creado, el autoregistro público quedará permanentemente bloqueado.
                </p>
              </div>
            </div>

            <form onSubmit={handleFirstAdminRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre Completo del Administrador *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: Administrador General"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Usuario de Acceso (Username) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Contraseña Maestra *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="admin@empresa.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {(formError || authError) && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError || authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoadingAuth}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Creando Administrador...' : 'Crear Administrador y Comenzar'}
              </button>
            </form>
          </div>
        ) : authMode === 'login' ? (
          <div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Tu usuario registrado en BD"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {(formError || authError) && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError || authError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoadingAuth}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? 'Verificando en Base de Datos...' : 'Iniciar Sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Opción para registrar otros usuarios autorizados */}
            <div className="mt-5 pt-4 border-t border-zinc-800/80 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setFormError(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-2.5 px-3 bg-zinc-800/70 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-zinc-700/60 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Registrar Nuevo Usuario (Cajero / Empleado)</span>
              </button>

              <div className="text-center text-[11px] text-zinc-500">
                Usuarios en base de datos: <span className="text-zinc-300 font-mono font-bold">{usersCount}</span> (Admin registrado)
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Alta de Usuario Operador</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                El sistema ya cuenta con Administrador principal. Crea un nuevo usuario para operadores del punto de venta o personal.
              </p>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcelo Suárez"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: marcelo.cajero"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="operador@empresa.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* SELECCIÓN DE ROL: ROL ADMIN RESTRINGIDO ESTRICTAMENTE */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Rol de Usuario en el Sistema *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      newUserRole === 'cashier'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newUserRole"
                      value="cashier"
                      checked={newUserRole === 'cashier'}
                      onChange={() => setNewUserRole('cashier')}
                      className="mt-0.5 text-emerald-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-emerald-400">Cajero / Turno POS</div>
                      <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Operación de punto de venta, arqueo de turno y cobros.</div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      newUserRole === 'employee'
                        ? 'bg-blue-500/15 border-blue-500 text-white'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newUserRole"
                      value="employee"
                      checked={newUserRole === 'employee'}
                      onChange={() => setNewUserRole('employee')}
                      className="mt-0.5 text-blue-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-blue-400">Empleado General</div>
                      <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Consulta de catálogo, stock, compras y proveedores.</div>
                    </div>
                  </label>
                </div>

                {/* Advertencia visual de que el rol de Administrador no está disponible */}
                <div className="mt-2.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[11px] text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Rol Administrador restringido:</strong> No disponible para nuevos usuarios. Es exclusivo del primer usuario del sistema.
                  </span>
                </div>
              </div>

              {(formError || authError) && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError || authError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoadingAuth}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Registrando en Base de Datos...' : 'Crear Usuario Operador'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setFormError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white transition-colors underline"
                >
                  ← Volver a Iniciar Sesión
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
