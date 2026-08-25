# Planet Cinema — Panduan Setup & Eksekusi Local Development (UAT)

Panduan resmi dalam Bahasa Indonesia untuk menjalankan seluruh ekosistem **Planet Cinema Platform**, **Kasir Ticket (Ticketing)**, dan **Concession POS (Consession)** secara terpadu (*unified*) di lingkungan lokal (*LOCAL environment*).

---

## 1. Persiapan Lingkungan

Sebelum menjalankan ekosistem, pastikan spesifikasi lingkungan lokal berikut telah terpenuhi:

* **Node.js**: Versi `v18.x` atau `v20.x` LTS.
* **NPM**: Versi `v9.x` atau lebih baru.
* **PostgreSQL Database**: Versi 14+ aktif berjalan di `127.0.0.1:5432`.
* **Database yang Dibutuhkan**:
  1. `planet_cinema_platform` (Master Auth & Control Plane)
  2. `ticketing` (Kasir Ticket Downstream)
  3. `consesion` (Concession POS Downstream)

### Instalasi Dependensi Root & Sub-proyek
Jalankan instalasi dependensi dari root project:
```bash
# Dari root directory: /Users/hari/Documents/planet-cinema/project
npm install
```

---

## 2. Menjalankan Semua Aplikasi (Satu Perintah)

Untuk menjalankan **ke-6 service (3 Backend + 3 Frontend)** secara bersamaan dalam satu terminal terorkestrasi:

```bash
npm run dev
```

### Opsi Perintah Tambahan

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan seluruh 6 service (Platform, Ticketing, Concession BE & FE) |
| `npm run dev:backend` | Menjalankan hanya 3 service Backend (Platform, Ticketing, Concession) |
| `npm run dev:frontend` | Menjalankan hanya 3 service Frontend (Platform, Ticketing, Concession) |
| `npm run dev:platform` | Menjalankan Backend & Frontend Platform saja |
| `npm run dev:ticketing`| Menjalankan Backend & Frontend Ticketing saja |
| `npm run dev:concession`| Menjalankan Backend & Frontend Concession saja |
| `npm run seed:uat` | Mengisi database lokal dengan akun dan permission UAT |
| `npm test` | Menjalankan unit & integration test suite seluruh backend |

---

## 3. Pemetaan Port & URL Aplikasi

| Aplikasi | Komponen / Service | Port Lokal | URL Akses Browser / API |
|---|---|:---:|---|
| **Planet Cinema Platform** | Backend | **5000** | `http://localhost:5000` |
| **Planet Cinema Platform** | Frontend | **3000** | `http://localhost:3000` |
| **Kasir Ticket (Ticketing)** | Backend | **5011** | `http://localhost:5011` |
| **Kasir Ticket (Ticketing)** | Frontend | **3011** | `http://localhost:3011` |
| **Concession POS** | Backend | **5050** | `http://localhost:5050` |
| **Concession POS** | Frontend | **3050** | `http://localhost:3050` |

---

## 4. Konfigurasi Environment Variables

Semua file `.env` dan template `.env.example` telah disediakan pada masing-masing sub-proyek.

### 4.1 Platform Backend (`planet-cinema-platform/backend/.env`)
* `PORT`: Port server backend Platform (`5000`).
* `DATABASE_URL`: URI koneksi PostgreSQL master auth (`planet_cinema_platform`).
* `JWT_SECRET`: Kunci enkripsi token autentikasi.
* `SESSION_SECRET`: Kunci penandatanganan session cookie.
* `TICKETING_API_URL`: URL internal backend Ticketing (`http://localhost:5011`).
* `CONCESSION_API_URL`: URL internal backend Concession (`http://localhost:5050`).
* `PLATFORM_INTERNAL_API_KEY`: Kunci bersama untuk komunikasi aman ke downstream.

### 4.2 Platform Frontend (`planet-cinema-platform/frontend/.env`)
* `NEXT_PUBLIC_API_URL`: Target backend Platform (`http://localhost:5000`).
* `NEXT_PUBLIC_TICKETING_APP_URL`: Target peluncuran SSO Ticketing (`http://localhost:3011`).
* `NEXT_PUBLIC_CONCESSION_APP_URL`: Target peluncuran SSO Concession (`http://localhost:3050`).

### 4.3 Ticketing Backend (`kasir-ticket/backend/.env`)
* `PORT`: Port backend Ticketing (`5011`).
* `DATABASE_URL`: URI koneksi database Ticketing (`ticketing`).
* `PLATFORM_URL`: URL backend Platform (`http://localhost:5000`).
* `PLATFORM_INTERNAL_API_KEY`: Kunci otentikasi internal dari Platform.

### 4.4 Ticketing Frontend (`kasir-ticket/frontend/.env`)
* `NEXT_PUBLIC_API_URL`: URL backend Ticketing (`http://localhost:5011/api`).

### 4.5 Concession Backend (`consession/backend/.env`)
* `PORT`: Port backend Concession (`5050`).
* `DATABASE_URL`: URI koneksi database Concession (`consesion`).
* `PLATFORM_URL`: URL backend Platform (`http://localhost:5000`).
* `PLATFORM_INTERNAL_API_KEY`: Kunci otentikasi internal dari Platform.

### 4.6 Concession Frontend (`consession/frontend/.env`)
* `NEXT_PUBLIC_API_URL`: URL backend Concession (`http://localhost:5050/api`).
* `NEXT_PUBLIC_WS_URL`: WebSocket endpoint Concession (`http://localhost:5050/`).

---

## 5. Health Check Verifikasi Layanan

Untuk memverifikasi kesehatan seluruh backend, panggil endpoint health masing-masing:

```bash
# 1. Platform Backend Health
curl -s http://localhost:5000/health
# Output: {"status":"ok"}

# 2. Ticketing Backend Health
curl -s http://localhost:5011/health
# Output: {"status":"OK","timestamp":"..."}

# 3. Concession Backend Health
curl -s http://localhost:5050/health
# Output: {"status":"OK","timestamp":"..."}
```

---

## 6. Panduan Troubleshooting

### 1. Port Already in Use (`EADDRINUSE`)
* **Penyebab**: Ada proses latar belakang Node.js atau Next.js lama yang masih menduduki port.
* **Solusi**: Matikan proses pada port yang bersangkutan:
  ```bash
  lsof -ti:5000,5011,5050,3000,3011,3050 | xargs kill -9
  ```

### 2. Database Connection Error (`ECONNREFUSED`)
* **Penyebab**: Layanan PostgreSQL lokal belum aktif atau kredensial pada `DATABASE_URL` tidak cocok.
* **Solusi**:
  1. Pastikan PostgreSQL berjalan: `brew services start postgresql` atau cek status Docker container.
  2. Pastikan database `planet_cinema_platform`, `ticketing`, dan `consesion` telah dibuat di PostgreSQL:
     ```sql
     CREATE DATABASE planet_cinema_platform;
     CREATE DATABASE ticketing;
     CREATE DATABASE consesion;
     ```

### 3. Internal API Unauthorized (`401 UNAUTHORIZED`)
* **Penyebab**: Nilai `PLATFORM_INTERNAL_API_KEY` tidak identik di antara `.env` Platform Backend, Ticketing Backend, dan Concession Backend.
* **Solusi**: Samakan nilai `PLATFORM_INTERNAL_API_KEY` di ketiga file `.env`.

### 4. CORS Error di Browser
* **Penyebab**: Frontend mengakses backend dari port yang belum didaftarkan di whitelist CORS.
* **Solusi**: Pastikan frontend berjalan pada port resmi (`3000` untuk Platform, `3011` untuk Ticketing, `3050` untuk Concession).

### 5. SSO Callback Gagal
* **Penyebab**: Kode SSO Launch kedaluwarsa (berlaku 60 detik) atau jam mesin lokal tidak sinkron.
* **Solusi**: Lakukan peluncuran ulang dari dashboard Platform.

---

## 7. Verifikasi Kesiapan UAT

Sebelum memulai testing:
1. Jalankan seeder akun UAT: `npm run seed:uat`
2. Jalankan ekosistem: `npm run dev`
3. Buka browser ke `http://localhost:3000` dan login menggunakan akun `uat.admin@planetcinema.local` / `Uat12345!`.
4. Ikuti tahapan testing pada [docs/UAT-LOCAL.md](file:///Users/hari/Documents/planet-cinema/project/docs/UAT-LOCAL.md).
