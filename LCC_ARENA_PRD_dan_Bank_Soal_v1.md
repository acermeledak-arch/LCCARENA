# LCC ARENA

## Product Requirements Document (PRD) + Bank Soal Numerasi Kelas VII

**Versi:** 1.0\
**Status:** Draft implementasi untuk Agentic AI Codex\
**Bahasa produk:** Indonesia\
**Platform:** Web responsif\
**Target perangkat:** IFP/proyektor Full HD dan smartphone Android\
**Pengguna utama:** Guru/operator dan tiga peserta lomba

------------------------------------------------------------------------

# BAGIAN I --- PRODUCT REQUIREMENTS DOCUMENT

## 1. Ringkasan Produk

**LCC ARENA (Literacy & Numeracy Competition Arena)** adalah aplikasi
simulasi lomba cerdas cermat berbasis web untuk melatih literasi dan
numerasi siswa SMP kelas VII. Aplikasi menggunakan dua tampilan yang
terhubung secara realtime:

1.  **Display Screen** untuk IFP/proyektor, menampilkan soal, timer,
    status permainan, dan skor tiga peserta.
2.  **Mobile Controller** untuk smartphone operator, mengendalikan
    pertandingan, memilih peserta yang mengangkat tangan, menghentikan
    timer, memeriksa jawaban, dan memberikan poin.

Peserta tidak perlu memasang aplikasi atau menggunakan HP. Mereka
menjawab secara lisan setelah operator memilih peserta yang mengangkat
tangan.

Aplikasi harus sederhana, responsif, mudah dikendalikan, dan dapat
digunakan dalam simulasi kelas tanpa perangkat buzzer khusus.

## 2. Tujuan Produk

-   Menyediakan simulasi cerdas cermat yang menyerupai suasana lomba.
-   Melatih kecepatan, ketepatan, literasi, numerasi, dan penalaran
    siswa.
-   Memudahkan guru mengoperasikan pertandingan dari smartphone.
-   Menampilkan perubahan skor dan status pertandingan secara realtime
    di IFP.
-   Menyediakan bank soal yang terstruktur berdasarkan kisi-kisi lomba
    kelas VII.
-   Menyimpan hasil pertandingan agar dapat ditinjau kembali.

### 2.1 Bukan tujuan MVP

-   Peserta menjawab melalui HP masing-masing.
-   Buzzer otomatis berbasis suara atau kamera.
-   Sistem akun siswa dan kelas.
-   Turnamen online antarsekolah.
-   Penilaian jawaban bebas menggunakan AI.
-   Integrasi perangkat keras buzzer.

## 3. Pengguna dan Peran

  -----------------------------------------------------------------------
  Peran                   Perangkat               Hak akses
  ----------------------- ----------------------- -----------------------
  Operator/host           Smartphone atau laptop  Membuat pertandingan,
                                                  mengendalikan timer,
                                                  memilih peserta,
                                                  menilai jawaban,
                                                  mengelola skor

  Display                 IFP/proyektor/laptop    Menampilkan
                                                  pertandingan; tidak
                                                  mengendalikan permainan

  Peserta 1--3            Tidak memerlukan        Mengikuti soal dan
                          perangkat               menjawab secara lisan
  -----------------------------------------------------------------------

**Aturan akses:** Controller harus menggunakan kode/tautan ruang dan
token kontrol yang tidak ditampilkan pada layar publik. Display hanya
memperoleh akses baca terhadap status pertandingan.

## 4. Cakupan Kisi-Kisi dan Bank Soal

Bank soal awal mengacu pada 13 indikator yang terbaca dalam dokumen
kisi-kisi:

1.  Bilangan bulat --- operasi hitung.
2.  Bilangan bulat --- garis bilangan.
3.  Bilangan bulat --- perbandingan bilangan.
4.  Bilangan rasional --- pecahan.
5.  Bilangan rasional --- desimal.
6.  Bilangan rasional --- persen.
7.  Rasio dan perbandingan --- rasio.
8.  Rasio dan perbandingan --- rasio senilai.
9.  Rasio dan perbandingan --- skala.
10. Aljabar --- variabel, koefisien, dan konstanta.
11. Aljabar --- bentuk aljabar.
12. Persamaan linear satu variabel --- persamaan sederhana.
13. Pertidaksamaan linear satu variabel --- pertidaksamaan sederhana.

Setiap indikator memiliki tiga soal: satu mudah dan dua menengah. Total
awal: **39 soal**.

> Catatan penomoran: dokumen kisi-kisi sumber melompat dari nomor 9 ke
> nomor 11. Daftar di PRD ini dinomori ulang secara berurutan agar mudah
> dipakai dalam aplikasi; tidak ada indikator baru yang ditambahkan.

### 4.1 Prinsip penulisan soal

-   Kontekstual dan sesuai tingkat kelas VII.
-   Pertanyaan ringkas dan dapat dipahami dalam waktu singkat.
-   Dapat diselesaikan tanpa kalkulator.
-   Target penyelesaian maksimal 20 detik untuk peserta yang telah
    berlatih.
-   Setiap soal memiliki empat opsi A--D, satu kunci benar, dan
    pembahasan.
-   Opsi pengecoh harus masuk akal dan tidak ambigu.
-   Gunakan satuan secara konsisten.
-   Hindari informasi yang tidak diperlukan.
-   Soal ditampilkan satu per satu, bukan sebagai lembar ujian.

**Catatan pedagogis:** waktu 20 detik merupakan batas simulasi lomba,
bukan jaminan bahwa semua siswa akan menyelesaikan setiap soal dalam
waktu tersebut. Guru dapat menyesuaikan waktu melalui pengaturan
pertandingan.

## 5. Aturan Resmi Permainan

### 5.1 Aturan dasar

-   Jumlah peserta: tepat tiga orang.
-   Nama peserta dapat diisi bebas sebelum pertandingan dimulai.
-   Waktu awal setiap soal: 20 detik.
-   Jawaban benar: **+10 poin**.
-   Jawaban salah: **0 poin**, tanpa pengurangan nilai.
-   Tidak ada poin otomatis karena kecepatan mengangkat tangan.
-   Operator menentukan peserta yang mendapat kesempatan berdasarkan
    pengamatan langsung di ruangan.
-   Peserta menjawab secara lisan.
-   Operator menjadi satu-satunya pihak yang mengonfirmasi benar atau
    salah.

### 5.2 Mekanisme lempar soal

1.  Timer berjalan saat soal dimulai.
2.  Ketika ada peserta mengangkat tangan, operator memilih nama peserta
    pada controller.
3.  Timer berhenti dan status menjadi `ANSWERING`.
4.  Operator mendengarkan jawaban.
5.  Jika benar, operator menekan **BENAR (+10)**. Poin bertambah dan
    soal selesai.
6.  Jika salah, operator menekan **SALAH**. Peserta tersebut ditandai
    sudah mencoba dan tidak dapat dipilih lagi untuk soal yang sama.
7.  Jika masih ada peserta yang belum mencoba dan waktu masih tersisa,
    timer melanjutkan hitungan dari sisa waktu sebelumnya.
8.  Peserta lain dapat dipilih oleh operator.
9.  Jika ketiga peserta sudah salah, soal berakhir tanpa poin.
10. Jika timer mencapai nol, soal berakhir tanpa poin.
11. Setelah soal selesai, kunci jawaban dan pembahasan singkat dapat
    ditampilkan.
12. Operator menekan **SOAL BERIKUTNYA** untuk melanjutkan.

### 5.3 Keputusan perilaku yang harus konsisten

-   Timer **tidak di-reset** setelah jawaban salah.
-   Timer **berhenti** saat peserta dipilih dan sedang menjawab secara
    lisan.
-   Waktu yang tersisa dibekukan selama peserta menjawab.
-   Setelah jawaban salah, timer melanjutkan sisa waktu yang dibekukan.
-   Setelah jawaban benar, soal langsung selesai.
-   Pemain yang sudah salah tidak boleh dipilih kembali pada soal yang
    sama.
-   Jika semua pemain sudah salah, soal langsung selesai meskipun masih
    ada sisa waktu.
-   Jika waktu habis ketika tidak ada peserta yang sedang menjawab, soal
    langsung selesai.
-   Jika operator memilih peserta secara tidak sengaja, sediakan aksi
    **BATALKAN PEMILIHAN** sebelum jawaban dinilai. Aksi ini
    mengembalikan status ke `RUNNING` dengan sisa waktu yang sama.
-   Jika operator sudah menekan BENAR atau SALAH, keputusan tersebut
    dianggap final untuk soal itu. Untuk MVP, koreksi skor dilakukan
    melalui fitur koreksi skor yang tercatat dalam riwayat aktivitas.

### 5.4 Skor dan peringkat

-   Skor awal setiap peserta: 0.
-   Jawaban benar: +10.
-   Jawaban salah: 0.
-   Waktu habis: 0.
-   Tidak ada skor negatif.
-   Peringkat diurutkan dari skor tertinggi ke terendah.
-   Jika skor sama, tampilkan peringkat seri. Jangan membuat pemecah
    seri otomatis yang tidak ditetapkan aturan lomba.
-   Operator dapat melakukan koreksi skor manual dengan alasan wajib;
    setiap koreksi dicatat dalam riwayat.

## 6. Mode Permainan

### 6.1 Full Competition

-   Memainkan semua 39 soal.
-   Urutan dapat mengikuti kisi-kisi atau diacak.
-   Pengaturan default: urutan kisi-kisi, Level 1 lalu Level 2 dan Level
    3 pada setiap indikator.

### 6.2 Category Challenge

-   Operator memilih satu atau beberapa indikator.
-   Sistem hanya mengambil soal dari indikator terpilih.
-   Operator dapat memilih semua level atau level tertentu.

### 6.3 Quick Match

-   Operator menentukan jumlah soal, misalnya 5, 10, atau 15.
-   Sistem mengambil soal dari bank yang tersedia.
-   Pengambilan dapat berurutan atau acak.
-   Hindari soal duplikat dalam satu pertandingan kecuali operator
    mengaktifkan opsi pengulangan.

## 7. Alur Penggunaan

### 7.1 Membuat pertandingan

1.  Operator membuka halaman beranda.
2.  Operator memilih **Buat Pertandingan**.
3.  Operator mengisi nama tiga peserta.
4.  Operator memilih mode permainan.
5.  Operator memilih kategori/indikator jika diperlukan.
6.  Operator mengatur waktu per soal (default 20 detik) dan poin jawaban
    benar (default 10).
7.  Sistem membuat Room ID unik.
8.  Sistem menampilkan tautan/QR Display dan tautan Controller.
9.  Operator membuka Display pada IFP dan Controller pada HP.
10. Controller melakukan verifikasi token kontrol.
11. Setelah kedua layar terhubung, operator menekan **Mulai
    Pertandingan**.

### 7.2 Alur satu soal

`READY → RUNNING → ANSWERING → (CORRECT → FINISHED | WRONG → RUNNING atau FINISHED) → NEXT QUESTION`

Alur alternatif: - `RUNNING → TIMEOUT → FINISHED` - `WRONG → FINISHED`
jika semua peserta sudah salah. - `ANSWERING → RUNNING` jika operator
membatalkan pemilihan sebelum penilaian.

### 7.3 Mengakhiri pertandingan

-   Setelah soal terakhir selesai, tampilkan hasil akhir.
-   Tampilkan podium juara 1, 2, dan 3.
-   Jika ada skor seri, tampilkan posisi seri.
-   Simpan ringkasan dan detail pertandingan.
-   Sediakan tombol pertandingan baru dan kembali ke beranda.

## 8. Persyaratan Halaman

### 8.1 Beranda `/`

Komponen: - Logo dan nama LCC ARENA. - Tombol Buat Pertandingan. -
Tombol Riwayat Pertandingan. - Ringkasan cara bermain. - Pengaturan bank
soal (untuk versi lanjutan).

### 8.2 Setup pertandingan

Input: - Nama Peserta 1, 2, 3 (wajib, tidak boleh kosong). - Mode
permainan. - Indikator/kategori. - Level kesulitan. - Jumlah soal untuk
Quick Match. - Urutan soal: berurutan/acak. - Durasi soal (default 20
detik). - Poin benar (default 10). - Opsi menampilkan pilihan jawaban di
Display (default aktif).

Validasi: - Nama peserta tidak boleh hanya spasi. - Nama peserta harus
unik agar operator tidak salah memilih. - Durasi harus bilangan positif
dalam batas yang ditetapkan aplikasi. - Poin harus bilangan bulat
nonnegatif. - Quick Match harus memiliki jumlah soal yang tersedia.

### 8.3 Display `/display/:roomId`

Prioritas: keterbacaan dari jarak jauh pada IFP Full HD 1920×1080.

Elemen: - Header: logo, nama mode, kategori, nomor soal. - Scoreboard
tiga peserta dengan nama, warna identitas, dan skor. - Area soal yang
dominan. - Pilihan A--D jika diaktifkan. - Timer besar dan mudah
terlihat. - Status: SIAP, BERLANGSUNG, MENJAWAB, BENAR, SALAH, WAKTU
HABIS. - Indikator peserta yang sedang menjawab. - Umpan balik
jawaban. - Kunci jawaban dan pembahasan setelah soal selesai jika
pengaturan mengizinkan. - Layar hasil akhir dan podium.

Ketentuan: - Jangan menampilkan kontrol operator di Display. - Jangan
menampilkan token controller. - Hindari animasi yang mengganggu
keterbacaan. - Gunakan kontras warna yang tinggi. - Ukuran soal harus
responsif terhadap panjang teks. - Timer harus tetap terlihat jelas.

### 8.4 Mobile Controller `/controller/:roomId`

Elemen: - Nama/ID pertandingan dan status koneksi. - Nomor soal dan sisa
waktu. - Tiga tombol peserta. - Tombol BENAR (+10). - Tombol SALAH. -
Tombol BATALKAN PEMILIHAN saat status `ANSWERING`. - Tombol MULAI
SOAL. - Tombol SOAL BERIKUTNYA. - Tombol PAUSE/RESUME. - Tombol LIHAT
KUNCI JAWABAN setelah soal selesai. - Ringkasan skor. - Aksi akhiri
pertandingan.

Ketentuan UX: - Mobile-first. - Tombol aksi utama minimal 48--56 px. -
Area sentuh tidak saling berhimpitan. - Konfirmasi untuk mengakhiri
pertandingan atau reset. - Tombol yang tidak relevan pada state tertentu
harus dinonaktifkan atau disembunyikan. - Tampilkan status koneksi
realtime dengan jelas.

### 8.5 Riwayat pertandingan

Simpan: - ID pertandingan. - Waktu mulai dan selesai. - Nama peserta. -
Skor akhir. - Peringkat. - Mode dan kategori. - Daftar soal yang
dimainkan. - Peserta yang mencoba setiap soal. - Hasil setiap
percobaan. - Koreksi skor dan alasan koreksi.

Fitur: - Melihat detail pertandingan. - Menghapus riwayat dengan
konfirmasi. - Filter tanggal (opsional MVP). - Ekspor laporan
(pengembangan berikutnya).

## 9. Desain UI/UX

Arah visual: - Modern, premium, dan terasa seperti acara game show. -
Dark theme sebagai tema utama. - Warna aksen biru, ungu, dan cyan. -
Hijau untuk jawaban benar. - Merah untuk jawaban salah. - Kuning/amber
untuk peringatan waktu. - Tipografi tegas, jelas, dan mudah dibaca. -
Panel dan kartu sederhana, tidak terlalu banyak ornamen.

### Display

-   Target utama 16:9.
-   Optimasi resolusi 1920×1080.
-   Scoreboard selalu terlihat.
-   Area pertanyaan menjadi fokus terbesar.
-   Timer besar dan kontras.
-   Layout tidak boleh bergantung pada hover.

### Controller

-   Optimasi layar smartphone portrait.
-   Kontrol dapat digunakan satu tangan.
-   Tombol BENAR dan SALAH harus mudah dibedakan.
-   Tampilkan nama peserta secara penuh.
-   Jangan mengandalkan warna saja; sertakan teks dan ikon/status.

## 10. Arsitektur Teknis yang Direkomendasikan

### 10.1 Stack

-   Frontend: React + Vite + TypeScript.
-   Styling: Tailwind CSS.
-   Komponen UI: gunakan komponen reusable dan accessible.
-   Backend: Supabase.
-   Database: PostgreSQL melalui Supabase.
-   Realtime: Supabase Realtime untuk broadcast perubahan status.
-   Hosting: Vercel atau hosting statis yang mendukung SPA.
-   Validasi data: Zod atau validator TypeScript setara.
-   Testing: unit test untuk game engine dan integration test untuk alur
    pertandingan.

Codex/agentic coding agent boleh mengusulkan stack setara jika memiliki
alasan teknis yang jelas, tetapi perilaku produk dan kontrak state harus
tetap dipertahankan.

### 10.2 Struktur data konseptual

**matches** - `id` - `room_code` - `controller_token_hash` - `status` -
`mode` - `settings_json` - `current_question_index` -
`current_question_id` - `created_at` - `started_at` - `finished_at`

**match_players** - `id` - `match_id` - `seat_number` (1--3) -
`display_name` - `score` - `theme_color`

**questions** - `id` - `indicator_id` - `difficulty` - `question_text` -
`options_json` - `correct_option` - `explanation` - `default_points` -
`is_active`

**indicators** - `id` - `category` - `topic` - `indicator_text` -
`sort_order`

**match_questions** - `id` - `match_id` - `question_id` -
`sequence_number` - `status` - `remaining_ms` - `deadline_at` -
`attempted_player_ids_json` - `selected_player_id` - `result`

**answer_attempts** - `id` - `match_question_id` - `player_id` -
`result` - `points_awarded` - `created_at`

**match_events** - `id` - `match_id` - `event_type` - `payload_json` -
`created_at`

Gunakan UUID untuk ID internal. Room code boleh berupa kode pendek yang
tidak mudah ditebak. Simpan hash token controller, bukan token mentah.

### 10.3 Keamanan dan akses

-   Display hanya boleh membaca data pertandingan yang diperlukan.
-   Controller harus membuktikan kepemilikan token kontrol.
-   Jangan meletakkan service-role key Supabase di frontend.
-   Gunakan Row Level Security (RLS).
-   Jangan menganggap Room ID sebagai satu-satunya rahasia untuk
    mengendalikan pertandingan.
-   Validasi setiap perubahan state di server atau melalui fungsi
    backend yang aman.
-   Batasi operasi skor agar tidak dapat dipanggil dua kali untuk soal
    yang sama.
-   Jangan pernah mengirim kunci jawaban ke Display sebelum soal selesai
    jika mode rahasia jawaban diaktifkan.
-   Sanitasi nama peserta dan teks yang ditampilkan.

Untuk MVP, implementasikan kontrol yang aman dan sederhana. Jangan
membuat sistem autentikasi siswa karena peserta tidak memakai perangkat.

## 11. Sinkronisasi Realtime dan Timer

### 11.1 Prinsip timer

Jangan mengandalkan `setInterval` lokal sebagai sumber kebenaran.

Sumber kebenaran timer adalah: - `deadline_at`: timestamp akhir hitung
mundur saat status berjalan. - `remaining_ms`: sisa waktu yang dibekukan
saat timer berhenti. - `status`: state pertandingan.

Saat soal dimulai: - `deadline_at = server_now + duration_ms` -
`status = RUNNING`

Saat peserta dipilih: - Hitung
`remaining_ms = max(0, deadline_at - server_now)`. - Simpan sisa
waktu. - Kosongkan deadline aktif. - `status = ANSWERING`.

Saat jawaban salah: - Tandai pemain sudah mencoba. - Jika masih ada
peserta yang belum mencoba dan sisa waktu lebih besar dari nol: -
`deadline_at = server_now + remaining_ms` - `status = RUNNING`. - Jika
semua sudah mencoba atau waktu nol: - `status = FINISHED`.

Saat jawaban benar: - Tambahkan poin tepat satu kali. -
`status = FINISHED`.

Display menghitung tampilan timer dari deadline yang diterima dan jam
lokal yang diselaraskan, bukan mengurangi angka secara independen
sebagai sumber kebenaran. Lakukan sinkronisasi ulang setelah reconnect.

### 11.2 Realtime events

Contoh event: - `MATCH_CREATED` - `MATCH_STARTED` - `QUESTION_STARTED` -
`TIMER_PAUSED` - `PLAYER_SELECTED` - `PLAYER_SELECTION_CANCELLED` -
`ANSWER_CORRECT` - `ANSWER_WRONG` - `QUESTION_FINISHED` -
`NEXT_QUESTION` - `SCORE_UPDATED` - `MATCH_PAUSED` - `MATCH_RESUMED` -
`MATCH_FINISHED`

Event harus memiliki ID unik atau mekanisme idempotensi agar pesan
realtime yang terkirim ulang tidak menggandakan poin.

### 11.3 Reconnect

-   Display dan Controller menampilkan indikator online/offline.
-   Ketika koneksi pulih, client meminta snapshot state terbaru.
-   Jangan melanjutkan timer berdasarkan state lokal lama.
-   Server/backend tetap menjadi sumber kebenaran.
-   Jika koneksi controller hilang, jangan menerima aksi yang tidak
    terverifikasi.
-   Jika timer habis saat controller offline, backend harus tetap dapat
    menandai soal timeout atau melakukan rekonsiliasi ketika koneksi
    pulih.

## 12. State Machine

State pertandingan: - `LOBBY` - `READY` - `RUNNING` - `ANSWERING` -
`PAUSED` - `QUESTION_FINISHED` - `MATCH_FINISHED`

State soal: - `PENDING` - `RUNNING` - `ANSWERING` - `CORRECT` -
`WRONG_RETRY` - `TIMEOUT` - `FINISHED`

Aturan transisi harus diuji. Jangan membiarkan frontend mengubah state
secara bebas tanpa memeriksa state sebelumnya.

## 13. Validasi dan Penanganan Kesalahan

-   Room tidak ditemukan: tampilkan pesan dan tautan kembali.
-   Token controller tidak valid: tolak akses kontrol.
-   Pertandingan sudah selesai: controller hanya dapat melihat hasil
    atau membuat pertandingan baru.
-   Soal tidak tersedia: jangan memulai pertandingan.
-   Dua aksi operator terkirim hampir bersamaan: terima hanya aksi valid
    pertama.
-   Klik ganda BENAR: poin tetap hanya bertambah sekali.
-   Koneksi terputus: tampilkan status dan lakukan reconnect.
-   Browser refresh: pulihkan pertandingan dari backend.
-   Timer melewati nol: jangan tampilkan nilai negatif.
-   Nama peserta duplikat: minta nama berbeda atau tambahkan nomor kursi
    secara jelas.

## 14. Acceptance Criteria MVP

MVP dinyatakan memenuhi kebutuhan jika:

1.  Operator dapat membuat pertandingan dengan tiga nama peserta.
2.  Sistem menghasilkan Room ID dan akses Display/Controller.
3.  IFP dan HP terhubung ke pertandingan yang sama.
4.  Display menampilkan soal dan tiga skor.
5.  Timer mulai dari 20 detik secara default.
6.  Memilih peserta menghentikan timer dan membekukan sisa waktu.
7.  Jawaban benar menambahkan 10 poin tepat satu kali.
8.  Jawaban salah tidak mengurangi poin.
9.  Peserta yang salah tidak dapat dipilih kembali pada soal yang sama.
10. Setelah jawaban salah, peserta lain dapat dipilih.
11. Timer melanjutkan sisa waktu, bukan kembali ke 20 detik.
12. Jika semua peserta salah, soal selesai.
13. Jika waktu habis, soal selesai.
14. Kunci jawaban dapat dilihat setelah soal selesai.
15. Soal berikutnya dapat dimulai.
16. Skor akhir dan peringkat ditampilkan.
17. Refresh browser tidak merusak state pertandingan.
18. UI dapat digunakan pada Android dan IFP Full HD.
19. Tidak ada penggandaan poin akibat klik ganda atau event realtime
    berulang.
20. Riwayat pertandingan tersimpan.

## 15. Rencana Implementasi

### Phase 1 --- Foundation

-   Setup project.
-   Design system.
-   Database schema.
-   Create match.
-   Player setup.
-   Room code.
-   Display dan Controller routing.

### Phase 2 --- Game Engine

-   State machine.
-   Timer deadline.
-   Player selection.
-   Wrong-answer handoff.
-   Correct-answer scoring.
-   Pause/resume.
-   Next question.
-   Idempotency.

### Phase 3 --- Question Bank

-   Seed 39 questions.
-   Indicator and difficulty filters.
-   Sequential/random mode.
-   Answer reveal.
-   Explanation panel.

### Phase 4 --- Match Results

-   Final leaderboard.
-   Podium.
-   Match history.
-   Score correction audit log.

### Phase 5 --- QA and Deployment

-   Unit tests.
-   Realtime integration tests.
-   Mobile browser tests.
-   Full HD display tests.
-   Reconnect and refresh tests.
-   Security/RLS review.
-   Production deployment.

## 16. Instruksi untuk Agentic AI Codex

Sebelum menulis kode: 1. Baca PRD ini secara menyeluruh. 2. Buat
implementation plan dan daftar risiko. 3. Usulkan struktur folder dan
skema database. 4. Identifikasi kebutuhan environment variables. 5. Buat
diagram state machine dan alur realtime. 6. Jangan mengubah aturan
permainan tanpa persetujuan.

Saat implementasi: 1. Kerjakan per fase, bukan sekaligus tanpa validasi.
2. Prioritaskan game engine dan sinkronisasi sebelum animasi. 3.
Pisahkan komponen Display, Controller, dan game state. 4. Pisahkan data
soal dari komponen UI. 5. Buat unit test untuk setiap transisi state dan
perhitungan timer. 6. Gunakan data seed dari bank soal pada Bagian II.
7. Jangan pernah mengekspos service-role key. 8. Dokumentasikan cara
menjalankan lokal, migrasi database, seed data, dan deployment. 9.
Setelah setiap fase, jalankan test dan laporkan hasilnya. 10. Jangan
menganggap fitur selesai hanya karena UI sudah tampil; uji alur dua
perangkat secara nyata.

**Definition of Done:** aplikasi dapat menjalankan satu pertandingan
dari pembuatan room hingga podium akhir menggunakan satu IFP dan satu
HP, dengan seluruh aturan, timer, skor, dan perpindahan kesempatan
berjalan benar.

------------------------------------------------------------------------

# BAGIAN II --- BANK SOAL NUMERASI KELAS VII

## Petunjuk penggunaan bank soal

-   Setiap indikator memiliki tiga soal.
-   Level 1 = Mudah.
-   Level 2 dan 3 = Menengah.
-   Semua soal memiliki empat pilihan jawaban.
-   Kunci dan pembahasan hanya untuk operator dan ditampilkan setelah
    soal selesai.
-   Semua nilai poin mengikuti pengaturan pertandingan; default 10 poin.
-   Soal dapat diacak tanpa mengubah ID dan indikator asalnya.

------------------------------------------------------------------------

## INDIKATOR 1 --- Bilangan Bulat: Operasi Hitung

**Kompetensi:** Menyelesaikan operasi penjumlahan, pengurangan,
perkalian, dan pembagian bilangan bulat dalam masalah sehari-hari.

### Q001 --- Level 1 (Mudah)

Suhu sebuah kota pada pagi hari adalah −3°C. Pada siang hari suhu
meningkat 8°C. Berapakah suhu pada siang hari?

A. −11°C\
B. 5°C\
C. −5°C\
D. 11°C

**Kunci:** B\
**Pembahasan:** −3 + 8 = 5°C.

### Q002 --- Level 2 (Menengah)

Sebuah lift berada di lantai 4. Lift turun 7 lantai, kemudian naik 5
lantai. Di lantai berapakah lift sekarang jika lantai dasar dinyatakan
0?

A. −2\
B. 0\
C. 2\
D. 6

**Kunci:** C\
**Pembahasan:** 4 − 7 + 5 = 2.

### Q003 --- Level 3 (Menengah)

Dalam sebuah permainan, jawaban benar mendapat 6 poin dan jawaban salah
mendapat −2 poin. Rani menjawab benar 5 kali dan salah 3 kali. Berapa
total poin Rani?

A. 20\
B. 24\
C. 26\
D. 36

**Kunci:** A\
**Pembahasan:** (5 × 6) + (3 × −2) = 30 − 6 = 24.\
**Koreksi kunci:** B.\
**Catatan:** Jawaban benar adalah 24 poin.

------------------------------------------------------------------------

## INDIKATOR 2 --- Bilangan Bulat: Garis Bilangan

**Kompetensi:** Menentukan posisi akhir objek berdasarkan perpindahan
pada garis bilangan.

### Q004 --- Level 1 (Mudah)

Seekor semut berada di angka −2 pada garis bilangan. Semut bergerak 5
langkah ke kanan. Di angka berapakah semut berhenti?

A. −7\
B. −3\
C. 3\
D. 7

**Kunci:** C\
**Pembahasan:** −2 + 5 = 3.

### Q005 --- Level 2 (Menengah)

Sebuah pion mulai dari angka 3. Pion bergerak 6 langkah ke kiri, lalu 2
langkah ke kanan. Di angka berapakah pion berhenti?

A. −5\
B. −1\
C. 1\
D. 5

**Kunci:** B\
**Pembahasan:** 3 − 6 + 2 = −1.

### Q006 --- Level 3 (Menengah)

Robot mulai di posisi −4. Robot bergerak 7 satuan ke kanan, kemudian
bergerak 5 satuan ke kiri. Berapa jarak posisi akhir robot dari titik
nol?

A. 2 satuan\
B. 4 satuan\
C. 6 satuan\
D. 8 satuan

**Kunci:** A\
**Pembahasan:** −4 + 7 − 5 = −2. Jarak dari nol adalah 2 satuan.

------------------------------------------------------------------------

## INDIKATOR 3 --- Bilangan Bulat: Perbandingan Bilangan

**Kompetensi:** Membandingkan dan mengurutkan bilangan bulat.

### Q007 --- Level 1 (Mudah)

Manakah bilangan yang paling besar?

A. −8\
B. −3\
C. −10\
D. −5

**Kunci:** B\
**Pembahasan:** Bilangan negatif yang paling dekat dengan nol adalah
yang terbesar.

### Q008 --- Level 2 (Menengah)

Urutan bilangan −4, 2, −1, 5 dari yang terkecil adalah ....

A. −4, −1, 2, 5\
B. −1, −4, 2, 5\
C. 5, 2, −1, −4\
D. −4, 2, −1, 5

**Kunci:** A\
**Pembahasan:** Bilangan negatif yang lebih jauh dari nol lebih kecil,
sehingga urutannya −4, −1, 2, 5.

### Q009 --- Level 3 (Menengah)

Empat kota memiliki suhu berikut: Kota P = −2°C, Q = 3°C, R = −5°C, dan
S = 0°C. Kota yang memiliki suhu paling rendah adalah ....

A. Kota P\
B. Kota Q\
C. Kota R\
D. Kota S

**Kunci:** C\
**Pembahasan:** −5°C adalah suhu paling rendah.

------------------------------------------------------------------------

## INDIKATOR 4 --- Bilangan Rasional: Pecahan

**Kompetensi:** Melakukan operasi hitung pecahan dan menyelesaikan
masalah kontekstual.

### Q010 --- Level 1 (Mudah)

Ibu memiliki 1/2 kg gula. Ibu membeli lagi 1/4 kg. Berapa kilogram gula
ibu sekarang?

A. 1/4 kg\
B. 2/4 kg\
C. 3/4 kg\
D. 1 kg

**Kunci:** C\
**Pembahasan:** 1/2 + 1/4 = 2/4 + 1/4 = 3/4 kg.

### Q011 --- Level 2 (Menengah)

Sebuah kue dipotong menjadi 8 bagian sama besar. Andi memakan 3/8 bagian
dan Budi memakan 2/8 bagian. Berapa bagian kue yang tersisa?

A. 1/8\
B. 3/8\
C. 5/8\
D. 7/8

**Kunci:** B\
**Pembahasan:** 8/8 − 3/8 − 2/8 = 3/8.

### Q012 --- Level 3 (Menengah)

Sebuah tangki terisi 3/4 bagian. Kemudian digunakan 1/3 dari kapasitas
penuh tangki. Berapa bagian kapasitas tangki yang masih terisi?

A. 1/4\
B. 5/12\
C. 7/12\
D. 2/3

**Kunci:** B\
**Pembahasan:** 3/4 − 1/3 = 9/12 − 4/12 = 5/12.

------------------------------------------------------------------------

## INDIKATOR 5 --- Bilangan Rasional: Desimal

**Kompetensi:** Menghitung penjumlahan dan pengurangan bilangan desimal
dalam kehidupan sehari-hari.

### Q013 --- Level 1 (Mudah)

Dina membeli pita sepanjang 1,5 meter dan 2,25 meter. Berapa panjang
seluruh pita?

A. 3,25 m\
B. 3,50 m\
C. 3,75 m\
D. 4,25 m

**Kunci:** C\
**Pembahasan:** 1,50 + 2,25 = 3,75 meter.

### Q014 --- Level 2 (Menengah)

Berat sebuah paket 4,8 kg. Setelah sebagian isinya dikeluarkan, beratnya
berkurang 1,35 kg. Berapa berat paket sekarang?

A. 3,35 kg\
B. 3,45 kg\
C. 3,55 kg\
D. 3,65 kg

**Kunci:** B\
**Pembahasan:** 4,80 − 1,35 = 3,45 kg.

### Q015 --- Level 3 (Menengah)

Rina memiliki uang Rp20.000. Ia membeli pensil seharga Rp3.500 dan buku
seharga Rp8.750. Berapa uang kembaliannya?

A. Rp7.250\
B. Rp7.500\
C. Rp7.750\
D. Rp8.250

**Kunci:** C\
**Pembahasan:** Rp20.000 − Rp3.500 − Rp8.750 = Rp7.750.

------------------------------------------------------------------------

## INDIKATOR 6 --- Bilangan Rasional: Persen

**Kompetensi:** Menentukan persentase, nilai persentase, dan bagian dari
keseluruhan.

### Q016 --- Level 1 (Mudah)

Dari 100 siswa, 35 siswa mengikuti klub matematika. Berapa persentase
siswa yang mengikuti klub tersebut?

A. 25%\
B. 30%\
C. 35%\
D. 45%

**Kunci:** C\
**Pembahasan:** 35/100 × 100% = 35%.

### Q017 --- Level 2 (Menengah)

Sebuah tas berharga Rp80.000 mendapat diskon 25%. Berapa rupiah potongan
harganya?

A. Rp10.000\
B. Rp15.000\
C. Rp20.000\
D. Rp25.000

**Kunci:** C\
**Pembahasan:** 25% × Rp80.000 = Rp20.000.

### Q018 --- Level 3 (Menengah)

Dalam sebuah kelas terdapat 40 siswa. Sebanyak 60% adalah perempuan.
Berapa jumlah siswa laki-laki?

A. 12 siswa\
B. 16 siswa\
C. 20 siswa\
D. 24 siswa

**Kunci:** B\
**Pembahasan:** Jumlah perempuan = 60% × 40 = 24. Laki-laki = 40 − 24 =
16 siswa.

------------------------------------------------------------------------

## INDIKATOR 7 --- Rasio dan Perbandingan: Rasio

**Kompetensi:** Menentukan rasio dua besaran dan menyederhanakannya.

### Q019 --- Level 1 (Mudah)

Di sebuah kotak terdapat 6 bola merah dan 9 bola biru. Rasio bola merah
terhadap bola biru dalam bentuk paling sederhana adalah ....

A. 2 : 3\
B. 3 : 2\
C. 2 : 5\
D. 3 : 5

**Kunci:** A\
**Pembahasan:** 6 : 9 dibagi 3 menjadi 2 : 3.

### Q020 --- Level 2 (Menengah)

Perbandingan jumlah siswa laki-laki dan perempuan adalah 3 : 4. Jika
jumlah siswa laki-laki 15 orang, berapa jumlah siswa perempuan?

A. 16\
B. 18\
C. 20\
D. 24

**Kunci:** C\
**Pembahasan:** 3 bagian = 15, maka 1 bagian = 5. Perempuan = 4 × 5 =
20.

### Q021 --- Level 3 (Menengah)

Perbandingan uang Ali dan Bima adalah 2 : 5. Jika jumlah uang mereka
Rp84.000, berapa uang Bima?

A. Rp24.000\
B. Rp36.000\
C. Rp48.000\
D. Rp60.000

**Kunci:** D\
**Pembahasan:** Total bagian = 2 + 5 = 7. Satu bagian = Rp84.000 ÷ 7 =
Rp12.000. Uang Bima = 5 × Rp12.000 = Rp60.000.

------------------------------------------------------------------------

## INDIKATOR 8 --- Rasio dan Perbandingan: Rasio Senilai

**Kompetensi:** Menentukan nilai yang belum diketahui dalam perbandingan
senilai.

### Q022 --- Level 1 (Mudah)

Harga 2 buku tulis adalah Rp10.000. Berapa harga 4 buku tulis dengan
harga satuan yang sama?

A. Rp15.000\
B. Rp20.000\
C. Rp25.000\
D. Rp30.000

**Kunci:** B\
**Pembahasan:** Harga satu buku Rp5.000, sehingga 4 buku = Rp20.000.

### Q023 --- Level 2 (Menengah)

Untuk membuat 4 gelas minuman diperlukan 8 sendok gula. Berapa sendok
gula yang diperlukan untuk membuat 10 gelas dengan rasa yang sama?

A. 16\
B. 18\
C. 20\
D. 24

**Kunci:** C\
**Pembahasan:** 8 ÷ 4 = 2 sendok per gelas. Untuk 10 gelas diperlukan 20
sendok.

### Q024 --- Level 3 (Menengah)

Sebuah kendaraan menempuh jarak 60 km dengan 4 liter bensin. Jika
konsumsi bensin tetap, berapa jarak yang dapat ditempuh dengan 7 liter
bensin?

A. 90 km\
B. 100 km\
C. 105 km\
D. 120 km

**Kunci:** C\
**Pembahasan:** 60 ÷ 4 = 15 km/liter. Dengan 7 liter: 15 × 7 = 105 km.

------------------------------------------------------------------------

## INDIKATOR 9 --- Rasio dan Perbandingan: Skala

**Kompetensi:** Menghitung jarak sebenarnya atau jarak pada peta
berdasarkan skala.

### Q025 --- Level 1 (Mudah)

Sebuah peta memiliki skala 1 : 100.000. Jika jarak pada peta 2 cm,
berapa jarak sebenarnya?

A. 200 m\
B. 1 km\
C. 2 km\
D. 20 km

**Kunci:** C\
**Pembahasan:** 2 × 100.000 cm = 200.000 cm = 2 km.

### Q026 --- Level 2 (Menengah)

Jarak sebenarnya dua kota adalah 15 km. Jika skala peta 1 : 500.000,
berapa jarak kedua kota pada peta?

A. 2 cm\
B. 3 cm\
C. 4 cm\
D. 5 cm

**Kunci:** B\
**Pembahasan:** 15 km = 1.500.000 cm. Jarak peta = 1.500.000 ÷ 500.000 =
3 cm.

### Q027 --- Level 3 (Menengah)

Jarak dua desa pada peta adalah 4,5 cm. Skala peta 1 : 200.000. Berapa
jarak sebenarnya kedua desa?

A. 4 km\
B. 8 km\
C. 9 km\
D. 12 km

**Kunci:** C\
**Pembahasan:** 4,5 × 200.000 = 900.000 cm = 9 km.

------------------------------------------------------------------------

## INDIKATOR 10 --- Aljabar: Variabel, Koefisien, dan Konstanta

**Kompetensi:** Mengidentifikasi variabel, koefisien, dan konstanta
dalam bentuk aljabar.

### Q028 --- Level 1 (Mudah)

Pada bentuk aljabar 5x + 7, yang merupakan variabel adalah ....

A. 5\
B. x\
C. 7\
D. 5x

**Kunci:** B\
**Pembahasan:** Variabel adalah lambang yang mewakili nilai yang belum
diketahui, yaitu x.

### Q029 --- Level 2 (Menengah)

Pada bentuk aljabar 8a − 3, berapakah koefisien dari a?

A. −3\
B. 3\
C. 8\
D. a

**Kunci:** C\
**Pembahasan:** Koefisien adalah bilangan yang mengalikan variabel,
yaitu 8.

### Q030 --- Level 3 (Menengah)

Pada bentuk aljabar 4x + 2y − 9, pasangan koefisien x dan konstanta
secara berurutan adalah ....

A. 4 dan −9\
B. 2 dan −9\
C. 4 dan 2\
D. 2 dan 9

**Kunci:** A\
**Pembahasan:** Koefisien x adalah 4, sedangkan konstanta adalah −9.

------------------------------------------------------------------------

## INDIKATOR 11 --- Aljabar: Bentuk Aljabar

**Kompetensi:** Menyederhanakan bentuk aljabar dan menerjemahkan situasi
sehari-hari ke dalam bentuk aljabar.

### Q031 --- Level 1 (Mudah)

Bentuk sederhana dari 3x + 2x adalah ....

A. 5\
B. 5x\
C. 6x\
D. x

**Kunci:** B\
**Pembahasan:** Suku sejenis dijumlahkan: 3x + 2x = 5x.

### Q032 --- Level 2 (Menengah)

Bentuk sederhana dari 5a + 3 − 2a + 4 adalah ....

A. 3a + 7\
B. 7a + 7\
C. 3a − 1\
D. 7a + 1

**Kunci:** A\
**Pembahasan:** 5a − 2a = 3a dan 3 + 4 = 7.

### Q033 --- Level 3 (Menengah)

Harga sebuah pensil adalah x rupiah. Harga sebuah buku adalah Rp2.000
lebih mahal daripada pensil. Jika seseorang membeli 3 pensil dan 2 buku,
bentuk aljabar total harganya adalah ....

A. 5x + 2.000\
B. 5x + 4.000\
C. 3x + 4.000\
D. 6x + 2.000

**Kunci:** B\
**Pembahasan:** 3 pensil = 3x. Dua buku = 2(x + 2.000). Total = 3x +
2x + 4.000 = 5x + 4.000.

------------------------------------------------------------------------

## INDIKATOR 12 --- Persamaan Linear Satu Variabel: Persamaan Sederhana

**Kompetensi:** Menentukan nilai variabel pada persamaan linear satu
variabel.

### Q034 --- Level 1 (Mudah)

Jika x + 5 = 12, berapakah nilai x?

A. 5\
B. 6\
C. 7\
D. 8

**Kunci:** C\
**Pembahasan:** x = 12 − 5 = 7.

### Q035 --- Level 2 (Menengah)

Nilai x yang memenuhi 3x = 24 adalah ....

A. 6\
B. 7\
C. 8\
D. 9

**Kunci:** C\
**Pembahasan:** x = 24 ÷ 3 = 8.

### Q036 --- Level 3 (Menengah)

Tiga kali suatu bilangan dikurangi 4 hasilnya 17. Berapakah bilangan
tersebut?

A. 5\
B. 6\
C. 7\
D. 8

**Kunci:** C\
**Pembahasan:** 3x − 4 = 17, sehingga 3x = 21 dan x = 7.

------------------------------------------------------------------------

## INDIKATOR 13 --- Pertidaksamaan Linear Satu Variabel

**Kompetensi:** Menyelesaikan pertidaksamaan dan menentukan nilai yang
memenuhi kondisi tertentu.

### Q037 --- Level 1 (Mudah)

Pertidaksamaan x + 3 \< 8 memiliki penyelesaian ....

A. x \< 5\
B. x \> 5\
C. x \< 11\
D. x \> 11

**Kunci:** A\
**Pembahasan:** Kurangi kedua ruas dengan 3, sehingga x \< 5.

### Q038 --- Level 2 (Menengah)

Jika 2x ≤ 12, bilangan bulat terbesar yang memenuhi pertidaksamaan
tersebut adalah ....

A. 4\
B. 5\
C. 6\
D. 7

**Kunci:** C\
**Pembahasan:** x ≤ 6. Bilangan bulat terbesar yang memenuhi adalah 6.

### Q039 --- Level 3 (Menengah)

Sebuah wahana hanya dapat dinaiki anak dengan tinggi minimal 120 cm.
Jika tinggi Dika adalah x cm, pertidaksamaan yang menyatakan syarat
tinggi Dika agar boleh naik adalah ....

A. x \< 120\
B. x \> 120\
C. x ≤ 120\
D. x ≥ 120

**Kunci:** D\
**Pembahasan:** Minimal 120 cm berarti tinggi harus sama dengan atau
lebih dari 120 cm, yaitu x ≥ 120.

------------------------------------------------------------------------

# BAGIAN III --- DATA SEED DAN QA BANK SOAL

## 1. Rekomendasi struktur data JSON

Setiap soal dapat disimpan dalam format berikut:

``` json
{
  "id": "Q001",
  "indicator_id": "IND-01",
  "category": "Bilangan bulat",
  "topic": "Operasi hitung",
  "difficulty": "easy",
  "question": "Suhu sebuah kota pada pagi hari adalah -3°C. Pada siang hari suhu meningkat 8°C. Berapakah suhu pada siang hari?",
  "options": {
    "A": "-11°C",
    "B": "5°C",
    "C": "-5°C",
    "D": "11°C"
  },
  "correct_option": "B",
  "explanation": "-3 + 8 = 5°C.",
  "points": 10,
  "recommended_time_seconds": 20,
  "is_active": true
}
```

Gunakan format yang sama untuk semua 39 soal. Kunci jawaban dan
pembahasan harus dilindungi dari akses Display sebelum soal selesai.

## 2. Checklist verifikasi sebelum bank soal dipakai

-   [ ] Seluruh 13 indikator tersedia.
-   [ ] Setiap indikator memiliki tiga soal.
-   [ ] Total soal tepat 39.
-   [ ] Setiap soal memiliki empat opsi.
-   [ ] Setiap soal hanya memiliki satu jawaban benar.
-   [ ] Kunci jawaban sesuai dengan hasil perhitungan.
-   [ ] Pembahasan sesuai dengan kunci.
-   [ ] Tidak ada soal duplikat.
-   [ ] Tidak ada satuan yang ambigu.
-   [ ] Soal dapat dibaca dengan nyaman di IFP.
-   [ ] Soal layak untuk simulasi 20 detik.

## 3. Catatan koreksi editorial

Bank soal ini merupakan draft awal yang harus melewati pemeriksaan
otomatis dan pemeriksaan guru sebelum digunakan dalam pertandingan
resmi.

Pemeriksaan khusus: - Q003: hasil perhitungan yang benar adalah 24 poin,
opsi B. Kunci final adalah **B**. - Pastikan format desimal, tanda
negatif, simbol pertidaksamaan, dan satuan tampil benar di browser. -
Untuk soal persentase dan skala, pertahankan penulisan angka dan satuan
secara konsisten. - Soal dapat direvisi tanpa mengubah ID jika hanya
teks atau opsi yang diperbaiki; perubahan substansial sebaiknya membuat
versi soal baru.

## 4. Rekomendasi pengujian bank soal

Buat automated validation yang memeriksa: - Jumlah soal = 39. - Jumlah
indikator = 13. - Jumlah soal per indikator = 3. - Jumlah opsi = 4. -
`correct_option` hanya salah satu dari A, B, C, D. - `difficulty` hanya
`easy` atau `medium`. - `points` berupa integer. - Semua ID unik. -
Semua `indicator_id` merujuk indikator yang tersedia.

**Akhir dokumen --- LCC ARENA PRD v1.0**
