# CodeUp Video Konusma Metni (TR)

Bu dosya, proje sunum videosunda dogrudan okuyabilecegin akista hazirlandi.

---

## 1) 3 Dakikalik Kisa Versiyon (Ezber Dostu)

Merhaba, bu projede SAP CAP backend ve SAPUI5 frontend kullanarak malzeme ve tedarikci yonetimi yaptim.  
Uygulamada listeleme, arama, filtreleme, detay goruntuleme, popup ile duzenleme, silme ve CSV ile toplu veri yukleme ozellikleri var.

Mimariyi uc katmanda kurguladim:  
Backend tarafinda `srv/catalog-service.js`,  
frontend davranis tarafinda `app/webapp/controller/pages/*.controller.js`,  
arayuz tarafinda `app/webapp/view/pages` ve `fragments`.

OData V4 tarafinda ozellikle su adimlari uyguladim:  
Step 4'te filtreleme ve siralama,  
Step 5'te `batchGroup` ile toplu kaydetme,  
Step 6'da list binding uzerinden create/edit,  
Step 8'de CSV icin action operasyonlari,  
Step 9'da list-detail senaryosu.

`Materials.controller.js` ve `Suppliers.controller.js` icinde arama, filtre, kaydet/iptal, silme ve detay akisini yonettim.  
`BaseController.js` ile router, i18n, hata yonetimi ve OData yardimci fonksiyonlarini merkeziledim.

CSV akisinda once dogrulama, sonra yukleme yapiyorum.  
UI tarafinda action cagrisini `bindContext(...).execute("$auto")` ile yapiyorum, backend'de ise CAP action handler'lariyla karsiliyorum.

Ayrica veri kalitesini sadece UI'da degil backend'de de garanti altina aldim: zorunlu alan kontrolu, email formati kontrolu, malzeme numarasi kurali ve otomatik numaralandirma.

Ozetle, bu projede SAPUI5 ve OData V4 tutorial mantigini gercek bir is akisina uyarlayarak uc uca calisan, bakimi kolay ve gelistirilebilir bir yapi kurdum.

---

## 2) 8-10 Dakikalik Tam Konusma Metni

### Giris (0:00 - 0:45)

Merhaba, bu videoda gelistirdigim CodeUp uygulamasini teknik akisla anlatacagim.  
Bu uygulama, malzeme ve tedarikci verilerini tek ekrandan yonetmek icin gelistirildi.  
Teknik yigin olarak SAP CAP, SAPUI5 ve OData V4 kullandim.

Hedefim sadece CRUD yapmak degildi.  
Ayni zamanda veri kalitesini korumak, kullanici deneyimini iyilestirmek ve kodu bakimi kolay bir yapiya tasimakti.

### Mimari (0:45 - 2:00)

Projede uc temel katman var:

1. Backend servis katmani: `srv/catalog-service.js`  
2. Frontend controller katmani: `app/webapp/controller/pages`  
3. UI katmani: `app/webapp/view/pages` ve `app/webapp/view/fragments`

Ortak yardimci fonksiyonlari `BaseController.js` dosyasinda topladim.  
Bu dosyada i18n metin alma, merkezi hata gostermesi, OData context yardimcilari ve timeout yonetimi var.

Bu yaklasim sayesinde kod tekrarini azalttim ve her sayfada ayni standardi korudum.

### OData V4 Uygulama Adimlari (2:00 - 5:30)

Bu projede OData V4 tutorial adimlarini dogrudan uyguladim:

**Step 4 - Filtering, Sorting, Counting**  
`Materials.controller.js` ve `Suppliers.controller.js` icinde arama ve filtreleme akisini OData list binding uzerinden yonettim.  
Malzeme ekraninda ada gore, tedarikci ekraninda yine ada gore case-insensitive arama yaptim.  
Ayrica filtre sayisini butonda gostererek kullaniciya aktif filtre bilgisini verdim.

**Step 5 - Batch Groups**  
Kaydetme ve iptal akisini `submitBatch("batchGroup")` ve `resetChanges("batchGroup")` ile yonettim.  
Bu sayede kullanici birden fazla satiri duzenleyip tek seferde kaydedebiliyor.

**Step 6 - Create and Edit**  
Yeni kayit olusturmada OData V4 uyumlu sekilde list binding `create` kullandim.  
Detay popup'larinda ilgili satirin context'ini dialoga bind ederek duzenleme yaptim.

**Step 7 - Delete**  
Tekli ve coklu silme akislarini ayirdim.  
Tekli silmede kayit adini mesajda gosteriyorum, coklu silmede adet bilgisi veriyorum.

**Step 8 - OData Operations**  
CSV surecini operation olarak modelledim: once `validateCSV`, sonra `uploadCSV`.  
UI tarafinda `bindContext(.../CatalogService.validateCSV(...))` ve `execute("$auto")` kullanarak action cagiriyorum.  
Bu cagrilar backend'de `catalog-service.js` icindeki action handler'larda karsilaniyor.

**Step 9 - List-Detail Scenario**  
Liste satirindan secilen context ile detail panelini dolduruyorum.  
Bu akis hem malzeme hem tedarikci ekraninda kullaniliyor.

### SAPUI5 Tarafinda Yapilanlar (5:30 - 7:15)

SAPUI5 tarafinda su best-practice'leri uyguladim:

- MVC ayrimi: controller ve view sorumluluklari net ayrildi.
- Fragment kullanimi: CSV dialog, filtre dialog ve edit popup gibi alanlar modulerlestirildi.
- JSONModel ile ekran durumu yonetimi: `dirty`, `busy`, `hasSel`, `layout`, `count` gibi alanlar ayrik tutuldu.
- i18n kullanimi: metinler turkce/ingilizce property dosyalarindan geliyor.
- MessageToast/MessageBox ile kullaniciya net geri bildirim verdim.

### CAP Servis ve Is Kurallari (7:15 - 8:45)

Backend tarafinda kritik nokta su:  
Sadece UI'a guvenmedim, is kurallarini CAP tarafinda da zorunlu kildim.

`catalog-service.js` dosyasinda:
- CREATE/UPDATE oncesi zorunlu alan validasyonlari var.
- Email formati kontrolu var.
- Malzeme numarasi icin satin alma grubuna bagli kural var.
- Otomatik numaralandirma var.
- CSV parse/dogrulama/yukleme akislarinin tamami backend'de de kontrol ediliyor.

Bu yaklasim, verinin tutarliligini guvence altina aliyor.

### Kapanis (8:45 - 9:30)

Ozetle bu projede SAPUI5 arayuz gelistirme, OData V4 operasyonlari ve CAP servis katmanini birlestirdim.  
Amacim sadece calisan ekran yapmak degildi; bakimi kolay, kurallari net, genisletilebilir bir yapi olusturmakti.  
Bu nedenle tutorial adimlarini birebir ezberlemek yerine, gercek senaryoya uyarlayarak uyguladim.

---

## 3) Video Cekiminde Dosya Gecis Sirasi (Pratik)

1. `KOD_ACIKLAMA_REHBERI.md` (genel cerceve)  
2. `app/webapp/controller/BaseController.js` (ortak katman)  
3. `app/webapp/controller/pages/Home.controller.js` (dashboard mantigi)  
4. `app/webapp/controller/pages/Materials.controller.js` (en kapsamli akis)  
5. `app/webapp/controller/pages/Suppliers.controller.js` (paralel akis)  
6. `srv/catalog-service.js` (backend is kurallari + action)  
7. `app/webapp/view/pages/Materials.view.xml` ve `Suppliers.view.xml` (UI baglami)

---

## 4) Muhtemel Juri Sorulari ve Hazir Cevaplar

**Soru:** Neden `batchGroup` kullandin?  
**Cevap:** Cunku kullanici birden fazla satiri ayni anda duzenleyebiliyor. `submitBatch` ile toplu kayit, `resetChanges` ile toplu geri alma yaparak kontrollu bir deneyim sagladim.

**Soru:** Neden CSV'yi action olarak modelledin?  
**Cevap:** Cunku CSV yukleme sadece CRUD degil, is akisidir. Once dogrulama sonra yukleme gerekiyor. Bu nedenle OData operation/action en dogru yaklasim oldu.

**Soru:** Neden validasyonlari backend'e de koydun?  
**Cevap:** UI validasyonu tek basina yeterli degil. API dogrudan cagrilsa bile veri kalitesi bozulmasin diye is kurallarini CAP servis katmaninda da zorunlu tuttum.

**Soru:** En kritik teknik karar neydi?  
**Cevap:** Ortak mantigi `BaseController`'da merkezilemek ve OData V4 pattern'ine sadik kalmak. Bu iki karar hem hata ayiklamayi hem gelistirmeyi kolaylastirdi.

---

## 5) Son 20 Saniye Icin Guclu Kapanis Cumlesi

"Bu projede SAPUI5, OData V4 ve CAP'i sadece baglamakla kalmadim; tutorial prensiplerini gercek ihtiyaca uyarlayip, kurallari net, bakimi kolay ve sunulabilir bir urun cikardim."
