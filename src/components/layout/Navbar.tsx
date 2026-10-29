import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Database,
  LogOut,
  Clock,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { ShiftModal } from '../modals/ShiftModal';
import { NotificationModal } from '../modals/NotificationModal';
import { BackupModal } from '../modals/BackupModal';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, db, theme, toggleTheme, logout, activeShift, cloudSyncStatus } = usePOS();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const unreadNotifCount = (db.notifications || []).filter((n) => !n.read).length;
  const storeName = db.master?.toko?.nama || 'parfumku';
  const logoText = storeName.charAt(0).toUpperCase();

  // Shift active time
  const getShiftDuration = () => {
    if (!activeShift) return '00:00';
    const diff = Math.max(0, Date.now() - new Date(activeShift.buka_at).getTime());
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 flex items-center shadow-xs">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden w-12 h-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Brand */}
        <div className="hidden md:flex w-[240px] h-full items-center px-5 border-r border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            {db.master?.logo ? (
              <img src={db.master.logo} alt="Logo" className="w-9 h-9 rounded-lg object-cover shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00C9A7] to-[#4ADE80] flex items-center justify-center text-white font-extrabold text-base shadow-xs">
                {logoText}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-extrabold text-[17px] text-[#00C9A7] tracking-tight lowercase">
                {storeName}
              </div>
              <div className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                POS v7.0
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Brand */}
        <div className="md:hidden flex items-center gap-2 flex-1 pl-1">
          {db.master?.logo ? (
            <img src={db.master.logo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00C9A7] to-[#4ADE80] flex items-center justify-center text-white font-bold text-xs">
              {logoText}
            </div>
          )}
          <div className="font-extrabold text-[#00C9A7] text-sm lowercase truncate max-w-[130px]">
            {storeName}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 pr-3 ml-auto">
          {/* Cloud Sync indicator */}
          <button
            onClick={() => setIsBackupOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Klik untuk melihat status sinkronisasi Supabase"
          >
            {cloudSyncStatus === 'syncing' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                <span className="text-blue-600 dark:text-blue-400">Syncing...</span>
              </>
            ) : cloudSyncStatus === 'synced' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-emerald-700 dark:text-emerald-400 hidden sm:inline">Supabase Realtime</span>
                <span className="text-emerald-700 dark:text-emerald-400 sm:hidden">Online</span>
              </>
            ) : cloudSyncStatus === 'needs_table' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-amber-700 dark:text-amber-400 hidden sm:inline">Supabase (Perlu Tabel)</span>
                <span className="text-amber-700 dark:text-amber-400 sm:hidden">Setup</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <span className="text-slate-500 hidden sm:inline">Offline (Lokal)</span>
                <span className="text-slate-500 sm:hidden">Offline</span>
              </>
            )}
          </button>

          {/* Shift Indicator */}
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              activeShift
                ? 'bg-teal-50 dark:bg-teal-950/60 text-[#00C9A7] hover:bg-teal-100 dark:hover:bg-teal-900/60'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
            title="Klik untuk buka / tutup shift"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></div>
            <div className="text-left">
              <div className="text-[9px] text-slate-400 leading-none mb-0.5">
                {activeShift ? 'Shift Aktif' : 'Shift Nonaktif'}
              </div>
              <div className="font-bold leading-none text-[11px]">
                {activeShift ? getShiftDuration() : 'Buka Shift'}
              </div>
            </div>
          </button>

          {/* Dark / Light toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Ganti Tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification bell */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Pemberitahuan"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>

          {/* Database / Backup */}
          <button
            onClick={() => setIsBackupOpen(true)}
            className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Backup & Database"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Profile Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C9A7] to-[#00A88E] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {user?.nama?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-[13px] font-semibold text-slate-800 dark:text-white truncate max-w-[100px]">
                  {user?.nama || 'User'}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {user?.role || 'KASIR'}
                </div>
              </div>
            </button>

            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 animate-slide-down"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{user?.nama}</div>
                  <div className="text-[10px] text-slate-400 font-mono">@{user?.username}</div>
                  <div className="mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-[#00C9A7] font-bold uppercase">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsShiftModalOpen(true)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-500" /> Kelola Shift
                </button>
                <button
                  onClick={() => setIsBackupOpen(true)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Database className="w-3.5 h-3.5 text-blue-500" /> Backup Database
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>

                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals rendered on request */}
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </>
  );
};
