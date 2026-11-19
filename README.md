# Nə deyib?

Azərbaycanın tanınmış simalarının açıq mənbələrdə dediklərini toplayan sabit sayt. Quruluş addımı yoxdur: fayllar GitHub Pages-də (`main` budağı) birbaşa açılır. Domen `nedeyib.com` (`CNAME`). `.nojekyll` Jekyll-in faylları dəyişdirməməsi üçündür. Ünvanlar domenin kökünə görə yazılıb (`/assets/...`).

Sual-cavab hələ qurulmayıb. Sual xanası qəsdən bağlıdır.

## Quruluş

- `index.html` — ana səhifə. `#ferhad-pervizi` köhnə ünvanı `/ferhad-pervizi/` səhifəsinə yönləndirir.
- `ferhad-pervizi/index.html` — sima səhifəsi
- `mexfilik/index.html` — məxfilik
- `404.html` — tapılmayan ünvan
- `assets/site.css`, `assets/site.js` — ortaq görünüş və skript
- `site.config.js` — əlaqə ünvanı
- `data/sources.json` — mənbə siyahısı. Səhifədə ayrıca siyahı kimi göstərilmir; axtarış nəticəsinin altındakı keçid mənbədir
- `data/index/ferhad-pervizi.json` — sual axtarışının mətni. Yalnız sual yazılanda yüklənir
- `data/stats/<sima>.json` — kitabxananın irəliləyişi. Faiz və platforma sayları buradan gəlir
- `sitemap.xml`, `robots.txt`, `favicon.svg`

## Mənbə əlavə etmək

`data/sources.json` mənbənin adını və ünvanını saxlayır. Şəxs səhifəsində bu siyahı açıq göstərilmir. Oxucu mənbəni axtarış nəticəsinin altındakı «Videoda bax» və ya «Oxu» keçidindən açır.

```json
{
  "title": "Mənbənin adı",
  "url": "https://real-unvan.example/sehife",
  "note": "İstəyə bağlı qısa qeyd"
}
```

`title` və `http` və ya `https` olan `url` mütləqdir. İstəyə bağlı `photo` sahəsi (`/assets/...` və ya `https://...`) simanın şəklini göstərir.

## İrəliləyiş

Rəqəmlər HTML-də yazılmır. Səhifə `data/stats/<sima>.json` faylını oxuyur. `processed` transkripsiya edilərək indekslənmiş saydır. Platformada `total_known` false-dursa faiz əvəzinə «hesablanır» görünür.

Ümumi faiz platformaların cəmi deyil. Eyni çıxış bir neçə yerdə təkrarlana bilər, ona görə səhifə faizi yalnız `unique_works` sahəsindən götürür. `duplicates_merged` neçə təkrarın birləşdirildiyini göstərir. Səhifə bu rəqəmləri özü cəmləmir.

Transkripsiya irəlilədikcə `data/stats/<sima>.json` faylını yenilə: platformanın `processed` sahəsini, `unique_works` sahəsini və `updated` tarixini (`YYYY-MM-DD`). Ümumi sayı bilinmirsə `total` null və `total_known` false olsun.

## Sima əlavə etmək

1. `data/sources.json`-a yeni açar və boş `sources` massivi əlavə et.
2. `data/stats/sima-adı.json` yarat. `unique_works` və `platforms` sahələri olsun.
3. `sima-adı/index.html` yarat. `data-person`, `data-source-list` və `data-stats` həmin açar olsun. Mətn HTML-də qalsın ki, səhifə indekslənsin. Faizi HTML-ə yazma.
4. Ana səhifədəki siyahıya kart əlavə et. Keçid yeni yola getsin, kartda `data-stats` eyni açar olsun.
5. `sitemap.xml`-ə `https://nedeyib.com/sima-adı/` ünvanını yaz.
6. Köhnə heş lazımdırsa, `index.html` başındakı yönləndirməyə həmin açarı əlavə et.

## Səsvermə

Namizədlər `data/candidates.json` faylındadır (`id`, `name`, `role`). `id` 3–64 simvol olmalıdır və yalnız hərf, rəqəm, `_`, `-`, `.` ola bilər. Səhifə hər namizəd üçün `https://abacus.jasoncameron.dev` sayğacını oxuyur və səs verəndə bir artırır. Ad boşluğu `nedeyib`-dir. Açarı `assets/vote.js` içindəki adapterdə dəyişmək olar.

Hər cihaz hər namizədə bir dəfə səs verir. Bu qeyd yalnız brauzerin `localStorage` yaddaşındadır. Sərbəst mətnlə namizəd təklifi yoxdur, çünki onu saxlayan serverimiz yoxdur.

## Əlaqə

`site.config.js` içində `CONTACT_EMAIL`. Dəyər `CONTACT_EMAIL_TODO` olduqca əlaqə bloku səhifədə görünmür və bu yazı heç yerdə göstərilmir. Real ünvan (məsələn `ad@domain.az`) yazılanda blok özü açılır. Eyni sabit ana səhifədə, sima səhifəsində və məxfilik səhifəsində istifadə olunur.

## Mövzu

İşıqlı və qaranlıq mövzu əvvəlcə sistem ayarına (`prefers-color-scheme`) baxır. Düymə seçimi yalnız brauzerin yerli yaddaşında saxlanır.
