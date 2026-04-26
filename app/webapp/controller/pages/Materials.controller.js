sap.ui.define([
  "com/abics/codeup/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/m/ViewSettingsItem",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/f/LayoutType"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, ViewSettingsItem, MessageBox, MessageToast, LayoutType) {
  "use strict";

  // Sunum notu:
  // Bu controller'da SAPUI5 + OData V4 List Binding yaklaşımı kullanıldı.
  // Referans: OData V4 Tutorial Step 4 (Filtering/Sorting), Step 5 (Batch Groups), Step 6 (Create/Edit), Step 8 (Operations).
  return BaseController.extend("com.abics.codeup.controller.pages.Materials", {

    onInit: function () {
      this.setModel(new JSONModel({
        layout: LayoutType.OneColumn, edit: false, dirty: false,
        hasSel: false, busy: false, filterBtn: "Default", filterCount: 0, count: 0
      }), "matVM");
      this.setModel(new JSONModel({}), "matDetail");
      this.getRouter().getRoute("materials").attachPatternMatched(this._onRoute, this);
    },

    _onRoute: function () {
      this._set({ layout: LayoutType.OneColumn, edit: false, dirty: false, hasSel: false, filterCount: 0, filterBtn: "Default" });
      this._refresh();
    },

    fmtFilterText: function (n) {
      return n > 0 ? this.getText("btn_filter") + " (" + n + ")" : this.getText("btn_filter");
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
      const oTable = this.byId("matTable");
      const oB = oTable?.getBinding("rows");
      if (!oB || typeof oB.create !== "function") {
        return;
      }
      oB.create(
        { MalzemeTanimi: "", Site: "100", SiteTanimi: "X ŞİRKETİ MERKEZ PROJESİ", Doviz: "TRY", Fiyat: 0, Stok: 0 },
        true
      );
      this._set({ edit: true, dirty: true });
      // Yeni satır altta oluştuğunda kullanıcı doğrudan görebilsin.
      setTimeout(() => {
        if (!oTable || typeof oTable.setFirstVisibleRow !== "function") {
          return;
        }
        const iLen = oB.getLength ? oB.getLength() : 0;
        const iTarget = Math.max(iLen - 1, 0);
        oTable.setFirstVisibleRow(iTarget);
      }, 0);
    },

    onEditRow: function () { this._set({ edit: true }); },
    onDirty: function ()   { this._set({ dirty: true }); },

    // ── KAYDET ──────────────────────────────────────────────
    // OData V4 Step 5: submitBatch("batchGroup") ile toplu değişiklik kaydı
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
      this.byId("matTable")?.clearSelection();
      this._set({ edit: false, dirty: false });
      this._set({ hasSel: false });
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
      const oB = oT.getBinding("rows");
      const sMsg = aI.length === 1
        ? (() => {
            const oCtx = oB.getContexts(aI[0], 1)[0];
            const sName = oCtx?.getObject()?.MalzemeTanimi || "-";
            return this.getText("dialog_deleteOneMaterial", [sName]);
          })()
        : this.getText("dialog_deleteMsg", [aI.length]);
      MessageBox.confirm(sMsg, {
        title: this.getText("dialog_deleteTitle"),
        icon: MessageBox.Icon.WARNING,
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        onClose: sA => {
          if (sA !== MessageBox.Action.OK) {
            return;
          }
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
        path: "MalzemeTanimi",
        operator: FilterOperator.Contains,
        value1: s,
        caseSensitive: false
      })] : [];
      this.byId("matTable")?.getBinding("rows")?.filter(aF);
    },

    // ── FİLTRE ──────────────────────────────────────────────
    // OData V4 Step 4: filtre/sıralama; çoklu filtrede OR/AND gruplama
    onFilter: function () {
      if (!this._oFD) {
        this._oFD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.MaterialFilter", this);
        this.getView().addDependent(this._oFD);
      }
      this._prepareFilterDialogItems().finally(() => this._oFD.open());
    },

    _prepareFilterDialogItems: function () {
      const oDialog = this._oFD;
      const aFilterItems = oDialog?.getFilterItems?.() || [];
      const oSuppFilter = aFilterItems.find(i => i.getKey() === "TedarikciNo");
      const oPurchFilter = aFilterItems.find(i => i.getKey() === "SatinalmaGrubu");
      if (!oSuppFilter || !oPurchFilter) {
        return Promise.resolve();
      }
      const oM = this.getModel();
      const pSupp = oM.bindList("/Suppliers", null, null, null, {
        $orderby: "Ad asc",
        $select: "TedarikciNo,Ad"
      }).requestContexts(0, 300);
      const pPurch = oM.bindList("/PurchasingGroups", null, null, null, {
        $orderby: "Aciklama asc",
        $select: "GrupNo,Aciklama"
      }).requestContexts(0, 100);
      return Promise.all([pSupp, pPurch]).then(([aSuppCtx, aPurchCtx]) => {
        oSuppFilter.removeAllItems();
        aSuppCtx.forEach(ctx => {
          const o = ctx.getObject();
          oSuppFilter.addItem(new ViewSettingsItem({
            key: o.TedarikciNo,
            text: (o.Ad || o.TedarikciNo) + " (" + o.TedarikciNo + ")"
          }));
        });
        oPurchFilter.removeAllItems();
        aPurchCtx.forEach(ctx => {
          const o = ctx.getObject();
          oPurchFilter.addItem(new ViewSettingsItem({
            key: o.GrupNo,
            text: (o.Aciklama || o.GrupNo) + " (" + o.GrupNo + ")"
          }));
        });
      }).catch(() => {});
    },

    onFilterConfirm: function (oEvent) {
      const oSel = oEvent.getParameter("filterItems") || [];
      const mGrouped = {};
      oSel.forEach(oItem => {
        const sKey = oItem.getParent().getKey();
        if (!mGrouped[sKey]) {
          mGrouped[sKey] = [];
        }
        mGrouped[sKey].push(oItem.getKey());
      });
      const aF = Object.keys(mGrouped).map((sGroupKey) => {
        const aVals = mGrouped[sGroupKey];
        const aGroupFilters = aVals.map((sVal) => {
          if (sGroupKey === "FiyatAralik") {
            if (sVal === "PRICE_0_10000") return new Filter("Fiyat", FilterOperator.BT, 0, 10000);
            if (sVal === "PRICE_10000_50000") return new Filter("Fiyat", FilterOperator.BT, 10000, 50000);
            return new Filter("Fiyat", FilterOperator.GT, 50000);
          }
          if (sGroupKey === "StokAralik") {
            if (sVal === "STOCK_0_10") return new Filter("Stok", FilterOperator.BT, 0, 10);
            if (sVal === "STOCK_10_100") return new Filter("Stok", FilterOperator.BT, 10, 100);
            return new Filter("Stok", FilterOperator.GT, 100);
          }
          return new Filter(sGroupKey, FilterOperator.EQ, sVal);
        });
        return aGroupFilters.length > 1 ? new Filter({ filters: aGroupFilters, and: false }) : aGroupFilters[0];
      });
      const sSortKey = oEvent.getParameter("sortItem")?.getKey();
      const bDesc    = oEvent.getParameter("sortDescending");
      const oB = this.byId("matTable").getBinding("rows");
      if (aF.length) oB.filter([new Filter({ filters: aF, and: true })]);
      else oB.filter([]);
      if (sSortKey) {
        this._applyODataListSort(oB, sSortKey, bDesc);
      }
      this._set({ filterBtn: aF.length ? "Emphasized" : "Default", filterCount: oSel.length });
    },

    // ── CSV (OData action: doğrula → onay → yükle; fetch/axios yok) ───────────────
    // OData V4 Step 8: action çağrısı bindContext(...)/execute("$auto") ile yapılıyor.
    onCSVOpen: function () {
      if (!this._oCSV) {
        this._oCSV = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.CSVDialog", this);
        this.getView().addDependent(this._oCSV);
      }
      this.getOwnerComponent().getModel("csvShared").setData({
        errors: [], checks: [], validated: false, content: "", hasErrors: false
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
        oCsv.setProperty("/checks", []);
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
      // 1) Hızlı client-side kontroller (tek tek göster)
      const { headers, rows } = this._parseCSV(sCsv);
      const aChecks = [];
      const aErrs = [];
      const hasMT = headers.includes("MalzemeTanimi");
      aChecks.push({
        title: this.getText("csv_check_requiredCols"),
        ok: hasMT,
        message: hasMT ? this.getText("csv_ok") : this.getText("csv_err_missingCols", ["MalzemeTanimi"])
      });
      aChecks.push({
        title: this.getText("csv_check_hasRows"),
        ok: rows.length > 0,
        message: rows.length > 0 ? this.getText("csv_ok") : this.getText("csv_err_noRows")
      });
      if (!hasMT || rows.length === 0) {
        oCsv.setProperty("/checks", aChecks);
        oCsv.setProperty("/errors", aErrs);
        oCsv.setProperty("/hasErrors", false);
        oCsv.setProperty("/validated", false);
        this._set({ busy: false });
        return;
      }

      let bad = 0;
      rows.forEach(r => {
        if (!String(r.MalzemeTanimi || "").trim()) {
          bad++;
          aErrs.push({ row: r.__row, column: "MalzemeTanimi", error: this.getText("csv_err_emptyField", ["MalzemeTanimi"]) });
        }
        if (r.Fiyat && isNaN(Number(String(r.Fiyat).replace(",", ".")))) {
          bad++;
          aErrs.push({ row: r.__row, column: "Fiyat", error: this.getText("csv_err_badNumber", ["Fiyat"]) });
        }
        if (r.Stok && isNaN(Number(String(r.Stok).replace(",", ".")))) {
          bad++;
          aErrs.push({ row: r.__row, column: "Stok", error: this.getText("csv_err_badNumber", ["Stok"]) });
        }
      });
      aChecks.push({
        title: this.getText("csv_check_rowRules"),
        ok: bad === 0,
        message: bad === 0 ? this.getText("csv_ok") : this.getText("csv_err_rowRules")
      });
      oCsv.setProperty("/checks", aChecks);
      oCsv.setProperty("/errors", aErrs);
      oCsv.setProperty("/hasErrors", aErrs.length > 0);
      oCsv.setProperty("/validated", aErrs.length === 0);
      if (aErrs.length) {
        this._set({ busy: false });
        return;
      }

      this._resolveODataAnchorPath("matTable", "Materials").then(sPath => {
        if (!sPath) {
          this._set({ busy: false });
          this.showError(this.getText("err_csvNeedMaterialRow"));
          return null;
        }
        const oA = this.getModel().bindContext(sPath + "/CatalogService.validateCSV(...)");
        oA.setParameter("csvContent", sCsv);
        return this._withTimeout(oA.execute("$auto").then(() => oA), 8000);
      }).then((oA) => {
        if (!oA) {
          return;
        }
        const oRes = oA.getBoundContext().getObject();
        const aE = oRes && (oRes.value !== undefined ? oRes.value : oRes) || [];
        const aSrv = Array.isArray(aE) ? aE : [];
        const aAll = (oCsv.getProperty("/errors") || []).concat(aSrv);
        oCsv.setProperty("/errors", aAll);
        oCsv.setProperty("/validated", aAll.length === 0);
        oCsv.setProperty("/hasErrors", aAll.length > 0);
        this._set({ busy: false });
      }).catch(e => {
        this._set({ busy: false });
        this.showError((e && e.message) || (e && String(e)) || this.getText("err_odataUnknownOp"));
      });
    },

    onCSVUpload: function () {
      const oCsv = this.getOwnerComponent().getModel("csvShared");
      const sCsv = oCsv.getProperty("/content");
      if (!oCsv.getProperty("/validated")) {
        MessageToast.show(this.getText("csv_validateFirst"));
        return;
      }
      MessageBox.confirm(
        this.getText("dialog_csvConfirmMsg"),
        {
          title: this.getText("dialog_csvConfirmTitle"),
          icon: MessageBox.Icon.INFORMATION,
          onClose: (sA) => {
            if (sA === MessageBox.Action.CANCEL) {
              return;
            }
            this._set({ busy: true });
            this._withTimeout(this._resolveODataAnchorPath("matTable", "Materials"), 4000).then(sPath => {
              if (!sPath) {
                this._set({ busy: false });
                this.showError(this.getText("err_csvNeedMaterialRow"));
                return null;
              }
              const oA = this.getModel().bindContext(sPath + "/CatalogService.uploadCSV(...)");
              oA.setParameter("csvContent", sCsv);
              return this._withTimeout(oA.execute("$auto"), 10000).then(() => oA);
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
    // OData V4 Step 9: list-detail senaryosunda satır context'i ile orta kolon detay açılır.
    onDetail: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext();
      if (!oCtx) {
        return;
      }
      this._matDetailCtx = oCtx;
      const o = oCtx.getObject();
      this.getModel("matDetail").setData({ ...o });
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
      const loadByList = function () {
        if (!sNo) {
          return Promise.resolve(null);
        }
        const oL = oM.bindList("/Suppliers", null, null, [
          new Filter("TedarikciNo", FilterOperator.EQ, sNo)
        ], {
          $top: 1,
          $select: "TedarikciNo,Ad,Ulke,Doviz,Email,Telefon"
        });
        return oL.requestContexts(0, 1)
          .then(function (a) {
            return a[0] && a[0].getObject();
          })
          .finally(function () {
            try {
              oL.destroy();
            } catch (e) { /* yoksay */ }
          });
      };
      oM.bindContext("tedarikci", oMatCtx).requestObject()
        .catch(function () { return null; })
        .then(function (s) {
          if (s && (s.TedarikciNo || s.Ad) && (s.Ulke || s.Doviz || s.Email || s.Telefon)) {
            return s;
          }
          return oM.bindContext("/Suppliers(TedarikciNo='" + esc + "')", undefined).requestObject()
            .catch(function () { return null; });
        })
        .then(function (s) {
          if (s && (s.TedarikciNo || s.Ad) && (s.Ulke || s.Doviz || s.Email || s.Telefon)) {
            return s;
          }
          return loadByList();
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
        const oV = new sap.m.VBox();
        oV.addStyleClass("sapUiSmallMarginTop");
        aRows.forEach(function (row) {
          const oRow = new sap.m.HBox({
            alignItems: "Center",
            items: [
              new sap.m.Label({ text: that.getText(row[0]) + ":", width: "8rem" }),
              new sap.m.Text({ text: (row[1] != null && String(row[1]) !== "") ? String(row[1]) : "-", wrapping: true })
            ]
          });
          oRow.addStyleClass("sapUiSmallMarginBottom");
          oV.addItem(oRow);
        });
        oBox.addItem(oV);
      } catch (e) {
        oBox.addItem(new sap.m.Text({ text: (oMat.TedarikciAd || sNo) || "-" }));
      }
    },

    onCloseDetail: function () { this._set({ layout: LayoutType.OneColumn }); },

    onDetailEditOpen: function () {
      if (!this._matDetailCtx) {
        return;
      }
      if (!this._oMatEdit) {
        this._oMatEdit = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.MaterialDetailEdit", this);
        this.getView().addDependent(this._oMatEdit);
      }
      this._oMatEdit.bindElement({
        path: this._matDetailCtx.getPath(),
        parameters: {
          $$updateGroupId: "batchGroup",
          $select: "MalzemeNo,MalzemeTanimi,Description,Fiyat,Doviz,Stok,TedarikciNo"
        }
      });
      const oBinding = this._oMatEdit.getObjectBinding();
      if (oBinding && typeof oBinding.requestObject === "function") {
        oBinding.requestObject().then(() => this._oMatEdit.open()).catch(() => this._oMatEdit.open());
      } else {
        this._oMatEdit.open();
      }
    },

    onDetailEditSave: function () {
      if (!this._matDetailCtx) {
        return;
      }
      this._set({ busy: true });
      this.getModel().submitBatch("batchGroup")
        .then(() => this._matDetailCtx.requestObject())
        .then((oNow) => {
          const oData = oNow || this._matDetailCtx.getObject() || {};
          this.getModel("matDetail").setData({ ...oData });
          this._loadSupplierPanel(oData, this._matDetailCtx);
          this._oMatEdit.close();
          this._set({ busy: false });
          MessageToast.show(this.getText("msg_saveSuccess"));
          this.getModel().refresh();
          this._refresh();
        })
        .catch((e) => {
          this._set({ busy: false });
          this.showError((e && e.message) || String(e));
        });
    },

    onDetailEditCancel: function () {
      this.getModel().resetChanges("batchGroup");
      if (this._oMatEdit) {
        this._oMatEdit.close();
      }
    },

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
