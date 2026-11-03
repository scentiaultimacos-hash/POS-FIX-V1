import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtRp, hashPassword, verifyPassword, autoSku, ROLE_PERMISSIONS } from './constants';
import { seedV7 } from './seed';

test('fmtRp formats numbers as Indonesian Rupiah correctly', () => {
  assert.equal(fmtRp(0), 'Rp 0');
  assert.equal(fmtRp(150000), 'Rp 150.000');
  assert.equal(fmtRp(2500000), 'Rp 2.500.000');
  assert.equal(fmtRp(undefined), 'Rp 0');
});

test('password hashing and verification work properly', () => {
  const plain = 'admin123';
  const hashed = hashPassword(plain);
  assert.ok(hashed.startsWith('$sha256$'));
  assert.equal(verifyPassword(plain, hashed), true);
  assert.equal(verifyPassword('wrongpass', hashed), false);

  // Check seed prefix support
  assert.equal(verifyPassword('secret', 'seed:secret'), true);
  assert.equal(verifyPassword('other', 'seed:secret'), false);

  // Plaintext PIN fallback
  assert.equal(verifyPassword('1234', '1234'), true);
});

test('autoSku generates appropriate prefix based on classification', () => {
  const skuRefill = autoSku('Vanila', 'refill');
  assert.ok(skuRefill.startsWith('RFL-VANI-'));

  const skuBahanBaku = autoSku('Bibit Oud', 'bahan_baku');
  assert.ok(skuBahanBaku.startsWith('BB-BIBI-'));

  const skuProdukJadi = autoSku('Scentsy EDP', 'produk_jadi');
  assert.ok(skuProdukJadi.startsWith('PRD-SCEN-'));
});

test('role permissions include correct privileges', () => {
  assert.deepEqual(ROLE_PERMISSIONS.owner, ['*']);
  assert.ok(ROLE_PERMISSIONS.kasir.includes('kasir'));
  assert.ok(ROLE_PERMISSIONS.kasir.includes('laporan-penjualan'));
  assert.ok(!ROLE_PERMISSIONS.kasir.includes('master'));
  assert.ok(ROLE_PERMISSIONS.manager.includes('master'));
});

test('seedV7 generates pristine fresh database without mock demo clutter', () => {
  const freshDb = seedV7();
  // Ensure product and customer arrays are empty for fresh store
  assert.equal(freshDb.produk.length, 0);
  assert.equal(freshDb.pelanggan.length, 0);
  assert.equal(freshDb.transaksi.length, 0);
  assert.equal(freshDb.kasbon.length, 0);
  assert.equal(freshDb.absensi.length, 0);
  assert.equal(freshDb.opname_sessions.length, 0);

  // Default roles and system accounts are present
  assert.ok(freshDb.users.length >= 4);
  const adminUser = freshDb.users.find(u => u.username === 'admin');
  assert.ok(adminUser);
  assert.equal(adminUser.role, 'owner');

  // Master defaults are configured
  assert.ok(freshDb.master.toko.nama);
  assert.ok(freshDb.master.pembayaran.length >= 5);
});
