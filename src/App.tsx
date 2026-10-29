import React, { useState } from 'react';
import { usePOS } from './context/POSContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/modals/ToastContainer';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { PinModal } from './components/modals/PinModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { KasirPage } from './pages/KasirPage';
import { PendingPage } from './pages/PendingPage';
import { RedeemPage } from './pages/RedeemPage';
import { BarcodeDesignerPage } from './pages/BarcodeDesignerPage';
import { ProdukPage } from './pages/ProdukPage';
import { InventoriPage } from './pages/InventoriPage';
import { OpnamePage } from './pages/OpnamePage';
import { SupplierPage } from './pages/SupplierPage';
import { PelangganPage } from './pages/PelangganPage';
import { KasbonPage } from './pages/KasbonPage';
import { VoucherPage } from './pages/VoucherPage';
import { RfmPage } from './pages/RfmPage';
import { KaryawanPage } from './pages/KaryawanPage';
import { ShiftPages } from './pages/ShiftPages';
import { AbsensiPage } from './pages/AbsensiPage';
import { LaporanKaryawanPage } from './pages/LaporanKaryawanPage';
import { PayrollPage } from './pages/PayrollPage';
import { LaporanPages } from './pages/LaporanPages';
import { HakAksesPage } from './pages/HakAksesPage';
import { MasterPage } from './pages/MasterPage';
import { DatabasePage } from './pages/DatabasePage';

export const App: React.FC = () => {
  const { currentUser, currentPage, hasPermission } = usePOS();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  const renderPage = () => {
    const normalizedPage = (currentPage || 'dashboard').toLowerCase().replace(/_/g, '-');

    // Permission check
    if (!hasPermission(normalizedPage) && currentUser.role !== 'owner') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl font-black mb-4">
            ⛔
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Akses Terbatas</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Role Anda ({currentUser.role}) tidak memiliki izin untuk mengakses halaman ini. Hubungi Manager atau Owner untuk membuka akses.
          </p>
        </div>
      );
    }

    switch (normalizedPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'kasir':
        return <KasirPage />;
      case 'pending':
        return <PendingPage />;
      case 'redeem':
        return <RedeemPage />;
      case 'barcode-designer':
      case 'barcode':
        return <BarcodeDesignerPage />;
      case 'produk':
        return <ProdukPage />;
      case 'inventori':
        return <InventoriPage />;
      case 'opname':
        return <OpnamePage />;
      case 'supplier':
        return <SupplierPage />;
      case 'pelanggan':
        return <PelangganPage />;
      case 'kasbon':
        return <KasbonPage />;
      case 'voucher':
        return <VoucherPage />;
      case 'rfm':
        return <RfmPage />;
      case 'karyawan':
        return <KaryawanPage />;
      case 'shift':
      case 'shift-groups':
        return <ShiftPages initialTab="groups" />;
      case 'shift-schedule':
        return <ShiftPages initialTab="roster" />;
      case 'shift-history':
        return <ShiftPages initialTab="history" />;
      case 'absensi':
        return <AbsensiPage />;
      case 'laporan-karyawan':
        return <LaporanKaryawanPage />;
      case 'payroll':
        return <PayrollPage />;
      case 'laporan-penjualan':
        return <LaporanPages activeReport="penjualan" />;
      case 'laporan-kasir':
        return <LaporanPages activeReport="kasir" />;
      case 'laporan-retur':
        return <LaporanPages activeReport="retur" />;
      case 'laporan-stok':
        return <LaporanPages activeReport="stok" />;
      case 'laporan-keuangan':
        return <LaporanPages activeReport="keuangan" />;
      case 'hak-akses':
        return <HakAksesPage />;
      case 'master':
        return <MasterPage />;
      case 'database':
        return <DatabasePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex flex-1 pt-[60px]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 md:ml-[250px] min-w-0 pb-16 md:pb-6 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      {/* Global Modals */}
      <ToastContainer />
      <ConfirmModal />
      <PinModal />
    </div>
  );
};

export default App;
