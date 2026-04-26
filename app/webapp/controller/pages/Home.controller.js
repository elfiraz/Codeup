sap.ui.define([
  "com/abics/codeup/controller/BaseController",
  "sap/m/ObjectListItem",
  "sap/m/ObjectAttribute",
  "sap/m/ObjectStatus"
], function (BaseController, ObjectListItem, ObjectAttribute, ObjectStatus) {
  "use strict";

  return BaseController.extend("com.abics.codeup.controller.pages.Home", {

    onInit: function () {
      this.getRouter().getRoute("home").attachPatternMatched(this._load, this);
    },

    /** Stok durumu metni (i18n) */
    fmtStockText: function (vStok) {
      const n = parseFloat(vStok);
      return n > 10 ? this.getText("status_stockOk") : this.getText("status_stockLow");
    },

    fmtStockState: function (vStok) {
      return parseFloat(vStok) > 10 ? "Success" : "Error";
    },

    _load: function () {
      const rb = this.getModel("i18n").getResourceBundle();

      // OData V4: satır sınırı $top ile değil, binding üzerinde length ile verilir (aksi halde veri gelmez)
      const oMat = this.byId("matList");
      oMat.unbindAggregation("items", true);
      oMat.bindItems({
        path: "/Materials",
        length: 3,
        parameters: { $orderby: "MalzemeNo desc" },
        template: new ObjectListItem({
          title: "{MalzemeTanimi}",
          number: "{Fiyat}",
          numberUnit: "{Doviz}",
          intro: "{MalzemeNo}",
          icon: "sap-icon://product",
          attributes: [
            new ObjectAttribute({ title: rb.getText("home_attr_pg"), text: "{SatinalmaGrAciklama}" }),
            new ObjectAttribute({ title: rb.getText("home_attr_supplier"), text: "{TedarikciAd}" })
          ],
          firstStatus: new ObjectStatus({
            text: { path: "Stok", formatter: this.fmtStockText.bind(this) },
            state: { path: "Stok", formatter: this.fmtStockState.bind(this) }
          })
        })
      });

      const oSupp = this.byId("suppList");
      oSupp.unbindAggregation("items", true);
      oSupp.bindItems({
        path: "/Suppliers",
        length: 3,
        parameters: { $orderby: "TedarikciNo desc" },
        template: new ObjectListItem({
          title: "{Ad}",
          intro: "{TedarikciNo}",
          icon: "sap-icon://supplier",
          attributes: [
            new ObjectAttribute({ title: rb.getText("home_attr_country"), text: "{Ulke}" }),
            new ObjectAttribute({ title: rb.getText("home_attr_email"), text: "{Email}" }),
            new ObjectAttribute({ title: rb.getText("home_attr_phone"), text: "{Telefon}" })
          ],
          firstStatus: new ObjectStatus({ text: "{Doviz}", state: "Success" })
        })
      });
    },

    /** Ana sayfadan çıkarken batch değişiklik uyarısı (routing guard) */
    onSeeAllMaterials: function () {
      this.checkUnsaved(() => this.getRouter().navTo("materials"));
    },

    onSeeAllSuppliers: function () {
      this.checkUnsaved(() => this.getRouter().navTo("suppliers"));
    }
  });
});
