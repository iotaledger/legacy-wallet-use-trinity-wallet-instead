const electron = require("electron");
const path     = require("path");

var isDevelopment = String(process.env.NODE_ENV).trim() === "development";
var resourcesDirectory = isDevelopment ? "../../" : "../../../";

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
  var isLightWallet = false;
  var _tempDirectory
  var _appDataDirectory

  UI.initialize = function() {
    document.getElementById("quit-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      document.getElementById("restart-btn").disabled = true;
      document.getElementById("settings-btn").disabled = true;
      document.getElementById("download-java-btn").disabled = true;

      electron.ipcRenderer.send("quit");
    });
    document.getElementById("restart-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      document.getElementById("restart-btn").disabled = true;
      document.getElementById("settings-btn").disabled = true;
      document.getElementById("download-java-btn").disabled = true;

      UI.relaunchApplication();
    });
    document.getElementById("download-java-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      document.getElementById("restart-btn").disabled = true;
      document.getElementById("settings-btn").disabled = true;
      document.getElementById("download-java-btn").disabled = true;

      UI.showNoJavaInstalledWindow();
    });
    document.getElementById("settings-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      document.getElementById("restart-btn").disabled = true;
      document.getElementById("settings-btn").disabled = true;
      document.getElementById("download-java-btn").disabled = true;

      UI.showSetupWindow(isLightWallet ? "light-node" : "full-node");
    });
  }

  UI.showContextMenu = function(e) {
    var template = [
      {
        label: UI.t("cut"),
        accelerator: "CmdOrCtrl+X",
        role: "cut",
      },
      {
        label: UI.t("copy"),
        accelerator: "CmdOrCtrl+C",
        role: "copy"
      },
      {
        label: UI.t("paste"),
        accelerator: "CmdOrCtrl+V",
        role: "paste"
      }
    ];
   
    const menu = electron.remote.Menu.buildFromTemplate(template);
    menu.popup(electron.remote.getCurrentWindow(), e.x, e.y);
  }

  UI.show = function(params) {
    if (params) {
      _appDataDirectory = params.appDataDirectory
      _tempDirectory = params.tempDirectory
      isLightWallet = params.lightWallet == 1;
      if (params.title) {
        document.getElementById("title").innerHTML = UI.format(params.title);
        document.getElementById("title").style.display = "block";
      } else {
        document.getElementById("title").style.display = "none";
      }
      if (params.message) {
        document.getElementById("message").innerHTML = UI.format(params.message);
        document.getElementById("message").style.display = "block";
      } else {
        document.getElementById("message").style.display = "none";
      }

      if (params.serverOutput && params.serverOutput.length) {
        var log = params.serverOutput.join("\n");
        log = log.replace(/\n\s*\n/g, "\n");

        if (!log || params.serverOutput.length == 1) {
          log = UI.t("no_server_output");
        }

        document.getElementById("server-output").value = log;
        document.getElementById("server-output-section").style.display = "block";
        //document.getElementById("server-output").scrollTop = document.getElementById("server-output").scrollHeight;
      } else {
        document.getElementById("server-output-section").style.display = "none";
      }
    } 

    UI.updateContentSize();

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }

  UI.showNoJavaInstalledWindow = function() {
    electron.ipcRenderer.send("showNoJavaInstalledWindow", {"downloadImmediatelyIfWindows": true});
  }

  UI.relaunchApplication = function() {
    electron.ipcRenderer.send("relaunchApplication");
  }
  
  UI.showSetupWindow = function(section) {
    electron.ipcRenderer.send("showSetupWindow", {"section": section, appDataDirectory: _appDataDirectory, tempDirectory: _tempDirectory});
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
          loadPath: path.join(resourcesDirectory, "locales", "{{lng}}", "{{ns}}.json")
        },
        debug: false
    }, function(err, t) {
      updateUI();
      callback();
    });
  }

  UI.t = function(message, options) {
    if (message.match(/^[a-z\_]+$/i)) {
      return UI.format(i18n.t(message, options));
    } else {
      return UI.format(message);
    }
  }

  UI.format = function(text) {
    return String(text).escapeHTML();
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
    document.getElementById(el).innerHTML = UI.t(key);
    document.getElementById(el).setAttribute("data-i18n", key.match(/^[a-z\_]+$/i ? key : ""));
  }

  function updateUI() {
    var i18nList = document.querySelectorAll('[data-i18n]');
    i18nList.forEach(function(v){
      if (v.dataset.i18n) {
        v.innerHTML = UI.t(v.dataset.i18n, v.dataset.i18nOptions);
      }
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
