const ipcRenderer = require("electron").ipcRenderer;

ipcRenderer.on("showNodeInfo", function() {
  if (typeof(UI) != "undefined") {
    if (!UI.initialConnection) {
      $(document).one("initialConnection", function() {
        UI.showNodeInfo(true).done(function(identifier, html) {
          ipcRenderer.send("showModal", identifier, html);
        });
      });
    } else {
      UI.showNodeInfo(true).done(function(identifier, html) {
        ipcRenderer.send("showModal", identifier, html);
      });
    }
  }
});

ipcRenderer.on("showPeers", function() {
  if (typeof(UI) != "undefined") {
    if (!UI.initialConnection) {
      $(document).one("initialConnection", function() {
        UI.showPeers(true).done(function(identifier, html) {
          ipcRenderer.send("showModal", identifier, html);
        });
      })
    } else {
      UI.showPeers(true).done(function(identifier, html) {
        ipcRenderer.send("showModal", identifier, html);
      });
    }
  }
});

ipcRenderer.on("showNetworkSpammer", function() {
  if (typeof(UI) != "undefined") {
    UI.showNetworkSpammer();
  }
})

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

ipcRenderer.on("setIsProofOfWorking", function(event, isProofOfWorking) {
  if (typeof(UI) != "undefined") {
    UI.setIsProofOfWorking(isProofOfWorking);
  }
});

ipcRenderer.on("notify", function(event, type, message) {
  if (typeof(UI) != "undefined") {
    UI.notify(type, message);
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

function _powStarted() {
  ipcRenderer.send("powStarted");
}

function _powEnded() {
  ipcRenderer.send("powEnded");
}

function _hoverAmountStart(amount) {
  ipcRenderer.send("hoverAmountStart", amount);
}

function _hoverAmountStop() {
  ipcRenderer.send("hoverAmountStop");
}

function _editServerConfiguration() {
  ipcRenderer.send("editServerConfiguration");
}

function _rendererIsReady() {
  ipcRenderer.send("rendererIsReady");
}

function _relaunchApplication() {
  ipcRenderer.send("relaunchApplication");
}
/*
function _logUINotification(type, message) {
  ipcRenderer.send("logUINotification", type, message);
}
*/

process.once('loaded', function() {
  global.powStarted = _powStarted;
  global.powEnded = _powEnded;
  global.hoverAmountStart = _hoverAmountStart;
  global.hoverAmountStop = _hoverAmountStop;
  global.editServerConfiguration = _editServerConfiguration;
  global.rendererIsReady = _rendererIsReady;
  global.relaunchApplication = _relaunchApplication;
  //global.logUINotification = _logUINotification;
});