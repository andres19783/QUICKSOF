import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SubGroupsModule } from './components/SubGroupsModule';
import { ProductsModule } from './components/ProductsModule';
import { SuppliersModule } from './components/SuppliersModule';
import { EmployeesModule } from './components/EmployeesModule';
import { CustomersModule } from './components/CustomersModule';
import { CashBankModule } from './components/CashBankModule';
import { POSModule } from './components/POSModule';
import { ShiftModule } from './components/ShiftModule';
import { SoldItemsReport } from './components/SoldItemsReport';
import { BalanceReport } from './components/BalanceReport';
import { BackupModule } from './components/BackupModule';
import { CloseShiftModal } from './components/CloseShiftModal';
import { SupabaseModal } from './components/SupabaseModal';
import { StoreSettingsModal } from './components/StoreSettingsModal';
import { LoginScreen } from './components/LoginScreen';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const { theme, currentUser, isAdmin } = useApp();

  // Si no hay usuario autenticado, renderizar la pantalla de Login conectada a la base de datos
  if (!currentUser) {
    return (
      <>
        <LoginScreen onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)} />
        <SupabaseModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${
      theme === 'dark' ? 'bg-[#0A0A0B] text-[#E4E4E7]' : 'bg-[#F4F4F5] text-[#18181B]'
    }`}>
      {/* Top Header */}
      <Header 
        onOpenCloseShiftModal={() => setIsCloseShiftModalOpen(true)} 
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main workspace with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Dynamic Module Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0A0A0B]/95">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard onNavigate={(tab: ActiveTab) => setActiveTab(tab)} />
            )}

            {activeTab === 'subgroups' && <SubGroupsModule />}

            {activeTab === 'products' && <ProductsModule />}

            {activeTab === 'suppliers' && <SuppliersModule />}

            {activeTab === 'employees' && <EmployeesModule />}

            {activeTab === 'customers' && <CustomersModule />}

            {activeTab === 'cashbank' && <CashBankModule />}

            {activeTab === 'pos' && <POSModule />}

            {activeTab === 'shift' && (
              <ShiftModule onOpenCloseShiftModal={() => setIsCloseShiftModalOpen(true)} />
            )}

            {activeTab === 'solditems' && <SoldItemsReport />}

            {activeTab === 'balance' && <BalanceReport />}

            {activeTab === 'backup' && <BackupModule />}
          </div>
        </main>
      </div>

      {/* Global Cash Shift Close & Audit Modal */}
      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
      />

      {/* Supabase Connection Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* Store Branding & Settings Modal */}
      <StoreSettingsModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
