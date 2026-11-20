# Değişiklik günlüğü

## v1.1 · Kasım 2026

- **Yenilikler penceresi:** ana menüde sürüm etiketi (v1.1 · Kasım 2026); tıklayınca bu güncellemenin maddeleri açılır (Türkçe ve İngilizce). Esc ile kapanır.
- **Usta defteri:** son 8 denemenin sonucu (sipariş, ayakta/çöktü/eksik, yıldız, kullanılan taş, en yüksek gerilme) yerelde, `arena.mimar.history` anahtarında tutulur ve Yenilikler penceresinde listelenir. Mevcut kayıt anahtarlarına (`arena.mimar.save`, `settings`, `best`) dokunulmadı; `?auto` ve `?nosave` ile yazılmaz, günün meydan okuması deneme sayılmaz.
- **Diğer oyunlar:** ana menüye `furkiozknn.github.io` oyunlar sayfasına giden «Diğer oyunlar» bağlantısı eklendi.
- **Klavye:** Esc, sipariş haritasından ana menüye ve sipariş ön bilgisinden haritaya geri götürür (daha önce yalnız duraklatma ve ayarlarda çalışıyordu).
- **Sayfa:** `<title>` ve açıklama Türkçeleştirildi (sayfa dili `tr` iken İngilizce kalmıştı); Open Graph ve Twitter paylaşım kartı (`docs/card.jpg`), `canonical`, `theme-color` ve sekme simgesi eklendi (hiçbiri yoktu); Türkçe 404 sayfası eklendi.
- **Test:** `test/duman.mjs` duman testi eklendi (sayfa açılışı, konsol hatası, harita → sipariş → parça yerleştirme, duraklatma, telefonda taşma, Yenilikler penceresi, 15 siparişi bitiren bot).

## v1.0 · Kasım 2026

İlk sürüm: 3 dönemde 15 sipariş, kendi yazdığımız taş statiği simülasyonu, çizgi-mavi arayüz yenilemesi; ayrıntı için README.
