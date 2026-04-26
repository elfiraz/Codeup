# CodeUp - Kisa Sunum Rehberi (TR)

Bu dosya, projeyi anlatirken "hangi ozellikte hangi SAP yaklasimi kullandim?" sorusuna hizli cevap vermek icin hazirlandi.

## 1) Ana mimari
- `srv/catalog-service.js`: SAP CAP service katmani (backend is kurallari, CSV action'lari, validasyonlar).
- `app/webapp/controller/pages/*.controller.js`: SAPUI5 ekran davranislari (liste, filtre, detay, popup, action cagri).
- `app/webapp/view/pages/*.view.xml`: SAPUI5 ekran yerlesimi (table, toolbar, detail panel).
- `app/webapp/view/fragments/*.fragment.xml`: Dialog/filter/value-help parcali gorunumleri.

## 2) OData V4 tutorial eslesmeleri

### Step 4: Filtering, Sorting, Counting
- Nerede: `Materials.controller.js` -> `onSearch`, `onFilterConfirm`, `_applyODataListSort`
- Nerede: `Suppliers.controller.js` -> `onSearch`, `onFilterConfirm`, `_applyODataListSort`
- Ne yaptim: OData V4 list binding uzerinde filtre/siralama uyguladim, sonuc sayisini UI'da gosterdim.

### Step 5: Batch Groups
- Nerede: `Materials.controller.js` -> `onSave`, `onCancel`
- Nerede: `Suppliers.controller.js` -> `onSave`, `onCancel`
- Ne yaptim: `submitBatch("batchGroup")` ve `resetChanges("batchGroup")` ile toplu kaydet/iptal akisi kurdum.

### Step 6: Create and Edit
- Nerede: `Materials.controller.js` -> `onAdd`, `onEditRow`, `onDetailEditOpen`, `onDetailEditSave`
- Nerede: `Suppliers.controller.js` -> `onAdd`, `onEditRow`, `onDetailEditOpen`, `onDetailEditSave`
- Ne yaptim: `listBinding.create(...)` ile satir ekledim, dialog icinde satir bazli duzenleme yaptim.

### Step 7: Delete
- Nerede: `Materials.controller.js` -> `onDelete`
- Nerede: `Suppliers.controller.js` -> `onDelete`
- Ne yaptim: secili satirlari OData context uzerinden sildim; tekli/coklu silme mesajlarini ozellestirdim.

### Step 8: OData Operations
- Nerede: `Materials.controller.js` -> `onCSVValidate`, `onCSVUpload`
- Nerede: `Suppliers.controller.js` -> `onCSVValidate`, `onCSVUpload`
- Nerede: `srv/catalog-service.js` -> `this.on("validateCSV", ...)`, `this.on("uploadCSV", ...)`
- Ne yaptim: UI'dan `bindContext(.../CatalogService.validateCSV(...))` ve `execute("$auto")` ile action cagirdim.

### Step 9: List-Detail Scenario
- Nerede: `Materials.controller.js` -> `onDetail`, `onCloseDetail`
- Nerede: `Suppliers.controller.js` -> `onDetail`, `onCloseDetail`
- Ne yaptim: secili satirin context bilgisini detail panele tasidim (FlexibleColumnLayout ile).

## 3) SAPUI5 tutorial / pattern eslesmeleri
- Controller-View ayirimi (MVC): `*.controller.js` + `*.view.xml`
- Reusable fragment kullanimi: CSV, filter, edit popup'lari `view/fragments`
- JSONModel ile ekran durumu yonetimi: `matVM`, `suppVM`, `matDetail`, `suppDetail`
- i18n metin yonetimi: `app/webapp/i18n/*.properties`
- Mesaj mekanizmasi: `sap/m/MessageToast`, `sap/m/MessageBox`

## 4) CAP ve HANA baglantili kisimlar
- `package.json` + `.cdsrc.json`: CAP profile ve DB baglanti ayarlari.
- `srv/catalog-service.js`: backend tarafinda create/update validasyonlari ve otomatik numara uretimi.
- Not: UI tarafi OData V4 model ile konusur; is kurallari backend'de merkezi tutulur.

## 5) Sunumda kullanabilecegin kisa cumleler
- "Bu ekranda OData V4 list binding kullandim; filtre ve siralamayi client tarafinda degil, model binding uzerinden yonettim."
- "Kaydet/iptal akisinda batchGroup kullandim, bu sayede birden fazla degisikligi tek transaction gibi yonettim."
- "CSV yukleme akisini iki asamali kurguladim: once validate action, sonra upload action."
- "Detay popup'larini fragment ile ayrip tekrar kullanilabilir hale getirdim."
- "Hata mesajlarini BaseController'da merkeziledim ve i18n ile yerellestirdim."
