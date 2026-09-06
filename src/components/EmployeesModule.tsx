import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Employee, User } from '../types';
import { formatCurrency, exportToExcel } from '../utils/exportUtils';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Briefcase, 
  DollarSign, 
  X,
  Shield,
  Lock,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Key
} from 'lucide-react';

export const EmployeesModule: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    isAdmin,
    users,
    createUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'employees' | 'system_users'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Estados para Modal de Nuevo Usuario del Sistema
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'cashier' | 'employee'>('cashier');
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    role: '',
    email: '',
    phone: '',
    salary: 250000,
    hireDate: new Date().toISOString().split('T')[0],
    isActive: true
  });

  const handleCreateSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);

    if (!newUserName.trim() || !newUsername.trim() || !newPassword) {
      setUserModalError('Todos los campos con asterisco son obligatorios.');
      return;
    }

    if (newPassword.length < 4) {
      setUserModalError('La contraseña debe contener al menos 4 caracteres.');
      return;
    }

    // Regla estricta: El rol admin no está disponible para nuevos usuarios
    if ((newUserRole as string) === 'admin') {
      setUserModalError('El rol Administrador no está disponible para nuevos usuarios.');
      return;
    }

    setIsSubmittingUser(true);
    const res = await createUser({
      name: newUserName.trim(),
      username: newUsername.trim(),
      password: newPassword,
      role: newUserRole,
      email: newUserEmail.trim() || undefined
    });
    setIsSubmittingUser(false);

    if (!res.success) {
      setUserModalError(res.error || 'Error al registrar el usuario.');
    } else {
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUsername('');
      setNewPassword('');
      setNewUserEmail('');
      setNewUserRole('cashier');
      alert(`Usuario ${newUsername} registrado exitosamente con rol ${newUserRole === 'cashier' ? 'Cajero' : 'Empleado'}.`);
    }
  };

  const openNewModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      taxId: '',
      role: 'Cajero / Mostrador',
      email: '',
      phone: '',
      salary: 250000,
      hireDate: new Date().toISOString().split('T')[0],
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      taxId: emp.taxId || emp.document || '',
      role: emp.role || emp.position || '',
      email: emp.email,
      phone: emp.phone,
      salary: emp.salary,
      hireDate: emp.hireDate,
      isActive: emp.isActive ?? (emp.status === 'active')
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.taxId.trim()) return;

    const empPayload = {
      name: formData.name.trim(),
      document: formData.taxId.trim(),
      taxId: formData.taxId.trim(),
      position: formData.role.trim(),
      role: formData.role.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      salary: Number(formData.salary),
      hireDate: formData.hireDate,
      status: (formData.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
      isActive: formData.isActive
    };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, empPayload);
    } else {
      addEmployee(empPayload);
    }
    setIsModalOpen(false);
  };

  const filtered = employees.filter(e => {
    const roleText = e.role || e.position || '';
    const docText = e.taxId || e.document || '';
    return (
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roleText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      docText.includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] p-5 rounded-2xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">4. Módulo de Personal & Usuarios del Sistema</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión de nómina de empleados y control de usuarios con credenciales de acceso a la base de datos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'employees' ? (
            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Empleado</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsUserModalOpen(true);
                setUserModalError(null);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de pestañas: Nómina vs Usuarios del Sistema */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              : 'bg-[#16161A] text-zinc-400 hover:text-white border border-[#27272A]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Nómina de Personal ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system_users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'system_users'
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              : 'bg-[#16161A] text-zinc-400 hover:text-white border border-[#27272A]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Usuarios del Sistema en BD ({users.length})</span>
        </button>
      </div>

      {activeTab === 'employees' ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, cargo o CUIT/CUIL..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#16161A] border border-[#27272A] rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-zinc-400">Total empleados: {employees.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(emp => (
              <div key={emp.id} className="bg-[#16161A] rounded-xl border border-[#27272A] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-base">{emp.name}</h3>
                      <p className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{emp.role || emp.position}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (emp.isActive ?? (emp.status === 'active')) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {(emp.isActive ?? (emp.status === 'active')) ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
                    <p className="font-mono text-zinc-300">CUIL/DNI: {emp.taxId || emp.document}</p>
                    <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-zinc-500" /> {emp.email}</p>
                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-500" /> {emp.phone}</p>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/40">
                      <span>Sueldo Base:</span>
                      <span className="font-mono font-bold text-white text-sm">{formatCurrency(emp.salary)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-2">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="px-3 py-1.5 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 rounded-lg text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar al empleado ${emp.name}?`)) {
                        deleteEmployee(emp.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* PESTAÑA: USUARIOS DEL SISTEMA EN BASE DE DATOS */
        <div className="space-y-4">
          <div className="p-4 bg-[#16161A] rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Cuentas de Acceso Autenticadas</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                El Administrador inicial es único. Se pueden registrar usuarios adicionales únicamente con roles de Cajero o Empleado.
              </p>
            </div>
            <button
              onClick={() => {
                setIsUserModalOpen(true);
                setUserModalError(null);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Usuario Operador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => (
              <div 
                key={u.id} 
                className={`bg-[#16161A] rounded-2xl border p-5 flex flex-col justify-between ${
                  u.role === 'admin' ? 'border-amber-500/40 bg-amber-500/5' : 'border-[#27272A]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        u.role === 'admin' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                          : u.role === 'cashier'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}>
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{u.name}</h4>
                        <p className="text-xs text-zinc-400 font-mono">@{u.username}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : u.role === 'cashier'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    }`}>
                      {u.role === 'admin' ? '👑 Administrador' : u.role === 'cashier' ? '🛒 Cajero POS' : '👤 Empleado'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs text-zinc-400">
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{u.email || 'Sin correo registrado'}</span>
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      ID Usuario: {u.id}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                  {u.role === 'admin' ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Administrador Principal
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Operador Habilitado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">CUIL / DNI *</label>
                  <input
                    type="text"
                    required
                    value={formData.taxId}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Puesto / Cargo *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Sueldo Asignado ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs font-mono text-emerald-400"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] text-zinc-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVO USUARIO DEL SISTEMA (ADMIN NO DISPONIBLE) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#27272A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Registrar Nuevo Usuario del Sistema</h3>
              </div>
              <button 
                onClick={() => !isSubmittingUser && setIsUserModalOpen(false)} 
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSystemUser} className="p-5 space-y-4 text-xs">
              {/* Notificación explicativa de la restricción del rol Admin */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Restricción de Rol:</strong> El rol de Administrador es único y exclusivo del primer usuario registrado. Los nuevos usuarios pueden registrarse como Cajeros o Empleados.
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Gómez"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                  Nombre de Usuario (para Login) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: laura_caja"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.toLowerCase().trim())}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                  Contraseña de Acceso *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="laura@empresa.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Selección de Rol con bloqueo explícito de Admin */}
              <div>
                <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-2">
                  Rol del Usuario en el Sistema *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col transition-colors ${
                    newUserRole === 'cashier' 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                      : 'bg-[#0A0A0B] border-[#27272A] text-zinc-400 hover:border-zinc-700'
                  }`}>
                    <input
                      type="radio"
                      name="newUserRole"
                      value="cashier"
                      checked={newUserRole === 'cashier'}
                      onChange={() => setNewUserRole('cashier')}
                      className="sr-only"
                    />
                    <span className="font-bold text-white text-xs">Cajero POS</span>
                    <span className="text-[10px] text-zinc-400 mt-1">Apertura/cierre de turnos, cobros y ventas.</span>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col transition-colors ${
                    newUserRole === 'employee' 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                      : 'bg-[#0A0A0B] border-[#27272A] text-zinc-400 hover:border-zinc-700'
                  }`}>
                    <input
                      type="radio"
                      name="newUserRole"
                      value="employee"
                      checked={newUserRole === 'employee'}
                      onChange={() => setNewUserRole('employee')}
                      className="sr-only"
                    />
                    <span className="font-bold text-white text-xs">Empleado</span>
                    <span className="text-[10px] text-zinc-400 mt-1">Consulta y gestión de catálogo y stock.</span>
                  </label>
                </div>

                {/* Opción Admin deshabilitada */}
                <div className="mt-2 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between opacity-60 cursor-not-allowed">
                  <span className="text-zinc-400 text-xs flex items-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    Rol Administrador
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-semibold">
                    No disponible para nuevos usuarios
                  </span>
                </div>
              </div>

              {userModalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userModalError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingUser}
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmittingUser ? 'Registrando...' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
