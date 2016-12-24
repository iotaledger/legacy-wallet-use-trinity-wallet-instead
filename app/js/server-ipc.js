const ipcRenderer = require("electron").ipcRenderer;
const ccurl       = require("ccurl.interface.js");

ipcRenderer.on("showNodeInfo", function() {
  if (typeof(UI) != "undefined") {
    if (!UI.initialConnection) {
      $(document).one("initialConnection", function() {
        UI.showNodeInfo(function(error, identifier, html) {
          if (!error) {
            ipcRenderer.send("showModal", identifier, html);
          }
        });
      });
    } else {
      UI.showNodeInfo(function(error, identifier, html) {
        if (!error) {
          ipcRenderer.send("showModal", identifier, html);
        }
      });
    }
  }
});

ipcRenderer.on("showPeers", function() {
  if (typeof(UI) != "undefined") {
    if (!UI.initialConnection) {
      $(document).one("initialConnection", function() {
        UI.showPeers(function(error, identifier, html) {
          if (!error) {
            ipcRenderer.send("showModal", identifier, html);
          }
        })
      })
    } else {
      UI.showPeers(function(error, identifier, html) {
        if (!error) {
          ipcRenderer.send("showModal", identifier, html);
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

ipcRenderer.on("showClaimProcess", function() {
  if (typeof(UI) != "undefined") {
    UI.showClaimProcess();
  }
});

ipcRenderer.on("generateSeed", function() {
  if (typeof(UI) != "undefined") {
    var modal = UI.showGeneratedSeed(true);
    ipcRenderer.send("showModal", "generated-seed-modal", modal);
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

ipcRenderer.on("addAndRemoveNeighbors", function(event, nodes) {
  UI.addAndRemoveNeighbors(nodes.add, nodes.remove);
});

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
  ipcRenderer.send("rendererIsReady");
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
/*
function _logUINotification(type, message) {
  ipcRenderer.send("logUINotification", type, message);
}
*/

process.once("loaded", function() {
  global.updateStatusBar = _updateStatusBar;
  global.hoverAmountStart = _hoverAmountStart;
  global.hoverAmountStop = _hoverAmountStop;
  global.editNodeConfiguration = _editNodeConfiguration;
  global.rendererIsReady = _rendererIsReady;
  global.relaunchApplication = _relaunchApplication;
  global.updateAppInfo = _updateAppInfo;
  global.ccurl = ccurl;
  //global.logUINotification = _logUINotification;
});