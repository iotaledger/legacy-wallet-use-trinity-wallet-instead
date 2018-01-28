const electron = require('electron')
const path = require('path')
const https = require('https')
const request = require('request')
const fs = require('fs')
const openpgp = require('openpgp')

const IRI_VERSION = '1.4.1.7'
const IRI_DIRECTORY = 'iri'
const IRI_RELEASE_URI = `https://github.com/iotaledger/iri/releases/download/v${IRI_VERSION}/iri-${IRI_VERSION}.jar`
const IRI_RELEASE_PUB_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----

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
jmYGC3AGYL1vyg==
=Om04
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
