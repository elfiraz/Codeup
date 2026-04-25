namespace com.abics.codeup;
using { managed } from '@sap/cds/common';

entity PurchasingGroups {
  key GrupNo   : String(10);
      Aciklama : String(200);
}

entity SupplierStatGroups {
  key Kod        : String(10);
      Aciklama   : String(200);
      Gecerlilik : String(20) default 'Aktif';
}

entity Purchasers {
  key SatinalmaciNo : String(20);
      Ad            : String(200);
}

entity Suppliers : managed {
  key TedarikciNo        : String(20);
      Ad                 : String(200) @mandatory;
      TedarikciIstatGrup : String(10);
      IstatGrupAciklama  : String(200);
      Ulke               : String(100) default 'TÜRKİYE';
      Doviz              : String(10)  default 'TRY';
      Telefon            : String(30);
      Email              : String(200) @mandatory;
      SatinalmaciNo      : String(20);
      SatinalmaciAd      : String(200);
}

entity Materials : managed {
  key MalzemeNo           : String(20);
      Site                : String(10)  default '100';
      SiteTanimi          : String(200) default 'X ŞİRKETİ MERKEZ PROJESİ';
      MalzemeTanimi       : String(500) @mandatory;
      Description         : String(500);
      Fiyat               : Decimal(15,2);
      Doviz               : String(10)  default 'TRY';
      Stok                : Decimal(15,2);
      SatinalmaGrubu      : String(10);
      SatinalmaGrAciklama : String(200);
      TedarikciNo         : String(20);
      TedarikciAd         : String(200);
      tedarikci           : Association to Suppliers
                              on tedarikci.TedarikciNo = TedarikciNo;
}
