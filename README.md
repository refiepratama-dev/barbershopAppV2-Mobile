# Barbershop POS Mobile

Aplikasi **Barbershop POS berbasis mobile** yang dikembangkan untuk membantu pengelolaan aktivitas barbershop melalui perangkat Android.

Aplikasi ini menggunakan teknologi web modern yang dikemas menjadi aplikasi mobile menggunakan **Capacitor**, sehingga dapat mengakses sistem melalui perangkat Android dengan pengalaman penggunaan yang lebih praktis.

## ✨ Fitur

* Login pengguna
* Autentikasi dan pengamanan halaman
* Dashboard aplikasi
* Pencatatan transaksi
* Pengelolaan laporan
* Informasi profil pengguna
* Navigasi mobile
* Pengelolaan layanan barbershop
* Informasi barber
* Pencatatan aktivitas operasional
* Integrasi dengan backend dan database

## 👤 Role Pengguna

Aplikasi mendukung beberapa role pengguna untuk menyesuaikan akses berdasarkan kebutuhan operasional:

| Role     | Akses                                                      |
| -------- | ---------------------------------------------------------- |
| Owner    | Memantau operasional dan informasi bisnis                  |
| Kasir    | Mengelola transaksi dan aktivitas kasir                    |
| Barber   | Mengakses informasi yang berkaitan dengan aktivitas barber |
| Admin IT | Mengelola kebutuhan sistem dan aplikasi                    |

## 🛠️ Teknologi

* **Next.js** — Web application framework
* **TypeScript** — Programming language
* **Capacitor** — Mobile application runtime
* **Android** — Mobile platform
* **Supabase** — Database dan backend services
* **Tailwind CSS** — User interface styling
* **Node.js** — Runtime environment
* **Git & GitHub** — Version control

## 📁 Struktur Project

```text
barbershopAppV2-Mobile/
├── app/
│   ├── login/
│   ├── laporan/
│   ├── profil/
│   ├── transaksi/
│   └── page.tsx
├── components/
├── lib/
├── public/
│   └── assets/
├── android/
├── capacitor.config.ts
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

> Struktur project dapat berubah selama proses pengembangan.

## 🚀 Instalasi

Pastikan perangkat sudah memiliki:

* Node.js
* npm
* Android Studio
* Android SDK
* Java Development Kit (JDK)
* Git

Clone repository:

```bash
git clone https://github.com/refiepratama-dev/barbershopAppV2-Mobile.git
```

Masuk ke folder:

```bash
cd barbershopAppV2-Mobile
```

Install dependency:

```bash
npm install
```

## ⚙️ Konfigurasi Environment

Buat file:

```text
.env.local
```

Kemudian masukkan konfigurasi environment yang diperlukan.

Contoh:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Jangan commit `.env.local` ke repository.

## 💻 Menjalankan Development

Jalankan development server:

```bash
npm run dev
```

Aplikasi web dapat diakses melalui alamat yang ditampilkan oleh Next.js.

## 📱 Capacitor

Project menggunakan Capacitor untuk mengintegrasikan aplikasi Next.js dengan platform Android.

Setelah melakukan perubahan pada aplikasi web, sinkronkan project dengan Android menggunakan:

```bash
npx cap sync android
```

Kemudian buka project Android:

```bash
npx cap open android
```

Project Android dapat dijalankan melalui Android Studio menggunakan emulator atau perangkat Android yang terhubung.

## 🔄 Workflow Pengembangan

Workflow dasar pengembangan aplikasi:

```text
Next.js
   ↓
Development / Build
   ↓
Capacitor
   ↓
Android
   ↓
Android Studio
   ↓
APK / Android Application
```

Perubahan pada bagian web perlu disinkronkan kembali ke project Android menggunakan Capacitor sebelum dijalankan sebagai aplikasi Android.

## 📦 Build Android

Build aplikasi web terlebih dahulu menggunakan script build yang tersedia:

```bash
npm run build
```

Kemudian sinkronkan perubahan ke Android:

```bash
npx cap sync android
```

Buka project Android:

```bash
npx cap open android
```

Selanjutnya proses build APK dapat dilakukan melalui Android Studio sesuai konfigurasi project.

## 📲 Instalasi APK

APK hasil build dapat dipindahkan secara manual ke perangkat Android untuk proses instalasi.

Aplikasi ini tidak bergantung pada distribusi melalui Google Play Store untuk penggunaan internal atau pengujian.

> Untuk instalasi manual, perangkat Android mungkin perlu mengizinkan pemasangan aplikasi dari sumber yang tidak dikenal sesuai versi Android yang digunakan.

## 🔐 Keamanan

File konfigurasi lokal tidak disimpan dalam repository.

Contoh file/folder yang diabaikan:

```text
node_modules/
.next/
out/
dist/
.env*
android/.gradle/
android/build/
android/app/build/
android/local.properties
android/.idea/
```

File seperti `.env.local` harus tetap berada di lingkungan lokal dan tidak boleh dimasukkan ke repository.

## 🎨 Asset

Asset layanan aplikasi disimpan pada:

```text
public/assets/
```

Contoh layanan:

```text
public/assets/layanan/
├── lyn-anak.png
├── lyn-bayi.png
├── lyn-dewasa.png
└── lyn-semir.png
```

Asset digunakan untuk mendukung tampilan informasi layanan pada aplikasi.

## 🔗 Integrasi Backend

Aplikasi menggunakan **Supabase** sebagai backend dan database.

Integrasi aplikasi dilakukan melalui konfigurasi environment dan library yang terdapat pada:

```text
lib/supabase.ts
```

Informasi kredensial dan konfigurasi environment tidak disimpan langsung dalam source code yang dipublikasikan.

## 📌 Status

**Development**

Aplikasi masih dalam tahap pengembangan. Fitur, tampilan, struktur database, dan konfigurasi aplikasi dapat berubah mengikuti kebutuhan pengembangan.

## 👨‍💻 Developer

**Muhammad Refie Pratama**

* GitHub: `refiepratama-dev`
* Fokus: Software Development, UI/UX Design, Web & Mobile Development

## 📄 License

Project ini dibuat untuk kebutuhan pengembangan dan pembelajaran.

Hak penggunaan, distribusi, dan pengembangan lebih lanjut mengikuti ketentuan yang ditetapkan oleh pemilik project.
