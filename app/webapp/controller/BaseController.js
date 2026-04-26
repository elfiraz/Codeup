sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
  "use strict";

  // Sunum notu:
  // BaseController, sayfalar arası ortak yardımcı katmandır (router, i18n, hata yönetimi, OData yardımcıları).
  // Referans: SAPUI5 Walkthrough'daki BaseController pattern'i + OData V4 Tutorial'daki context/binding yaklaşımı.
  return Controller.extend("com.abics.codeup.controller.BaseController", {

    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    getText: function (sKey, aArgs) {
      const oView = this.getView && this.getView();
      const oI18nModel = oView?.getModel("i18n") || this.getOwnerComponent()?.getModel("i18n");
      const oBundle = oI18nModel?.getResourceBundle?.();
      if (!oBundle) {
        return sKey;
      }
      return oBundle.getText(sKey, aArgs);
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

    _parseCSV: function (sCsv) {
      const lines = String(sCsv || "").replace(/\r/g, "").split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        return { headers: [], rows: [] };
      }
      const splitRow = (line, delimiter) => {
        const vals = [];
        let cur = "";
        let inQ = false;
        for (const ch of line) {
          if (ch === "\"") { inQ = !inQ; continue; }
          if (ch === delimiter && !inQ) { vals.push(cur.trim()); cur = ""; }
          else { cur += ch; }
        }
        vals.push(cur.trim());
        return vals;
      };
      const headerLine = lines[0].replace(/^\uFEFF/, "");
      const commaCount = (headerLine.match(/,/g) || []).length;
      const semicolonCount = (headerLine.match(/;/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ";" : ",";
      const headers = splitRow(headerLine, delimiter).map(h => h.trim().replace(/^\"|\"$/g, ""));
      const rows = lines.slice(1).map((line, idx) => {
        const vals = splitRow(line, delimiter);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        obj.__row = idx + 2;
        return obj;
      });
      return { headers, rows };
    },

    _isValidEmail: function (s) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
    },

    // OData V4 operation kuralı: instance-bound action için tekil context path gerekir.
    // Bu yardımcı, tablo binding tipine göre güvenli şekilde bir anchor path bulur.
    _resolveODataAnchorPath: function (sTableId, sEntitySet) {
      const b = sTableId && this.byId(sTableId) && this.byId(sTableId).getBinding("rows");
      if (b) {
        // Binding implementation'ına göre kullanılabilir API değişebiliyor
        if (typeof b.getContextByIndex === "function") {
          const c = b.getContextByIndex(0);
          if (c) {
            return Promise.resolve(c.getPath());
          }
        }
        if (typeof b.getContexts === "function") {
          const aCtx = b.getContexts(0, 1);
          if (aCtx && aCtx[0]) {
            return Promise.resolve(aCtx[0].getPath());
          }
        }
        if (typeof b.requestContexts === "function") {
          return b.requestContexts(0, 1).then((aCtx) => (aCtx && aCtx[0] && aCtx[0].getPath()) || null);
        }
      }
      const oList = this.getModel().bindList("/" + sEntitySet, null, null, null, { $top: 1 });
      if (oList && typeof oList.requestContexts === "function") {
        return oList.requestContexts(0, 1).then((a) => (a[0] && a[0].getPath()) || null);
      }
      const aC = oList && oList.getContexts && oList.getContexts(0, 1);
      return Promise.resolve((aC && aC[0] && aC[0].getPath()) || null);
    },

    _withTimeout: function (p, ms) {
      return Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error(this.getText("err_timeout"))), ms))
      ]);
    }
  });
});
