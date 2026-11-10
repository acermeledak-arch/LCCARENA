# Simulasi CPNS — Drilling CAT TIU CPNS & Pembahasan Kelas

Platform drilling mandiri soal **TIU CPNS** (Verbal, Numerik, Figural) berbasis **Convex Realtime** + **Static SPA (Vercel)** untuk latihan kelas maupun mandiri.

## Fitur Utama

- **105 Soal TIU CPNS Standar CAT (Opsi A–E)**:
  - **TIU Verbal (35 Soal)**: Analogi (12), Silogisme (12), Analitis (11)
  - **TIU Numerik (45 Soal)**: Berhitung (12), Deret Angka (12), Perbandingan Kuantitatif (10), Soal Cerita (11)
  - **TIU Figural (25 Soal)**: Analogi Figural (8), Ketidaksamaan Figural (8), Serial Figural (9) lengkap dengan diagram vektor `<svg>` presisi di batang soal dan 5 opsi jawaban.
- **Tanpa Timer & Tanpa Batas 3 Pemain**: Peserta mengerjakan di HP masing-masing dengan ritme sendiri tanpa tekanan waktu.
- **Tanpa Label Tingkat Kesulitan**: Semua soal disetarakan tanpa label mudah/menengah/sulit.
- **Skor Standar CAT TIU**: Benar `+5`, Salah `0`, Kosong `0`.
- **Proteksi Ketat Kunci & Pembahasan (Server-Side Lock)**:
  - Selama sesi berlangsung (`waiting` / `in_progress`), payload API peserta tidak pernah mengirim `correctOption`, `isCorrect`, `score`, atau `explanationParts`.
  - Mode Pembahasan Kelas (`review_open`) hanya terbuka setelah seluruh peserta menyelesaikan soal atau saat Host secara eksplisit mengakhiri sesi.
- **Pembahasan Terstruktur 8 Bagian**:
  1. Inti Pertanyaan
  2. Informasi yang Diketahui
  3. Strategi / Rumus / Pola
  4. Langkah Penyelesaian Step-by-Step
  5. Alasan Jawaban Benar
  6. Analisis Pengecoh (Mengapa 4 opsi lain salah)
  7. Tips Cepat / Pola Serupa
  8. Cek Akhir
- **3 Tema Tampilan Layar (IFP / Proyektor & HP)**:
  - `🌙 Dark Arena`
  - `🟩 Papan Tulis`
  - `☀️ Kelas Terang`

## Pengujian & Deploy

```bash
# Jalankan verifikasi bank soal 105 item + simulasi alur backend Convex
npm test

# Sinkronisasi skema & fungsi ke Convex
npx convex dev --once

# Seed 105 soal TIU CPNS ke database Convex
npx convex run matches:ensureSeed
```
