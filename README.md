# Devlet Yönetim Paneli - GitHub Pages V3

Bu sürüm Supabase Auth için resmi `@supabase/supabase-js` istemcisini kullanır.

## GitHub Pages

`index.html`, `config.js`, `schema.sql` dosyalarını repository ana dizinine yükleyin.

Pages: `main` + `/ (root)`.

## Supabase

`schema.sql` dosyasını Supabase SQL Editor'da bir kez çalıştırın.

Authentication > Providers > Email açık olmalı.

Email Confirmations açık ise kayıt sonrası e-posta doğrulaması gerekir. İsterseniz test sırasında kapatabilirsiniz.

Authentication > URL Configuration bölümünde Site URL olarak GitHub Pages adresinizi ekleyin:

https://osmanbarissarikaya1-lang.github.io/Game/

## Önemli

`config.js` içindeki `sb_publishable_...` anahtarı frontend'de kullanılabilen publishable key'dir. Secret/service_role key kullanmayın.
