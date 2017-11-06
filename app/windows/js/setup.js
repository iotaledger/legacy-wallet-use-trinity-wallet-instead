const electron = require("electron");
const path     = require("path");
const https    = require("https");

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
  var _updateNodeConfiguration = false;
  var _lightWalletHosts = [];

  UI.fetchProviders = function (urls) {
    return Promise.all(urls.map(url => {
      return new Promise((resolve, reject) => {
        var req = https.get(url + '?' + (new Date().getTime()));
        req.on('response', function (res) {
          var body = '';
          res.on('data', function (chunk) {
            body += chunk.toString();
          });
          res.on('end', function () {
            try {
              var parsed = JSON.parse(body).filter(function(host) {
                return host.match(/^(https?:\/\/.*):([0-9]+)$/i);
              });
              resolve(parsed)
            } catch (err) {
              resolve(false);
            }
          });
          res.on('error', function (err) {
            resolve(false);
          })
        });
      })
    })).then(res => {
      var hosts = []
      res.filter(a => Array.isArray(a)).forEach(list => list.forEach(host => {
        if (hosts.indexOf(host) === -1) {
          hosts.push(host)
        }
      }))
      console.log('PROVIDERS', hosts)
      if (!hosts.length) {
        return hosts
      }
      return shuffleArray(hosts)
    })
  }

  UI.initialize = function() {
    var urls = [
      'https://iotasupport.com/providers.json',
      'https://static.iota.org/providers.json'
    ]
    UI.fetchProviders(urls).then(res => {
      _lightWalletHosts = res
    }).catch(err => {
      console.log(err)
    })

    document.getElementById("host-select").addEventListener("change", function(e) {
      e.preventDefault();
      if (this.value == "custom") {
        document.getElementById("host").style.display = "block";
        document.getElementById("host-format-example").style.display = "block";
      } else {
        document.getElementById("host").style.display = "none";
        document.getElementById("host-format-example").style.display = "none";
      }
      UI.updateContentSize();
    });

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
        var selectedHost;

        var select = document.getElementById("host-select");
        if (select && select.style.display == "block") {
          var selectedHost = select.options[select.selectedIndex].value;
          if (selectedHost == "custom") {
            selectedHost = document.getElementById("host").value;
          }
        } else {
          selectedHost = document.getElementById("host").value;
        }

        var res = selectedHost.match(/^(https?:\/\/.*):([0-9]+)$/i);

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

    if (_lightWalletHosts && _lightWalletHosts.length) {
      document.getElementById("host-select").style.display = "block";
      document.getElementById("host").style.display = "none";
      document.getElementById("host-format-example").style.display = "none";
      document.getElementById("host-select").innerHTML = "";

      var content = "<option value='' data-i18n='select_your_host'>" + UI.t("select_your_host") + "</option>";

      for (var i=0; i<_lightWalletHosts.length; i++) {
        content += "<option value='" + UI.format(_lightWalletHosts[i]) + "'>" + UI.format(_lightWalletHosts[i]) + "</option>";
      }
      
      content += "<option value='custom' data-i18n='custom'>" + UI.t("custom") + "</option>";

      document.getElementById("host-select").innerHTML = content;
    } else {
      document.getElementById("host-select").style.display = "none";
      document.getElementById("host").style.display = "block";
      document.getElementById("host-format-example").style.display = "block";
    }

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

  function shuffleArray(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
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
