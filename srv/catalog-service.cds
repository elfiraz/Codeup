using { com.abics.codeup as db } from '../db/schema';

service CatalogService @(path:'/catalog') {

  @readonly entity PurchasingGroups   as projection on db.PurchasingGroups;
  @readonly entity SupplierStatGroups as projection on db.SupplierStatGroups;
  @readonly entity Purchasers         as projection on db.Purchasers;

  // Instance-bound: CSV eylemleri /Suppliers('...')/validateCSV yolu; UI5 anchor satırı kullanır
  entity Suppliers as projection on db.Suppliers actions {
    action validateCSV(csvContent: LargeString) returns array of {
      row: Integer; column: String; error: String;
    };
    action uploadCSV(csvContent: LargeString) returns {
      inserted: Integer; errors: Integer;
    };
  };

  entity Materials as projection on db.Materials actions {
    action validateCSV(csvContent: LargeString) returns array of {
      row: Integer; column: String; error: String;
    };
    action uploadCSV(csvContent: LargeString) returns {
      inserted: Integer; errors: Integer;
    };
  };
}
