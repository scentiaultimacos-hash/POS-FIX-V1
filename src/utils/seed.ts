import { DatabaseState } from '../types';
import { nowISO, today } from './constants';

export function seedV7(): DatabaseState {
  const d: DatabaseState = {
    company: { nama: 'King Parfum', kode: 'KP' },
    outlets: [{ id: 'o1', nama: 'Outlet Utama' }],
    kategori: [
      { id: 'k1', nama: 'Parfum Jadi', icon: '🌸' },
      { id: 'k2', nama: 'Refill', icon: '🔄' },
      { id: 'k3', nama: 'Botol', icon: '🧴' },
      { id: 'k4', nama: 'Aksesoris', icon: '🎀' },
      { id: 'k5', nama: 'Bundling', icon: '🎁' },
      { id: 'k6', nama: 'Bahan Baku', icon: '🍶' },
      { id: 'k7', nama: 'Alat', icon: '🧪' },
      { id: 'k8', nama: 'Voucher', icon: '🎫' },
      { id: 'k9', nama: 'Lain-lain', icon: '📦' },
      { id: 'k10', nama: 'Sample', icon: '🎁' },
    ],
    aroma: [
      { id: 'a1', nama: 'Aqua Fresh', kode: 'AQF' },
      { id: 'a2', nama: 'Ocean Blue', kode: 'OCB' },
      { id: 'a3', nama: 'Sweet Floral', kode: 'SWF' },
      { id: 'a4', nama: 'Woody Sandal', kode: 'WDS' },
      { id: 'a5', nama: 'Vanilla Musk', kode: 'VMS' },
      { id: 'a6', nama: 'Citrus Splash', kode: 'CTS' },
      { id: 'a7', nama: 'Green Tea', kode: 'GRT' },
      { id: 'a8', nama: 'Mango Tango', kode: 'MGT' },
      { id: 'a9', nama: 'Lavender Calm', kode: 'LVC' },
      { id: 'a10', nama: 'Rose Petal', kode: 'RSP' },
    ],
    ukuran: [
      { id: 'u1', nama: '10ml', ml: 10 },
      { id: 'u2', nama: '30ml', ml: 30 },
      { id: 'u3', nama: '50ml', ml: 50 },
      { id: 'u4', nama: '100ml', ml: 100 },
      { id: 'u5', nama: '5ml', ml: 5 },
      { id: 'u6', nama: '15ml', ml: 15 },
      { id: 'u7', nama: '20ml', ml: 20 },
      { id: 'u8', nama: '60ml', ml: 60 },
      { id: 'u9', nama: '75ml', ml: 75 },
      { id: 'u10', nama: '200ml', ml: 200 },
    ],
    harga: [
      { id: 'h1', aroma_id: 'a1', ukuran_id: 'u2', harga: 25000 },
      { id: 'h2', aroma_id: 'a1', ukuran_id: 'u3', harga: 40000 },
      { id: 'h3', aroma_id: 'a2', ukuran_id: 'u2', harga: 27000 },
      { id: 'h4', aroma_id: 'a2', ukuran_id: 'u3', harga: 45000 },
      { id: 'h5', aroma_id: 'a3', ukuran_id: 'u2', harga: 30000 },
      { id: 'h6', aroma_id: 'a4', ukuran_id: 'u2', harga: 32000 },
      { id: 'h7', aroma_id: 'a5', ukuran_id: 'u2', harga: 28000 },
      { id: 'h8', aroma_id: 'a6', ukuran_id: 'u3', harga: 42000 },
      { id: 'h9', aroma_id: 'a7', ukuran_id: 'u4', harga: 85000 },
      { id: 'h10', aroma_id: 'a8', ukuran_id: 'u2', harga: 26000 },
    ],
    produk: [],
    bahan_baku: [],
    pelanggan: [],
    karyawan: [],
    absensi: [],
    payroll: [],
    transaksi: [],
    kasbon: [],
    vouchers: [],
    pending_orders: [],
    suppliers: [],
    purchase_orders: [],
    shifts: [],
    shift_schedules: [],
    shift_groups: [],
    opname_sessions: [],
    returns: [],
    notifications: [],
    point_ledger: [],
    point_redemptions: [],
    users: [
      {
        id: 'user_admin',
        username: 'admin',
        nama: 'Administrator',
        email: 'admin@kingparfum.com',
        role: 'owner',
        aktif: true,
        password_hash: 'seed:admin123',
        permissions: ['*'],
      },
      {
        id: 'user_manager',
        username: 'manager',
        nama: 'Manager Toko',
        email: 'manager@kingparfum.com',
        role: 'manager',
        aktif: true,
        password_hash: 'seed:manager123',
        permissions: ['*'],
      },
      {
        id: 'user_kasir',
        username: 'kasir',
        nama: 'Kasir 1',
        email: 'kasir@kingparfum.com',
        role: 'kasir',
        aktif: true,
        password_hash: 'seed:kasir123',
        permissions: ['dashboard', 'kasir', 'pending', 'redeem', 'produk', 'pelanggan', 'shift-history', 'laporan-penjualan'],
      },
      {
        id: 'user_gudang',
        username: 'gudang',
        nama: 'Staff Gudang',
        email: 'gudang@kingparfum.com',
        role: 'gudang',
        aktif: true,
        password_hash: 'seed:gudang123',
        permissions: ['produk', 'inventori', 'opname', 'supplier', 'laporan-stok', 'barcode-designer'],
      },
    ],
    roles: [
      { id: 'r1', nama: 'owner', label: 'Owner', deskripsi: 'Akses penuh', warna: 'bg-red-100 text-red-700' },
      { id: 'r2', nama: 'manager', label: 'Manager', deskripsi: 'Hampir semua', warna: 'bg-purple-100 text-purple-700' },
      { id: 'r3', nama: 'kasir', label: 'Kasir', deskripsi: 'Kasir & produk', warna: 'bg-teal-100 text-teal-800' },
      { id: 'r4', nama: 'gudang', label: 'Gudang', deskripsi: 'Produk & stok', warna: 'bg-blue-100 text-blue-700' },
    ],
    log: [],
    master: {
      toko: {
        nama: 'King Parfum',
        telepon: '0812-3456-7890',
        alamat: 'Jl. Merdeka No. 10, Jakarta',
        footer: 'Terima kasih telah berbelanja di King Parfum! 🌸',
      },
      pajak: { aktif: true, nama: 'PPN', persen: 11 },
      diskon: { kasir: 10, manager: 50 },
      poin: {
        aktif: true,
        rate: 1000,
        pin_threshold: 1000,
        tiers: [
          { poin: 1000, nilai: 100000, min_belanja: 300000 },
          { poin: 2000, nilai: 200000, min_belanja: 450000 },
          { poin: 4000, nilai: 400000, min_belanja: 700000 },
        ],
      },
      komisi: { rate: 1 },
      jam_operasional: { mulai: 8, selesai: 22 },
      absensi: { jam_masuk_max: '09:00', jam_keluar_min: '16:00', jam_lembur_mulai: '17:00' },
      shift: { toleransi_menit: 10 },
      sound: { aktif: true },
      wa: { nomor_bisnis: '6281234567890' },
      logo: null,
      pembayaran: [
        { id: 'pm1', nama: 'Tunai', icon: '💵', biaya: 0, aktif: true },
        { id: 'pm2', nama: 'Debit', icon: '💳', biaya: 0, aktif: true },
        { id: 'pm3', nama: 'QRIS', icon: '📱', biaya: 0.7, aktif: true },
        { id: 'pm4', nama: 'Transfer', icon: '🏦', biaya: 0, aktif: true },
        { id: 'pm5', nama: 'E-Wallet', icon: '📲', biaya: 0, aktif: true },
      ],
      struk: { mode: 'wa', kertas: '58', autoPrint: false },
      payroll_settings: {
        status_kehadiran: [
          { id: 'hadir', label: 'Hadir', warna: 'text-green-600', potongan_persen: 0, potongan_flat: 0 },
          { id: 'telat', label: 'Telat', warna: 'text-amber-600', potongan_persen: 0, potongan_flat: 0 },
          { id: 'izin', label: 'Izin', warna: 'text-blue-600', potongan_persen: 0, potongan_flat: 0 },
          { id: 'sakit', label: 'Sakit', warna: 'text-purple-600', potongan_persen: 0, potongan_flat: 0 },
          { id: 'alfa', label: 'Alfa', warna: 'text-red-600', potongan_persen: 100, potongan_flat: 0 },
          { id: 'off', label: 'Off', warna: 'text-slate-600', potongan_persen: 0, potongan_flat: 0 },
          { id: 'cuti', label: 'Cuti', warna: 'text-cyan-600', potongan_persen: 0, potongan_flat: 0 },
        ],
        hari_kerja_per_bulan: 22,
        jam_kerja_normal: 8,
        rate_lembur_per_jam: 25000,
        uang_makan_per_hari: 20000,
        uang_transport_per_hari: 15000,
      },
    },
  };

  const prodSamples: [string, string, number, number, string, string][] = [
    ['Aqua Fresh 30ml', 'AQF-30', 25000, 10000, 'refill', 'k2'],
    ['Ocean Blue 50ml', 'OCB-50', 45000, 18000, 'refill', 'k2'],
    ['Sweet Floral 30ml', 'SWF-30', 30000, 12000, 'refill', 'k2'],
    ['Woody Sandal 30ml', 'WDS-30', 32000, 13000, 'refill', 'k2'],
    ['Vanilla Musk 50ml', 'VMS-50', 48000, 19000, 'refill', 'k2'],
    ['Botol Kaca 30ml', 'BTL-30', 10000, 3000, 'bahan_baku', 'k3'],
    ['Botol Kaca 50ml', 'BTL-50', 12000, 4000, 'bahan_baku', 'k3'],
    ['Pouch Premium', 'PCH-PRM', 25000, 12000, 'aksesoris', 'k4'],
    ['Essens Aqua 100ml', 'ECS-AQF', 15000, 5000, 'bahan_cair', 'k6'],
    ['Essens Ocean 100ml', 'ECS-OCB', 16000, 5500, 'bahan_cair', 'k6'],
  ];
  prodSamples.forEach((arr, i) =>
    d.produk.push({
      id: 'prd_v7_' + i,
      sku: arr[1],
      nama: arr[0],
      kategori_id: arr[5],
      klasifikasi: arr[4],
      harga_jual: arr[2],
      harga_beli: arr[3],
      stok: 50 + i * 5,
      stok_min: 10,
      satuan: 'pcs',
      foto: null,
      aktif: true,
    })
  );

  const bahanSamples: [string, string, number, number, number][] = [
    ['Essens Aqua', 'ml', 500, 50, 500],
    ['Essens Ocean', 'ml', 450, 50, 550],
    ['Alkohol 96%', 'ml', 2000, 200, 50],
    ['Kristal Pewarna', 'gram', 100, 20, 1500],
    ['Botol Kaca 30ml', 'pcs', 150, 20, 3000],
    ['Botol Kaca 50ml', 'pcs', 120, 20, 4000],
    ['Botol Plastik 10ml', 'pcs', 200, 30, 1500],
    ['Tutup Spray', 'pcs', 300, 50, 800],
    ['Stiker Label', 'pcs', 500, 100, 200],
    ['Pouch Premium', 'pcs', 80, 15, 12000],
  ];
  bahanSamples.forEach((arr, i) =>
    d.bahan_baku.push({
      id: 'bb_' + i,
      nama: arr[0],
      satuan: arr[1],
      stok: arr[2],
      stok_min: arr[3],
      harga_beli: arr[4],
      klasifikasi: 'bahan_cair',
    })
  );

  const pelSamples: [string, string, 'bronze' | 'silver' | 'gold', number, number, string[], string][] = [
    ['Siti Aminah', '081234567890', 'silver', 450, 1500000, ['VIP'], '👩'],
    ['Budi Santoso', '081234567891', 'bronze', 120, 450000, [], '👨'],
    ['Rina Marlina', '081234567892', 'gold', 1250, 5500000, ['VIP', 'Member'], '👩‍🦰'],
    ['Dewi Lestari', '081234567893', 'silver', 800, 2100000, [], '👩'],
    ['Agus Salim', '081234567894', 'bronze', 60, 180000, [], '👨'],
    ['Maya Sari', '081234567895', 'gold', 2500, 12000000, ['VIP'], '👩'],
    ['Andi Pratama', '081234567896', 'silver', 600, 950000, [], '👨'],
    ['Lina Wijaya', '081234567897', 'bronze', 30, 80000, [], '👩'],
    ['Rudi Hartono', '081234567898', 'silver', 900, 1800000, ['Member'], '👨'],
    ['Fitri Handayani', '081234567899', 'bronze', 200, 600000, [], '👩'],
  ];
  pelSamples.forEach((arr, i) =>
    d.pelanggan.push({
      id: 'p_' + (i + 1),
      nama: arr[0],
      telepon: arr[1],
      tier: arr[2],
      poin: arr[3],
      total_belanja: arr[4],
      tags: arr[5],
      avatar: arr[6],
    })
  );

  const karSamples: [string, string, string, number, number, string, string][] = [
    ['Andi Wijaya', 'Kasir', '081211100001', 2500000, 500000, '1111', 'kasir'],
    ['Rina Marlina', 'Kasir', '081211100002', 2500000, 500000, '2222', 'kasir'],
    ['Dedi Kurniawan', 'Manager', '081211100003', 4000000, 1000000, '3333', 'manager'],
    ['Budi Santoso', 'Gudang', '081211100004', 2200000, 300000, '4444', 'gudang'],
    ['Eka Putri', 'Kasir', '081211100005', 2400000, 400000, '5555', 'kasir'],
    ['Fajar Nugroho', 'Packing', '081211100006', 2000000, 250000, '6666', 'kasir'],
    ['Gita Sari', 'Admin Online', '081211100007', 2300000, 350000, '7777', 'kasir'],
    ['Hadi Susanto', 'Kurir', '081211100008', 1900000, 200000, '8888', 'gudang'],
    ['Indah Permata', 'Supervisor', '081211100009', 3500000, 700000, '9999', 'manager'],
    ['Joko Widodo', 'Gudang', '081211100010', 2100000, 300000, '0000', 'gudang'],
  ];
  karSamples.forEach((arr, i) =>
    d.karyawan.push({
      id: 'kr_' + (i + 1),
      nama: arr[0],
      jabatan: arr[1],
      telepon: arr[2],
      gaji_pokok: arr[3],
      tunjangan: arr[4],
      pin: arr[5],
      role: arr[6],
      username: 'karyawan' + (i + 1),
      aktif: true,
    })
  );

  const supSamples: [string, string, string, string][] = [
    ['PT Aroma Nusantara', '0813000001', 'sales@aromanusantara.com', 'Jakarta'],
    ['CV Wangi Sejahtera', '0813000002', 'order@wangisejahtera.com', 'Bandung'],
    ['PT Essens Prima', '0813000003', 'info@essensprima.com', 'Surabaya'],
    ['Toko Botol Jaya', '0813000004', '-', 'Jakarta'],
    ['PT Kemasan Indah', '0813000005', 'sales@kemasanindah.com', 'Tangerang'],
  ];
  supSamples.forEach((arr, i) =>
    d.suppliers.push({
      id: 'sup_' + i,
      nama: arr[0],
      telepon: arr[1],
      email: arr[2],
      alamat: arr[3],
    })
  );

  const vSamples: [string, number, number, number][] = [
    ['PROMO10', 10, 100, 5],
    ['NEWMEMBER', 15, 50, 2],
    ['WEEKEND20', 20, 30, 8],
    ['FLASH25', 25, 20, 12],
    ['HEMAT5', 5, 200, 20],
  ];
  vSamples.forEach((arr, i) =>
    d.vouchers.push({
      id: 'v_' + (i + 1),
      kode: arr[0],
      diskon: arr[1],
      kuota: arr[2],
      terpakai: arr[3],
      expired: null,
      aktif: true,
      created_at: nowISO(),
    })
  );

  // Sample Purchase Orders
  for (let i = 0; i < 5; i++) {
    const prod = d.produk[i % d.produk.length];
    const qty = 5 + i;
    const harga = prod.harga_beli;
    d.purchase_orders.push({
      id: 'po_' + i,
      nomor: 'PO-' + (1000 + i),
      supplier: d.suppliers[i % d.suppliers.length].nama,
      tgl: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      items: [{ produk_id: prod.id, nama: prod.nama, qty, harga, subtotal: qty * harga }],
      total: qty * harga,
      status: i < 2 ? 'draft' : 'diterima',
      created_at: nowISO(),
    });
  }

  // Sample Shift Groups
  d.shift_groups.push({
    id: 'sg_1',
    nama: 'Pagi',
    jam_mulai: '08:00',
    jam_selesai: '14:00',
    karyawan_ids: [d.karyawan[0]?.id || '', d.karyawan[4]?.id || ''],
    created_at: nowISO(),
  });
  d.shift_groups.push({
    id: 'sg_2',
    nama: 'Siang',
    jam_mulai: '14:00',
    jam_selesai: '20:00',
    karyawan_ids: [d.karyawan[1]?.id || '', d.karyawan[5]?.id || ''],
    created_at: nowISO(),
  });

  // Sample Transactions
  for (let i = 9; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const tgl = dt.toISOString().slice(0, 10);
    const prod = d.produk[i % d.produk.length];
    const qty = 1 + (i % 3);
    const sub = prod.harga_jual * qty;
    const pajak = Math.round(sub * 0.11);
    const total = sub + pajak;
    const pel = d.pelanggan[i % d.pelanggan.length];
    const kas = d.karyawan[i % d.karyawan.length];
    d.transaksi.push({
      id: 'trx_' + i,
      nomor: 'INV-V7-' + String(1000 + i),
      tanggal: tgl,
      kasir_id: kas?.id || 'kr_1',
      kasir_nama: kas?.nama || 'Kasir',
      pelanggan_id: pel?.id,
      pelanggan_nama: pel?.nama,
      items: [{ produk_id: prod.id, nama: prod.nama, harga: prod.harga_jual, qty, subtotal: sub }],
      subtotal: sub,
      diskon: 0,
      pajak,
      total,
      bayar: total,
      kembalian: 0,
      metode: [{ id: 'pm1', nama: 'Tunai', icon: '💵', jumlah: total }],
      status: 'selesai',
      poin_didapat: Math.floor(sub / 1000),
      created_at: dt.toISOString(),
    });
  }

  // Sample Kasbon
  d.kasbon.push({
    id: 'kb_1',
    pelanggan_id: 'p_2',
    pelanggan_nama: 'Budi Santoso',
    total: 150000,
    terbayar: 50000,
    sisa: 100000,
    jatuh_tempo: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'belum_lunas',
    keterangan: 'Beli Aqua Fresh 30ml x 2 botol',
    created_at: nowISO(),
    riwayat_bayar: [{ tanggal: today(), jumlah: 50000, metode: 'Tunai' }],
  });

  // Sample Notifications
  const notifSamples: [string, string, 'info' | 'warning' | 'success' | 'error'][] = [
    ['Stok Kritis', 'Botol Kaca 30ml sisa 5 pcs', 'warning'],
    ['Transaksi Selesai', 'INV-V7-1009 berhasil diselesaikan', 'success'],
    ['Pelanggan Baru', 'Lina Wijaya terdaftar sebagai member', 'info'],
    ['Redeem Berhasil', 'Siti Aminah berhasil menukar 1000 poin', 'success'],
  ];
  notifSamples.forEach((arr, i) =>
    d.notifications.push({
      id: 'not_' + i,
      title: arr[0],
      msg: arr[1],
      type: arr[2],
      read: i > 2,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    })
  );

  return d;
}
