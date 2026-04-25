sap.ui.define([
  "com/abics/codeup/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/f/LayoutType"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, MessageBox, MessageToast, LayoutType) {
  "use strict";

  return BaseController.extend("com.abics.codeup.controller.pages.Materials", {

    onInit: function () {
      this.setModel(new JSONModel({
        layout: LayoutType.OneColumn, edit: false, dirty: false,
        hasSel: false, busy: false, filterBtn: "Default", count: 0
      }), "matVM");
      this.setModel(new JSONModel({}), "matDetail");
      this.getRouter().getRoute("materials").attachPatternMatched(this._onRoute, this);
    },

    _onRoute: function () {
      this._set({ layout: LayoutType.OneColumn, edit: false, dirty: false, hasSel: false });
      this._refresh();
    },

    /** JSONModel alanlarını tek tek güncelle (setData ile layout/binding bozulmasını önler) */
    _set: function (o) {
      const m = this.getModel("matVM");
      Object.keys(o).forEach((k) => {
        m.setProperty("/" + k, o[k]);
      });
    },

    /** Araç çubuğunda kayıt sayısı: sadece sayı — i18n XML'de */
    fmtCountParen: function (n) {
      return "(" + (n != null ? n : 0) + ")";
    },

    _refresh: function () {
      const b = this.byId("matTable")?.getBinding("rows");
      if (b) {
        b.refresh();
        b.attachEventOnce("dataReceived", () => {
          this._set({ count: b.getLength() });
        });
      }
    },

    /** OData V4: sadece $orderby ($$ parametreleri changeParameters ile verilemez) */
    _applyODataListSort: function (oBinding, sKey, bDesc) {
      if (!oBinding || !sKey) {
        return;
      }
      const sOrd = sKey + (bDesc ? " desc" : " asc");
      try {
        if (typeof oBinding.changeParameters === "function") {
          oBinding.changeParameters({ $orderby: sOrd });
        } else if (typeof oBinding.sort === "function") {
          oBinding.sort([new Sorter(sKey, bDesc)]);
        }
      } catch (e) {
        /* bekleyen değişiklik vb. — tablo çalışmaya devam eder */
      }
    },

    // ── YENİ SATIR (OData V4: oModel.create yok; tablo list binding .create) ─
    onAdd: function () {
      const oB = this.byId("matTable")?.getBinding("rows");
      if (!oB || typeof oB.create !== "function") {
        return;
      }
      oB.create(
        { MalzemeTanimi: "", Site: "100", SiteTanimi: "X ŞİRKETİ MERKEZ PROJESİ", Doviz: "TRY", Fiyat: 0, Stok: 0 },
        true
      );
      this._set({ edit: true, dirty: true });
    },

    onEditRow: function () { this._set({ edit: true }); },
    onDirty: function ()   { this._set({ dirty: true }); },

    // ── KAYDET ──────────────────────────────────────────────
    onSave: function () {
      if (!this._validate()) return;
      this._set({ busy: true });
      this.getModel().submitBatch("batchGroup")
        .then(() => {
          this._set({ edit: false, dirty: false, busy: false });
          MessageToast.show(this.getText("msg_saveSuccess"));
          this._refresh();
        })
        .catch(e => { this._set({ busy: false }); this.showError(e.message); });
    },

    // ── İPTAL ───────────────────────────────────────────────
    onCancel: function () {
      this.getModel().resetChanges("batchGroup");
      this._set({ edit: false, dirty: false });
      this._refresh();
    },

    // ── SEÇİM ───────────────────────────────────────────────
    onSelChange: function () {
      const n = this.byId("matTable").getSelectedIndices().length;
      this._set({ hasSel: n > 0 });
    },

    // ── SİLME ───────────────────────────────────────────────
    onDelete: function () {
      const oT = this.byId("matTable");
      const aI = oT.getSelectedIndices();
      if (!aI.length) {
        MessageToast.show(this.getText("msg_noSelection"));
        return;
      }
      MessageBox.confirm(this.getText("dialog_deleteMsg", [aI.length]), {
        title: this.getText("dialog_deleteTitle"),
        icon: MessageBox.Icon.WARNING,
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        onClose: sA => {
          if (sA !== MessageBox.Action.OK) {
            return;
          }
          const oB = oT.getBinding("rows");
          Promise.all([...aI].reverse().map(i => {
            const oC = oB.getContexts(i, 1)[0];
            return oC ? oC.delete("$auto") : Promise.resolve();
          })).then(() => {
            oT.clearSelection();
            this._set({ hasSel: false });
            MessageToast.show(this.getText("dialog_deleteSuccess", [aI.length]));
          }).catch(e => this.showError(e.message));
        }
      });
    },

    // ── ARAMA ───────────────────────────────────────────────
    onSearch: function (oEvent) {
      const s = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
      const aF = s ? [new Filter({
        filters: [
          new Filter("MalzemeTanimi", FilterOperator.Contains, s),
          new Filter("MalzemeNo",     FilterOperator.Contains, s),
          new Filter("TedarikciAd",   FilterOperator.Contains, s)
        ], and: false
      })] : [];
      this.byId("matTable")?.getBinding("rows")?.filter(aF);
    },

    // ── FİLTRE ──────────────────────────────────────────────
    onFilter: function () {
      if (!this._oFD) {
        this._oFD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.MaterialFilter", this);
        this.getView().addDependent(this._oFD);
      }
      this._oFD.open();
    },

    onFilterConfirm: function (oEvent) {
      const aF = [], oSel = oEvent.getParameter("filterItems") || [];
      oSel.forEach(oItem => {
        aF.push(new Filter(oItem.getParent().getKey(), FilterOperator.EQ, oItem.getKey()));
      });
      const sSortKey = oEvent.getParameter("sortItem")?.getKey();
      const bDesc    = oEvent.getParameter("sortDescending");
      const oB = this.byId("matTable").getBinding("rows");
      if (aF.length) oB.filter([new Filter({ filters: aF, and: false })]);
      else oB.filter([]);
      if (sSortKey) {
        this._applyODataListSort(oB, sSortKey, bDesc);
      }
      this._set({ filterBtn: aF.length ? "Emphasized" : "Default" });
    },

    // ── CSV (OData action: doğrula → onay → yükle; fetch/axios yok) ───────────────
    onCSVOpen: function () {
      if (!this._oCSV) {
        this._oCSV = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.CSVDialog", this);
        this.getView().addDependent(this._oCSV);
      }
      this.getOwnerComponent().getModel("csvShared").setData({
        errors: [], validated: false, content: "", hasErrors: false
      });
      this._oCSV.open();
    },

    onCSVFile: function (oEvent) {
      const oF = oEvent.getParameter("files")[0];
      if (!oF) {
        return;
      }
      const r = new FileReader();
      const oCsv = this.getOwnerComponent().getModel("csvShared");
      r.onload = function (e) {
        oCsv.setProperty("/content", e.target.result);
        oCsv.setProperty("/validated", false);
        oCsv.setProperty("/hasErrors", false);
        oCsv.setProperty("/errors", []);
      };
      r.readAsText(oF, "UTF-8");
    },

    onCSVValidate: function () {
      const oCsv = this.getOwnerComponent().getModel("csvShared");
      const sCsv = oCsv.getProperty("/content");
      if (!sCsv) {
        MessageToast.show(this.getText("msg_selectCsvFile"));
        return;
      }
      this._set({ busy: true });
      this._resolveODataAnchorPath("matTable", "Materials").then(sPath => {
        if (!sPath) {
          this._set({ busy: false });
          this.showError(this.getText("err_csvNeedMaterialRow"));
          return null;
        }
        const oA = this.getModel().bindContext(sPath + "/validateCSV(...)");
        oA.setParameter("csvContent", sCsv);
        return oA.execute("$auto").then(() => oA);
      }).then((oA) => {
        if (!oA) {
          return;
        }
        const oRes = oA.getBoundContext().getObject();
        const aE = oRes && (oRes.value !== undefined ? oRes.value : oRes) || [];
        oCsv.setProperty("/errors", Array.isArray(aE) ? aE : []);
        oCsv.setProperty("/validated", !aE || aE.length === 0);
        oCsv.setProperty("/hasErrors", !!(aE && aE.length));
        this._set({ busy: false });
      }).catch(e => {
        this._set({ busy: false });
        this.showError((e && e.message) || (e && String(e)) || this.getText("err_odataUnknownOp"));
      });
    },

    onCSVUpload: function () {
      const oCsv = this.getOwnerComponent().getModel("csvShared");
      const sCsv = oCsv.getProperty("/content");
      MessageBox.confirm(
        this.getText("dialog_csvConfirmMsg"),
        {
          title: this.getText("dialog_csvConfirmTitle"),
          icon: MessageBox.Icon.INFORMATION,
          onClose: (sA) => {
            if (sA !== MessageBox.Action.OK) {
              return;
            }
            this._set({ busy: true });
            this._resolveODataAnchorPath("matTable", "Materials").then(sPath => {
              if (!sPath) {
                this._set({ busy: false });
                this.showError(this.getText("err_csvNeedMaterialRow"));
                return null;
              }
              const oA = this.getModel().bindContext(sPath + "/uploadCSV(...)");
              oA.setParameter("csvContent", sCsv);
              return oA.execute("$auto").then(() => oA);
            }).then((oA) => {
              if (!oA) {
                return;
              }
              const o = oA.getBoundContext().getObject();
              this._oCSV.close();
              this._set({ busy: false });
              MessageToast.show(this.getText("msg_csvUploaded", [String((o && o.inserted) || 0)]));
              this._refresh();
            }).catch(e => {
              this._set({ busy: false });
              this.showError((e && e.message) || (e && String(e)) || this.getText("err_odataUnknownOp"));
            });
          }
        }
      );
    },

    onCSVClose: function () { this._oCSV.close(); },

    // ── DETAY ───────────────────────────────────────────────
    onDetail: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext();
      if (!oCtx) {
        return;
      }
      const o = oCtx.getObject();
      this.getModel("matDetail").setData(o);
      this._set({ layout: LayoutType.TwoColumnsBeginExpanded });
      this._loadSupplierPanel(o, oCtx);
    },

    /**
     * Tedarikçi: navigasyon + mutlak yol + liste; başarısız olsa bile malzeme satırındaki No/Ad ile doldur
     */
    _loadSupplierPanel: function (o, oMatCtx) {
      const oBox = this.byId("detailSuppBox");
      const oNo  = this.byId("detailNoSupp");
      while (oBox.getItems().length > 1) {
        oBox.removeItem(oBox.getItems()[1]);
      }
      const sNo = o.TedarikciNo != null ? String(o.TedarikciNo).trim() : "";
      if (!sNo && !o.TedarikciAd) {
        oNo.setVisible(true);
        return;
      }
      oNo.setVisible(false);
      // Önce malzeme satırındaki No/Ad ile doldur (OData gecikse bile boş kutu kalmaz)
      this._renderDetailSupplierForm(oBox, o, sNo, null);
      const oM = this.getModel();
      const esc = sNo.replace(/'/g, "''");
      const that = this;
      oM.bindContext("tedarikci", oMatCtx).requestObject()
        .catch(function () { return null; })
        .then(function (s) {
          if (s && (s.TedarikciNo || s.Ad)) {
            return s;
          }
          return oM.bindContext("/Suppliers(TedarikciNo='" + esc + "')", undefined).requestObject()
            .catch(function () { return null; });
        })
        .then(function (s) {
          if (s && (s.TedarikciNo || s.Ad)) {
            return s;
          }
          if (!sNo) {
            return null;
          }
          const oL = oM.bindList("/Suppliers", null, null, [
            new Filter("TedarikciNo", FilterOperator.EQ, sNo)
          ], { length: 1 });
          return oL.requestContexts(0, 1)
            .then(function (a) {
              return a[0] && a[0].getObject();
            })
            .finally(function () {
              try {
                oL.destroy();
              } catch (e) { /* yoksay */ }
            });
        })
        .catch(function () { return null; })
        .then(function (sSrv) {
          that._renderDetailSupplierForm(oBox, o, sNo, sSrv);
        });
    },

    /**
     * programatik SimpleForm+ResponsiveGridLayout bazen kırılır; VBox+satır her zaman çizilir
     */
    _renderDetailSupplierForm: function (oBox, oMat, sNo, sSrv) {
      const that = this;
      try {
        while (oBox.getItems().length > 1) {
          oBox.removeItem(oBox.getItems()[1]);
        }
        const s = sSrv && typeof sSrv === "object" ? sSrv : {};
        const tNo = s.TedarikciNo != null && String(s.TedarikciNo) !== "" ? s.TedarikciNo : sNo;
        const tAd = s.Ad || oMat.TedarikciAd || "-";
        const aRows = [
          ["col_tedarikciNo", tNo || "-"],
          ["col_ad", tAd],
          ["col_ulke", s.Ulke],
          ["col_doviz", s.Doviz],
          ["col_email", s.Email],
          ["col_telefon", s.Telefon]
        ];
        const oV = new sap.m.VBox({ class: "sapUiSmallMarginTop" });
        aRows.forEach(function (row) {
          oV.addItem(new sap.m.HBox({
            alignItems: "Center",
            class: "sapUiSmallMarginBottom",
            items: [
              new sap.m.Label({ text: that.getText(row[0]) + ":", width: "8rem" }),
              new sap.m.Text({ text: (row[1] != null && String(row[1]) !== "") ? String(row[1]) : "-", wrapping: true })
            ]
          }));
        });
        oBox.addItem(oV);
      } catch (e) {
        oBox.addItem(new sap.m.Text({ text: (oMat.TedarikciAd || sNo) || "-" }));
      }
    },

    onCloseDetail: function () { this._set({ layout: LayoutType.OneColumn }); },

    // ── VALUE HELP — Satınalma Grubu ────────────────────────
    onPGVH: function (oEvent) {
      const oSrc = oEvent.getSource();
      this._vhCtx = oSrc.getBindingContext() || oSrc.getParent().getBindingContext();
      if (!this._pgD) {
        this._pgD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.PGDialog", this);
        this.getView().addDependent(this._pgD);
      }
      this._pgD.open();
    },
    onPGSelect: function (oEvent) {
      const oI = oEvent.getParameter("selectedItem");
      const oListCtx = oI?.getBindingContext();
      if (oListCtx && this._vhCtx) {
        const oD = oListCtx.getObject();
        this._vhCtx.setProperty("SatinalmaGrubu", oD.GrupNo);
        this._vhCtx.setProperty("SatinalmaGrAciklama", oD.Aciklama);
        this._set({ dirty: true });
      }
      this._pgD.close();
    },

    // ── VALUE HELP — Tedarikçi ──────────────────────────────
    onSuppVH: function (oEvent) {
      const oSrc = oEvent.getSource();
      this._vhCtx = oSrc.getBindingContext() || oSrc.getParent().getBindingContext();
      if (!this._svD) {
        this._svD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.SuppVHDialog", this);
        this.getView().addDependent(this._svD);
      }
      this._svD.open();
    },
    onSuppSelect: function (oEvent) {
      const oI = oEvent.getParameter("selectedItem");
      const oListCtx = oI?.getBindingContext();
      if (oListCtx && this._vhCtx) {
        const oD = oListCtx.getObject();
        this._vhCtx.setProperty("TedarikciNo", oD.TedarikciNo);
        this._vhCtx.setProperty("TedarikciAd", oD.Ad);
        this._set({ dirty: true });
      }
      this._svD.close();
    },

    // ── VALİDASYON ──────────────────────────────────────────
    _validate: function () {
      const oB = this.byId("matTable").getBinding("rows");
      if (!oB) return true;
      let ok = true;
      (oB.getAllCurrentContexts?.() || []).forEach(c => {
        if (!c.getObject().MalzemeTanimi?.trim()) {
          this.showError(this.getText("materials_requiredMalzemeTanimi"));
          ok = false;
        }
      });
      return ok;
    }
  });
});
