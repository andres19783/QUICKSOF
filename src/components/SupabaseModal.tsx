import React, { useState } from 'react';
import { supabaseUrl, isSupabaseConfigured, setSupabaseCredentials } from '../lib/supabase';
import { Database, Key, CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [anonKey, setAnonKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const projectRef = 'jhxybbyeajqilxodgrzx';

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anonKey.trim()) return;
    setSupabaseCredentials(anonKey.trim(), supabaseUrl);
  };

  const handleCopySchemaCommand = () => {
    navigator.clipboard.writeText(`-- Copia y pega el contenido del archivo supabase_schema.sql en el SQL Editor de tu proyecto Supabase`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#121215] border border-zinc-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-[#18181C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Conexión Supabase PostgreSQL</h3>
              <p className="text-xs text-zinc-400">Project Ref: <code className="text-emerald-400 font-mono">{projectRef}</code></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto font-sans text-sm">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isSupabaseConfigured 
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}>
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-white text-xs uppercase tracking-wider">
                {isSupabaseConfigured ? 'Conectado a la Base de Datos Supabase' : 'URL Vinculada - Requiere Clave anon / public'}
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {isSupabaseConfigured
                  ? 'La aplicación está conectada exitosamente a tu proyecto de Supabase en tiempo real.'
                  : 'El Endpoint del proyecto ya quedó configurado en el código. Para permitir que el navegador lea y escriba tablas en Supabase, ingresa tu clave API anon/public.'}
              </p>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-[#18181C] p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Supabase URL configurada:</span>
              <span className="font-mono text-emerald-400 font-semibold">{supabaseUrl}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Proyecto Referencia:</span>
              <span className="font-mono text-white font-semibold">{projectRef}</span>
            </div>
          </div>

          {/* Form to enter anon key if not in env */}
          <form onSubmit={handleSave} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Clave de API de Supabase (`anon` / `public`)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              La encuentras en tu panel de Supabase en: <strong>Project Settings &gt; API &gt; Project API keys &gt; anon / public</strong>.
            </p>

            <button
              type="submit"
              disabled={!anonKey.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Guardar y Activar Sincronización
            </button>
          </form>

          {/* Quick link & Schema execution info */}
          <div className="pt-2 border-t border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Esquema de Tablas (SQL)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              El proyecto incluye el archivo <code className="text-zinc-200 font-mono bg-zinc-800 px-1 py-0.5 rounded">supabase_schema.sql</code> listo con las tablas: <strong>users, sub_groups, products, suppliers, supplier_invoices, customers, employees, bank_accounts, cash_register, shifts, sales</strong>.
            </p>
            <div className="flex gap-2">
              <a
                href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                Abrir SQL Editor en Supabase
              </a>
              <button
                type="button"
                onClick={handleCopySchemaCommand}
                className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedSql ? 'Copiado' : 'Ayuda SQL'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#16161A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
