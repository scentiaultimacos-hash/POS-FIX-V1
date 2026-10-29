import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { PAGE_GROUPS } from '../../utils/constants';
import {
  LayoutGrid,
  BarChart3,
  Package,
  Users,
  UserCog,
  Settings2,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  PauseCircle,
  Gift,
  TrendingUp,
  UserCheck,
  RotateCcw,
  PackageSearch,
  Wallet,
  Target,
  Warehouse,
  ClipboardList,
  Truck,
  QrCode,
  CreditCard,
  Ticket,
  CalendarClock,
  Camera,
  Banknote,
  BarChart2,
  ShieldCheck,
  Clock,
  Settings,
  Database,
  LogOut,
  Users2,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  'layout-grid': LayoutGrid,
  'bar-chart-3': BarChart3,
  package: Package,
  users: Users,
  'user-cog': UserCog,
  'settings-2': Settings2,
  'layout-dashboard': LayoutDashboard,
  'shopping-cart': ShoppingCart,
  'pause-circle': PauseCircle,
  gift: Gift,
  'trending-up': TrendingUp,
  'user-check': UserCheck,
  'rotate-ccw': RotateCcw,
  'package-search': PackageSearch,
  wallet: Wallet,
  target: Target,
  warehouse: Warehouse,
  'clipboard-list': ClipboardList,
  truck: Truck,
  'qr-code': QrCode,
  'credit-card': CreditCard,
  ticket: Ticket,
  'users-2': Users2,
  'calendar-clock': CalendarClock,
  camera: Camera,
  banknote: Banknote,
  'bar-chart-2': BarChart2,
  'shield-check': ShieldCheck,
  clock: Clock,
  settings: Settings,
  database: Database,
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentPage, setCurrentPage, canAccess, db, logout } = usePOS();
  // Open groups state (default: open all groups)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Utama: true,
    Laporan: true,
    'Produk & Stok': true,
    Pelanggan: true,
    Karyawan: true,
    Sistem: true,
  });

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const pendingCount = (db.pending_orders || []).length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Aside container */}
      <aside
        className={`fixed top-[60px] left-0 bottom-0 w-[240px] bg-gradient-to-b from-[#00C9A7] to-[#00A88E] text-white z-40 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shadow-lg md:shadow-none`}
      >
        <div className="flex-1 overflow-y-auto sidebar-scroll py-3">
          <nav className="px-3 space-y-1">
            {PAGE_GROUPS.map((group) => {
              // Filter pages accessible by user
              const accessiblePages = group.pages.filter((page) => canAccess(page.id));
              if (accessiblePages.length === 0) return null;

              const isGroupOpen = !!openGroups[group.name];
              const hasActiveChild = accessiblePages.some((p) => p.id === currentPage);
              const GroupIcon = iconMap[group.icon] || LayoutGrid;

              return (
                <div key={group.name} className="sidebar-group mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/10 transition-colors text-left ${
                      hasActiveChild ? 'bg-white/10 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GroupIcon className="w-4 h-4 text-white/80" />
                      <span className="text-sm font-medium">{group.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isGroupOpen && (
                    <div className="pl-3 mt-1 space-y-0.5 animate-slide-down">
                      {accessiblePages.map((page) => {
                        const PageIcon = iconMap[page.icon] || LayoutDashboard;
                        const isActive = currentPage === page.id;

                        return (
                          <button
                            key={page.id}
                            onClick={() => {
                              setCurrentPage(page.id);
                              onClose();
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left relative ${
                              isActive
                                ? 'bg-black/20 text-white font-bold shadow-xs'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {/* Gold bar indicator if active */}
                            {isActive && (
                              <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFC107] rounded-r-md"></span>
                            )}
                            <PageIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFC107]' : 'text-white/75'}`} />
                            <span className="truncate">{page.label}</span>

                            {/* Pending Count Badge */}
                            {page.id === 'pending' && pendingCount > 0 && (
                              <span className="ml-auto text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold">
                                {pendingCount}
                              </span>
                            )}

                            {/* NEW Badge */}
                            {page.badge && (
                              <span className="ml-auto text-[9px] bg-[#FFC107] text-slate-900 px-1.5 py-0.2 rounded font-extrabold uppercase">
                                {page.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom footer / Logout */}
        <div className="p-3 border-t border-white/15 bg-black/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold"
          >
            <LogOut className="w-4 h-4 text-white/70" />
            <span>Keluar Akun (Logout)</span>
          </button>
          <div className="text-[10px] text-white/50 text-center mt-2 font-mono">
            Parfumku POS v7.0 • © 2026
          </div>
        </div>
      </aside>
    </>
  );
};
