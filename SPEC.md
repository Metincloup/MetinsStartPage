# Browser Home Page — Spec

El çizimi 3 sayfalık bir defter sketch'inden çıkarıldı.
Kaynak görseller: `./sketches/{1,2,3}.png`

## Genel Bakış

Özel bir tarayıcı ana sayfası / yeni sekme sayfası.

## Yerleşim — Ana Sayfa

- **Sol üst:** Dişli / ayar ikonu (asteriks tarzı ✻). Ayarlar menüsünü açar. İleride burger ikona dönüşebilir.
- **Üst orta:** Büyük saat göstergesi (ör. `9.41`).
- **Sağ üst:** Güneş/ay ikonu — dark/light mod toggle.
- **Saatin altı:** Arama çubuğu ("Search on…").
- **Aramanın altı:** Kategori kartları satırı (ör. Work, Social, Tech).

## Bileşenler

### Background

- Arka plan tipi ayarlardan seçilir: **Waves** (animasyonlu CSS dalga), **Solid** (tek renk), **Image / GIF**, **Video**.
- Waves: yavaşça süzülen, blur'lu 3 dalga katmanı (dark/light temaya duyarlı). `prefers-reduced-motion` ile durur.
- Solid: renk seçici.
- Image / Video: kullanıcı ya URL verir ya da dosya yükler. Yüklenen dosyalar IndexedDB'de (`FileStore`) saklanır — localStorage video için yetersiz. URL ve upload arasında `mode` ile geçiş yapılır; "Reset settings" yüklenenleri de temizler.
- Image / Video için **blur slider** (0-100% → 0-40px) — arka plan bulanıklığı ayarlanır. Kenarlarda blur `--bg` rengine fade eder (yumuşak vignette); içerik ölçeklenmez (zoom-in olmaz).
- Cam (glassmorphism) yüzeyler (kartlar, search bar, paneller, öneri kutusu) arka planı `backdrop-filter` ile bulanıklaştırır → 3D camsı görünüm.
- Dark estetik korunuyor.

### Dişli & Güneş/Ay

- Güneş/ay ikonu → dark/light mod toggle.
- Dişli ikonu → ayarlar menüsünü açar.
- Dişli ileride burger ikona değişebilir.

### Clock (Saat)

- Büyük gösterge.
- Birden fazla saat stili / tema (varyasyonlar) — sketch'te varyasyon olduğunu belli etmek için "garip" stilize bir saat çizilmiş.
- Uygulanan görsel temalar: Minimal, Outline, Glow, Gradient, Glass (genişletilebilir).
- Glass teması: saat metni buzlu cam panel içinde; camı hafifçe renklendiren tint paleti (~6 düşük-alfa renk) sadece bu temada görünür.
- Saatin yazı tipi ayrıca "Fonts" ayarından seçilir (System/Serif/Mono/Rounded) — tema efektiyle birleşebilir.
- Renk: "Theme" (temadan gelen) veya "Custom" (renk seçici + opaklık slider'ı → hex `rgba()`'ya çevrilir, şeffaflık desteklenir). `--clock-color` değişkeniyle tüm saat stillerine uygulanır.
- Blur slider (0-100% → 0-20px).
- 24 saat ve 12 saat versiyonları.

### Search Bar (Arama Çubuğu)

- Varsayılan motorla arama ("Search on Google…").
- İkonlara tıklayarak motor değiştirilir — Google, DuckDuckGo, Bing.
- "Search on Categories…" modu — kategoriler içinde arama; görünür veya gizli kategorileri gösterebilir.
- Kategori modu "bang" (shebang / !bang) sözdizimi gibi çalışır: `!kategori` ile o kategoriye scope'lanır.
- Web motoru modunda özel site `!bang`'leri çalışır (`!yt` YouTube, `!gh` GitHub, `!w` Wikipedia vb. — en çok kullanılanlar). Kategori `!kategori` scoping'inden ayrıdır.
- Arama motoru ikonuna tıklama veya `Shift+1`–`Shift+4` kısayolu o anki (aktif) motoru **geçici** değiştirir — kalıcı varsayılanı (ayarlardaki "Default search engine" radio'su) değiştirmez. Sayfa yenilenince aktif motor varsayılana döner.
- `Shift+1–4` arama kutusu odaktayken yoksayılır — böylece `Shift+1` ile `!` (bang) yazılabilir, `@ # $` normal çalışır.

### Category Cards (Kategori Kartları)

- Kategoriler ve içlerindeki siteler ayarlardaki **Categories** bölümünden eklenip kaldırılabilir; başlık, "Hidden" flag, site adı ve URL inline düzenlenir. Liste `Settings.get("categories")` üzerinden tek kaynaktan beslenir; kartlar ve arama önerileri değişimleri otomatik yansıtır. Reset varsayılan listeyi geri yükler.

- Her kartın bir başlığı (ör. "Category1") ve item listesi var.
- Item'lar: `İkon + Item` satırları (Icon1 Item1, Icon2 Item2, …).
- Bir kartta çok fazla item olursa (4-5'ten fazla) kart scrollable olur.
- Bir kategorideki item'ların ya HEPSİ ikonludur ya da HİÇBİRİ ikonlu değildir (kart başına tutarlı).
- İkonlar sitelerin gerçek favicon'larıdır (DuckDuckGo favicon servisi: `icons.duckduckgo.com/ip3/<domain>.ico`); yüklenemezse veri modelindeki emoji'ye fallback yapar.

### Settings Menu (Ayarlar Menüsü)

- Dişli ikonundan açılır.
- Sketch'te **%40 / %60** olarak çizilmişti; uygulamada `clamp(340px, 32%, 440px)` olarak revize edildi (büyük ekranda ~%30, ama ayar satırları her ekranda okunaklı kalsın diye min/max sınırlı). Sayfanın geri kalanı kalan alana sıkıştırılır.
- Çok fazla ayar olursa scrollable olur.
- "Advanced settings" olabilir — yeni sekmede açılır.
- Açılış/kapanış animasyonu var.
- Üstte bir kapatma (X) butonu ve dişli ikonu var.
- Örnek bölümler: General (toggle'lar, radio gruplar), Misc (text area, butonlar), vb.
- Tüm bölümler artık **collapsible drawer** (`<details>`) — bölüm başlığına tıklayınca açılır/kapanır. Açık/kapalı durumu localStorage'da (`hp.openDrawers`) saklanır. Default: yalnızca **General** açık.
- **Categories** bölümünde "Per row" select'i (3/4/5/6) — kart container'ının `max-width`'i `data-cols` attribute ile değişir, satır başına maks kart sayısını kontrol eder.

### Config Mode (Tek / Çift)

- Misc bölümünde **Config mode** seg kontrolü: `Single` veya `Dual`.
- **Single**: tüm görsel ayarlar (saat, fontlar, arka plan) iki temada da paylaşılır.
- **Dual**: saat / fontlar / arka plan ayarları temaya göre ayrı saklanır (`hp.<key>__dark`, `hp.<key>__light`). Theme değiştirildiğinde ayarlar otomatik swap olur.
- Mod değiştirme migration: single→dual ise mevcut değerler iki tema namespace'ine kopyalanır; dual→single ise aktif temanın değerleri single key'e taşınır. Yüklenen IndexedDB blob'ları (arka plan resim/videosu) da aynı şekilde namespaced ve migration'da kopyalanır.

### Components (Görünürlük)

- Ayarlarda **Components** açılır paneli (collapsible drawer) — `<details>` ile.
- İçinde her ana bileşen için **Show / Hide** seg'i: Clock, Search bar, Categories, Theme button.
- Dişli butonu hep görünür kalır (settings'e giriş noktası); kullanıcı isterse onun dışındaki her şeyi gizleyip sade bir ekran elde edebilir.

### Backup (Export / Import)

- Misc → **Backup** satırında üç buton: **Export** (sadece ayarlar — küçük JSON), **Export + media** (ayarlar + yüklenen görsel/video, base64 — çok daha büyük JSON), **Import**.
- Export: tüm `hp.*` localStorage anahtarları; `+ media` modunda ek olarak IndexedDB blob'ları da base64'le pakete katılır.
- Import: dosya seçilir, onay alınır, mevcut ayarlar silinip JSON'dan geri yüklenir; medya sadece içe aktarılan dosya media taşıyorsa wipe edilir (settings-only import mevcut upload'ları korur). Bitince sayfa yenilenir.

## Görsel İyileştirmeler (Visual Improvements)

1. Dişli ikonu mouse hover'da döner.
2. Bazı bileşenler hover'da: opacity artar / blur azalır — ya da "buzlu cam" (blurry glass) görünümü alır.
3. Arama çubuğu focus değilken tamamen şeffaf (sadece metin ve outline görünür); focus'ta / arama yaparken solid olur.
4. Kategori arama modunda yazdıkça olası kategori item'ları listelenir.
5. Her bileşen için birden fazla font alternatifi seçilebilir.
6. Kategori kartlarında hover edilen item'lar glow yapar.
7. Ayarlar menüsünün açılışta animasyonu var.
8. Özel imleç ışığı: dark modda mouse etrafında küçük beyaz radius, light modda küçük koyu radius.
