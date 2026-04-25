sap.ui.define([
  "com/abics/codeup/controller/BaseController"
], function (BaseController) {
  "use strict";
  return BaseController.extend("com.abics.codeup.controller.pages.PurchasingMasterData", {
    onInit: function () {
      this.getRouter().getRoute("purchasingMasterData").attachPatternMatched(() => {}, this);
    },
    onTabSelect: function (oEvent) {
      const sKey = oEvent.getParameter("key");
      const oTable = this.byId(
        sKey === "pg" ? "pgTable" : sKey === "sg" ? "sgTable" : "purTable"
      );
      oTable?.getBinding("rows")?.refresh();
    }
  });
});
