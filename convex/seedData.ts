export const SEED_DATA = {
  "indicators": [
    {
      "id": "IND-01",
      "category": "Bilangan Bulat",
      "topic": "Operasi Hitung",
      "indicator_text": "Menyelesaikan operasi penjumlahan, pengurangan, perkalian, dan pembagian bilangan bulat dalam masalah sehari-hari.",
      "sort_order": 1
    },
    {
      "id": "IND-02",
      "category": "Bilangan Bulat",
      "topic": "Garis Bilangan",
      "indicator_text": "Menentukan posisi akhir objek berdasarkan perpindahan pada garis bilangan.",
      "sort_order": 2
    },
    {
      "id": "IND-03",
      "category": "Bilangan Bulat",
      "topic": "Perbandingan Bilangan",
      "indicator_text": "Membandingkan dan mengurutkan bilangan bulat.",
      "sort_order": 3
    },
    {
      "id": "IND-04",
      "category": "Bilangan Rasional",
      "topic": "Pecahan",
      "indicator_text": "Melakukan operasi hitung pecahan dan menyelesaikan masalah kontekstual.",
      "sort_order": 4
    },
    {
      "id": "IND-05",
      "category": "Bilangan Rasional",
      "topic": "Desimal",
      "indicator_text": "Menghitung penjumlahan dan pengurangan bilangan desimal dalam kehidupan sehari-hari.",
      "sort_order": 5
    },
    {
      "id": "IND-06",
      "category": "Bilangan Rasional",
      "topic": "Persen",
      "indicator_text": "Menentukan persentase, nilai persentase, dan bagian dari keseluruhan.",
      "sort_order": 6
    },
    {
      "id": "IND-07",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio",
      "indicator_text": "Menentukan rasio dua besaran dan menyederhanakannya.",
      "sort_order": 7
    },
    {
      "id": "IND-08",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio Senilai",
      "indicator_text": "Menentukan nilai yang belum diketahui dalam perbandingan senilai.",
      "sort_order": 8
    },
    {
      "id": "IND-09",
      "category": "Rasio dan Perbandingan",
      "topic": "Skala",
      "indicator_text": "Menghitung jarak sebenarnya atau jarak pada peta berdasarkan skala.",
      "sort_order": 9
    },
    {
      "id": "IND-10",
      "category": "Aljabar",
      "topic": "Variabel, Koefisien, dan Konstanta",
      "indicator_text": "Mengidentifikasi variabel, koefisien, dan konstanta dalam bentuk aljabar.",
      "sort_order": 10
    },
    {
      "id": "IND-11",
      "category": "Aljabar",
      "topic": "Bentuk Aljabar",
      "indicator_text": "Menyederhanakan bentuk aljabar dan menerjemahkan situasi sehari-hari ke dalam bentuk aljabar.",
      "sort_order": 11
    },
    {
      "id": "IND-12",
      "category": "Persamaan Linear Satu Variabel",
      "topic": "Persamaan Sederhana",
      "indicator_text": "Menentukan nilai variabel pada persamaan linear satu variabel.",
      "sort_order": 12
    },
    {
      "id": "IND-13",
      "category": "Pertidaksamaan Linear Satu Variabel",
      "topic": "Pertidaksamaan Sederhana",
      "indicator_text": "Menyelesaikan pertidaksamaan dan menentukan nilai yang memenuhi kondisi tertentu.",
      "sort_order": 13
    }
  ],
  "questions": [
    {
      "id": "Q001",
      "indicator_id": "IND-01",
      "category": "Bilangan Bulat",
      "topic": "Operasi Hitung",
      "level": 1,
      "difficulty": "easy",
      "question": "Suhu sebuah kota pada pagi hari adalah −3°C. Pada siang hari suhu meningkat 8°C. Berapakah suhu pada siang hari?",
      "options": {
        "A": "−11°C",
        "B": "5°C",
        "C": "−5°C",
        "D": "11°C"
      },
      "correct_option": "B",
      "explanation": "−3 + 8 = 5°C.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q002",
      "indicator_id": "IND-01",
      "category": "Bilangan Bulat",
      "topic": "Operasi Hitung",
      "level": 2,
      "difficulty": "medium",
      "question": "Sebuah lift berada di lantai 4. Lift turun 7 lantai, kemudian naik 5 lantai. Di lantai berapakah lift sekarang jika lantai dasar dinyatakan 0?",
      "options": {
        "A": "−2",
        "B": "0",
        "C": "2",
        "D": "6"
      },
      "correct_option": "C",
      "explanation": "4 − 7 + 5 = 2.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q003",
      "indicator_id": "IND-01",
      "category": "Bilangan Bulat",
      "topic": "Operasi Hitung",
      "level": 3,
      "difficulty": "medium",
      "question": "Dalam sebuah permainan, jawaban benar mendapat 6 poin dan jawaban salah mendapat −2 poin. Rani menjawab benar 5 kali dan salah 3 kali. Berapa total poin Rani?",
      "options": {
        "A": "20",
        "B": "24",
        "C": "26",
        "D": "36"
      },
      "correct_option": "B",
      "explanation": "(5 × 6) + (3 × −2) = 30 − 6 = 24.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q004",
      "indicator_id": "IND-02",
      "category": "Bilangan Bulat",
      "topic": "Garis Bilangan",
      "level": 1,
      "difficulty": "easy",
      "question": "Seekor semut berada di angka −2 pada garis bilangan. Semut bergerak 5 langkah ke kanan. Di angka berapakah semut berhenti?",
      "options": {
        "A": "−7",
        "B": "−3",
        "C": "3",
        "D": "7"
      },
      "correct_option": "C",
      "explanation": "−2 + 5 = 3.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q005",
      "indicator_id": "IND-02",
      "category": "Bilangan Bulat",
      "topic": "Garis Bilangan",
      "level": 2,
      "difficulty": "medium",
      "question": "Sebuah pion mulai dari angka 3. Pion bergerak 6 langkah ke kiri, lalu 2 langkah ke kanan. Di angka berapakah pion berhenti?",
      "options": {
        "A": "−5",
        "B": "−1",
        "C": "1",
        "D": "5"
      },
      "correct_option": "B",
      "explanation": "3 − 6 + 2 = −1.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q006",
      "indicator_id": "IND-02",
      "category": "Bilangan Bulat",
      "topic": "Garis Bilangan",
      "level": 3,
      "difficulty": "medium",
      "question": "Robot mulai di posisi −4. Robot bergerak 7 satuan ke kanan, kemudian bergerak 5 satuan ke kiri. Berapa jarak posisi akhir robot dari titik nol?",
      "options": {
        "A": "2 satuan",
        "B": "4 satuan",
        "C": "6 satuan",
        "D": "8 satuan"
      },
      "correct_option": "A",
      "explanation": "−4 + 7 − 5 = −2. Jarak dari nol adalah 2 satuan.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q007",
      "indicator_id": "IND-03",
      "category": "Bilangan Bulat",
      "topic": "Perbandingan Bilangan",
      "level": 1,
      "difficulty": "easy",
      "question": "Manakah bilangan yang paling besar?",
      "options": {
        "A": "−8",
        "B": "−3",
        "C": "−10",
        "D": "−5"
      },
      "correct_option": "B",
      "explanation": "Bilangan negatif yang paling dekat dengan nol adalah yang terbesar.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q008",
      "indicator_id": "IND-03",
      "category": "Bilangan Bulat",
      "topic": "Perbandingan Bilangan",
      "level": 2,
      "difficulty": "medium",
      "question": "Urutan bilangan −4, 2, −1, 5 dari yang terkecil adalah ....",
      "options": {
        "A": "−4, −1, 2, 5",
        "B": "−1, −4, 2, 5",
        "C": "5, 2, −1, −4",
        "D": "−4, 2, −1, 5"
      },
      "correct_option": "A",
      "explanation": "Bilangan negatif yang lebih jauh dari nol lebih kecil, sehingga urutannya −4, −1, 2, 5.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q009",
      "indicator_id": "IND-03",
      "category": "Bilangan Bulat",
      "topic": "Perbandingan Bilangan",
      "level": 3,
      "difficulty": "medium",
      "question": "Empat kota memiliki suhu berikut: Kota P = −2°C, Q = 3°C, R = −5°C, dan S = 0°C. Kota yang memiliki suhu paling rendah adalah ....",
      "options": {
        "A": "Kota P",
        "B": "Kota Q",
        "C": "Kota R",
        "D": "Kota S"
      },
      "correct_option": "C",
      "explanation": "−5°C adalah suhu paling rendah.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q010",
      "indicator_id": "IND-04",
      "category": "Bilangan Rasional",
      "topic": "Pecahan",
      "level": 1,
      "difficulty": "easy",
      "question": "Ibu memiliki 1/2 kg gula. Ibu membeli lagi 1/4 kg. Berapa kilogram gula ibu sekarang?",
      "options": {
        "A": "1/4 kg",
        "B": "2/4 kg",
        "C": "3/4 kg",
        "D": "1 kg"
      },
      "correct_option": "C",
      "explanation": "1/2 + 1/4 = 2/4 + 1/4 = 3/4 kg.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q011",
      "indicator_id": "IND-04",
      "category": "Bilangan Rasional",
      "topic": "Pecahan",
      "level": 2,
      "difficulty": "medium",
      "question": "Sebuah kue dipotong menjadi 8 bagian sama besar. Andi memakan 3/8 bagian dan Budi memakan 2/8 bagian. Berapa bagian kue yang tersisa?",
      "options": {
        "A": "1/8",
        "B": "3/8",
        "C": "5/8",
        "D": "7/8"
      },
      "correct_option": "B",
      "explanation": "8/8 − 3/8 − 2/8 = 3/8.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q012",
      "indicator_id": "IND-04",
      "category": "Bilangan Rasional",
      "topic": "Pecahan",
      "level": 3,
      "difficulty": "medium",
      "question": "Sebuah tangki terisi 3/4 bagian. Kemudian digunakan 1/3 dari kapasitas penuh tangki. Berapa bagian kapasitas tangki yang masih terisi?",
      "options": {
        "A": "1/4",
        "B": "5/12",
        "C": "7/12",
        "D": "2/3"
      },
      "correct_option": "B",
      "explanation": "3/4 − 1/3 = 9/12 − 4/12 = 5/12.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q013",
      "indicator_id": "IND-05",
      "category": "Bilangan Rasional",
      "topic": "Desimal",
      "level": 1,
      "difficulty": "easy",
      "question": "Dina membeli pita sepanjang 1,5 meter dan 2,25 meter. Berapa panjang seluruh pita?",
      "options": {
        "A": "3,25 m",
        "B": "3,50 m",
        "C": "3,75 m",
        "D": "4,25 m"
      },
      "correct_option": "C",
      "explanation": "1,50 + 2,25 = 3,75 meter.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q014",
      "indicator_id": "IND-05",
      "category": "Bilangan Rasional",
      "topic": "Desimal",
      "level": 2,
      "difficulty": "medium",
      "question": "Berat sebuah paket 4,8 kg. Setelah sebagian isinya dikeluarkan, beratnya berkurang 1,35 kg. Berapa berat paket sekarang?",
      "options": {
        "A": "3,35 kg",
        "B": "3,45 kg",
        "C": "3,55 kg",
        "D": "3,65 kg"
      },
      "correct_option": "B",
      "explanation": "4,80 − 1,35 = 3,45 kg.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q015",
      "indicator_id": "IND-05",
      "category": "Bilangan Rasional",
      "topic": "Desimal",
      "level": 3,
      "difficulty": "medium",
      "question": "Rina memiliki uang Rp20.000. Ia membeli pensil seharga Rp3.500 dan buku seharga Rp8.750. Berapa uang kembaliannya?",
      "options": {
        "A": "Rp7.250",
        "B": "Rp7.500",
        "C": "Rp7.750",
        "D": "Rp8.250"
      },
      "correct_option": "C",
      "explanation": "Rp20.000 − Rp3.500 − Rp8.750 = Rp7.750.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q016",
      "indicator_id": "IND-06",
      "category": "Bilangan Rasional",
      "topic": "Persen",
      "level": 1,
      "difficulty": "easy",
      "question": "Dari 100 siswa, 35 siswa mengikuti klub matematika. Berapa persentase siswa yang mengikuti klub tersebut?",
      "options": {
        "A": "25%",
        "B": "30%",
        "C": "35%",
        "D": "45%"
      },
      "correct_option": "C",
      "explanation": "35/100 × 100% = 35%.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q017",
      "indicator_id": "IND-06",
      "category": "Bilangan Rasional",
      "topic": "Persen",
      "level": 2,
      "difficulty": "medium",
      "question": "Sebuah tas berharga Rp80.000 mendapat diskon 25%. Berapa rupiah potongan harganya?",
      "options": {
        "A": "Rp10.000",
        "B": "Rp15.000",
        "C": "Rp20.000",
        "D": "Rp25.000"
      },
      "correct_option": "C",
      "explanation": "25% × Rp80.000 = Rp20.000.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q018",
      "indicator_id": "IND-06",
      "category": "Bilangan Rasional",
      "topic": "Persen",
      "level": 3,
      "difficulty": "medium",
      "question": "Dalam sebuah kelas terdapat 40 siswa. Sebanyak 60% adalah perempuan. Berapa jumlah siswa laki-laki?",
      "options": {
        "A": "12 siswa",
        "B": "16 siswa",
        "C": "20 siswa",
        "D": "24 siswa"
      },
      "correct_option": "B",
      "explanation": "Jumlah perempuan = 60% × 40 = 24. Laki-laki = 40 − 24 = 16 siswa.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q019",
      "indicator_id": "IND-07",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio",
      "level": 1,
      "difficulty": "easy",
      "question": "Di sebuah kotak terdapat 6 bola merah dan 9 bola biru. Rasio bola merah terhadap bola biru dalam bentuk paling sederhana adalah ....",
      "options": {
        "A": "2 : 3",
        "B": "3 : 2",
        "C": "2 : 5",
        "D": "3 : 5"
      },
      "correct_option": "A",
      "explanation": "6 : 9 dibagi 3 menjadi 2 : 3.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q020",
      "indicator_id": "IND-07",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio",
      "level": 2,
      "difficulty": "medium",
      "question": "Perbandingan jumlah siswa laki-laki dan perempuan adalah 3 : 4. Jika jumlah siswa laki-laki 15 orang, berapa jumlah siswa perempuan?",
      "options": {
        "A": "16",
        "B": "18",
        "C": "20",
        "D": "24"
      },
      "correct_option": "C",
      "explanation": "3 bagian = 15, maka 1 bagian = 5. Perempuan = 4 × 5 = 20.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q021",
      "indicator_id": "IND-07",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio",
      "level": 3,
      "difficulty": "medium",
      "question": "Perbandingan uang Ali dan Bima adalah 2 : 5. Jika jumlah uang mereka Rp84.000, berapa uang Bima?",
      "options": {
        "A": "Rp24.000",
        "B": "Rp36.000",
        "C": "Rp48.000",
        "D": "Rp60.000"
      },
      "correct_option": "D",
      "explanation": "Total bagian = 2 + 5 = 7. Satu bagian = Rp84.000 ÷ 7 = Rp12.000. Uang Bima = 5 × Rp12.000 = Rp60.000.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q022",
      "indicator_id": "IND-08",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio Senilai",
      "level": 1,
      "difficulty": "easy",
      "question": "Harga 2 buku tulis adalah Rp10.000. Berapa harga 4 buku tulis dengan harga satuan yang sama?",
      "options": {
        "A": "Rp15.000",
        "B": "Rp20.000",
        "C": "Rp25.000",
        "D": "Rp30.000"
      },
      "correct_option": "B",
      "explanation": "Harga satu buku Rp5.000, sehingga 4 buku = Rp20.000.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q023",
      "indicator_id": "IND-08",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio Senilai",
      "level": 2,
      "difficulty": "medium",
      "question": "Untuk membuat 4 gelas minuman diperlukan 8 sendok gula. Berapa sendok gula yang diperlukan untuk membuat 10 gelas dengan rasa yang sama?",
      "options": {
        "A": "16",
        "B": "18",
        "C": "20",
        "D": "24"
      },
      "correct_option": "C",
      "explanation": "8 ÷ 4 = 2 sendok per gelas. Untuk 10 gelas diperlukan 20 sendok.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q024",
      "indicator_id": "IND-08",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio Senilai",
      "level": 3,
      "difficulty": "medium",
      "question": "Sebuah kendaraan menempuh jarak 60 km dengan 4 liter bensin. Jika konsumsi bensin tetap, berapa jarak yang dapat ditempuh dengan 7 liter bensin?",
      "options": {
        "A": "90 km",
        "B": "100 km",
        "C": "105 km",
        "D": "120 km"
      },
      "correct_option": "C",
      "explanation": "60 ÷ 4 = 15 km/liter. Dengan 7 liter: 15 × 7 = 105 km.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q025",
      "indicator_id": "IND-09",
      "category": "Rasio dan Perbandingan",
      "topic": "Skala",
      "level": 1,
      "difficulty": "easy",
      "question": "Sebuah peta memiliki skala 1 : 100.000. Jika jarak pada peta 2 cm, berapa jarak sebenarnya?",
      "options": {
        "A": "200 m",
        "B": "1 km",
        "C": "2 km",
        "D": "20 km"
      },
      "correct_option": "C",
      "explanation": "2 × 100.000 cm = 200.000 cm = 2 km.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q026",
      "indicator_id": "IND-09",
      "category": "Rasio dan Perbandingan",
      "topic": "Skala",
      "level": 2,
      "difficulty": "medium",
      "question": "Jarak sebenarnya dua kota adalah 15 km. Jika skala peta 1 : 500.000, berapa jarak kedua kota pada peta?",
      "options": {
        "A": "2 cm",
        "B": "3 cm",
        "C": "4 cm",
        "D": "5 cm"
      },
      "correct_option": "B",
      "explanation": "15 km = 1.500.000 cm. Jarak peta = 1.500.000 ÷ 500.000 = 3 cm.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q027",
      "indicator_id": "IND-09",
      "category": "Rasio dan Perbandingan",
      "topic": "Skala",
      "level": 3,
      "difficulty": "medium",
      "question": "Jarak dua desa pada peta adalah 4,5 cm. Skala peta 1 : 200.000. Berapa jarak sebenarnya kedua desa?",
      "options": {
        "A": "4 km",
        "B": "8 km",
        "C": "9 km",
        "D": "12 km"
      },
      "correct_option": "C",
      "explanation": "4,5 × 200.000 = 900.000 cm = 9 km.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q028",
      "indicator_id": "IND-10",
      "category": "Aljabar",
      "topic": "Variabel, Koefisien, dan Konstanta",
      "level": 1,
      "difficulty": "easy",
      "question": "Pada bentuk aljabar 5x + 7, yang merupakan variabel adalah ....",
      "options": {
        "A": "5",
        "B": "x",
        "C": "7",
        "D": "5x"
      },
      "correct_option": "B",
      "explanation": "Variabel adalah lambang yang mewakili nilai yang belum diketahui, yaitu x.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q029",
      "indicator_id": "IND-10",
      "category": "Aljabar",
      "topic": "Variabel, Koefisien, dan Konstanta",
      "level": 2,
      "difficulty": "medium",
      "question": "Pada bentuk aljabar 8a − 3, berapakah koefisien dari a?",
      "options": {
        "A": "−3",
        "B": "3",
        "C": "8",
        "D": "a"
      },
      "correct_option": "C",
      "explanation": "Koefisien adalah bilangan yang mengalikan variabel, yaitu 8.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q030",
      "indicator_id": "IND-10",
      "category": "Aljabar",
      "topic": "Variabel, Koefisien, dan Konstanta",
      "level": 3,
      "difficulty": "medium",
      "question": "Pada bentuk aljabar 4x + 2y − 9, pasangan koefisien x dan konstanta secara berurutan adalah ....",
      "options": {
        "A": "4 dan −9",
        "B": "2 dan −9",
        "C": "4 dan 2",
        "D": "2 dan 9"
      },
      "correct_option": "A",
      "explanation": "Koefisien x adalah 4, sedangkan konstanta adalah −9.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q031",
      "indicator_id": "IND-11",
      "category": "Aljabar",
      "topic": "Bentuk Aljabar",
      "level": 1,
      "difficulty": "easy",
      "question": "Bentuk sederhana dari 3x + 2x adalah ....",
      "options": {
        "A": "5",
        "B": "5x",
        "C": "6x",
        "D": "x"
      },
      "correct_option": "B",
      "explanation": "Suku sejenis dijumlahkan: 3x + 2x = 5x.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q032",
      "indicator_id": "IND-11",
      "category": "Aljabar",
      "topic": "Bentuk Aljabar",
      "level": 2,
      "difficulty": "medium",
      "question": "Bentuk sederhana dari 5a + 3 − 2a + 4 adalah ....",
      "options": {
        "A": "3a + 7",
        "B": "7a + 7",
        "C": "3a − 1",
        "D": "7a + 1"
      },
      "correct_option": "A",
      "explanation": "5a − 2a = 3a dan 3 + 4 = 7.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q033",
      "indicator_id": "IND-11",
      "category": "Aljabar",
      "topic": "Bentuk Aljabar",
      "level": 3,
      "difficulty": "medium",
      "question": "Harga sebuah pensil adalah x rupiah. Harga sebuah buku adalah Rp2.000 lebih mahal daripada pensil. Jika seseorang membeli 3 pensil dan 2 buku, bentuk aljabar total harganya adalah ....",
      "options": {
        "A": "5x + 2.000",
        "B": "5x + 4.000",
        "C": "3x + 4.000",
        "D": "6x + 2.000"
      },
      "correct_option": "B",
      "explanation": "3 pensil = 3x. Dua buku = 2(x + 2.000). Total = 3x + 2x + 4.000 = 5x + 4.000.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q034",
      "indicator_id": "IND-12",
      "category": "Persamaan Linear Satu Variabel",
      "topic": "Persamaan Sederhana",
      "level": 1,
      "difficulty": "easy",
      "question": "Jika x + 5 = 12, berapakah nilai x?",
      "options": {
        "A": "5",
        "B": "6",
        "C": "7",
        "D": "8"
      },
      "correct_option": "C",
      "explanation": "x = 12 − 5 = 7.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q035",
      "indicator_id": "IND-12",
      "category": "Persamaan Linear Satu Variabel",
      "topic": "Persamaan Sederhana",
      "level": 2,
      "difficulty": "medium",
      "question": "Nilai x yang memenuhi 3x = 24 adalah ....",
      "options": {
        "A": "6",
        "B": "7",
        "C": "8",
        "D": "9"
      },
      "correct_option": "C",
      "explanation": "x = 24 ÷ 3 = 8.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q036",
      "indicator_id": "IND-12",
      "category": "Persamaan Linear Satu Variabel",
      "topic": "Persamaan Sederhana",
      "level": 3,
      "difficulty": "medium",
      "question": "Tiga kali suatu bilangan dikurangi 4 hasilnya 17. Berapakah bilangan tersebut?",
      "options": {
        "A": "5",
        "B": "6",
        "C": "7",
        "D": "8"
      },
      "correct_option": "C",
      "explanation": "3x − 4 = 17, sehingga 3x = 21 dan x = 7.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q037",
      "indicator_id": "IND-13",
      "category": "Pertidaksamaan Linear Satu Variabel",
      "topic": "Pertidaksamaan Sederhana",
      "level": 1,
      "difficulty": "easy",
      "question": "Pertidaksamaan x + 3 < 8 memiliki penyelesaian ....",
      "options": {
        "A": "x < 5",
        "B": "x > 5",
        "C": "x < 11",
        "D": "x > 11"
      },
      "correct_option": "A",
      "explanation": "Kurangi kedua ruas dengan 3, sehingga x < 5.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q038",
      "indicator_id": "IND-13",
      "category": "Pertidaksamaan Linear Satu Variabel",
      "topic": "Pertidaksamaan Sederhana",
      "level": 2,
      "difficulty": "medium",
      "question": "Jika 2x ≤ 12, bilangan bulat terbesar yang memenuhi pertidaksamaan tersebut adalah ....",
      "options": {
        "A": "4",
        "B": "5",
        "C": "6",
        "D": "7"
      },
      "correct_option": "C",
      "explanation": "x ≤ 6. Bilangan bulat terbesar yang memenuhi adalah 6.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q039",
      "indicator_id": "IND-13",
      "category": "Pertidaksamaan Linear Satu Variabel",
      "topic": "Pertidaksamaan Sederhana",
      "level": 3,
      "difficulty": "medium",
      "question": "Sebuah wahana hanya dapat dinaiki anak dengan tinggi minimal 120 cm. Jika tinggi Dika adalah x cm, pertidaksamaan yang menyatakan syarat tinggi Dika agar boleh naik adalah ....",
      "options": {
        "A": "x < 120",
        "B": "x > 120",
        "C": "x ≤ 120",
        "D": "x ≥ 120"
      },
      "correct_option": "D",
      "explanation": "Minimal 120 cm berarti tinggi harus sama dengan atau lebih dari 120 cm, yaitu x ≥ 120.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q040",
      "indicator_id": "IND-01",
      "category": "Bilangan Bulat",
      "topic": "Operasi Hitung",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Saldo awal kartu uang elektronik Raka adalah Rp18.000. Ia mengisi saldo Rp50.000, kemudian membayar tiga kali perjalanan dengan biaya Rp12.000 setiap perjalanan. Berapa saldo akhirnya?",
      "options": {
        "A": "Rp22.000",
        "B": "Rp28.000",
        "C": "Rp32.000",
        "D": "Rp36.000"
      },
      "correct_option": "C",
      "explanation": "18.000 + 50.000 − (3 × 12.000) = 68.000 − 36.000 = Rp32.000.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q041",
      "indicator_id": "IND-01",
      "category": "Bilangan Bulat",
      "topic": "Operasi Hitung",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Dalam sebuah kuis, jawaban benar bernilai +8, jawaban salah bernilai −3, dan tidak menjawab bernilai 0. Dimas menjawab benar 7 soal, salah 4 soal, dan tidak menjawab 2 soal. Berapa skor Dimas?",
      "options": {
        "A": "40",
        "B": "42",
        "C": "44",
        "D": "48"
      },
      "correct_option": "C",
      "explanation": "(7 × 8) + (4 × −3) + (2 × 0) = 56 − 12 = 44 poin.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q042",
      "indicator_id": "IND-02",
      "category": "Bilangan Bulat",
      "topic": "Garis Bilangan",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Sebuah robot berada pada posisi −7. Robot bergerak 12 satuan ke kanan, kemudian 4 satuan ke kiri. Di posisi berapakah robot sekarang?",
      "options": {
        "A": "−1",
        "B": "1",
        "C": "5",
        "D": "9"
      },
      "correct_option": "B",
      "explanation": "−7 + 12 − 4 = 1.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q043",
      "indicator_id": "IND-02",
      "category": "Bilangan Bulat",
      "topic": "Garis Bilangan",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Sebuah pion mulai pada posisi 6. Pion bergerak ke kiri sebanyak 3 kali, setiap gerakan sejauh 4 satuan. Setelah itu pion bergerak ke kanan sebanyak 2 kali, setiap gerakan sejauh 5 satuan. Berapa jarak posisi akhir pion dari titik awal?",
      "options": {
        "A": "0 satuan",
        "B": "2 satuan",
        "C": "4 satuan",
        "D": "8 satuan"
      },
      "correct_option": "B",
      "explanation": "Posisi akhir = 6 − (3 × 4) + (2 × 5) = 4. Jarak dari posisi awal 6 adalah |4 − 6| = 2 satuan.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q044",
      "indicator_id": "IND-03",
      "category": "Bilangan Bulat",
      "topic": "Perbandingan Bilangan",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Empat kota mencatat suhu berikut: Kota A = −6°C, Kota B = −2°C, Kota C = 3°C, dan Kota D = −9°C. Urutan kota dari suhu paling rendah ke paling tinggi adalah ....",
      "options": {
        "A": "D, A, B, C",
        "B": "A, D, B, C",
        "C": "D, B, A, C",
        "D": "C, B, A, D"
      },
      "correct_option": "A",
      "explanation": "Urutan bilangan dari terkecil adalah −9, −6, −2, 3. Jadi urutannya D, A, B, C.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q045",
      "indicator_id": "IND-03",
      "category": "Bilangan Bulat",
      "topic": "Perbandingan Bilangan",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Diketahui empat bilangan bulat: P = −12, Q = −(−8), R = 3 − 15, dan S = −5. Pernyataan yang benar adalah ....",
      "options": {
        "A": "P < R < S < Q",
        "B": "R < P < S < Q",
        "C": "P = R < S < Q",
        "D": "S < P = R < Q"
      },
      "correct_option": "C",
      "explanation": "P = −12, Q = 8, R = −12, dan S = −5. Jadi P = R < S < Q.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q046",
      "indicator_id": "IND-04",
      "category": "Bilangan Rasional",
      "topic": "Pecahan",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Sebuah wadah berisi 3/4 liter sirup. Sebanyak 2/5 liter digunakan untuk membuat minuman. Berapa liter sirup yang tersisa?",
      "options": {
        "A": "5/20 liter",
        "B": "7/20 liter",
        "C": "9/20 liter",
        "D": "11/20 liter"
      },
      "correct_option": "B",
      "explanation": "3/4 − 2/5 = 15/20 − 8/20 = 7/20 liter.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q047",
      "indicator_id": "IND-04",
      "category": "Bilangan Rasional",
      "topic": "Pecahan",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Sebuah tangki mula-mula terisi 2/3 bagian. Kemudian air sebanyak 1/4 kapasitas tangki digunakan. Setelah itu, tangki diisi lagi sebanyak 1/6 kapasitas penuh. Berapa bagian tangki yang terisi sekarang?",
      "options": {
        "A": "5/12",
        "B": "1/2",
        "C": "7/12",
        "D": "3/4"
      },
      "correct_option": "C",
      "explanation": "2/3 − 1/4 + 1/6 = 8/12 − 3/12 + 2/12 = 7/12.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q048",
      "indicator_id": "IND-05",
      "category": "Bilangan Rasional",
      "topic": "Desimal",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Tiga potong pita memiliki panjang 2,75 m, 1,8 m, dan 3,45 m. Jika seluruh pita disambungkan, berapa panjangnya?",
      "options": {
        "A": "7,5 m",
        "B": "7,8 m",
        "C": "8,0 m",
        "D": "8,2 m"
      },
      "correct_option": "C",
      "explanation": "2,75 + 1,80 + 3,45 = 8,00 meter.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q049",
      "indicator_id": "IND-05",
      "category": "Bilangan Rasional",
      "topic": "Desimal",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Sebuah galon berisi 19,5 liter air. Pagi hari digunakan 3,75 liter dan siang hari digunakan lagi 4,8 liter. Berapa liter air yang tersisa?",
      "options": {
        "A": "10,75 liter",
        "B": "10,85 liter",
        "C": "10,95 liter",
        "D": "11,05 liter"
      },
      "correct_option": "C",
      "explanation": "19,50 − 3,75 − 4,80 = 10,95 liter.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q050",
      "indicator_id": "IND-06",
      "category": "Bilangan Rasional",
      "topic": "Persen",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Sebuah jaket berharga Rp240.000 mendapat diskon 15%. Berapa harga jaket setelah diskon?",
      "options": {
        "A": "Rp196.000",
        "B": "Rp200.000",
        "C": "Rp204.000",
        "D": "Rp216.000"
      },
      "correct_option": "C",
      "explanation": "Diskon = 15% × 240.000 = 36.000. Harga akhir = 240.000 − 36.000 = Rp204.000.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q051",
      "indicator_id": "IND-06",
      "category": "Bilangan Rasional",
      "topic": "Persen",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Harga sebuah sepatu adalah Rp250.000. Toko memberikan diskon 20%, kemudian memberikan diskon tambahan 10% dari harga setelah diskon pertama. Berapa harga yang harus dibayar?",
      "options": {
        "A": "Rp175.000",
        "B": "Rp180.000",
        "C": "Rp185.000",
        "D": "Rp200.000"
      },
      "correct_option": "B",
      "explanation": "Setelah diskon pertama: 250.000 × 80% = 200.000. Setelah diskon kedua: 200.000 × 90% = Rp180.000. Diskon bertingkat tidak sama dengan menjumlahkan 20% + 10%.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q052",
      "indicator_id": "IND-07",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Perbandingan jumlah buku cerita dan buku pengetahuan di perpustakaan adalah 5 : 3. Jika jumlah seluruh buku tersebut 64 buah, berapa jumlah buku cerita?",
      "options": {
        "A": "24 buku",
        "B": "32 buku",
        "C": "40 buku",
        "D": "48 buku"
      },
      "correct_option": "C",
      "explanation": "Total bagian = 5 + 3 = 8. Satu bagian = 64 ÷ 8 = 8. Buku cerita = 5 × 8 = 40 buku.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q053",
      "indicator_id": "IND-07",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Perbandingan uang Ani dan Budi adalah 3 : 4. Selisih uang mereka Rp18.000. Berapa jumlah uang Ani dan Budi seluruhnya?",
      "options": {
        "A": "Rp108.000",
        "B": "Rp112.000",
        "C": "Rp126.000",
        "D": "Rp144.000"
      },
      "correct_option": "C",
      "explanation": "Selisih bagian = 4 − 3 = 1 bagian = Rp18.000. Total bagian = 7, sehingga jumlah uang = 7 × Rp18.000 = Rp126.000.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q054",
      "indicator_id": "IND-08",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio Senilai",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Enam pekerja dapat menyelesaikan 90 paket dalam waktu yang sama. Jika kemampuan setiap pekerja sama, berapa paket yang dapat diselesaikan oleh 10 pekerja dalam waktu tersebut?",
      "options": {
        "A": "120 paket",
        "B": "135 paket",
        "C": "150 paket",
        "D": "180 paket"
      },
      "correct_option": "C",
      "explanation": "90 ÷ 6 = 15 paket per pekerja. Untuk 10 pekerja: 10 × 15 = 150 paket.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q055",
      "indicator_id": "IND-08",
      "category": "Rasio dan Perbandingan",
      "topic": "Rasio Senilai",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Untuk persediaan selama 5 hari, 8 ekor sapi membutuhkan total 12 kg pakan. Jika jumlah sapi menjadi 12 ekor dan persediaan harus cukup untuk 10 hari, berapa kilogram pakan yang diperlukan dengan kebutuhan per ekor per hari tetap?",
      "options": {
        "A": "24 kg",
        "B": "30 kg",
        "C": "36 kg",
        "D": "48 kg"
      },
      "correct_option": "C",
      "explanation": "Kebutuhan per ekor per hari = 12 kg ÷ (8 × 5) = 0,3 kg. Untuk 12 sapi selama 10 hari: 12 × 10 × 0,3 = 36 kg.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q056",
      "indicator_id": "IND-09",
      "category": "Rasio dan Perbandingan",
      "topic": "Skala",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Jarak dua kota pada peta adalah 7,2 cm. Jika skala peta 1 : 250.000, berapa jarak sebenarnya kedua kota?",
      "options": {
        "A": "12 km",
        "B": "15 km",
        "C": "18 km",
        "D": "20 km"
      },
      "correct_option": "C",
      "explanation": "7,2 × 250.000 = 1.800.000 cm = 18 km.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q057",
      "indicator_id": "IND-09",
      "category": "Rasio dan Perbandingan",
      "topic": "Skala",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Sebuah rute pada peta terdiri atas dua ruas jalan dengan panjang 3,5 cm dan 2,75 cm. Jika skala peta 1 : 400.000, berapa panjang seluruh rute sebenarnya?",
      "options": {
        "A": "20 km",
        "B": "22 km",
        "C": "25 km",
        "D": "27 km"
      },
      "correct_option": "C",
      "explanation": "Panjang pada peta = 3,5 + 2,75 = 6,25 cm. Jarak sebenarnya = 6,25 × 400.000 = 2.500.000 cm = 25 km.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q058",
      "indicator_id": "IND-10",
      "category": "Aljabar",
      "topic": "Variabel, Koefisien, dan Konstanta",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Pada bentuk aljabar 7p − 3q + 12, pasangan koefisien q dan konstanta secara berurutan adalah ....",
      "options": {
        "A": "−3 dan 12",
        "B": "3 dan 12",
        "C": "7 dan −3",
        "D": "7 dan 12"
      },
      "correct_option": "A",
      "explanation": "Koefisien q adalah −3 karena q dikalikan −3. Konstanta adalah 12.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q059",
      "indicator_id": "IND-10",
      "category": "Aljabar",
      "topic": "Variabel, Koefisien, dan Konstanta",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Bentuk aljabar 4(2x − 3) − 3(x + 5) + 7 disederhanakan menjadi ....",
      "options": {
        "A": "5x − 20",
        "B": "5x − 10",
        "C": "11x − 20",
        "D": "11x − 10"
      },
      "correct_option": "A",
      "explanation": "8x − 12 − 3x − 15 + 7 = 5x − 20. Koefisien x adalah 5 dan konstantanya −20.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q060",
      "indicator_id": "IND-11",
      "category": "Aljabar",
      "topic": "Bentuk Aljabar",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Bentuk sederhana dari 3(2x − 4) + 2(x + 5) adalah ....",
      "options": {
        "A": "6x − 2",
        "B": "8x − 2",
        "C": "8x + 2",
        "D": "10x − 2"
      },
      "correct_option": "B",
      "explanation": "6x − 12 + 2x + 10 = 8x − 2.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q061",
      "indicator_id": "IND-11",
      "category": "Aljabar",
      "topic": "Bentuk Aljabar",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Sebuah taman berbentuk persegi panjang memiliki panjang (2x + 3) meter dan lebar (x − 1) meter. Bentuk aljabar sederhana untuk keliling taman adalah ....",
      "options": {
        "A": "3x + 2",
        "B": "6x + 2",
        "C": "6x + 4",
        "D": "8x + 4"
      },
      "correct_option": "C",
      "explanation": "Keliling = 2(panjang + lebar) = 2[(2x + 3) + (x − 1)] = 2(3x + 2) = 6x + 4.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q062",
      "indicator_id": "IND-12",
      "category": "Persamaan Linear Satu Variabel",
      "topic": "Persamaan Sederhana",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Empat kali suatu bilangan ditambah 7 sama dengan 31. Berapakah bilangan tersebut?",
      "options": {
        "A": "5",
        "B": "6",
        "C": "7",
        "D": "8"
      },
      "correct_option": "B",
      "explanation": "4x + 7 = 31. Maka 4x = 24 dan x = 6.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q063",
      "indicator_id": "IND-12",
      "category": "Persamaan Linear Satu Variabel",
      "topic": "Persamaan Sederhana",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Tiga kali selisih suatu bilangan dan 2, kemudian ditambah 5, hasilnya sama dengan dua kali bilangan tersebut ditambah 11. Berapakah bilangan itu?",
      "options": {
        "A": "9",
        "B": "10",
        "C": "11",
        "D": "12"
      },
      "correct_option": "D",
      "explanation": "3(x − 2) + 5 = 2x + 11. Maka 3x − 6 + 5 = 2x + 11, sehingga 3x − 1 = 2x + 11 dan x = 12.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    },
    {
      "id": "Q064",
      "indicator_id": "IND-13",
      "category": "Pertidaksamaan Linear Satu Variabel",
      "topic": "Pertidaksamaan Sederhana",
      "level": 2,
      "difficulty": "medium",
      "bank": "ADVANCED",
      "question": "Penyelesaian dari pertidaksamaan 5x − 4 ≤ 21 adalah ....",
      "options": {
        "A": "x ≤ 5",
        "B": "x ≥ 5",
        "C": "x ≤ 17",
        "D": "x ≥ 17"
      },
      "correct_option": "A",
      "explanation": "5x − 4 ≤ 21, sehingga 5x ≤ 25 dan x ≤ 5.",
      "points": 10,
      "recommended_time_seconds": 20,
      "is_active": true
    },
    {
      "id": "Q065",
      "indicator_id": "IND-13",
      "category": "Pertidaksamaan Linear Satu Variabel",
      "topic": "Pertidaksamaan Sederhana",
      "level": 3,
      "difficulty": "hard",
      "bank": "ADVANCED",
      "question": "Sebuah kelompok memiliki anggaran maksimal Rp57.000 untuk membeli tiket masuk. Biaya tetap administrasi adalah Rp12.000, sedangkan harga setiap tiket Rp3.000. Jika x menyatakan banyak tiket yang dibeli, berapa jumlah tiket terbanyak yang dapat dibeli?",
      "options": {
        "A": "12 tiket",
        "B": "13 tiket",
        "C": "15 tiket",
        "D": "19 tiket"
      },
      "correct_option": "C",
      "explanation": "3.000x + 12.000 ≤ 57.000. Maka 3.000x ≤ 45.000, sehingga x ≤ 15. Jumlah terbanyak adalah 15 tiket.",
      "points": 20,
      "recommended_time_seconds": 25,
      "is_active": true
    }
  ]
};
