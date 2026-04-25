sap.ui.define([
  "com/abics/codeup/controller/BaseController"
], function (BaseController) {
  "use strict";

  return BaseController.extend("com.abics.codeup.controller.App", {

    onInit: function () {
      this.getRouter().attachRouteMatched(this._onRoute, this);
    },

    /** Yan menüyü aç/kapat (ToolPage) */
    onMenuButton: function () {
      const o = this.byId("toolPage");
      o.setSideExpanded(!o.getSideExpanded());
    },

    /**
     * Menüden rota seçimi — kaydedilmemiş OData değişikliklerinde uyarı (routing guard)
     */
    onSideNav: function (oEvent) {
      const oItem = oEvent.getParameter("item");
      const sKey = oItem && oItem.getKey();
      if (!sKey) {
        return;
      }
      this.checkUnsaved(() => {
        this.getRouter().navTo(sKey);
        this.byId("toolPage").setSideExpanded(false);
      });
    },

    /** Geçerli sayfaya göre yan menü seçimini senkronize et */
    _onRoute: function (oEvent) {
      const sName = oEvent.getParameter("name");
      const oSide = this.byId("sideNav");
      if (oSide) {
        oSide.setSelectedKey(sName);
      }
    }
  });
});
