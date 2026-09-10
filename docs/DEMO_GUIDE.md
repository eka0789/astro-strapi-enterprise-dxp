# 🎬 Panduan Demo — NovaSphere Enterprise DXP

Panduan lengkap untuk mendemokan (dan merekam) aplikasi **NovaSphere Enterprise DXP**: Astro frontend + Strapi headless CMS + Supabase PostgreSQL + Vercel edge deployment, semuanya berjalan lokal di mesin Anda.

> Skenario ini disusun agar selaras dengan struktur video Anda: **One Real Project → Architecture & Decisions → Challenges & Results** (lihat `docs/VIDEO_SCRIPT.md` untuk naskahnya). Di setiap langkah ada **poin narasi** yang bisa dibacakan langsung.

---

## 1. Peta Demo → Struktur Video

| Bagian Video | Segmen Demo (file ini) | Durasi saran |
|---|---|---|
| **HOOK + One Real Project** | Bagian A1–A3 (homepage, visualizer, simulator) | ±2–3 menit |
| **Architecture & Decisions** | Bagian A4–A6 + Bagian B (admin CMS) | ±3–4 menit |
| **Challenges & Results** | Bagian A7–A9 (telemetry, health JSON, fallback) + Bagian C | ±2–3 menit |

---

## 2. Persiapan (checklist wajib sebelum demo)

### 2.1 Pastikan kedua server hidup

Buka dua terminal terpisah di folder repo:

```bash
# Terminal 1 — Strapi CMS + Admin (port 1337)
cd C:\Users\Admin\astro-strapi-enterprise-dxp\backend
npm run develop

# Terminal 2 — Astro frontend (port 4321)
cd C:\Users\Admin\astro-strapi-enterprise-dxp\frontend
npm run dev
```

> Catatan: frontend saat ini memakai database SQLite lokal (`.cache/novasphere-dev.db`) via `DATABASE_CLIENT=sqlite` di `backend/.env` — tidak butuh kredensial cloud Supabase sama sekali. Sudah ada 1 admin user yang bisa langsung login.

**Verifikasi cepat** (bisa juga lewat browser):

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321      # harap 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/admin  # harap 200
```

### 2.2 Kredensial & URL

| Item | Nilai |
|---|---|
| Frontend (public) | http://localhost:4321 |
| Strapi Admin | http://localhost:1337/admin |
| **Login admin** | `admin@novasphere.local` / `NovaSphere@2026` |
| REST API Strapi (belum di-scaffold, lihat §6) | http://localhost:1337/api/projects → 404 |
| Health endpoint frontend | http://localhost:4321/api/health |

### 2.3 Persiapan perekaman (opsional tapi sangat disarankan)

1. Tutup tab lain; buka browser **mode incognito/private** (bersih dari ekstensi & cookie).
2. Set zoom 100%; matikan bookmarks bar agar layar bersih.
3. Window recorder pada resolusi ≥ 1920×1080, capture **hanya window browser** (bukan seluruh layar) supaya terminal tidak ikut terekam.
4. Sebelum rekam: muat dulu tiap halaman sekali agar gambar cover Unsplash sudah masuk cache browser → scroll di rekaman jadi mulus tanpa loading bar.

---

## 3. BAGIAN A — Demo Frontend (yang paling "wow" untuk ditonton)

Mulai di http://localhost:4321. Urutan ini membangun cerita: *lihat hasilnya dulu, baru jelaskan arsitekturnya*.

### A1. Homepage — hero & pipeline status

**Aksi:** buka homepage, diamkan 2–3 detik, lalu scroll perlahan dari atas sampai ke CTA paling bawah.

**Yang tampil (expected):**
- Badge hijau **"Senior Fullstack & Solution Architect"**, H1 gradient **"Ultra-Fast Edge DXP with Astro v5 & Strapi CMS"**, 4 tech pills.
- Status bar: `Database Pipeline:` menampilkan **"Embedded Resilient Fixture"** (karena tanpa env Supabase/Strapi yang terisi, frontend memakai data seed internal — ini justru bahan narasi, lihat A5).
- Terminal dekoratif `novasphere-telemetry.ts` + 3 gauge (`Performance 100/100`, `Hydration Selective`, `Edge TTL Instant ISR`).
- Section: **SystemFlowVisualizer + EdgeBenchmarkSimulator** → **Architecture Matrix ("The Four Pillars")** → **Featured Projects** → **Services** → **Blog preview** → CTA **"Ready to deploy NovaSphere to your own infrastructure?"**.

**Poin narasi (One Real Project — masalah yang dipecahkan):**
> "Ini bukan landing page template. Ini reference implementation DXP yang menyelesaikan satu masalah nyata: situs enterprise modern harus simultan — *ultra-fast* di edge, mudah dikelola kontennya oleh tim non-teknis, dan tetap hidup saat CMS atau database turun. Halaman ini sendiri buktinya: zero JavaScript default — semua yang Anda lihat sudah jadi HTML statis, dihydrate selektif hanya saat dibutuhkan."

### A2. EdgeBenchmarkSimulator — klik wilayah edge

**Aksi:** di section simulator, klik chip region satu per satu: **SIN1 Singapore (default)** → **NRT1 Tokyo** → **FRA1 Frankfurt** → **LHR1 London**. Perhatikan angka dan progress bar beranimasi (500ms).

**Yang tampil:** badge `Active PoP: FRA1 (Frankfurt)`, TTFB Astro vs legacy monolith berubah (mis. 18ms vs 175ms), 2 progress bar bergeser, caption **"92% Faster"**; di bawahnya **"91% Smaller"** JS (18.4 KB vs 220.8 KB) dan blok Supavisor pooler `10,000+ QPS`.

**Poin narasi (Architecture & Decisions — kenapa Astro):**
> "Simulator ini membandingkan latensi Astro melawan monolith legacy dari 6 PoP dunia — dari 8ms di Singapura sampai 22ms di Sydney. Kenapa bisa? Karena dengan Island Architecture, tidak ada JavaScript framework yang dikirim ke browser secara default: payload 0 KB JS, jadi TTFB global di bawah 30ms. Monolith klasik mengirim 220 KB JavaScript dan kalah di tiap region."

### A3. SystemFlowVisualizer — topologi 4 stage

**Aksi:** arahkan kursor ke tiap node (hover) — border menyala sesuai warna node. Klik chip hijau **"Packet Flow Active"**.

**Yang tampil:** 4 kartu node: `Vercel Edge Network` (Stage 01, <15ms) → `Astro v5 Hybrid` (Stage 02, 0 KB) → `Strapi Headless CMS` (Stage 03, Event Hook: Auto Invalidate) → `Supabase PostgreSQL` (Stage 04, Port 6543, 10k+ QPS); footer console + **"Architect Verified: Eka Prasetyo (@eka0789)"**.

**Poin narasi:** jelaskan alur *request → edge → static HTML → konten dari CMS → database via connection pooler*, lalu: *"Perhatikan Stage 03: saat editor publish konten di Strapi, event webhook otomatis memicu invalidasi di Vercel — siklus konten baru sampai ke pengunjung dalam hitungan detik tanpa redeploy manual."*

### A4. Omnibar — pencarian ⌘K

**Aksi:** tekan `Ctrl+K` (Windows) / `Cmd+K` (Mac) — atau klik tombol **Search** di navbar. Ketik `Fintech`, hapus, ketik `Supabase`, lalu ketik `zzz` untuk menunjukkan state kosong. Tutup dengan `Esc`.

**Yang tampil:** modal search dengan daftar hasil ber-badge (`Case Study` / `Article` / `Core Spec` / `SRE`). Hasil live saat mengetik; "Fintech" memunculkan *Hyperion Quantum Exchange*; "Supabase" memunculkan artikel pooling & topologi; query tak dikenal → **"No matching resources found. Try another query."**

> ⚠️ Detail jujur: footer menampilkan petunjuk `↑↓ to navigate / ↵ to open`, tapi navigasi keyboard tersebut **belum diimplementasikan** — cukup klik hasil atau jangan sorot petunjuk itu di kamera. (Tab/klik tetap jalan.)

**Poin narasi:** *"Cara cepat navigasi: Cmd+K. Omnibar ini mengindeks semua case study, artikel engineering, dan node arsitektur — satu pintu masuk ke seluruh knowledge base platform. Di produksi, lapisan pencarian ini bisa diganti semantic search di pgvector tanpa menyentuh UI."*

### A5. Halaman Projects — bukti resilient fallback (jangan dilewatkan!)

**Aksi:** klik **Projects** di navbar. Sorot meta di bawah H1: **`Source Pipeline: FALLBACK`** dan `Total Showcase Records: 4`. Lalu demo **category filter**: klik `All` → `Cloud Architecture` → `Fintech Solution` → kembali `All`.

**Yang tampil:** 4 kartu case study: *Aetherial Cloud Gateway* (featured ★), *Nexus Autonomous Data Fabric* (featured ★), *Lumina Sovereign Micro-Services*, *Hyperion Quantum Exchange* — masing-masing dengan metrics & tech stack; filter langsung menyaring kartu (`display` toggle).

**Poin narasi (Challenges & Results — ini momen kunci):**
> "Lihat label ini: `Source Pipeline: FALLBACK`. Ini sengaja saya perlihatkan, bukan disembunyikan — di sesi ini CMS lokal dan cloud database sedang tidak menyuplai data, dan situs tetap menampilkan 4 case study lengkap. Itulah arsitektur *resilient by design*: prioritas Supabase → Strapi → seed data internal. Kalau Supabase turun, Strapi melayani; kalau keduanya turun, situs tetap 100% utuh — tidak pernah ada error 500 yang sampai ke pengunjung."

### A6. Blog — baca artikel dengan progress bar

**Aksi:** klik **Engineering Blog**, klik kartu artikel **"Supabase Transaction Pooling & Postgres Optimization for High-Concurrency CMS"** (artikel featured), scroll perlahan sampai bawah.

**Yang tampil:** halaman artikel dengan breadcrumb `← Back to Engineering Blog`, header author `EP` Eka Prasetyo + chip `readingTime` (8 min), reading **progress bar gradient** di atas yang mengikuti scroll, strip `Topics:` berisi `#tag`, lalu author bio card dengan link GitHub.

**Poin narasi:** *"Tiap artikel adalah konten nyata dari CMS headless — di produksi halaman ini dibangun ulang otomatis lewat webhook begitu artikel dipublish. Perhatikan progress bar: inilah satu-satunya JavaScript yang perlu dihydrate di halaman ini — sisanya statis."*

### A7. Halaman Telemetry — dashboard SRE

**Aksi:** klik **Telemetry**. Tunjuk 4 KPI card, blok **"Distributed Subsystems Readiness"**, dan **"Immutable Audit Stream"**.

**Yang tampil:** `Global Uptime (SLO)` **99.995%** · `Edge Cache Hit Ratio` **99.4%** · `Supavisor Pool Saturation` **Safe (14%)** · `Avg Database TTFB` **p95 < 4.2ms**; nodes `Vercel Anycast Edge Router HEALTHY`, `Astro v5 Hybrid Runtime HEALTHY • 0 KB JS`, `Strapi v5 Headless Gateway AUTO-RESILIENT`, `Supabase Postgres 15+ HEALTHY • 10K QPS`; 4 baris audit log dengan animasi pulse.

> ⚠️ Fakta untuk Anda: KPI & log di halaman ini **statis/hardcoded** (tidak ada live streaming) — cocok didemokan sebagai *visualisasi SLO design*, bukan data live. Jangan klaim "data real-time" di narasi.

**Poin narasi:** *"Ini lapisan observability: SLO uptime 99.995%, cache hit 99.4% di edge, dan pool saturation Supabase hanya 14% dari 100 koneksi — desain untuk 10.000+ QPS lewat Supavisor. Prinsipnya: setiap subsistem punya status eksplisit — dan kalau Strapi dalam mode auto-resilient, sistem tetap melayani."*

### A8. Endpoint `/api/health` — bukti nyata di browser

**Aksi:** klik tombol **"Raw JSON Telemetry"** (atau buka http://localhost:4321/api/health di tab baru), lalu di halaman Architecture klik **"View JSON Endpoint →"**.

**Yang tampil:** JSON terformat rapi (2-space indent): `status: "healthy"`, `timestamp` real-time, `services.astroFrontend: UP`, `supabasePostgreSQL`, `strapiCMS` (endpoint `http://localhost:1337`), blok `telemetry` (300+ PoPs, brotli, cache header). Header `Cache-Control: no-cache` — endpoint ini selalu fresh.

**Poin narasi:** *"Bukan klaim di slide — ini endpoint hidup yang bisa dicek siapa pun: status pipeline, konfigurasi CMS, sampai strategi cache-nya. Satu URL untuk memverifikasi kesehatan seluruh platform."*

### A9. Bonus — custom 404 (opsional)

**Aksi:** ketik URL acak, mis. http://localhost:4321/route-tidak-ada.

**Yang tampil:** H1 **"Route Node Unavailable"** dengan copy bernuansa edge-routing + 2 tombol: **"Return to Overview"** dan **"View System Architecture"**.

**Poin narasi (satu kalimat):** *"Bahkan halaman error-nya didesain sesuai konteks platform — menjelaskan 'route tidak ditemukan di edge', bukan error page default."*

---

## 4. BAGIAN B — Demo Strapi Admin (CMS governance)

Buka http://localhost:1337/admin di tab baru. Login: `admin@novasphere.local` / `NovaSphere@2026`.

> Persiapan: karena proses boot pertama mungkin masih menyiapkan plugin, tunggu sampai dashboard muncul. Jika lupa password: hapus `backend/.cache/novasphere-dev.db` lalu restart Strapi dan buat admin baru lewat CLI (lihat §6.3).

### B1. Dashboard & struktur konten

**Aksi:** tunjukkan panel kiri: **Content Manager**, **Content-Type Builder**, **Media Library**, **Settings** (Users & Roles).

**Poin narasi (Architecture & Decisions — kenapa decoupled CMS):**
> "Ini sisi governance-nya. Tim konten tidak pernah menyentuh kode: mereka mengelola case study, artikel, dan layanan lewat UI ini — sementara frontend Astro tetap murni presentasi. Decoupling ini yang membuat tim marketing bisa publish tanpa deployment, dan developer bebas refactor tanpa takut merusak konten."

### B2. Content Manager — tampilkan collection type

**Aksi:** klik **Content Manager** → collection **Project**. Tunjukkan bahwa tiap entri punya field sesuai schema (title, slug, client, category, tagline, description, techStack, metrics, coverUrl, featured, externalUrl).

**Poin narasi:** field-field ini yang dipetakan frontend ke ProjectCard — *"schema di CMS menentukan kartu di website: category menjadi filter, metrics menjadi tiga angka di kartu, featured menempelkan badge ★."*

### B3. Demo publish workflow (opsional — buat entri baru)

**Aksi (kalau mau demo end-to-end):**
1. Collection **Project** → **Create new entry**.
2. Isi minimal: title `NovaSphere Demo Entry`, slug `novasphere-demo-entry`, category `Cloud Architecture`, description bebas; set `featured: false`; **Save** lalu **Publish**.
3. Kembali ke list → entri muncul dengan status **Published**.
4. (Opsional) Edit → ubah → **Save** (versi draft) → perlihatkan tombol **Publish** berisi perubahan yang belum live.

> ⚠️ **Penting & jujur:** saat ini entri yang dibuat di admin **belum akan muncul di frontend**, karena endpoint REST Strapi (`/api/projects`) belum di-scaffold (repo hanya berisi definisi schema) sehingga frontend jatuh ke fallback data. Jika Anda ingin demo "publish di CMS → muncul di website" benar-benar berfungsi, lihat **§6.1** (butuh tambahan scaffolding routes — bisa saya siapkan, ±10 file kecil).

**Poin narasi (kalau hanya sampai UI admin):** *"Di produksi, tombol publish ini memicu webhook yang meng-invalidate cache edge Vercel — konten baru live global dalam hitungan detik. Arsitektur ini yang memisahkan ritme editorial dari ritme rilis software."*

### B4. (Opsional) Content-Type Builder & Roles

- **Content-Type Builder:** tunjukkan daftar collection type `Project`, `Article`, `Service` — jelaskan bahwa schema versi kode ada di `backend/src/api/<type>/content-types/<type>/schema.json` (versioned, bisa code review).
- **Settings → Users & Roles:** tunjukkan role `Author` vs `Editor/Admin` — poin: RBAC menentukan siapa boleh draft, siapa boleh publish.

---

## 5. BAGIAN C — Demo Ketahanan (Challenges & Results, ±60 detik)

Ini segmen penutup paling berkesan karena "membuktikan" klaim resiliency:

1. Di halaman Projects, tunjukkan lagi badge `Source Pipeline: FALLBACK`.
2. (Jika Strapi mati) restart/stop proses Strapi di Terminal 1 (`Ctrl+C`), lalu **refresh** halaman frontend → situs tetap tampil sempurna.
3. Tutup narasi: *"Ini tantangan nyata yang saya hadapi: bagaimana menjamin uptime kalau CMS atau database mengalami insiden? Jawabannya bukan menghilangkan risiko, tapi mendesain degradasi yang anggun — tiap lapisan tahu cara mundur ke lapisan berikutnya. Hasilnya: pengunjung tidak pernah melihat error, dan SRE punya waktu untuk memperbaiki akar masalah."*

> Tanpa menghentikan Strapi pun cerita ini tetap sah — badge FALLBACK sudah membuktikan bahwa pada kondisi saat ini pun (Strapi hidup tapi API belum di-scaffold, Supabase tidak dikonfigurasi) situs tetap menyajikan konten.

---

## 6. Catatan Teknis & Troubleshooting

### 6.1 Kenapa konten admin tidak muncul di frontend?

Rantai data frontend (`frontend/src/lib/strapi.ts`): **Supabase REST (4s timeout) → Strapi API (2s timeout) → mock-data internal**.
- Supabase dilewati karena env `SUPABASE_URL`/`KEY` tidak ada di `.env` lokal.
- Strapi dipanggil ke `http://localhost:1337/api/projects` tapi **404** — repo belum punya `src/api/*/routes|controllers|services` (hanya `schema.json`), jadi endpoint REST tidak ter-register.
- Akibatnya semua halaman memakai fallback — dan itu **tidak merusak demo** (justru jadi bahan cerita §A5).

**Kalau mau flow penuh** (publish → muncul di web): scaffolding routes/controllers/services standar untuk Project/Article/Service + memastikan field schema selaras dengan mapper di `strapi.ts` (perhatikan: mapper membaca `attributes.title`, `techStack`, `coverUrl`, dsb. — penamaan field harus cocok). Minta saya siapkan bila diperlukan.

### 6.2 Perintah restart cepat

```bash
# Strapi (Terminal 1)
cd C:\Users\Admin\astro-strapi-enterprise-dxp\backend && npm run develop

# Frontend (Terminal 2) — jika port 4321 sudah terpakai instance lain,
# stop instance itu dulu, atau jalankan: npm run dev -- --port 4322
cd C:\Users\Admin\astro-strapi-enterprise-dxp\frontend && npm run dev
```

### 6.3 Reset total (kalau demo berantakan / mau mulai bersih)

```bash
# 1) Stop kedua proses (Ctrl+C di tiap terminal)
# 2) Hapus database dev & cache Strapi, lalu start ulang
rm -f C:\Users\Admin\astro-strapi-enterprise-dxp\backend\.cache\novasphere-dev.db
cd C:\Users\Admin\astro-strapi-enterprise-dxp\backend && npm run develop
# 3) Buat admin baru di terminal Strapi (interaktif — isi email/password)
npm run strapi admin:create-user
```

### 6.4 Hal-hal kecil yang mungkin terlihat & jangan panik

| Gejala | Penyebab | Solusi |
|---|---|---|
| Log Strapi 500 `favicon.ico` sekali di awal | tidak ada `backend/favicon.ico` | kosmetik, abaikan |
| Homepage menulis "Astro v5"/"Strapi v5" | copy UI mengikuti brand docs | repo memakai Astro 4.16 & Strapi 4.25 — **jangan sebut "v5" di narasi video** kecuali siap menjelaskan versi; cukup sebut "Astro"/"Strapi" |
| KPI & log Telemetry tidak berubah-ubah | memang statis (design target) | jangan klaim real-time; klaim sebagai "SLO & design targets" |
| Omnibar `↑↓`/`Enter` tidak merespons | belum diimplementasikan | klik hasil / Esc |
| Cover gambar butuh waktu di rekaman pertama | Unsplash remote | pre-load halaman sekali sebelum rekam (§2.3) |
| `/api/projects` (Strapi) → 404 | routes belum di-scaffold | lihat §6.1 |
| Frontend di 4321 menampilkan data lama | fallback di-build saat boot | refresh penuh (Ctrl+Shift+R) |

### 6.5 Angka yang boleh & tidak boleh diklaim saat demo

**Boleh (didukung repo/kode):** zero-JS baseline & island hydration Astro; arsitektur decoupled CMS; rantai fallback berlapis (badge FALLBACK terlihat langsung); endpoint `/api/health` hidup; schema SQL & RLS di `database/supabase-schema.sql`; webhook design untuk invalidasi cache.

**Hati-hati (target desain / belum terukur dari instance ini):** "sub-30ms TTFB global", "10.000+ QPS", "300+ PoPs", "99.995% uptime" — semua ini **design targets** yang tertulis di arsitektur, bukan hasil benchmark instance lokal. Frasa aman: *"di-desain untuk sub-30ms global …"* / *"kapasitas pooling 10.000+ QPS"*.
