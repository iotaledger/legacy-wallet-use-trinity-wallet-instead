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
  var _updateNodeConfiguration = false;

  UI.initialize = function() {
    document.getElementById("light-node-btn").addEventListener("click", UI.showLightNodeSection);
    document.getElementById("full-node-btn").addEventListener("click", UI.showFullNodeSection);
    document.getElementById("switch-btn").addEventListener("click", UI.showOtherNodeSection);

    document.getElementById("quit-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      electron.ipcRenderer.send("quit");
    });
    
    document.getElementById("start-btn").addEventListener("click", function(e) {
      document.getElementById("start-btn").disabled = true;
      document.getElementById("switch-btn").disabled = true;
      
      var settings = {};

      if (document.getElementById("full-node-section").style.display == "block") {
        settings.lightWallet = 0;
        settings.port  = parseInt(document.getElementById("port").value, 10);
        if (!settings.port) {
          document.getElementById("port-error").style.display = "inline";
          UI.changeElementLanguage("port-error", "required");
        }
        settings.nodes = document.getElementById("nodes").value;
        if (!settings.nodes) {
          document.getElementById("nodes-error").style.display = "inline";
          UI.changeElementLanguage("nodes-error", "required");
        }

        if (!settings.nodes || !settings.port) {
          document.getElementById("start-btn").disabled = false;
          document.getElementById("switch-btn").disabled = false;
          return;
        }
      } else {
        var res = String(document.getElementById("host").value).match(/^(https?:\/\/.*):([0-9]+)$/i);
        if (!res) {
          if (!document.getElementById("host").value) {
            UI.changeElementLanguage("host-error", "required");
          } else {
            UI.changeElementLanguage("host-error", "invalid");
          }
          document.getElementById("host-error").style.display = "inline";
          document.getElementById("start-btn").disabled = false;
          document.getElementById("switch-btn").disabled = false;
          return;
        } else {
          settings.lightWallet = 1;
          settings.lightWalletHost = res[1];
          settings.lightWalletPort = res[2];
        }
      }

      UI.updateNodeConfiguration(settings);
    });
  }

 UI.showLightNodeSection = function() {
    document.getElementById("node-choice").style.display = "none";
    UI.changeElementLanguage("title", "light_node_settings");
    document.getElementById("message").style.display = "none";
    document.getElementById("light-node-section").style.display = "block";
    document.getElementById("full-node-section").style.display = "none";
    document.getElementById("start-btn").style.display = "block";
    document.getElementById("switch-btn").style.display = "block";
    UI.changeElementLanguage("switch-btn", "switch_to_full_node");
    document.getElementById("quit-btn").style.display = "none";

    UI.updateContentSize();
  }

  UI.showFullNodeSection = function() {
    document.getElementById("node-choice").style.display = "none";
    UI.changeElementLanguage("title", "full_node_settings");
    document.getElementById("message").style.display = "none";
    document.getElementById("light-node-section").style.display = "none";
    document.getElementById("full-node-section").style.display = "block";
    document.getElementById("start-btn").style.display = "block";
    document.getElementById("switch-btn").style.display = "block";
    UI.changeElementLanguage("switch-btn", "switch_to_light_node");
    document.getElementById("quit-btn").style.display = "none";

    UI.updateContentSize();
  }

  UI.showDefaultSection = function() {
    document.getElementById("node-choice").style.display = "block";
    UI.changeElementLanguage("title", "choose_wallet_type");
    document.getElementById("message").style.display = "block";
    document.getElementById("light-node-section").style.display = "none";
    document.getElementById("full-node-section").style.display = "none";
    document.getElementById("start-btn").style.display = "none";
    document.getElementById("switch-btn").style.display = "none";
    document.getElementById("quit-btn").style.display = "block";

    UI.updateContentSize();
  }

  UI.showOtherNodeSection = function() {
    if (document.getElementById("light-node-section").style.display == "block") {
      UI.showFullNodeSection();
      UI.changeElementLanguage("switch-btn", "switch_to_light_node");
    } else {
      UI.showLightNodeSection();
      UI.changeElementLanguage("switch-btn", "switch_to_full_node");
    }
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
    document.getElementById("light-node-section").style.display = "none";
    document.getElementById("full-node-section").style.display = "none";
    document.getElementById("start-btn").style.display = "none";
    document.getElementById("switch-btn").style.display = "none";

    if (params) {
      if (params.lightWalletHost) {
        document.getElementById("host").value = params.lightWalletHost + (params.lightWalletPort ? ":" + params.lightWalletPort : "");
      }
      if (params.port) {
        document.getElementById("port").value = params.port;
      }
      if (params.nodes) {
        document.getElementById("nodes").value = params.nodes.join("\r\n");
      }
      if (params.section) {
        if (params.section == "light-node") {
          UI.showLightNodeSection();
        } else if (params.section == "full-node") {
          UI.showFullNodeSection();
        }
      }
    } 

    UI.updateContentSize();

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }
  
  UI.updateNodeConfiguration = function(settings) {
    electron.ipcRenderer.send("updateNodeConfiguration", settings);
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