const electron = require("electron");

var __entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

String.prototype.escapeHTML = function() {
  return String(this).replace(/[&<>"'\/]/g, function(s) {
    return __entityMap[s];
  });
}

var UI = (function(UI, undefined) {
  UI.initialize = function() {
    document.getElementById("quit-btn").addEventListener("click", function(e) {
      electron.ipcRenderer.send("quit");
    });
  }

  UI.showContextMenu = function(e) {
    var template = [
      {
        label: i18n.t("cut"),
        accelerator: "CmdOrCtrl+X",
        role: "cut",
      },
      {
        label: i18n.t("copy"),
        accelerator: "CmdOrCtrl+C",
        role: "copy"
      },
      {
        label: i18n.t("paste"),
        accelerator: "CmdOrCtrl+V",
        role: "paste"
      }
    ];
   
    const menu = electron.remote.Menu.buildFromTemplate(template);
    menu.popup(electron.remote.getCurrentWindow(), e.x, e.y);
  }

  UI.show = function(params) {
    if (params) {
      if (params.title) {
        UI.changeElementLanguage("title", params.title);
        document.getElementById("title").style.display = "block";
      } else {
        document.getElementById("title").style.display = "none";
      }
      if (params.message) {
        UI.changeElementLanguage("message", params.message);
        document.getElementById("message").style.display = "block";
      } else {
        document.getElementById("message").style.display = "none";
      }
    }

    UI.updateContentSize();

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }

  UI.updateContentSize = function() {
    electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);
  }

  UI.makeMultilingual = function(currentLanguage, callback) {
    i18n = i18next
      .use(window.i18nextXHRBackend)
      .init({
        lng: currentLanguage,
        fallbackLng: "en",
        backend: {
          loadPath: "../../locales/{{lng}}/{{ns}}.json"
        },
        debug: false
    }, function(err, t) {
      updateUI();
      callback();
    });
  }

  UI.changeLanguage = function(language, callback) {
    i18n.changeLanguage(language, function(err, t) {
      updateUI();
      if (callback) {
        callback();
      }
    });
  }

  UI.changeElementLanguage = function(el, key) {
    document.getElementById(el).innerHTML = i18n.t(key);
    document.getElementById(el).setAttribute("data-i18n", key);
  }

  function updateUI() {
    var i18nList = document.querySelectorAll('[data-i18n]');
    i18nList.forEach(function(v){
      v.innerHTML = i18n.t(v.dataset.i18n, v.dataset.i18nOptions);
    });
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, params) {
  UI.makeMultilingual(params.language, function() {
    UI.show(params);
  });
});

electron.ipcRenderer.on("changeLanguage", function(event, language) {
  UI.changeLanguage(language, function() {
    UI.updateContentSize();
  });
});