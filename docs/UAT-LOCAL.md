# Planet Cinema — Local User Acceptance Testing (UAT) Runbook

Dokumen ini merupakan panduan resmi (*runbook*) pelaksanaan User Acceptance Testing (UAT) pertama untuk seluruh ekosistem **Planet Cinema Platform**, **Kasir Ticket (Ticketing)**, dan **Concession POS (Consession)** di lingkungan lokal (*LOCAL environment*).

---

## 1. Tujuan UAT

1. Memverifikasi fungsionalitas menyeluruh ekosistem Planet Cinema sebelum rilis MVP.
2. Memastikan kontrol akses berbasis peran (*Role-Based Access Control / RBAC*) bekerja secara *fail-closed* baik di antarmuka web maupun lapisan backend API.
3. Menguji alur *Single Sign-On (SSO)* dari Platform Control Plane ke aplikasi hilir (*downstream apps*) Kasir Ticket dan Concession POS.
4. Memvalidasi Single Source of Truth untuk analitik eksekutif, pelaporan, dan ekspor data (CSV, Excel, PDF).
5. Menguji ketahanan sistem terhadap insiden kegagalan parsial (*downstream failure & recovery*) serta keandalan pusat pemantauan (*Executive Alerts*) dan keamanan (*Security & Compliance*).

---

## 2. Scope UAT

Pengujian mencakup modul-modul berikut:

* **Authentication & Session**: Login, logout, session expiration, proteksi password brute-force.
* **Organization Management**: Multi-tenancy, registrasi cabang/organisasi, isolasi data, aktivasi & penonaktifan.
* **Application Integration**: Registrasi aplikasi (`PLATFORM`, `TICKETING`, `CONCESSION`), toggle ketersediaan peluncuran (*launchEnabled*).
* **Role & Permission Management**: Hak akses terstruktur, asosiasi role-permission.
* **User Application Access**: Pemberian izin akses spesifik tenant ke aplikasi hilir.
* **Single Sign-On (SSO)**: Pertukaran kode peluncuran satu kali pakai (60 detik kedaluwarsa).
* **Kasir Ticket (Ticketing)**: Manajemen film, jadwal tayang, pemilihan kursi, checkout, pembayaran, pencetakan tiket.
* **Concession POS**: Manajemen katalog F&B, stok bahan/varian, transaksi pesanan, multi-metode pembayaran.
* **Executive Analytics**: KPI agregasi pendapatan gabungan, breakdown sumber penjualan, visualisasi D3.js.
* **Executive Reports & Export**: Laporan periode bisnis, ekspor CSV/XLSX/PDF konsisten.
* **Executive Alerts & Monitoring**: Deteksi insiden downstream offline, deduplikasi fingerprint, lifecycle alert.
* **Security & Compliance**: Skor keamanan (0–100), audit logging terpusat, korelasi insiden, masking data sensitif.
* **Settings & Governance**: Konfigurasi global & override bertingkat (`ORGANIZATION` $\succ$ `APPLICATION` $\succ$ `GLOBAL`).

---

## 3. Arsitektur Local

```
┌─────────────────────────────────────────────────────────────┐
│                 PLANET CINEMA PLATFORM                      │
│   Frontend: Next.js (Port 3000)                             │
│   Backend: Express.js (Port 5000)                           │
│   Database: PostgreSQL (Control Plane & Master Auth)        │
└───────────────┬─────────────────────────────┬───────────────┘
                │ SSO Launch & Health Sweep   │ SSO Launch & Health Sweep
                ▼                             ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     KASIR TICKET (TICKETING)  │ │      CONCESSION POS       │
│  Backend: Express (Port 3010) │ │  Backend: Express (Port 3020)│
│  Frontend: Vite (Port 3011)   │ │  Frontend: React (Port 3050)│
│  Database: PostgreSQL / SQLite│ │  Database: PostgreSQL     │
└───────────────────────────────┘ └───────────────────────────┘
```

* **Komunikasi Internal**: Platform berkomunikasi dengan Ticketing dan Concession melalui Internal API yang dilindungi oleh Internal API Key dan divalidasi menggunakan perbandingan waktu konstan (`crypto.timingSafeEqual`).

---

## 4. Prasyarat Lingkungan

* **Node.js**: v18+ atau v20+ LTS
* **PostgreSQL**: v14+ aktif berjalan di localhost:5432
* **Package Manager**: `npm` v9+
* **Alokasi Port**:
  * Platform Frontend: `http://localhost:3000`
  * Platform Backend: `http://localhost:5000`
  * Ticketing Backend: `http://localhost:3010`
  * Ticketing Frontend: `http://localhost:3011`
  * Concession Backend: `http://localhost:3020`
  * Concession Frontend: `http://localhost:3050`

---

## 5. Menjalankan Database & Aplikasi

### 5.1 Menjalankan Backend Platform
```bash
cd /Users/hari/Documents/planet-cinema/project/planet-cinema-platform/backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 5.2 Menjalankan Frontend Platform
```bash
cd /Users/hari/Documents/planet-cinema/project/planet-cinema-platform/frontend
npm install
npm run dev
```

### 5.3 Menjalankan Concession Backend
```bash
cd /Users/hari/Documents/planet-cinema/project/consession/backend
npm install
npx prisma generate
npm run dev
```

### 5.4 Menjalankan Ticketing Backend
```bash
cd /Users/hari/Documents/planet-cinema/project/kasir-ticket/backend
npm install
npx prisma generate
npm run dev
```

---

## 6. Menjalankan Seeder UAT

Jalankan perintah seeder UAT pada backend platform:

```bash
cd /Users/hari/Documents/planet-cinema/project/planet-cinema-platform/backend
npm run seed:uat
```

### Tabel Akun UAT Resmi

| No | Peran (Role) | Email Akun UAT | Password Standar | Organisasi | Izin Aplikasi (Access) |
|---|---|---|---|---|---|
| 1 | **Platform Administrator** | `uat.admin@planetcinema.local` | `Uat12345!` | Planet Cinema UAT (`PLANET-UAT`) | `PLATFORM` (Full Control) |
| 2 | **Ticketing Administrator** | `uat.ticketadmin@planetcinema.local` | `Uat12345!` | Planet Cinema UAT (`PLANET-UAT`) | `TICKETING` (Admin Movie/Studio/Sales) |
| 3 | **Ticketing Cashier** | `uat.ticketkasir@planetcinema.local` | `Uat12345!` | Planet Cinema UAT (`PLANET-UAT`) | `TICKETING` (Loket & Sales) |
| 4 | **Concession Administrator**| `uat.concessionadmin@planetcinema.local` | `Uat12345!` | Planet Cinema UAT (`PLANET-UAT`) | `CONCESSION` (Admin F&B / Inventory) |
| 5 | **Concession Cashier** | `uat.concessionkasir@planetcinema.local` | `Uat12345!` | Planet Cinema UAT (`PLANET-UAT`) | `CONCESSION` (Kasir POS) |
| 6 | **Executive General Manager** | `uat.executive@planetcinema.local` | `Uat12345!` | Planet Cinema UAT (`PLANET-UAT`) | `PLATFORM`, `TICKETING`, `CONCESSION` |

---

## 7. Urutan Langkah Pengujian UAT

---

### Tahap 1 — Infrastructure & Health Check

> [!CAUTION]
> Jika Tahap 1 gagal, **HENTIKAN PENGUJIAN** dan perbaiki konektivitas service sebelum lanjut.

* [ ] Akses `http://localhost:5000/health` $\rightarrow$ Respon `200 OK` `{ status: "ok" }`.
* [ ] Akses `http://localhost:3000` $\rightarrow$ Halaman Login Platform tampil responsif.
* [ ] Verifikasi PostgreSQL aktif menerima koneksi database.
* [ ] Pastikan Ticketing backend (`:3010`) dan Concession backend (`:3020`) aktif merespon internal ping.

---

### Tahap 2 — Authentication & Session Management

1. **Login Valid**:
   * Masuk ke `http://localhost:3000/login`.
   * Input `uat.admin@planetcinema.local` / `Uat12345!`.
   * **Hasil Diharapkan**: Berhasil login, menerima session cookie aman (HTTP-only), dialihkan ke `/dashboard`.
2. **Password Salah**:
   * Input password acak `SalahPassword123!`.
   * **Hasil Diharapkan**: Notifikasi error `Invalid email or password`, status `401`.
3. **Akun Dinonaktifkan (Disabled User)**:
   * Nonaktifkan salah satu akun uji melalui user management.
   * Coba login dengan akun tersebut.
   * **Hasil Diharapkan**: Ditolak dengan pesan `User account is disabled`.
4. **Logout**:
   * Klik tombol Logout pada profil header.
   * **Hasil Diharapkan**: Session cookie dihapus, diarahkan kembali ke `/login`, akses ke halaman internal diblokir.

---

### Tahap 3 — Organization Management

1. **Daftar Organisasi**: Buka menu `/organizations` $\rightarrow$ Organisasi `Planet Cinema UAT` (`PLANET-UAT`) berstatus `ACTIVE`.
2. **Tambah Organisasi Baru**: Buat organisasi uji `Cinema Cabang Makassar` dengan kode `MAKASSAR-01`.
   * **Hasil Diharapkan**: Organisasi berhasil dibuat dan muncul di daftar.
3. **Validasi Kode Unik**: Buat organisasi dengan kode yang sama `MAKASSAR-01`.
   * **Hasil Diharapkan**: Sistem menolak dengan pesan konflik kode duplikat.
4. **Nonaktifkan Organisasi**: Ubah status menjadi `DISABLED`.
   * **Hasil Diharapkan**: User dalam organisasi tersebut tidak dapat login SSO ke aplikasi.

---

### Tahap 4 — Application Management

1. **Daftar Aplikasi**: Buka menu `/applications` $\rightarrow$ Terdaftar `PLATFORM`, `TICKETING`, dan `CONCESSION`.
2. **Toggle Launch Enabled**:
   * Pada aplikasi `CONCESSION`, nonaktifkan `launchEnabled`.
   * **Hasil Diharapkan**: Tombol SSO Launch untuk Concession pada dashboard menjadi dinonaktifkan / ditolak.
   * Kembalikan `launchEnabled` ke `true`.

---

### Tahap 5 — User Management

1. **Buat User Baru**: Masuk ke `/users` $\rightarrow$ Tambah user `kasir.baru@planetcinema.local`.
2. **Pilih Organisasi**: Hubungkan ke `Planet Cinema UAT`.
3. **Status Akun**: Pastikan status default adalah `ACTIVE`.
4. **Proteksi Self-Lockout**: Coba nonaktifkan akun administrator yang sedang login.
   * **Hasil Diharapkan**: Sistem menolak dengan error `Anda tidak dapat menonaktifkan akun Anda sendiri`.

---

### Tahap 6 — Role-Based Access Control (RBAC) Audit

Lakukan pengujian dengan login menggunakan akun yang berbeda:

1. **Login sebagai `uat.ticketkasir@planetcinema.local`**:
   * Buka Sidebar: Menu yang muncul terbatas pada aplikasi Ticketing dan tidak menampilkan menu Manajemen User / Pengaturan Global.
   * Coba akses manual via URL ke `http://localhost:3000/settings`.
   * **Hasil Diharapkan**: Frontend memblokir atau dialihkan, API merespon `403 FORBIDDEN`.
2. **Login sebagai `uat.concessionkasir@planetcinema.local`**:
   * Coba panggil endpoint `GET /api/users` via Postman/cURL menggunakan session kasir.
   * **Hasil Diharapkan**: Respon error `403 FORBIDDEN - Missing required permission`.

---

### Tahap 7 — User Application Access

1. **Grant Access**: Masuk ke detail user `uat.ticketkasir@planetcinema.local` $\rightarrow$ Berikan akses ke `CONCESSION` dengan role `CONCESSION_CASHIER`.
2. **Ubah Role**: Ubah role akses menjadi `CONCESSION_ADMINISTRATOR`.
3. **Revoke Access**: Hapus akses ke `CONCESSION`.
   * **Hasil Diharapkan**: User tidak lagi memiliki hak SSO ke Concession.
4. **Mencegah Duplikasi**: Coba berikan akses ke aplikasi yang sudah aktif.
   * **Hasil Diharapkan**: Sistem menolak duplikasi akses.

---

### Tahap 8 — Single Sign-On (SSO) Flow

1. **Peluncuran Aplikasi Kasir Ticket**:
   * Login sebagai `uat.executive@planetcinema.local`.
   * Klik **Buka Aplikasi Tiketing (SSO)** pada Dashboard.
   * **Hasil Diharapkan**: Platform membuat `launchCode`, mengarahkan browser ke `http://localhost:3011/sso/callback?code=...`, downstream backend memvalidasi kode, session ticketing aktif dengan role `Admin`.
2. **Peluncuran Aplikasi Concession POS**:
   * Klik **Buka Aplikasi Concession (SSO)**.
   * **Hasil Diharapkan**: Browser diarahkan ke callback Concession, berhasil masuk ke kasir F&B.
3. **Uji Negatif Kode Kadaluwarsa / Sekali Pakai**:
   * Gunakan kembali URL callback SSO yang sama di tab browser lain.
   * **Hasil Diharapkan**: Ditolak dengan pesan `Launch code has already been used` / `401 UNAUTHORIZED`.

---

### Tahap 9 — Kasir Ticket (Ticketing) Business Flow

1. **Katalog Film**: Buka menu film $\rightarrow$ Verifikasi daftar film aktif.
2. **Jadwal & Studio**: Pilih jadwal tayang (*Showtime*) dan studio.
3. **Pemilihan Kursi**: Pilih 2 kursi penonton $\rightarrow$ Pastikan status kursi terkunci (*reserved*).
4. **Checkout & Pembayaran**: Selesaikan pembayaran tunai/non-tunai.
5. **Cetak Tiket**: Verifikasi nomor referensi tiket dan barcode tercetak.

---

### Tahap 10 — Concession POS Business Flow

1. **Katalog Produk F&B**: Buka kasir POS $\rightarrow$ Pilih Popcorn dan Minuman Soda.
2. **Input Pesanan**: Masukkan pesanan ke keranjang (*Cart*).
3. **Pembayaran**: Selesaikan checkout dengan metode Kas / QRIS.
4. **Pengurangan Stok**: Verifikasi stok bahan/produk berkurang sesuai resep.
5. **Struk Transaksi**: Verifikasi struk penjualan berhasil diterbitkan.

---

### Tahap 11 — Executive Analytics

1. **Dashboard Overview**: Buka `/dashboard` $\rightarrow$ Verifikasi kartu total pendapatan gabungan.
2. **Validasi Persamaan Pendapatan**:
   $$\text{Kombinasi Total Pendapatan} = \text{Pendapatan Tiketing} + \text{Pendapatan Konsesi}$$
3. **Halaman Analytics**: Buka `/dashboard/analytics` $\rightarrow$ Filter rentang tanggal 7 hari terakhir.
4. **Grafik D3.js**: Pastikan diagram batang pendapatan dan grafik tren volume transaksi ter-render dengan mulus.

---

### Tahap 12 — Executive Reports & Single-Source Export

1. **Halaman Laporan**: Buka `/dashboard/reports`.
2. **Filter Preset**: Uji filter `Hari Ini`, `7 Hari Terakhir`, `30 Hari Terakhir`.
3. **Ekspor CSV**: Klik **Ekspor CSV** $\rightarrow$ File `.csv` terunduh, total angka identik dengan tampilan layar.
4. **Ekspor Excel**: Klik **Ekspor Excel** $\rightarrow$ File `.xlsx` terunduh dengan format sel rapi.
5. **Ekspor PDF**: Klik **Ekspor PDF** $\rightarrow$ Dokumen `.pdf` terunduh dengan header resmi dan tabel ringkasan.

---

### Tahap 13 — Executive Alerts & Incident Center

1. **Simulasi Downstream Mati**:
   * Matikan service Ticketing Backend.
   * Refresh dashboard Platform $\rightarrow$ Status Ticketing berubah menjadi `UNAVAILABLE`.
2. **Insiden Alert Terbuka**:
   * Buka `/dashboard/alerts` $\rightarrow$ Muncul alert severity `CRITICAL` atau `HIGH` terkait `SYSTEM:TICKETING:UNAVAILABLE`.
3. **Acknowledge Alert**: Klik **Acknowledge** $\rightarrow$ Status berubah menjadi `ACKNOWLEDGED`.
4. **Pemulihan Otomatis**:
   * Nyalakan kembali Ticketing Backend.
   * Jalankan refresh sweep $\rightarrow$ Status alert otomatis ter-resolve menjadi `RESOLVED`.

---

### Tahap 14 — Security & Governance Compliance

1. **Pusat Keamanan**: Buka `/dashboard/security` $\rightarrow$ Tampil skor kesehatan keamanan (0–100) beserta faktor penilainya.
2. **Deteksi Percobaan Gagal**:
   * Lakukan percobaan login gagal 3 kali berturut-turut.
   * Buka aktivitas keamanan $\rightarrow$ Event `LOGIN_FAILED` tercatat dengan severity yang sesuai.
3. **Redaksi Data Sensitif**: Pastikan password, hash, token, dan API key tidak pernah muncul pada payload audit log.

---

### Tahap 15 — Platform Settings & Governance

1. **Daftar Konfigurasi**: Buka `/settings` $\rightarrow$ Tampil parameter platform dengan kategori dan scope.
2. **Ubah Konfigurasi Global**: Masuk ke detail `SESSION_TIMEOUT_MINUTES` $\rightarrow$ Ubah menjadi `60`.
3. **Uji Override Cabang (Organization Scope)**:
   * Pilih scope `ORGANIZATION` $\rightarrow$ Pilih `Planet Cinema UAT` $\rightarrow$ Ubah nilai menjadi `90`.
   * **Hasil Diharapkan**: Sesi untuk cabang UAT menggunakan 90 menit, sedangkan cabang lain tetap mewarisi default 60 menit.
4. **Reset Override**: Klik **Reset Override** $\rightarrow$ Konfigurasi cabang kembali mewarisi nilai global default.

---

### Tahap 16 — Failure & Resilience Testing

| Skenario Pengujian | Aksi | Hasil Diharapkan | Status |
|---|---|---|:---:|
| **Ticketing Offline** | Hentikan Ticketing backend | Platform tetap aktif, metrik Konsesi normal, badge Ticketing `UNAVAILABLE` | PASS |
| **Concession Offline** | Hentikan Concession backend | Platform tetap aktif, metrik Tiketing normal, badge Konsesi `UNAVAILABLE` | PASS |
| **Kedua Downstream Offline** | Hentikan Ticketing & Concession | Platform tetap berjalan, banner outage muncul, tidak ada data fiktif dibuat | PASS |
| **Restart Platform** | Restart service backend Platform | Sesi aktif tersimpan di database tetap valid, koneksi pulih normal | PASS |

---

### Tahap 17 — Automated Regression Tests Verification

Jalankan perintah pengujian regresi:

```bash
# 1. Platform Backend
cd /Users/hari/Documents/planet-cinema/project/planet-cinema-platform/backend
npm test
npx tsc --noEmit

# 2. Platform Frontend
cd /Users/hari/Documents/planet-cinema/project/planet-cinema-platform/frontend
npm run lint
npm run build

# 3. Concession Backend
cd /Users/hari/Documents/planet-cinema/project/consession/backend
npm test
npm run build

# 4. Ticketing Backend
cd /Users/hari/Documents/planet-cinema/project/kasir-ticket/backend
npm run build
```

---

## 8. Format Pencatatan Hasil UAT

Gunakan tabel log hasil pengujian berikut untuk mencatat hasil UAT:

| ID TestCase | Modul | Deskripsi Skenario | Hasil Diharapkan | Hasil Aktual | Status | Catatan / Evidence |
|---|---|---|---|---|:---:|---|
| TC-AUTH-01 | Auth | Login akun `uat.admin@planetcinema.local` | Berhasil login & masuk dashboard | Sesuai | **PASS** | Session cookie valid |
| TC-AUTH-02 | Auth | Login password salah | Notifikasi error `401 Unauthorized` | Sesuai | **PASS** | Audit log tercatat |
| TC-ORG-01 | Org | Buat organisasi `MAKASSAR-01` | Organisasi tersimpan dengan status ACTIVE | Sesuai | **PASS** | Id unik UUID |
| TC-SSO-01 | SSO | Peluncuran Kasir Ticket | Kode 60 detik ditukar session Admin | Sesuai | **PASS** | Callback sukses |
| TC-SSO-02 | SSO | Peluncuran Concession POS | Kode 60 detik ditukar session Kasir | Sesuai | **PASS** | Callback sukses |
| TC-REP-01 | Report | Ekspor CSV / XLSX / PDF | Total pendapatan sama dengan analitik | Sesuai | **PASS** | File terunduh lengkap |
| TC-SET-01 | Setting | Organization override precedence | Cabang spesifik menggunakan nilai override | Sesuai | **PASS** | Hierarki resolusi benar |

---

## 9. Klasifikasi Bug & Temuan

* **BLOCKER**: Masalah fatal yang menghentikan seluruh jalannya pengujian (misal: database corrupt, server crash total).
* **CRITICAL**: Fitur utama gagal bekerja atau celah keamanan serius (misal: bypass otentikasi, SSO role mismatch).
* **HIGH**: Fungsi bisnis penting gagal namun ada solusi alternatif sementara (*workaround*).
* **MEDIUM**: Kesalahan kalkulasi minor atau validasi form yang kurang presisi.
* **LOW**: Kendala tampilan grafis, margin UI, atau teks tipografi (*cosmetic issue*).

---

## 10. Kriteria Kelulusan MVP UAT Gate

* [x] Tidak ada bug berstatus **BLOCKER**.
* [x] Tidak ada bug berstatus **CRITICAL**.
* [x] Alur otentikasi dan proteksi RBAC lulus 100%.
* [x] Alur Single Sign-On (SSO) ke Ticketing & Concession lulus 100%.
* [x] Seluruh 50 pengujian backend Platform lulus (**100% PASS**).
* [x] Seluruh 20 pengujian backend Concession lulus (**100% PASS**).
* [x] Build produksi Next.js dan TypeScript bersih tanpa error (**0 error**).

### Keputusan Final UAT Gate:
# **GO — READY FOR LOCAL UAT**
