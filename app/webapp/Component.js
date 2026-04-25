sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
  "use strict";
  return UIComponent.extend("com.abics.codeup.Component", {
    metadata: { manifest: "json" },
    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      // CSV diyaloğu: Malzeme/Tedarikçi ortak doğrulama durumu (lazy fragment ile uyumlu)
      this.setModel(new JSONModel({ errors: [], validated: false, content: "", hasErrors: false }), "csvShared");
      this.getRouter().initialize();
    },
    getContentDensityClass: function () {
      return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
    }
  });
});
