# 🎬 Video Script — "Membangun Enterprise DXP dengan Astro + Strapi + Supabase"

**Proyek:** NovaSphere Enterprise DXP
**Durasi target:** ± 11 menit
**Bahasa:** Indonesia (istilah teknis tetap bahasa Inggris)
**Struktur:** One Real Project → Architecture & Decisions → Challenges & Results

> [!NOTE]
> Format `[VISUAL: ...]` = saran gambar/klip yang direkam/diedit. `(—bicara sambil—)` = bahasa tubuh.
> Kamu bisa merekam demo langsung dari server lokal: frontend di `localhost:4321`, dashboard admin Strapi di `localhost:1337/admin`.

---

## 🎣 HOOK — Pembuka (0:00–0:45)

**Narasi:**

> Pernah nggak sih, kamu harus pilih antara website yang super cepat, tapi susah diupdate — atau website yang gampang dikelola tim konten, tapi lambat dan mahal infrastrukturnya?
>
> Di proyek ini, aku membangun sebuah platform yang mencoba menjawab tiga tuntutan sekaligus: **cepat secara global, mudah dikelola editor, dan kuat di bawah beban**. Namanya **NovaSphere** — sebuah Enterprise Digital Experience Platform yang kubangun dengan **Astro, Strapi Headless CMS, Supabase PostgreSQL, dan Vercel Edge**.
>
> Di video ini aku akan cerita: proyeknya seperti apa, keputusan arsitektur yang kuambil dan kenapa, plus tantangan serta hasil yang kudapat. Let's go.

**[VISUAL: potongan cepat website NovaSphere — hero dengan glow animasi, scroll halaman, buka-tutup Cmd+K, dashboard admin]** 

---

## PART 1 — ONE REAL PROJECT (0:45–3:30)

### 1.1 Masalah yang mau dipecahkan (0:45–1:45)

**Narasi:**

> Ceritanya begini. Banyak portal enterprise — perusahaan teknologi, konsultan, startup berskala besar — butuh satu platform yang bisa dipakai buat tiga hal sekaligus:
>
> **Pertama**, halaman marketing yang harus kebuka hampir seketika di seluruh dunia. Ini soal *First Contentful Paint* dan *Time to First Byte* — kalau lambat, user hilang, SEO turun.
>
> **Kedua**, tim konten — bukan programmer — harus bisa bikin, edit, dan publish artikel, studi kasus, layanan, kapan pun, tanpa nunggu tim engineering dan tanpa takut website-nya down.
>
> **Ketiga**, data di belakangnya harus tetap konsisten dan aman meski traffic-nya melonjak. Relational data, permission per-role, sampai query yang kompleks — semua harus kuat.
>
> Ini yang kusebut **Frontend Performance Trilemma** — tiga kekuatan yang saling tarik-menarik: *performance*, *editorial agility*, dan *data integrity*. NovaSphere kubangun khusus untuk menyelesaikan trilemma ini.

**[VISUAL: diagram segitiga 3 sudut berlabel Performance / Editorial Governance / Data Integrity; panah di tengah: NovaSphere]**

### 1.2 Apa yang sebenarnya dibangun (1:45–2:45)

**Narasi:**

> Secara konkret, NovaSphere adalah satu monorepo dengan dua aplikasi:
>
> **Frontend** — dibangun dengan Astro. Ada halaman utama dengan hero, visualisasi sistem, halaman arsitektur yang interaktif, halaman proyek dan blog yang isinya dari CMS, sampai halaman telemetri ala dashboard SRE. Ada juga fitur Omnibar — pencarian global ala Cmd+K — dan simulator benchmark edge yang menghitung latensi dari berbagai region.
>
> **Backend** — Strapi Headless CMS dengan content model Project, Article, Service, dan Category. Tim konten mengelola semuanya dari dashboard admin tanpa menyentuh kode.
>
> **Database** — Supabase PostgreSQL yang tersambung lewat koneksi pooler, plus skema dengan Row Level Security.

**[VISUAL: split screen — kiri: scroll website (index → projects → blog → telemetry), kanan: dashboard Strapi membuka salah satu artikel]**

### 1.3 Kenapa proyek ini "real" (2:45–3:30)

**Narasi:**

> Yang kubuat ini bukan landing page demo. Ini arsitektur produksi yang lengkap: ada pipeline CI, ada deployment ke edge network, ada sitemap dan robots untuk SEO, custom 404, security headers, webhook untuk invalidasi konten, sampai fallback data berlapis.
>
> Dan semuanya berjalan dengan **zero-JS di halaman pertama** — artinya HTML-nya murni statis, JavaScript baru dihidupkan untuk komponen yang benar-benar butuh interaksi. Baseline-nya super ringan.

**[VISUAL: buka DevTools → Network/Performance: tunjukkan ukuran dokumen HTML kecil, JS hanya di island tertentu]**

---

## PART 2 — ARCHITECTURE & DECISIONS (3:30–8:00)

### 2.1 Peta arsitektur (3:30–4:15)

**Narasi:**

> Ini peta lengkapnya. Di paling depan ada **Vercel Edge Network** — ratusan PoP di seluruh dunia dengan anycast DNS. Pengunjung dari Jakarta, London, atau San Francisco dilayani dari server terdekat, plus kompresi Brotli dan security headers di middleware.
>
> Di belakangnya, **Astro** menghasilkan HTML statis saat build. Saat konten berubah, sebuah **deploy hook** memicu build ulang — jadi situs selalu fresh tanpa server yang harus jalan 24/7.
>
> Tim konten bekerja di **Strapi**, yang menyimpan semua datanya ke **Supabase PostgreSQL** lewat *transaction pooler* Supavisor. Satu database, banyak konsumen.

**[VISUAL: animasi diagram alur: User → Vercel Edge (300+ PoP) → Astro Static → Strapi → Supabase; panah kembali webhook → deploy hook]**

### 2.2 Keputusan #1 — Astro, kenapa bukan Next.js penuh? (4:15–5:00)

**Narasi:**

> Keputusan pertama: kenapa Astro?
>
> Untuk portal yang isinya 90% konten marketing, hampir tidak ada alasan mengirim JavaScript ke browser hanya untuk merender teks. Astro punya konsep **Island Architecture** — halaman dirender sebagai HTML statis lebih dulu, lalu komponen interaktif "dihidupkan" satu per satu, hanya saat dibutuhkan: saat terlihat di layar, atau saat browser sedang idle.
>
> Hasilnya: halaman pertama tanpa JavaScript sama sekali. Skor performa dan SEO dapat angin segar. Kalau pakai Next.js atau SPA murni, kita membayar biaya JavaScript di setiap kunjungan — padahal sebagian besar pengunjung cuma mau baca kontennya.
>
> Trade-off-nya: interaktivitas berat seperti dashboard real-time memang kurang cocok di sini — dan itu keputusan sadar. Untuk halaman yang butuh itu, kita pisahkan jadi aplikasi tersendiri.

**[VISUAL: perbandingan render — SPA: HTML kosong + JS besar; Astro: HTML penuh + island kecil; animasi island "menyala"]**

### 2.3 Keputusan #2 — CMS terpisah (decoupled), bukan monolit (5:00–5:45)

**Narasi:**

> Keputusan kedua: konten dan presentasi **dipisahkan total**.
>
> Strapi berdiri sendiri sebagai headless CMS. Tim konten tidak bisa merusak tampilan — mereka hanya mengisi data lewat schema yang sudah didefinisikan: Project, Article, Service. Editor bisa publish kapan saja.
>
> Karena CMS dan frontend terpisah, masing-masing bisa di-scale sendiri. CMS sibuk direktur? Tidak masalah — frontend tetap melayani dari HTML statis yang sudah di-build. Ini pola *decoupled content governance*, dan ini mengubah ritme kerja: dari "tunggu deploy tim IT" menjadi "publish sendiri, langsung tayang".
>
> Waktu konten dipublish, Strapi mengirim **webhook** yang memicu deploy hook Vercel — jadi pembaruan tayang otomatis dalam hitungan menit, tanpa ada yang bangun tengah malam.

**[VISUAL: skenario — editor klik Publish di Strapi → animasi webhook → Vercel rebuild → situs ter-update; stopwatch kecil]**

### 2.4 Keputusan #3 — Supabase PostgreSQL (5:45–6:30)

**Narasi:**

> Keputusan ketiga: datanya kubuat di **PostgreSQL** yang dikelola Supabase — bukan sekadar JSON di file, bukan database NoSQL.
>
> Kenapa? Karena konten enterprise itu relasional: Project punya banyak Article, Article punya kategori, Service punya metadata. Relasi, constraint, dan transaksi ACID itu bukan pelengkap — itu kebutuhan.
>
> Yang menarik ada di lapisan koneksinya: **Supavisor**, transaction pooler Supabase. Bayangkan ribuan koneksi database — pooling membuat ribuan itu dipadatkan ke antrean koneksi yang efisien, sampai skala 10.000+ query per detik tanpa menjatuhkan database.
>
> Keamanannya juga kubangun di level database: **Row Level Security**. Kebijakan akses diterapkan di Postgres sendiri — jadi siapa pun yang mencoba akses lewat jalur mana pun, tetap tunduk pada aturan yang sama.

**[VISUAL: animasi koneksi client → pooler → Postgres; sorot RLS policy sederhana]**

### 2.5 Keputusan #4 — Arsitektur "resilient by default" (6:30–7:30)

**Narasi:**

> Sekarang keputusan yang menurutku paling penting — dan yang jarang dibahas di video arsitektur.
>
> Situs statis itu cepat, tapi punya satu kelemahan: kontennya bisa basi kalau CMS-nya sedang tidak bisa dihubungi. Jadi kubangun **data layer berlapis dengan fallback otomatis**.
>
> Saat frontend butuh data, dia mencoba sumber terbaik lebih dulu — Strapi. Kalau Strapi sedang lambat atau mati, dia pindah ke Supabase langsung. Kalau dua-duanya tidak terjangkau — misalnya saat cold start di serverless — dia jatuh ke **lapisan mock data yang sudah tertanam di dalam bundle**.
>
> Semua fallback punya *timeout* ketat, dua sampai empat detik, supaya pengunjung tidak pernah menunggu lama.
>
> Artinya satu hal: **CMS-nya boleh down, website-nya tetap 100% up.** Ini pola *fault-tolerant fallback* — dan ini yang bikin arsitektur ini cocok dipakai beneran di produksi, bukan cuma untuk demo.

**[VISUAL: alur percobaan berantai: Strapi (❌ timeout 2s) → Supabase (❌ 4s) → Mock data (✅); grafis "0 error, 100% uptime"]**

### 2.6 Lapisan operasional: SEO, keamanan, observability (7:30–8:00)

**Narasi:**

> Terakhir, arsitektur ini kuperlengkapi dengan lapisan operasional:
>
> **SEO** — sitemap.xml digenerate dari kode, robots.txt, meta tags lengkap, custom 404 page yang tetap on-brand.
>
> **Keamanan** — security headers dipasang di level edge lewat konfigurasi Vercel, plus CORS yang dibatasi ketat ke domain yang dikenal.
>
> **Observability** — ada halaman telemetri bergaya SRE yang menampilkan status layanan, dan endpoint health check untuk monitoring.
>
> Ini yang membedakan "project" dari "produk": bukan cuma fitur yang terlihat user, tapi fondasi yang membuatnya aman dikelola dan diukur.

**[VISUAL: scroll cepat: sitemap.xml di browser, header keamanan di DevTools, halaman telemetry]**

---

## PART 3 — CHALLENGES & RESULTS (8:00–10:30)

### 3.1 Tantangan arsitektural (8:00–9:00)

**Narasi:**

> Sekarang bagian yang paling jujur: tantangannya.
>
> **Tantangan pertama — menyatukan tiga dunia.** Arsitektur ini mempertemukan static site generator, CMS dengan database sendiri, dan API publik — tiga hal yang cara kerjanya berbeda. Tantangan terbesarnya bukan di salah satu teknologi, tapi di **kontrak antar-lapisan**: bentuk data di Strapi harus sama dengan tipe di frontend, dan harus sama dengan kolom di Supabase. Kusederhanakan dengan tipe TypeScript bersama dan normalisasi di data layer.
>
> **Tantangan kedua — konsistensi data di dua jalur baca.** Karena frontend bisa membaca dari Strapi *atau* Supabase, datanya harus konsisten di dua tempat. Solusinya: satu sumber kebenaran di Postgres, dan setiap perubahan konten mengalir lewat webhook.
>
> **Tantangan ketiga — kecepatan vs. kesegaran konten.** HTML statis itu cepat, tapi kalau setiap publish harus build ulang, bagaimana caranya tetap murah? Deploy hook yang dipicu webhook adalah jawabannya — build terjadi hanya saat konten benar-benar berubah, dan seluruh prosesnya otomatis.

**[VISUAL: close-up kode data layer (strapi.ts) dengan tiga cabang sumber data; sorot bagian timeout]**

### 3.2 Tantangan teknis di lapangan (9:00–9:45)

**Narasi:**

> Di level teknis, ada juga cerita yang lebih membumi — dan ini penting kuedukasi, karena setiap proyek nyata selalu begitu.
>
> **Environment dan kredensial.** Database produksi hidup di Supabase cloud, tapi untuk development lokal, kredensial tidak bisa sembarangan dibagikan lewat repository. Jadi kubangun *dual environment resolution* — konfigurasi membaca dari environment variable dengan fallback, dan untuk development lokal, backend bisa dijalankan dengan database SQLite embedded. Tim tetap bisa bekerja, produksi tetap aman.
>
> **Native module dan versi Node.** Menjalankan CMS di Node.js versi terbaru ternyata punya jebakan: ada dependency native yang belum punya binary untuk runtime baru. Pelajarannya: *pin the version, atau siapkan jalur prebuilt*, dan selalu verifikasi di CI — bukan cuma di mesin sendiri.
>
> **Monorepo dan package manager.** Dua aplikasi dalam satu repository itu rapi, tapi tooling-nya harus disiplin — lockfile yang konsisten dan pipeline CI yang memvalidasi build frontend di setiap push, supaya yang namanya "works on my machine" tidak pernah terjadi.

**[VISUAL: terminal — proses menjalankan backend lokal, lalu dashboard admin terbuka; CI pipeline hijau di GitHub Actions]**

### 3.3 Hasil & angka (9:45–10:15)

**Narasi:**

> Dan hasilnya? Mari kita lihat angkanya.
>
> Karena HTML disajikan dari edge network, **Time to First Byte bisa ditekan di bawah 30 milidetik** dari berbagai region — ini di luar jangkauan arsitektur server-tunggal tradisional.
>
> Karena halaman pertama **zero-JS**, beban rendering di browser pengguna sangat kecil — metrik Core Web Vitals dapat ruang gerak yang jauh lebih besar.
>
> Karena data memakai **pooling database**, kapasitasnya naik ke skala ribuan query per detik tanpa perubahan arsitektur.
>
> Dan karena ada **fallback berlapis**, ketersediaan website tidak lagi bergantung pada satu komponen — targetnya 100% uptime untuk pengunjung, apa pun yang terjadi di belakang layar.

**[VISUAL: kartu angka besar — <30ms TTFB · 300+ PoP · 10,000+ QPS · 100% uptime · 0 JS di first paint]**

### 3.4 Pelajaran utama (10:15–10:30)

**Narasi:**

> Kalau disimpulkan, ada tiga pelajaran yang kubawa dari proyek ini:
>
> **Pertama**, kecepatan bukan hasil optimasi di akhir — tapi konsekuensi dari keputusan arsitektur di awal. Memilih static-first dan edge sejak hari pertama jauh lebih murah daripada mengejar performa setelah aplikasi jadi.
>
> **Kedua**, decoupling bukan tren — itu strategi organisasi. Saat tim konten bisa bekerja tanpa menunggu tim engineering, organisasi bergerak lebih cepat.
>
> **Ketiga**, sistem yang tangguh itu bukan sistem yang tidak pernah gagal — tapi sistem yang tetap bekerja saat komponennya gagal. Fallback berlapis itu asuransi, dan asuransi terbaik adalah yang tidak pernah kamu sadari sedang bekerja.

**[VISUAL: tiga kartu kesimpulan muncul satu per satu]**

---

## 🎬 OUTRO (10:30–11:00)

**Narasi:**

> Itu dia NovaSphere — satu proyek nyata yang mempertemukan Astro, Strapi, Supabase, dan Vercel dalam satu arsitektur enterprise: cepat di edge, mudah dikelola tim konten, dan kuat di bawah beban.
>
> Seluruh source code, skema database, dan dokumentasi arsitekturnya terbuka di GitHub — link-nya ada di deskripsi. Kalau ada satu hal yang bisa kamu ambil dari video ini: **pilih arsitektur berdasarkan cara organisasimu bekerja, bukan berdasarkan hype teknologi.**
>
> Kalau video ini bermanfaat, like dan subscribe — dan ceritakan di komentar: tantangan arsitektur apa yang paling sering kamu hadapi? Sampai jumpa di video berikutnya!

**[VISUAL: logo NovaSphere + handle GitHub + link repo di overlay; akhir video dengan CTA subscribe]**

---

## 📋 Catatan Produksi (hapus sebelum upload)

- **Durasi segmen:** Hook 45 dtk · Part 1 ±2:45 · Part 2 ±4:30 · Part 3 ±2:30 · Outro 30 dtk.
- **Demo yang bisa direkam sekarang (semua jalan di lokal):**
  1. `localhost:4321` — scroll homepage, buka Omnibar (Cmd+K), halaman Architecture, Projects, Blog, Telemetry.
  2. `localhost:1337/admin` — login `admin@novasphere.local`, tunjukkan Content Manager (Project/Article/Service) lalu edit & publish satu artikel (webhook ke frontend bisa direkam sebagai "konten tayang otomatis").
  3. DevTools Network — tunjukkan dokumen HTML kecil & minim JS.
- **Sebelum merekam, verifikasi klaim versi:** README/docs menyebut Astro v5 & Strapi v5, sementara kode yang ter-pin di repository adalah Astro 4.16 & Strapi 4.25 — sesuaikan narasi agar tidak salah sebut di video.
- **Angka (<30ms TTFB, 10.000+ QPS)** berasal dari target desain/docs — jika menyebutnya sebagai hasil terukur, tampilkan sumber pengukurannya (contoh: hasil deploy di Vercel atau skenario load test) agar kredibel.
- Opsional: tambahkan bagian singkat "stack tambahan" (Tailwind CSS, CI GitHub Actions, TypeScript) di akhir Part 1 jika audiens menyukai detail.
- Buat versi pendek (<60 dtk) untuk Shorts/Reels: potong HOOK → keputusan fallback berlapis → hasil <30ms & 100% uptime.
