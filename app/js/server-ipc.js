const ipcRenderer = require("electron").ipcRenderer;
const clipboard   = require("electron").clipboard;

var ccurl = false;

var isLightWallet = require("electron").remote.getGlobal("lightWallet");

//only load for light wallets
if (isLightWallet) {
  try {
    ccurl = require("./ccurl-interface");
  } catch (err) {
    alert(err);
    ccurl = false;
  }
}

ipcRenderer.on("showNodeInfo", function() {
  if (typeof(UI) != "undefined") {
    if (!UI.initialConnection) {
      UI.notify("error", (isLightWallet ? "could_not_connect_to_remote_node" : "could_not_connect_to_node"));
    } else {
      UI.showNodeInfo(function(error, identifier, html) {
        if (!error) {
          ipcRenderer.send("showModal", identifier, html);
        } else {
          UI.notify("error", error);
        }
      });
    }
  }
});

ipcRenderer.on("showPeers", function() {
  if (typeof(UI) != "undefined") {
    if (!UI.initialConnection) {
      UI.notify("error", (isLightWallet ? "could_not_connect_to_remote_node" : "could_not_connect_to_node"));
    } else {
      UI.showPeers(function(error, identifier, html) {
        if (!error) {
          ipcRenderer.send("showModal", identifier, html);
        } else {
          UI.notify("error", error);
        }
      });
    }
  }
});

ipcRenderer.on("showFAQ", function() {
  if (typeof(UI) != "undefined") {
    UI.openHelpMenu();
  }
});

ipcRenderer.on("showNetworkSpammer", function() {
  if (typeof(UI) != "undefined") {
    UI.showNetworkSpammer();
  }
});

ipcRenderer.on("pasteTrytes", function() {
  if (typeof(UI) != "undefined") {
    UI.showPasteTrytes();
  }
});

ipcRenderer.on("hideAlerts", function() {
  if (typeof(UI) != "undefined") {
    UI.hideAlerts();
  }
});

ipcRenderer.on("setFocus", function(event, focus) {
  if (typeof(UI) != "undefined") {
    UI.hasFocus = focus;
  }
});

ipcRenderer.on("toggleStatusBar", function(event, show) {
  if (typeof(UI) != "undefined") {
    if (show) {
      UI.startStatusBarTracking();
    } else {
      UI.stopStatusBarTracking();
    }
  }
});

ipcRenderer.on("hideStatusBar", function() {
  if (typeof(UI) != "undefined") {
    UI.stopStatusBarTracking();
  }
});

ipcRenderer.on("notify", function(event, type, message, options) {
  if (typeof(UI) != "undefined") {
    UI.notify(type, message, options);
  }
});

ipcRenderer.on("changeLanguage", function(event, language) {
  if (typeof(UI) != "undefined") {
    UI.changeLanguage(language);
  }
});

ipcRenderer.on("handleURL", function(event, url) {
  if (typeof(UI) != "undefined") {
    UI.handleURL(url);
  }
});

ipcRenderer.on("openHelpMenu", function() {
  if (typeof(UI) != "undefined") {
    UI.openHelpMenu();
  }
});

ipcRenderer.on("shutdown", function() {
  if (typeof(UI) != "undefined") {
    UI.shutdown();
  }
});

ipcRenderer.on("updateSettings", function(event, settings) {
  UI.updateSettings(settings);
});

ipcRenderer.on("stopCcurl", function(event, callback) {
  console.log("in stopCcurl renderer");
  if (ccurl && connection.ccurlProvider) {
    console.log("calling ccurlInterruptAndFinalize with " + connection.ccurlProvider);
    ccurl.ccurlInterruptAndFinalize(connection.ccurlProvider);
  }

  console.log("Calling relaunchApplication");
  ipcRenderer.send("relaunchApplication", true);
});

ipcRenderer.on('showRecovery', function(event, callback) {
  console.log('enter recovery tool')
  if (typeof(UI) !== "undefined") {
    UI.showRecoveryModal()
  }
})

function _hoverAmountStart(amount) {
  ipcRenderer.send("hoverAmountStart", amount);
}

function _hoverAmountStop() {
  ipcRenderer.send("hoverAmountStop");
}

function _editNodeConfiguration() {
  ipcRenderer.send("editNodeConfiguration");
}

function _rendererIsReady() {
  ipcRenderer.send("rendererIsReady", process.pid);
}

function _relaunchApplication() {
  ipcRenderer.send("relaunchApplication");
}

function _updateStatusBar(data) {
  ipcRenderer.send("updateStatusBar", data);
}

function _updateAppInfo(data) {
  ipcRenderer.send("updateAppInfo", data);
}

function _clearSeedFromClipboard(seed) {
  if (clipboard.readText() == seed) {
    clipboard.clear();
  }
}

/*
function _logUINotification(type, message) {
  ipcRenderer.send("logUINotification", type, message);
}
*/

process.once("loaded", function() {
  global.backendLoaded = true;
  global.updateStatusBar = _updateStatusBar;
  global.hoverAmountStart = _hoverAmountStart;
  global.hoverAmountStop = _hoverAmountStop;
  global.editNodeConfiguration = _editNodeConfiguration;
  global.rendererIsReady = _rendererIsReady;
  global.relaunchApplication = _relaunchApplication;
  global.updateAppInfo = _updateAppInfo;
  global.clearSeedFromClipboard = _clearSeedFromClipboard;

  if (typeof(ccurl) != "undefined") {
    global.ccurl = ccurl;
  }
  //global.logUINotification = _logUINotification;
});
