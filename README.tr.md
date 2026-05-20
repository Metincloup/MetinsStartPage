# Browser Home Page

[English](./README.md) · **Türkçe**

El çizimi bir defter sketch'inden yola çıkılarak yapılmış, kişiye özel bir
new-tab / başlangıç sayfası. Saf HTML, CSS ve JavaScript — build adımı yok,
bağımlılığı yok.

---

## Özellikler

### Saat

- Canlı saat — tıklayarak 12 / 24 saat formatları arasında geçiş
- Beş görsel tema: **Minimal**, **Outline**, **Glow**, **Gradient**, **Glass**
- Özel renk + opaklık (hex picker + slider, `rgba` üretir)
- Blur slider'ı (sadece metni bulanıklaştırır — cam panel keskin kalır)
- Boyut slider'ı (responsive font-size'ın 50–200%'ü)
- Outline kalınlığı slider'ı (sadece Outline teması seçiliyken görünür)
- **Glass** temasının kendi renk paleti (6 yumuşak ton, camı hafifçe boyar)

### Arama

- Üç varsayılan motor (Google, DuckDuckGo, Bing); ikona tıklayarak veya
  `Shift+1`–`Shift+4` ile geçiş
- İkon / kısayolla yapılan değişim **geçicidir** — ayarlardaki kalıcı
  varsayılan değişmez, sayfa yenilenince ona dönülür
- 15 hazır site `!bang` (DuckDuckGo tarzı):
  `!yt` `!gh` `!w` `!so` `!r` `!maps` `!img` `!mdn` `!npm` `!a` `!tw` `!tr`
  `!g` `!ddg` `!b`
- **Kategori** arama modu: `!work cats` ile bir kategori içinde filtrele,
  yazdıkça canlı öneri
- "Hidden" kategoriler kart olarak gözükmez ama aramada çıkar

### Kategori kartları

- Ayarlardaki accordion editörden kategori ekle / sil / yeniden adlandır /
  **sırasını değiştir**; site (item) için de aynı işlemler
- Ayarlardan satır başına kart sayısı (3 / 4 / 5 / 6)
- İkonlar gerçek site favicon'larıdır (DuckDuckGo ikon servisi); yüklenemezse
  emoji'ye otomatik fallback
- Bir kategori 5'ten fazla item içerdiğinde kart kendi içinde scroll olur

### Arka plan

- Ayarlardan dört seçenek arasında geçiş:
  - **Waves** — yavaşça süzülen animasyonlu SVG katmanları
    (`prefers-reduced-motion` aktifse durur)
  - **Solid color** — renk seçici
  - **Image / GIF** — URL veya yerel dosya yükleme
  - **Video** — URL veya yerel dosya yükleme
- Yüklenen dosyalar **IndexedDB**'de saklanır (localStorage video için
  yetersiz). "Reset settings" yüklenenleri de temizler.
- Image / Video için opsiyonel blur slider — yakınlaştırma yapmaz, kenarlar
  sayfa rengine doğru yumuşakça fade eder

### Görsel cila

- Kartlar, arama çubuğu, ayar paneli ve öneri kutusunda gerçek
  glassmorphism — `backdrop-filter: blur() saturate()`, ışık yakalayan
  border, katmanlı gölge, hover'da hafif lift
- Arama çubuğu odak yokken tamamen şeffaftır (sadece outline + metin);
  hover / focus'ta cama dönüşür
- İmleci takip eden ışık — dark modda beyazımsı, light modda koyumsu
- Dişli ikon hover'da döner; scrollbar'lar temaya duyarlıdır

### Ayarlar menüsü

- Soldan kayarak açılır, viewport'un `clamp(340px, 32%, 440px)` kadarını
  kaplar, sayfanın geri kalanı kalan alana sıkışır
- Bölümler: **General**, **Fonts**, **Background**, **Components**,
  **Categories**, **Misc** — her biri collapsible drawer; açık / kapalı
  durumu yenilemeler arasında hatırlanır
- **Components** drawer — saat, arama çubuğu, kategoriler ve tema butonunu
  ayrı ayrı gizleyebilirsin; istersen sadece dişli kalır
- **Config mode**: `Single` (tek paylaşılan ayar) veya `Dual` (saat, fontlar
  ve arka plan temaya göre ayrı saklanır — dark ↔ light geçişinde swap'lanır)
- **Backup**: ayarları JSON olarak indir (veya ayarlar + yüklenen medya);
  başka tarayıcıda / cihazda geri yüklemek için import et
- Komponent başına font seçimi (`System` / `Serif` / `Mono` / `Rounded`) —
  saat, arama çubuğu ve kartlar için ayrı ayrı; saat temalarıyla istediğin
  gibi birleşir
- "Reset settings" her şeyi varsayılana döndürür + yüklenen medyayı siler

### Kalıcılık

- Tüm ayarlar `localStorage`'da `hp.` prefiksi altında
- Yüklenen arka plan medyası IndexedDB'de (`hp-files`)
- Oturumda kullanılan arama motoru yenilemede varsayılana döner

---

## Kullanım

Build yok, bağımlılık yok. `index.html` dosyasını tarayıcıda aç:

```bash
git clone https://github.com/<sen>/<repo>.git
cd <repo>
xdg-open index.html        # ya da dosya yöneticisinde çift tıkla
```

Tarayıcının gerçek başlangıç / new-tab sayfası yapmak için: `file://…/index.html`
yoluna işaret et, ya da klasörü GitHub Pages'e koyup o URL'i kullan.

## Teknoloji

- HTML5
- CSS3 — custom property'lerle tema, `backdrop-filter`, `clamp()`, CSS
  animasyonları
- Saf JavaScript — framework yok, bundler yok, transpiler yok
- Ayarlar için `localStorage`, yüklenen medya için `IndexedDB`

Tek dış istek: favicon'lar için `icons.duckduckgo.com`'a opsiyonel çağrı;
düşerse emoji fallback devreye girer.

## Proje yapısı

```
.
├── index.html          markup
├── css/style.css       tüm stiller
├── js/main.js          tüm davranış (tek dosya)
├── SPEC.md             defter sketch'inden çıkarılmış detaylı spec
├── sketches/           orijinal defter fotoğrafları
└── README.md / README.tr.md
```

---

## Proje nasıl geliştirildi

Proje, bir defterde **üç sayfa kurşun kalem sketch** olarak başladı —
yerleşim, bileşenler ve sekiz görsel iyileştirme fikri (dişli hover-spin,
camsı bileşenler, focus'suz şeffaf arama çubuğu, imleç ışığı, …).

Geliştirme **Claude Code** ile terminalde aşama aşama yapıldı; her stage
sonrası tarayıcıda gözden geçirildi:

1. **İskelet ve temel yerleşim** — saat, arama çubuğu (motor ikonları ile),
   kategori kartları, CSS custom property'leriyle dark / light
2. **Ayarlar menüsü** — sayfayı sıkıştıran slide-in panel; küçük bir
   pub/sub settings store inline kontrolleri ve paneli senkron tutar
3. **Kategori araması ve saat stilleri** — kategori modunda `!bang`
   scoping, otomatik öneri, birden fazla saat teması, scrollable kartlar
4. **Görsel cila (sekiz madde)** — glassmorphism, şeffaf arama çubuğu,
   imleç ışığı, komponent başına font, item glow, animasyonlar
5. **Ayarlanabilir arka plan** — animasyonlu SVG dalgalar, tek renk, URL
   **veya** dosya yüklemeli görsel / video (IndexedDB)
6. **Favicon'lar ve klavye kısayolları** — gerçek site ikonları (fallback'li),
   `Shift+1–4` ile geçici motor değişimi
7. **Kategori editörü** — ayarlardan kategori / site ekle / sil / sırala;
   sonradan accordion'a dönüştürüldü

Bazı özellikler sketch'in dışında, ilerleyen aşamalarda eklendi: özel cam
tint paleti, kendi `!bang`'lerimiz, saatte opaklık, arka plan blur slider'ı,
item sayısı rozetli accordion editör, temaya duyarlı scrollbar'lar, …

`SPEC.md` implementation ile senkron tutulur ve eşlik dokümanı niteliğindedir.

---

## Orijinal sketch

| Sayfa 1 — ana yerleşim      | Sayfa 2 — kart & ayarlar    | Sayfa 3 — görsel fikirler   |
| --------------------------- | --------------------------- | --------------------------- |
| ![Sayfa 1](sketches/1.jpeg) | ![Sayfa 2](sketches/2.jpeg) | ![Sayfa 3](sketches/3.jpeg) |

## Lisans

[MIT](./LICENSE) — istediğini yap, sadece notu sakla.
