const electron = require('electron')
const path = require('path')
const https = require('https')
const request = require('request')
const fs = require('fs')
const openpgp = require('openpgp')

const IRI_VERSION = '1.4.2.1'
const IRI_DIRECTORY = 'iri'
const IRI_RELEASE_URI = `https://github.com/iotaledger/iri/releases/download/v${IRI_VERSION}/iri-${IRI_VERSION}.jar`
const IRI_RELEASE_PUB_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----

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
=fX8W
-----END PGP PUBLIC KEY BLOCK-----`

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
  var _appDataDirectory
  var _tempDirectory

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
    document.getElementById("full-node-btn").addEventListener("click", function() {
      UI.showFullNodeSection({appDataDirectory: _appDataDirectory, tempDirectory: _tempDirectory})
    });
    document.getElementById("switch-btn").addEventListener("click", function () {
      UI.showOtherNodeSection({appDataDirectory: _appDataDirectory, tempDirectory: _tempDirectory})
    });

    document.getElementById('download-iri-btn').addEventListener('click', UI.downloadIRI)

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

  UI.showFullNodeSection = function(params) {
    _appDataDirectory = params.appDataDirectory
    _tempDirectory = params.tempDirectory
    let title = ''
    if (fileExists(path.join(_appDataDirectory, IRI_DIRECTORY, `iri-${IRI_VERSION}.jar`))) {
      renderFullNodeConfigurationSection()
      title = 'full_node_settings'
      document.getElementById("start-btn").style.display = "block"
    } else {
      renderDownloadIRISection()
      title = 'download_iri_prompt'
      document.getElementById('download-iri-btn').innerHTML = UI.t('download_iri') + '-' + IRI_VERSION
      document.getElementById("start-btn").style.display = "none"
    }

    document.getElementById("node-choice").style.display = "none";
    UI.changeElementLanguage("title", title);
    document.getElementById("message").style.display = "none";
    document.getElementById("light-node-section").style.display = "none";
    document.getElementById("full-node-section").style.display = "block";
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

  UI.showOtherNodeSection = function(params) {
    if (document.getElementById("light-node-section").style.display == "block") {
      UI.showFullNodeSection(params);
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
      _appDataDirectory = params.appDataDirectory
      _tempDirectory = params.tempDirectory
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
          UI.showFullNodeSection(params);
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

  UI.downloadIRI = function () {
    const fileName = `iri-${IRI_VERSION}.jar`
    const tempFileName = `iri-${IRI_VERSION}-unverified.jar`
    const iriDirectory = path.join(_appDataDirectory, IRI_DIRECTORY)
    const filePath = path.join(iriDirectory, fileName)
    const tempFilePath = path.join(_tempDirectory, tempFileName)

    hideDownloadErrors()
    disableButtons()

    downloadFile(IRI_RELEASE_URI, tempFilePath, {
      onResponse: (size) => {
        renderDownloadStatus()
        renderDownloadProgress(0, size)
      },
      onData: renderDownloadProgress
    })

      .then(() => {
        downloadFile(`${IRI_RELEASE_URI}.asc`, `${tempFilePath}.asc`, {
          onResponse: () => {},
          onData: () => {}
        })
          .then(() => {
            renderVerificationStatus()
            return verifyFileSignature(
              fs.readFileSync(tempFilePath),
              fs.readFileSync(`${tempFilePath}.asc`, { encoding: 'utf8' }),
              IRI_RELEASE_PUB_KEY
            )
          })
          .then(valid => {
            hideVerificationStatus()
            if (!valid) {
              return renderDownloadErrors(`Signature verification failed for downloaded file: ${tempFileName}`)
            }
            renameFile(tempFilePath, filePath)
              .then(() => renameFile(`${tempFilePath}.asc`, `${filePath}.asc`))
              .then(() => renderDownloadSuccess())
              .catch(err => renderDownloadErrors(`Failed to save ${fileName}.`, err))
          })
      })

      .catch(err => {
        hideVerificationStatus()
        renderDownloadErrors(`Failed to download ${fileName}`, err)
      })
  }

  function downloadFile (uri, destination, hooks) {
    return new Promise((resolve, reject) => {
      let size = 0
      let bytesReceived = 0

      let file = fs.createWriteStream(destination)

      request
        .get(uri)
        .on('response', data => {
          size = parseInt(data.headers['content-length'])
          hooks.onResponse(size)
        })
        .on('data', chunk => {
          bytesReceived += chunk.length
          hooks.onData(bytesReceived, size)
        })
        .on('error', err => reject(err))
        .on('end', () => resolve(file))
        .pipe(file)
    })
  }

  function verifyFileSignature (file, signature, publicKey) {
    const options = {
      message: openpgp.message.fromBinary(file),
      signature: openpgp.signature.readArmored(signature),
      publicKeys: openpgp.key.readArmored(publicKey).keys
    }

    return openpgp.verify(options)
      .then(verified => verified.signatures[0].valid)
  }

  function fileExists (path) {
    return fs.existsSync(path)
  }

  function renameFile (oldPath, newPath) {
    return new Promise((resolve, reject) =>
      fs.rename(oldPath, newPath, err => {
        if (err) reject(err)
        else resolve()
      })
    )
  }

  function renderDownloadIRISection () {
    document.getElementById('full-node-download-iri-section').style.display = 'block'
    document.getElementById('full-node-configuration-section').style.display = 'none'
    document.getElementById('download-iri-verification-status').style.display = 'none'
    document.getElementById('download-iri-verification-status').style.display = 'none'
    UI.updateContentSize()
  }

  function renderFullNodeConfigurationSection () {
    document.getElementById('full-node-download-iri-section').style.display = 'none'
    document.getElementById('full-node-configuration-section').style.display = 'block'
    UI.updateContentSize()
  }

  function disableButtons () {
    document.getElementById('download-iri-prompt').style.display = 'none'
    document.getElementById('download-iri-btn').disabled = true
    document.getElementById('switch-btn').disabled = true
    UI.updateContentSize()
  }

  function enableButtons () {
    document.getElementById('download-iri-prompt').style.display = 'block'
    document.getElementById('download-iri-btn').style.display = 'block'
    document.getElementById('download-iri-btn').disabled = false
    document.getElementById('switch-btn').disabled = false
    UI.updateContentSize()
  }

  function renderDownloadStatus () {
    document.getElementById('download-iri-progress').style.display = 'block'
    document.getElementById('download-iri-btn').style.display = 'none'
    document.getElementById('download-iri-verification-status').style.display = 'none'
    document.getElementById('download-iri-success').style.display = 'none'
    document.getElementById('download-iri-error').style.display = 'none'
    UI.updateContentSize()
  }

  function renderDownloadErrors (...errors) {
    hideVerificationStatus()
    const el = document.getElementById('download-iri-error')
    el.style.display = 'block'
    for (const err of Object.keys(errors)) {
      const errEl = document.createElement('div')
      errEl.innerHTML = UI.format(errors[err])
      el.append(errEl)
    }
    enableButtons()
  }

  function hideDownloadErrors () {
    const el = document.getElementById('download-iri-error')
    el.style.display = 'none'
    while (el.hasChildNodes()) {
      el.removeChild(el.lastChild)
    }
    UI.updateContentSize()
  }

  function renderDownloadProgress (received, size) {
    document.getElementById('download-iri-progress').style.display = 'block'
    const dx = (received * 100) / size
    document.getElementById('download-iri-progress-percentage').innerHTML = UI.format(`${parseFloat(dx).toFixed(2)} %`)
    document.getElementById('download-iri-progress-bar-content').style.transform = `scaleX(${(dx / 100).toString()})`
  }

  function renderVerificationStatus () {
    document.getElementById('download-iri-progress').style.display = 'none'
    document.getElementById('download-iri-verification-status').style.display = 'block'
    UI.updateContentSize()
  }

  function hideVerificationStatus () {
    document.getElementById('download-iri-verification-status').style.display = 'none'
    UI.updateContentSize()
  }

  function renderDownloadSuccess () {
    document.getElementById('download-iri-success').style.display = 'block'
    document.getElementById('download-iri-btn').style.display = 'none'
    document.getElementById('download-iri-verification-status').style.display = 'none'
    document.getElementById('switch-btn').disabled = false
    UI.updateContentSize()
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        UI.changeElementLanguage("title", 'full_node_settings');
        document.getElementById('start-btn').style.display = 'block'
        renderFullNodeConfigurationSection()
        resolve()
      }, 2000)
    )
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
