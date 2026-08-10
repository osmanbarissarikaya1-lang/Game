# Devlet Yönetim Paneli — GitHub Pages + Supabase

Statik GitHub Pages uygulamasıdır. Veriler kullanıcı hesabına göre Supabase `game_data.data` JSONB alanında saklanır.

## Yeni özellikler
- Devlet hazinesinden açıklamalı manuel para kesintisi ve işlem geçmişi
- Devletler arası para aktarımı
- Küçük/Orta/Büyük liman: gemi kapasitesi
- Küçük/Orta/Büyük top ocağı: top kapasitesi
- Kapasite doluyken gemi/top satın alma engeli
- Okul satın alma ve eğitim seviyesi artışı
- Halk mutluluğu ve eğitim seviyesi
- Mutluluğa bağlı elverişli nüfus hesabı
- Eğitime bağlı kişi başı vergi bonusu
- Admin panelinden fiyatlar, bakım giderleri, kapasite ve ekonomik kurallar
- Admin panelinden sınırsız özel satış ürünü ekleme/silme
- Otomatik Supabase kayıt

## Kurulum
1. `index.html` ve `config.js` dosyalarını GitHub repository köküne yükleyin.
2. Pages: `main` + `/ (root)`.
3. Supabase'de mevcut `game_data` tablosu yeterlidir; JSONB veri yapısı uygulama tarafından otomatik genişletilir.
4. Publishable/anon key kullanın; Service Role Key kullanmayın.
