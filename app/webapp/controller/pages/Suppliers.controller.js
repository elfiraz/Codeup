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

  return BaseController.extend("com.abics.codeup.controller.pages.Suppliers", {

    onInit: function () {
      this.setModel(new JSONModel({
        layout: LayoutType.OneColumn, edit: false, dirty: false,
        hasSel: false, busy: false, filterBtn: "Default", count: 0
      }), "suppVM");
      this.setModel(new JSONModel({}), "suppDetail");
      this.getRouter().getRoute("suppliers").attachPatternMatched(this._onRoute, this);
    },

    _onRoute: function () {
      this._set({ layout: LayoutType.OneColumn, edit: false, dirty: false, hasSel: false });
      this._refresh();
    },

    _set: function (o) {
      const m = this.getModel("suppVM");
      Object.keys(o).forEach((k) => {
        m.setProperty("/" + k, o[k]);
      });
    },

    fmtCountParen: function (n) {
      return "(" + (n != null ? n : 0) + ")";
    },

    _refresh: function () {
      const b = this.byId("suppTable")?.getBinding("rows");
      if (b) {
        b.refresh();
        b.attachEventOnce("dataReceived", () => this._set({ count: b.getLength() }));
      }
    },

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
        /* yoksay */
      }
    },

    // OData V4: yeni satır yalnızca tablo /Materials benzeri list binding .create ile eklenir
    onAdd: function () {
      const oB = this.byId("suppTable")?.getBinding("rows");
      if (!oB || typeof oB.create !== "function") {
        return;
      }
      oB.create({ Ad: "", Email: "", Ulke: "TÜRKİYE", Doviz: "TRY" }, true);
      this._set({ edit: true, dirty: true });
    },

    onEditRow: function () { this._set({ edit: true }); },
    onDirty:   function () { this._set({ dirty: true }); },

    onEmailChange: function (oEvent) {
      const s = oEvent.getParameter("value");
      const oI = oEvent.getSource();
      if (s && !this.validateEmail(s)) {
        oI.setValueState("Error");
        oI.setValueStateText(this.getText("msg_invalidEmail"));
      } else {
        oI.setValueState("None");
      }
      this._set({ dirty: true });
    },

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

    onCancel: function () {
      this.getModel().resetChanges("batchGroup");
      this._set({ edit: false, dirty: false });
      this._refresh();
    },

    onSelChange: function () {
      this._set({ hasSel: this.byId("suppTable").getSelectedIndices().length > 0 });
    },

    onDelete: function () {
      const oT = this.byId("suppTable");
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
            const c = oB.getContexts(i, 1)[0];
            return c ? c.delete("$auto") : Promise.resolve();
          })).then(() => {
            oT.clearSelection();
            this._set({ hasSel: false });
            MessageToast.show(this.getText("dialog_deleteSuccess", [aI.length]));
          }).catch(e => this.showError(e.message));
        }
      });
    },

    onSearch: function (oEvent) {
      const s = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
      const aF = s ? [new Filter({ filters: [
        new Filter("Ad",          FilterOperator.Contains, s),
        new Filter("TedarikciNo", FilterOperator.Contains, s),
        new Filter("Email",       FilterOperator.Contains, s)
      ], and: false })] : [];
      this.byId("suppTable")?.getBinding("rows")?.filter(aF);
    },

    onFilter: function () {
      if (!this._oFD) {
        this._oFD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.SuppFilter", this);
        this.getView().addDependent(this._oFD);
      }
      this._oFD.open();
    },

    onFilterConfirm: function (oEvent) {
      const aF = (oEvent.getParameter("filterItems") || []).map(oI =>
        new Filter(oI.getParent().getKey(), FilterOperator.EQ, oI.getKey()));
      const sSortKey = oEvent.getParameter("sortItem")?.getKey();
      const bDesc    = oEvent.getParameter("sortDescending");
      const oB = this.byId("suppTable").getBinding("rows");
      oB.filter(aF.length ? [new Filter({ filters: aF, and: false })] : []);
      if (sSortKey) {
        this._applyODataListSort(oB, sSortKey, bDesc);
      }
      this._set({ filterBtn: aF.length ? "Emphasized" : "Default" });
    },

    // ── CSV (OData action; fetch/axios yok) ───────────────────────────────────────
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
      this._resolveODataAnchorPath("suppTable", "Suppliers").then(sPath => {
        if (!sPath) {
          this._set({ busy: false });
          this.showError(this.getText("err_csvNeedSupplierRow"));
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
            this._resolveODataAnchorPath("suppTable", "Suppliers").then(sPath => {
              if (!sPath) {
                this._set({ busy: false });
                this.showError(this.getText("err_csvNeedSupplierRow"));
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
      const o = oEvent.getSource().getBindingContext()?.getObject();
      if (!o) return;
      this.getModel("suppDetail").setData(o);
      this._set({ layout: LayoutType.TwoColumnsBeginExpanded });

      const rb = this.getModel("i18n").getResourceBundle();
      this.byId("detailMatList").bindItems({
        path: "/Materials",
        filters: [new Filter("TedarikciNo", FilterOperator.EQ, o.TedarikciNo)],
        template: new sap.m.ObjectListItem({
          title: "{MalzemeTanimi}", intro: "{MalzemeNo}",
          number: "{Fiyat}", numberUnit: "{Doviz}",
          attributes: [
            new sap.m.ObjectAttribute({ label: rb.getText("col_satinalmaGrubu"), text: "{SatinalmaGrAciklama}" }),
            new sap.m.ObjectAttribute({ label: rb.getText("col_stok"), text: "{Stok}" })
          ]
        })
      });
    },

    onCloseDetail: function () { this._set({ layout: LayoutType.OneColumn }); },

    // ── VALUE HELP — İstatistik Grubu ───────────────────────
    onSGVH: function (oEvent) {
      // Satır bağlamı: buton veya HBox üzerinden (yeni satırda da geçerli)
      const oSrc = oEvent.getSource();
      this._vhCtx = oSrc.getBindingContext() || oSrc.getParent().getBindingContext();
      if (!this._sgD) {
        this._sgD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.SGDialog", this);
        this.getView().addDependent(this._sgD);
      }
      this._sgD.open();
    },
    onSGSelect: function (oEvent) {
      // StandardListItem'da getKey yok; liste satırı OData bağlamından alan değerleri
      const oI = oEvent.getParameter("selectedItem");
      const oListCtx = oI?.getBindingContext();
      if (oListCtx && this._vhCtx) {
        const oD = oListCtx.getObject();
        this._vhCtx.setProperty("TedarikciIstatGrup", oD.Kod);
        this._vhCtx.setProperty("IstatGrupAciklama", oD.Aciklama);
        this._set({ dirty: true });
      }
      this._sgD.close();
    },

    // ── VALUE HELP — Satınalmacı ────────────────────────────
    onPurchVH: function (oEvent) {
      const oSrc = oEvent.getSource();
      this._vhCtx = oSrc.getBindingContext() || oSrc.getParent().getBindingContext();
      if (!this._pvD) {
        this._pvD = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.PurchDialog", this);
        this.getView().addDependent(this._pvD);
      }
      this._pvD.open();
    },
    onPurchSelect: function (oEvent) {
      const oI = oEvent.getParameter("selectedItem");
      const oListCtx = oI?.getBindingContext();
      if (oListCtx && this._vhCtx) {
        const oD = oListCtx.getObject();
        this._vhCtx.setProperty("SatinalmaciNo", oD.SatinalmaciNo);
        this._vhCtx.setProperty("SatinalmaciAd", oD.Ad);
        this._set({ dirty: true });
      }
      this._pvD.close();
    },

    _validate: function () {
      const oB = this.byId("suppTable").getBinding("rows");
      if (!oB) return true;
      let ok = true;
      (oB.getAllCurrentContexts?.() || []).forEach(c => {
        const d = c.getObject();
        if (!d.Ad?.trim()) {
          this.showError(this.getText("supplier_valAd"));
          ok = false;
        }
        if (!d.Email?.trim()) {
          this.showError(this.getText("supplier_valEmail"));
          ok = false;
        } else if (!this.validateEmail(d.Email)) {
          this.showError(this.getText("msg_invalidEmail"));
          ok = false;
        }
      });
      return ok;
    }
  });
});
