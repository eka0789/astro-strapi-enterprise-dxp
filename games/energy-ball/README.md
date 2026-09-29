# ⚡ Bola Energi Positif

Visualisasi 3D interaktif 60 detik: sebuah bola bercahaya dengan aurora warna-warni
yang berdenyut, dikelilingi partikel energi yang tersedot masuk, dan meningkat
perlahan dari keheningan menuju ledakan kedamaian.

Dibangun dengan **Three.js** (WebGL) — tanpa build step, tanpa asset eksternal.
Semua tekstur dan lingkungan dibuat secara prosedural di dalam browser.

## 🌍 Live

**https://bola-energi.netlify.app**

## Jalankan

Butuh server lokal (module ES + WebGL tidak bisa jalan dari `file://`):

```bash
cd games/energy-ball
python -m http.server 8931
```

Buka **http://127.0.0.1:8931/** — animasi mulai otomatis.

## Struktur

| File | Isi |
|---|---|
| `index.html` | Seluruh aplikasi — shader, geometri, koreografi, UI, audio |
| `functional-test.mjs` | 22 tes fungsional (headless Chrome via CDP) |
| `render-check.mjs` | Screenshot per babak ke `shots/` |
| `prod-check.mjs` | Smoke test terhadap URL produksi Netlify |
| `analyze.mjs` | Analisis saturasi & sebaran hue dari screenshot |

## Cara kerja visual

**Bola** — `ShaderMaterial` dengan dua lapisan fbm noise. Lapisan besar
menghasilkan aliran warna (aurora), lapisan kecil menghasilkan kilau detail.
Warnanya diambil dari palet 7 warna (merah → jingga → emas → hijau → biru →
ungu → magenta) yang diinterpolasi mulus, lalu saturasi dinaikkan eksplisit
supaya tidak berubah jadi abu-abu.

**Volume** — pencahayaan diffuse dari satu arah utama memberi kesan bola
memang bulat, ditambah *fresnel rim* di tepi yang memberi halo.

**Partikel** — 2.200 titik sprite yang mengorbit pada beberapa shell di luar bola.
Seiring energi naik, radius partikel menyusut dan semuanya tersedot ke arah inti.

**Aura** — shell transparan radius lebih besar dengan *additive blending*, memberi
glow lembut di sekeliling bola.

**Post-processing** — `UnrealBloomPass` untuk cahaya yang melebar (threshold tinggi
supaya midtone tidak ikut meledak), lalu *grade pass* kustom setelah tone mapping
yang menaikkan saturasi dan menghangatkan warna. Pass ini yang membuat bola tampil
penuh warna, bukan sekadar putih bercahaya.

## Koreografi 60 detik

Energi naik bertahap dalam lima babak, masing-masing mengatur intensitas cahaya,
kecepatan rotasi, exposure, dan gradasi warna:

| Detik | Babak | Cahaya | Warna |
|---|---|---|---|
| 0 | Bangkitnya Cahaya | 0.35 | Bola tenang, aurora mulai berputar |
| 11 | Aliran Warna | 0.55 | Warna merambah, partikel lebih aktif |
| 24 | Berkembang | 0.75 | Partikel tersedot masuk, inti menguat |
| 37 | Puncak Kedamaian | 0.92 | Hangat, melimpah, exposure & saturasi tinggi |
| 50 | Kedamaian Abadi | 1.00 | Pelan, hangat, menetap |

Tiap babak punya judul, subjudul, dan satu affirmation yang ditampilkan di bawah.

## Kontrol

| Tombol | Pintasan | Fungsi |
|---|---|---|
| Putar / Jeda | `Spasi` | Mulai atau hentikan animasi |
| Ulangi | `R` | Mulai dari detik 0 |
| Suara | — | Pad ambient WebAudio (harmonic drone + shimmer) |
| Geser / zoom | — | OrbitControls, kamera bisa diputar |
| — | `klik` mouse | Drag untuk memutar, scroll untuk zoom |

Otomatis berhenti tepat di detik 60 dan menampilkan layar penutup.

## Audio

Tanpa file audio — WebAudio API membuat drone harmonik (110/165/220/330 Hz
+ sub 55 Hz) dengan LFO lambat, ditambah *noise bandpass* untuk tekstur shimmer.
Ramping fade-in saat play, fade-out saat selesai.

## Testing

```bash
# server harus sudah jalan di port 8931
node functional-test.mjs    # 22 tes fungsional (localhost)
node prod-check.mjs         # smoke test URL produksi
node render-check.mjs       # screenshot per babak → shots/
node analyze.mjs shots/*.png  # statistik warna
```

## Catatan performa

- `devicePixelRatio` di-cap 2 supaya retina tidak terlalu berat
- Geometri bola 128 segment, aura 96, partikel 2.200 — ringan untuk GPU modern
- Kalau perangkat berat, turunkan `PARTICLE_COUNT` dan `renderer.setPixelRatio(1)`


## Deploy

Site terhubung ke project Netlify `bola-energi` (terpisah dari Adventure
Tetris yang memakai `netlify.toml` sendiri di root repo).

`dist/` berisi `index.html` yang sama dengan root; `netlify.toml` menunjuk
ke situ sebagai publish directory, tanpa build step.

`dist/` tidak di-commit, jadi harus dibuat dulu setelah clone:

```bash
mkdir -p dist && cp index.html dist/
netlify deploy --prod --dir=dist
```

Project ID: `0b1bf9ae-2b6f-4712-832b-25d8cd15273d`
Admin: https://app.netlify.com/projects/bola-energi
