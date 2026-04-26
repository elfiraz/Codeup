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

  // Sunum notu:
  // Bu controller, Suppliers ekranında OData V4 liste yönetimi + detay + action akışını yönetir.
  // Referans: OData V4 Tutorial Step 4, 5, 6, 8, 9.
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

    // Step 5 (Batch Groups): tüm satır güncellemeleri tek submitBatch ile kaydediliyor.
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
      this.byId("suppTable")?.clearSelection();
      this._set({ edit: false, dirty: false });
      this._set({ hasSel: false });
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
      const oB = oT.getBinding("rows");
      const sMsg = aI.length === 1
        ? (() => {
            const oCtx = oB.getContexts(aI[0], 1)[0];
            const sName = oCtx?.getObject()?.Ad || "-";
            return this.getText("dialog_deleteOneSupplier", [sName]);
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
      const aF = s ? [new Filter({
        path: "Ad",
        operator: FilterOperator.Contains,
        value1: s,
        caseSensitive: false
      })] : [];
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
    // Step 8 (OData Operations): validateCSV/uploadCSV action'ları backend'e operation olarak gider.
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
      const hasAd = headers.includes("Ad");
      const hasEmail = headers.includes("Email");
      aChecks.push({
        title: this.getText("csv_check_requiredCols"),
        ok: hasAd && hasEmail,
        message: (hasAd && hasEmail) ? this.getText("csv_ok") : this.getText("csv_err_missingCols", ["Ad, Email"])
      });
      aChecks.push({
        title: this.getText("csv_check_hasRows"),
        ok: rows.length > 0,
        message: rows.length > 0 ? this.getText("csv_ok") : this.getText("csv_err_noRows")
      });

      if (!(hasAd && hasEmail) || rows.length === 0) {
        oCsv.setProperty("/checks", aChecks);
        oCsv.setProperty("/errors", aErrs);
        oCsv.setProperty("/hasErrors", false);
        oCsv.setProperty("/validated", false);
        this._set({ busy: false });
        return;
      }

      let bad = 0;
      rows.forEach(r => {
        if (!String(r.Ad || "").trim()) {
          bad++;
          aErrs.push({ row: r.__row, column: "Ad", error: this.getText("csv_err_emptyField", ["Ad"]) });
        }
        if (!String(r.Email || "").trim()) {
          bad++;
          aErrs.push({ row: r.__row, column: "Email", error: this.getText("csv_err_emptyField", ["Email"]) });
        } else if (!this._isValidEmail(r.Email)) {
          bad++;
          aErrs.push({ row: r.__row, column: "Email", error: this.getText("csv_err_badEmail") });
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

      // Client-side hata varsa server çağrısı yapma
      if (aErrs.length) {
        this._set({ busy: false });
        return;
      }

      this._resolveODataAnchorPath("suppTable", "Suppliers").then(sPath => {
        if (!sPath) {
          this._set({ busy: false });
          this.showError(this.getText("err_csvNeedSupplierRow"));
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
            // Bazı dillerde dönen aksiyon metni yerelleşebildiği için yalnızca explicit cancel'i engelle
            if (sA === MessageBox.Action.CANCEL) {
              return;
            }
            this._set({ busy: true });
            this._withTimeout(this._resolveODataAnchorPath("suppTable", "Suppliers"), 4000).then(sPath => {
              if (!sPath) {
                this._set({ busy: false });
                this.showError(this.getText("err_csvNeedSupplierRow"));
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
    // Step 9 (List-Detail): seçilen supplier context'i detail paneline taşınır.
    onDetail: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext();
      const o = oCtx?.getObject();
      if (!o) return;
      this._suppDetailCtx = oCtx;
      this.getModel("suppDetail").setData({ ...o });
      this._set({ layout: LayoutType.TwoColumnsBeginExpanded });

      const rb = this.getModel("i18n").getResourceBundle();
      this.byId("detailMatList").bindItems({
        path: "/Materials",
        filters: [new Filter("TedarikciNo", FilterOperator.EQ, o.TedarikciNo)],
        template: new sap.m.ObjectListItem({
          title: "{MalzemeTanimi}", intro: "{MalzemeNo}",
          number: "{Fiyat}", numberUnit: "{Doviz}",
          attributes: [
            new sap.m.ObjectAttribute({ title: rb.getText("col_satinalmaGrubu"), text: "{SatinalmaGrAciklama}" }),
            new sap.m.ObjectAttribute({ title: rb.getText("col_stok"), text: "{Stok}" })
          ]
        })
      });
    },

    onCloseDetail: function () { this._set({ layout: LayoutType.OneColumn }); },

    onDetailEditOpen: function () {
      if (!this._suppDetailCtx) {
        return;
      }
      if (!this._oSuppEdit) {
        this._oSuppEdit = sap.ui.xmlfragment(this.getView().getId(),
          "com.abics.codeup.view.fragments.SupplierDetailEdit", this);
        this.getView().addDependent(this._oSuppEdit);
      }
      this._oSuppEdit.bindElement({
        path: this._suppDetailCtx.getPath(),
        parameters: { $$updateGroupId: "batchGroup" }
      });
      const sSuppNo = this.getModel("suppDetail").getProperty("/TedarikciNo");
      const oMatTable = sap.ui.core.Fragment.byId(this.getView().getId(), "suppEditMatTable");
      if (oMatTable) {
        oMatTable.unbindItems();
        const oTemplate = new sap.m.ColumnListItem({
          cells: [
            new sap.m.Text({ text: "{MalzemeNo}" }),
            new sap.m.ComboBox({
              selectedKey: "{MalzemeTanimi}",
              width: "100%",
              selectionChange: this.onSuppEditMaterialNameSelect.bind(this),
              items: {
                path: "/Materials",
                parameters: {
                  $orderby: "MalzemeTanimi asc",
                  $select: "MalzemeTanimi"
                },
                templateShareable: false,
                template: new sap.ui.core.Item({
                  key: "{MalzemeTanimi}",
                  text: "{MalzemeTanimi}"
                })
              }
            }),
            new sap.m.Select({
              selectedKey: "{Doviz}",
              items: [
                new sap.ui.core.Item({ key: "TRY", text: "TRY" }),
                new sap.ui.core.Item({ key: "USD", text: "USD" }),
                new sap.ui.core.Item({ key: "EUR", text: "EUR" }),
                new sap.ui.core.Item({ key: "GBP", text: "GBP" })
              ]
            }),
            new sap.m.Input({ value: "{Fiyat}", textAlign: "End" }),
            new sap.m.Input({ value: "{Stok}", textAlign: "End" })
          ]
        });
        oMatTable.bindItems({
          path: "/Materials",
          parameters: {
            $$updateGroupId: "batchGroup",
            $orderby: "MalzemeNo asc",
            $select: "MalzemeNo,MalzemeTanimi,Doviz,Fiyat,Stok,TedarikciNo"
          },
          filters: [new Filter("TedarikciNo", FilterOperator.EQ, sSuppNo)],
          template: oTemplate,
          templateShareable: false
        });
      }
      const oBinding = this._oSuppEdit.getObjectBinding();
      if (oBinding && typeof oBinding.requestObject === "function") {
        oBinding.requestObject().then(() => this._oSuppEdit.open()).catch(() => this._oSuppEdit.open());
      } else {
        this._oSuppEdit.open();
      }
    },

    onDetailEditSave: function () {
      if (!this._suppDetailCtx) {
        return;
      }
      this._set({ busy: true });
      this.getModel().submitBatch("batchGroup")
        .then(() => this._suppDetailCtx.requestObject())
        .then((oNow) => {
          const oData = oNow || this._suppDetailCtx.getObject() || {};
          const oMatTable = sap.ui.core.Fragment.byId(this.getView().getId(), "suppEditMatTable");
          if (oMatTable) {
            oMatTable.unbindItems();
          }
          this._oSuppEdit.close();
          this.getModel("suppDetail").setData({ ...oData });
          this._set({ busy: false });
          MessageToast.show(this.getText("msg_saveSuccess"));
          this._refresh();
        })
        .catch((e) => {
          this._set({ busy: false });
          this.showError((e && e.message) || String(e));
        });
    },

    onDetailEditCancel: function () {
      this.getModel().resetChanges("batchGroup");
      const oMatTable = sap.ui.core.Fragment.byId(this.getView().getId(), "suppEditMatTable");
      if (oMatTable) {
        oMatTable.unbindItems();
      }
      if (this._oSuppEdit) {
        this._oSuppEdit.close();
      }
    },

    onSuppEditAddMaterial: function () {
      const sSuppNo = this.getModel("suppDetail").getProperty("/TedarikciNo");
      const oMatTable = sap.ui.core.Fragment.byId(this.getView().getId(), "suppEditMatTable");
      const oBinding = oMatTable && oMatTable.getBinding("items");
      if (!oBinding || typeof oBinding.create !== "function") {
        this.showError(this.getText("err_odataUnknownOp"));
        return;
      }
      oBinding.create({
        MalzemeTanimi: "",
        Description: "",
        Doviz: "TRY",
        Fiyat: 0,
        Stok: 0,
        TedarikciNo: sSuppNo
      }, true);
    },

    onSuppEditMaterialNameSelect: function (oEvent) {
      const oItem = oEvent.getParameter("selectedItem");
      const oCtx = oEvent.getSource().getBindingContext();
      if (!oItem || !oCtx) {
        return;
      }
      oCtx.setProperty("MalzemeTanimi", oItem.getKey());
    },

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
