# LCC ARENA — Literacy & Numeracy Competition Arena

Aplikasi simulasi lomba cerdas cermat numerasi SMP Kelas VII berbasis web dua layar (**IFP Display 1920×1080** + **Mobile Controller Smartphone**), dibangun mengikuti prinsip **Ponytail (`AGENTS.md`)**: **0 dependensi eksternal (`node_modules` = 0)**, siap berjalan 100% offline di jaringan Wi-Fi/Hotspot kelas.

## Arsitektur (Opsi A — Zero-Dependency Local Classroom Server)

- **Runtime:** Node.js v24+ native TypeScript (`node --no-warnings server.ts`)
- **Database & Seed:** Built-in `node:sqlite` (`data/lcc_arena.sqlite`, mode WAL) + validasi & auto-seed otomatis 39 soal / 13 indikator dari `data/questions.json`
- **Realtime & Kalibrasi Jam:** Native HTTP Server-Sent Events (`text/event-stream` + `EventSource`) dengan kalibrasi RTT monotonik (tahan selisih jam antara IFP dan HP)
- **Keamanan Ruang:** `controller_token` disimpan sebagai hash `SHA-256` (`timingSafeEqual`), otomatis dihapus dari URL bar HP, dan kunci jawaban tidak pernah dikirim ke Display sebelum soal selesai & diizinkan operator
- **QR Offline:** Generator SVG QR ISO/IEC 18004 mandiri di `src/qr.ts` (tanpa internet & tanpa membocorkan token ke layanan pihak ketiga)

## Cara Menjalankan di Kelas (IFP + Smartphone)

Pastikan Node.js **v24+** terpasang, lalu jalankan:

```powershell
npm start
```

1. Buka `http://localhost:3000` pada laptop / IFP yang terhubung ke proyektor dan Wi-Fi/Hotspot kelas.
2. Klik **Buat Pertandingan Baru**, isi nama 3 peserta, pilih mode (**Full Competition**, **Category Challenge**, atau **Quick Match**), lalu buat ruang.
3. Pada halaman **Lobby Ruang**:
   - Scan **QR Controller** menggunakan kamera HP Guru/Operator (pastikan HP berada di Wi-Fi/Hotspot yang sama).
   - Klik **Jadikan Layar Ini IFP** (atau **Buka Tab Display**) untuk menampilkan layar publik `/display/:roomCode` di proyektor.
4. Tekan **Mulai Pertandingan** dari HP Operator untuk menjalankan lomba hingga Podium Juara.

### Konfigurasi Opsional (Environment Variables)

- `PORT` — Port HTTP server (default: `3000`)
- `HOST` — Alamat bind jaringan (default: `0.0.0.0` agar dapat diakses dari HP di LAN)

## Menjalankan Pengujian Otomatis

```powershell
npm test
```

Menguji validasi 39 soal & 13 indikator (termasuk koreksi kunci `Q003 = B`), encoder QR SVG, seluruh transisi state machine, pembekuan/kelanjutan timer, pencegahan poin ganda (idempotensi), log koreksi skor, peringkat seri, serta simulasi E2E dua perangkat (Display + Controller) melalui HTTP & SSE.
