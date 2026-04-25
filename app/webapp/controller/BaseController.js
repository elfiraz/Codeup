sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("com.abics.codeup.controller.BaseController", {

    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    getText: function (sKey, aArgs) {
      return this.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    },

    getModel: function (sName) {
      return this.getView().getModel(sName) || this.getOwnerComponent().getModel(sName);
    },

    setModel: function (oModel, sName) {
      return this.getView().setModel(oModel, sName);
    },

    showSuccess: function (sKey, aArgs) {
      MessageToast.show(this.getText(sKey, aArgs));
    },

    // OData/UI5’in İngilizce mesajlarını i18n ile Türkçeleştirir (gerekirse yeni eşleme ekle)
    showError: function (sMsg) {
      let t = sMsg && String(sMsg) || this.getText("err_odataUnknownOp");
      if (t.indexOf("Unknown operation") === 0) {
        t = this.getText("err_odataUnknownOp");
      } else if (t.indexOf("must be called on a single instance") >= 0) {
        t = this.getText("err_odataActionInstance");
      }
      MessageBox.error(t, { title: this.getText("dialog_errorTitle") });
    },

    validateEmail: function (s) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    },

    checkUnsaved: function (fnGo) {
      const oModel = this.getModel();
      if (oModel && oModel.hasPendingChanges && oModel.hasPendingChanges()) {
        MessageBox.warning(this.getText("dialog_unsavedMsg"), {
          title: this.getText("dialog_unsaved"),
          actions: [this.getText("dialog_leave"), this.getText("dialog_stay")],
          onClose: sA => {
            if (sA === this.getText("dialog_leave")) {
              oModel.resetChanges("batchGroup");
              fnGo();
            }
          }
        });
      } else {
        fnGo();
      }
    },

    /** CSV hata satırı başlığı (i18n parametreli) */
    formatCsvErrTitle: function (iRow, sColumn) {
      return this.getText("csv_errRowCol", [iRow, sColumn]);
    },

    // OData instance-bound eylem için gerekli: koleksiyon yolu yok, tek satır yolu (CAP)
    _resolveODataAnchorPath: function (sTableId, sEntitySet) {
      const b = sTableId && this.byId(sTableId) && this.byId(sTableId).getBinding("rows");
      if (b) {
        const c = b.getContextByIndex(0);
        if (c) {
          return Promise.resolve(c.getPath());
        }
      }
      const oList = this.getModel().bindList("/" + sEntitySet, null, null, null, { $top: 1 });
      if (oList && typeof oList.requestContexts === "function") {
        return oList.requestContexts(0, 1).then((a) => (a[0] && a[0].getPath()) || null);
      }
      const aC = oList && oList.getContexts && oList.getContexts(0, 1);
      return Promise.resolve((aC && aC[0] && aC[0].getPath()) || null);
    }
  });
});
