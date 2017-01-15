const electron = require("electron")

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
  var showQuitAlert      = false;
  var isInitialized      = false;
  var callNodeStarted    = false;
  var serverLogLines     = 0;
  var webviewIsLoaded    = false;
  var lightWallet        = false;
  var webview;

  UI.initialize = function() {
    isInitialized = true;

    var showStatusBar = false;
    var isFirstRun    = false;

    if (typeof(URLSearchParams) != "undefined") {
      var params = new URLSearchParams(location.search.slice(1));
      showStatusBar = params.get("showStatus") == 1;
      isFirstRun = params.get("isFirstRun") == 1;
      lightWallet = parseInt(params.get("lightWallet"), 10) == 1;
    }

    if (isFirstRun) {
      document.body.className = "new-user-active";
    } else if (showStatusBar) {
      document.body.className = "status-bar-active";
    } else {
      document.body.className = "";
    }

    electron.webFrame.setZoomLevelLimits(1, 1);
    electron.ipcRenderer.send("rendererIsInitialized");
    if (callNodeStarted) {
      UI.nodeStarted(callNodeStarted);
      callNodeStarted = false;
    }

    if (!lightWallet) {
      document.body.className += " full-node";
      document.getElementById("status-bar-milestone").addEventListener("click", function(e) {
        electron.ipcRenderer.send("showServerLog");
      });

      document.getElementById("status-bar-solid-milestone").addEventListener("click", function(e) {
        electron.ipcRenderer.send("showServerLog");
      });
    } 


    document.getElementById("new-user").addEventListener("click", function(e) {
      UI.sendToWebview("openHelpMenu");
    });
  }

  UI.showContextMenu = function(e) {
    var template = [
      {
        label: "Cut",
        accelerator: "CmdOrCtrl+X",
        role: "cut",
      },
      {
        label: "Copy",
        accelerator: "CmdOrCtrl+C",
        role: "copy"
      },
      {
        label: "Paste",
        accelerator: "CmdOrCtrl+V",
        role: "paste"
      }
    ];
   
    if (electron.remote.getCurrentWindow().isFullScreen()) {
      template.push({
        label: "Exit Fullscreen",
        accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
        click: function() {
          electron.remote.getCurrentWindow().setFullScreen(false);
        }
      })
    }

    const menu = electron.remote.Menu.buildFromTemplate(template);
    menu.popup(electron.remote.getCurrentWindow(), e.x, e.y);
  }

  UI.nodeStarted = function(url, settings) {
    url = url + "?" + Object.keys(settings).map(function(key) { return encodeURIComponent(key) + "=" + encodeURIComponent(settings[key]); }).join("&");

    if (!isInitialized) {
      callNodeStarted = url;
      return;
    }

    webview = document.getElementById("server");
    webviewIsLoaded = false;
    
    webview.loadURL(url);

    // Prevent window from redirecting to dragged link location (mac)
    webview.addEventListener("dragover",function(e) {
      e.preventDefault();
      return false;
    },false);

    //also "dom-ready"
    webview.addEventListener("did-finish-load", UI.webviewDidFinishLoad());

    //sometimes did-finish-load does not fire..
    setTimeout(UI.webviewDidFinishLoad, 1000);

    webview.addEventListener("new-window", function(e) {
      electron.shell.openExternal(e.url);
    });
  }

  UI.webviewDidFinishLoad = function() {
    //for some reason this is sometimes called 2 times?..
    if (webviewIsLoaded) {
      return;
    }

    if (electron.remote.getGlobal("hasOtherWin")) {
      return;
    }

    if (webview.style.display == "none") {
      webview.style.display = "";
    }

    webviewIsLoaded = true;   

    webview.getWebContents().addListener("context-menu", function(e) {
      e.preventDefault();
      e.stopPropagation();
      UI.showContextMenu(e);
    });

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
      webview.focus();
      //electron.ipcRenderer.send("rendererIsReady");
    }, 250);

    try {
      webview.getWebContents().document.body.addEventListener("contextmenu", UI.showContextMenu, false);
    } catch (err) {
    }
  }

  // https://github.com/electron/electron/issues/5900
  UI.focusOnWebview = function() {
    if (webviewIsLoaded && webview) {
      webview.focus();
    }
  }

  UI.showServerLog = function(serverOutput) {
    if (showQuitAlert) {
      return;
    }

    UI.hideAlerts();

    serverLogLines = serverOutput.length;
    var log = serverOutput.join("\n");

    log = log.replace(/\n\s*\n/g, "\n");

    UI.showAlert("<h1>Server Log</h1><p>Below are the last messages from the server log (<a href='#' id='copy_server_log'>copy</a>):</p>" +
                 "<textarea rows='10' class='form-control' id='server_output' style='background:#000;color:#fff;font-family:courier;' readonly>" + String(log).escapeHTML() + "</textarea>", function() {
      document.getElementById("copy_server_log").addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        UI.copyServerLog();
      });
    }, function() {
      electron.ipcRenderer.send("stopLookingAtServerLog");
    });

    document.getElementById("server_output").scrollTop = document.getElementById("server_output").scrollHeight;
  }

  UI.copyServerLog = function() {
    document.getElementById("server_output").select();
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
  }

  UI.appendToServerLog = function(data) {
    var serverLog = document.getElementById("server_output");

    if (serverLog) {
      serverLogLines++;
      if (serverLogLines > 5000) {
        var lines = serverLog.value.split(/\n/);
        lines = lines.slice(lines.length-1001, lines.length-1);
        serverLog.value = lines.join("\n");
        serverLogLines = 1000;
      }
      serverLog.value += data;
      if (serverLog.scrollHeight - (serverLog.scrollTop+serverLog.offsetHeight) < 100) {
        serverLog.scrollTop = serverLog.scrollHeight;
      }
    }
  }

  UI.toggleStatusBar = function(show) {
    document.body.className = (show ? "status-bar-active" : "");
    if (webviewIsLoaded && webview) {
      webview.send("toggleStatusBar", show);
    }
  }

  UI.updateStatusBar = function(data) {    
    if (data.hasOwnProperty("latestSolidSubtangleMilestoneIndex")) {
      document.getElementById("status-bar-solid-milestone").innerHTML = String(data.latestSolidSubtangleMilestoneIndex).escapeHTML();
    }
    if (data.hasOwnProperty("latestMilestoneIndex")) {
      document.getElementById("status-bar-milestone").innerHTML = String(data.latestMilestoneIndex).escapeHTML();
    }

    if (data.hasOwnProperty("cpu")) {
      if (data.cpu === "") {
        document.getElementById("status-bar-cpu").innerHTML = "";
      } else {
        document.getElementById("status-bar-cpu").innerHTML = "CPU: " + String(data.cpu).escapeHTML() + "%";
      }
    }

    if (document.getElementById("status-bar-dot-1").style.display == "none") {
      if (document.getElementById("status-bar-milestone").innerHTML && document.getElementById("status-bar-solid-milestone").innerHTML) {
        document.getElementById("status-bar-dot-1").style.display = "inline";
      }
    }
    if (document.getElementById("status-bar-dot-2").style.display == "none") {
      if ((document.getElementById("status-bar-milestone").innerHTML || document.getElementById("status-bar-solid-milestone").innerHTML) && document.getElementById("status-bar-cpu").innerHTML) {
        document.getElementById("status-bar-dot-2").style.display = "inline";
     }
    }
    
    if (data.hasOwnProperty("hoverAmount")) {
      if (data.hoverAmount == -1) {
        document.getElementById("status-bar-giota").style.display = "none";
      } else {
        document.getElementById("status-bar-giota").style.display = "inline";
        document.getElementById("status-bar-giota").innerHTML = UI.convertToGiotas(data.hoverAmount);
      }
    }
  }

  UI.convertToGiotas = function(amount) {
    if (typeof(amount) != "integer") {
      amount = parseInt(amount, 10);
    }

    if (isNaN(amount)) {
      return "";
    }

    var negative = afterComma = "", beforeComma = "", afterCommaDigits = 0;

    if (amount < 0) {
      amount = Math.abs(amount);
      negative = "-";
    }

    afterCommaDigits = 9;

    amount = amount.toString();

    var digits = amount.split("").reverse();

    for (var i=0; i<afterCommaDigits; i++) {
      if (typeof(digits[i]) == "undefined") {
        afterComma = "0" + afterComma;
      } else {
        afterComma = digits[i] + afterComma;
      }
    }

    if (/^0*$/.test(afterComma)) {
      afterComma = "";
    }

    var j = 0;

    for (var i=afterCommaDigits; i<digits.length; i++) {
      if (j > 0 && j % 3 == 0) {
        beforeComma = "'" + beforeComma;
      }
      beforeComma = digits[i] + beforeComma;
      j++;
    }

    if (beforeComma === "") {
      beforeComma = "0";
    }

    afterComma = afterComma.replace(/0+$/, "");

    formattedAmount = "<span>" + negative + beforeComma + "</span>" + (afterComma ? "." + afterComma : "") + " Gi";

    return formattedAmount;
  }

  UI.showPreferences = function(settings) {
    UI.hideAlerts();

    var modal = new tingle.modal({
      footer: true,
      onOpen: function() {
        var close = document.querySelector(".tingle-modal__close");
        var modalContent = document.querySelector(".tingle-modal-box__content");
        modalContent.appendChild(close);
      }
    });

    /*
    modal.setContent("<h1>Preferences</h1>" + 
                     "<select name='auto_update_time' id='auto_update_time' style='width:100%'>" + 
                     "<option value='1'" + (checkForUpdatesOption == "1" ? " selected='selected'" : "") + ">Check for Updates on Application Start</option>" + 
                     "<option value='2'" + (checkForUpdatesOption == "2" ? " selected='selected'" : "") + ">Check for updates daily</option>" + 
                     "<option value='3'" + (checkForUpdatesOption == "3" ? " selected='selected'" : "") + ">Check for updates weekly</option>" + 
                     "<option value='0'" + (checkForUpdatesOption == "0" ? " selected='selected'" : "") + ">Never check for updates</option>" + 
                     "</select>");
    */

    modal.setContent("<h1>Preferences</h1>" + 
                     (process.platform != "linux" ? "<div class='input-group input-group-last'><label class='label--checkbox'><input type='checkbox' name='open_at_login' id='preferences_open_at_login' class='checkbox' value='1'" + (settings.openAtLogin ? " checked='checked'" : "") + " />Open at Login</label>" : ""));
    
    modal.addFooterBtn("Save", "tingle-btn tingle-btn--primary", function() {
      var settings = {};

      if (process.platform != "linux") {
        settings.openAtLogin = document.getElementById("preferences_open_at_login").checked;
      }
      
      /*
      var autoUpdateTimeSelect = document.getElementById("auto_update_time");
      var checkForUpdatesOption = autoUpdateTimeSelect.options[autoUpdateTimeSelect.selectedIndex].value;
      */

      modal.close();
      electron.ipcRenderer.send("updatePreferences", settings);
    });

    modal.open();
  }

  UI.addNeighborNode = function(node) {
    if (showQuitAlert) {
      return;
    }

    UI.hideAlerts();

    var modal = new tingle.modal({
      footer: true,
      onOpen: function() {
        var close = document.querySelector(".tingle-modal__close");
        var modalContent = document.querySelector(".tingle-modal-box__content");
        modalContent.appendChild(close);
      }
    });

    modal.setContent("<h1>Add Neighbor Node</h1>" + 
                     "<p>Are you sure you want to add this node to your server configuration?</p>" + 
                     "<p style='font-weight:bold'>" + String(node).escapeHTML() + "</p>");

    modal.addFooterBtn("Yes, Add This Node", "tingle-btn tingle-btn--primary", function() {
      modal.close();
      electron.ipcRenderer.send("addNeighborNode", node);
    });

    modal.addFooterBtn("No, Cancel", "tingle-btn tingle-btn--default", function() {
      modal.close();
    });

    modal.open();
  }

  UI.editNodeConfiguration = function(configuration) {
    if (showQuitAlert) {
      return;
    }

    UI.hideAlerts();

    var modal = new tingle.modal({
      footer: true,
      onOpen: function() {
        var close = document.querySelector(".tingle-modal__close");
        var modalContent = document.querySelector(".tingle-modal-box__content");
        modalContent.appendChild(close);

        var el = document.getElementById(configuration.lightWallet ? "server_config_host" : "server_config_port");

        var temp = el.value;
        el.value = "";
        el.value = temp;
        el.focus();
      }
    });

    var content = "";

    if (configuration.lightWallet) {
      content = "<h1>Node Config</h1>" + 
      "<div class='input-group'><label>Host: <span class='error' id='host-error'></span></label>" + 
      "<input type='text' id='server_config_host' placeholder='' value='" + (configuration.lightWalletHost ? String(configuration.lightWalletHost).escapeHTML() + (configuration.lightWalletPort ? ":" + String(configuration.lightWalletPort).escapeHTML() : "") : "") + "' /></div>" + 
      "<div class='input-group'><label>Min Weight Magnitude:</label>" + 
      "<input type='number' min='" + (configuration.testNet ? "13" : "18") + "' name='min_weight_magnitude' id='server_config_min_weight_magnitude' placeholder='' value='" + (configuration.minWeightMagnitude ? String(configuration.minWeightMagnitude).escapeHTML() : (configuration.testNet ? "13": "18")) + "' /></div>";
    } else {
      content = "<h1>Node Config</h1>" + 
      "<div class='input-group'><label>Node Port:</label>" + 
      "<input type='number' min='1024' name='port' id='server_config_port' placeholder='' value='" + (configuration.port ? String(configuration.port).escapeHTML() : "14265") + "' /></div>" +  
      "<div class='input-group'><label>Depth:</label>" + 
      "<input type='number' min='1' name='depth' id='server_config_depth' placeholder='' value='" + (configuration.depth ? String(configuration.depth).escapeHTML() : "3") + "' /></div>" +
      "<div class='input-group'><label>Min Weight Magnitude:</label>" + 
      "<input type='number' min='" + (configuration.testNet ? "13" : "18") + "' name='min_weight_magnitude' id='server_config_min_weight_magnitude' placeholder='' value='" + (configuration.minWeightMagnitude ? String(configuration.minWeightMagnitude).escapeHTML() : (configuration.testNet ? "13": "18")) + "' /></div>" + 
      "<div class='input-group input-group'><label>Neighboring Nodes:</label>" + 
      "<textarea name='neighboring_nodes' id='server_config_neighboring_nodes' style='width:100%;height:150px;' placeholder='Add nodes in the following format (one per line):\r\n\r\nudp://ip:12345'>" + String(configuration.nodes).escapeHTML() + "</textarea></div>";
    }

    modal.setContent(content);

    modal.addFooterBtn("Save", "tingle-btn tingle-btn--primary", function() {
      var config = {};

      config.lightWallet = configuration.lightWallet;
      
      if (configuration.lightWallet) {
        var res = String(document.getElementById("server_config_host").value).match(/^(https?:\/\/.*):([0-9]+)$/i);

        if (!res) {
          document.getElementById("host-error").style.display = "inline";
          document.getElementById("host-error").innerHTML = "Invalid!";
          return;
        } 

        config.lightWalletHost = res[1];
        config.lightWalletPort = res[2];
        config.minWeightMagnitude = parseInt(document.getElementById("server_config_min_weight_magnitude").value, 10);
      } else {
        config.port = parseInt(document.getElementById("server_config_port").value, 10);
        config.depth = parseInt(document.getElementById("server_config_depth").value, 10);
        config.minWeightMagnitude = parseInt(document.getElementById("server_config_min_weight_magnitude").value, 10);
        config.nodes = document.getElementById("server_config_neighboring_nodes").value;
      }

      modal.close();

      electron.ipcRenderer.send("updateNodeConfiguration", config);
    });

    modal.open();
  }

  UI.showUpdateAvailable = function() {
    UI.showAlert("<h1>Update Available</h1><p>An update is available and is being downloaded.</p>");
  }

  UI.showUpdateDownloaded = function(releaseNotes, releaseName, releaseDate) {
    if (showQuitAlert) {
      return;
    }

    UI.hideAlerts();

    var modal = new tingle.modal({
      allowClose: false,
      footer: true,
      cssClass: ["update-downloaded"]
    });

    modal.setContent("<h1>New Update Available...</h1><p>Version " + String(releaseName).escapeHTML() + " is downloaded and ready to install.");

    modal.addFooterBtn("Install Now", "tingle-btn tingle-btn--primary", function() {
      modal.close();
      electron.ipcRenderer.send("installUpdate");
    });

    modal.addFooterBtn("Install on Quit", "tingle-btn tingle-btn--default", function() {
      modal.close();
    });

    modal.open();
  }

  UI.showUpdateError = function() {
    UI.showAlert("<h1>Update Error</h1><p>An error occurred during checking for an update.</p>");
  }

  UI.showCheckingForUpdate = function() {
    if (showQuitAlert) {
      return;
    }

    UI.showAlert("<h1>Checking for Updates...</h1><p>Checking for updates, please wait...</p>");
  }

  UI.showUpdateNotAvailable = function() {
    UI.showAlert("<h1>No Updates</h1><p>No updates are currently available.</p>");
  }

  UI.showKillAlert = function() {
    showQuitAlert = true;

    UI.hideAlerts();

    var modal = new tingle.modal({
      footer: false,
      allowClose: false
    });

    modal.setContent("<h1>Shutdown In Progress</h1><p style='margin-bottom:0'>Shutting down IOTA... Please wait.</p>");

    modal.open();
  }

  UI.hideAlerts = function() {
    var nodes = document.querySelectorAll(".tingle-modal");
     Array.prototype.forEach.call(nodes, function(node) {
      node.parentNode.removeChild(node);
    });

    var body = document.querySelector('body');
    body.classList.remove("tingle-enabled");
  }

  UI.showAlert = function(msg, openCallback, closeCallback) {
    if (showQuitAlert) {
      return;
    }

    UI.hideAlerts();

    var modal = new tingle.modal({
      footer: true,
      onOpen: function() {
        var close = document.querySelector(".tingle-modal__close");
        var modalContent = document.querySelector(".tingle-modal-box__content");
        modalContent.appendChild(close);
        if (openCallback) {
          openCallback();
        }
      },
      onClose: function() {
        if (closeCallback) {
          closeCallback();
        }
      }
    });

    modal.setContent(msg);

    modal.addFooterBtn("OK", "tingle-btn tingle-btn--primary", function() {
      modal.close();
    });

    modal.open();
  }

  UI.showAlertAndQuit = function(msg, serverOutput, callback) {
    if (showQuitAlert) {
      return;
    }

    showQuitAlert = true;

    UI.hideAlerts();

    if (!msg) {
      msg = "<h1>Error</h1><p>An error occurred, the server has quit. Please restart the application.</p>";
    }

    if (serverOutput && serverOutput.length) {
      var log = serverOutput.join("\n");

      log = log.replace(/\n\s*\n/g, "\n");

      var html = "<p>" + msg + "</p><textarea rows='6' class='form-control' readonly>" + String(log).escapeHTML() + "</textarea>";
    } else {
      var html = "<p>" + msg + "</p>";
    }

    var modal = new tingle.modal({
      footer: true,
      allowClose: false,
      onClose: function() {
        electron.remote.getCurrentWindow().hide();
        electron.remote.getCurrentWindow().close();
      }
    });

    modal.setContent(html);

    modal.addFooterBtn("OK", "tingle-btn tingle-btn--primary", function() {
      modal.close();
    });

    modal.open();
  }

  UI.relaunchApplication = function() {
    electron.ipcRenderer.send("relaunchApplication");
  }

  UI.toggleDeveloperTools = function() {
    if (webviewIsLoaded && webview) {
      if (webview.isDevToolsOpened()) {
        webview.closeDevTools();
      } else {
        webview.openDevTools({"mode": "undocked"});
      }
    }
  }

  UI.sendToWebview = function(command, args) {
    if (showQuitAlert) {
      return;
    }

    if (webviewIsLoaded && webview) {
      webview.send(command, args);
    }
  }

  UI.setFocus = function(focus) {
    if (webviewIsLoaded && webview) {
      webview.send("setFocus", focus);
    }
  }

  UI.notify = function(type, message, options) {
    if (webviewIsLoaded && webview) {
      webview.send("notify", type, message, options);
    }
  }

  UI.handleURL = function(url) {
    UI.hideAlerts();
    
    url = decodeURI(url.replace("iota://", "").toLowerCase().replace(/\/$/, ""));

    if (url == "config" || url == "configuration" || url == "setup") {
      electron.ipcRenderer.send("editNodeConfiguration");
    } else if (url == "log") {
      if (!lightWallet) {
        electron.ipcRenderer.send("showServerLog");
      }
    } else if (url == "nodeinfo" || url == "node") {
      UI.sendToWebview("showNodeInfo");
    } else if (url == "peers") {
      UI.sendToWebview("showPeers");
    } else if (url == "spam" || url == "spammer") {
      UI.sendToWebview("showNetworkSpammer");
    } else if (url == "generateseed" || url == "seed") {
      UI.sendToWebview("generateSeed");
    } else if (url == "claim") {
      UI.sendToWebview("showClaimProcess");
    } else if (url == "faq") {
      UI.sendToWebview("faq");
    } else {
      var match = url.match(/(?:addnode|addneighbou?r)\/(.*)/i);
      if (match && match[1] && match[1].charAt(0) != "-") {
        if (!lightWallet) {
          UI.addNeighborNode(match[1]);
        }
      } else {
        UI.sendToWebview("handleURL", url);
      }
    }
  }

  UI.relaunch = function() {
    UI.hideAlerts();
    showQuitAlert = false;
    webviewIsLoaded = false;
    var server = document.getElementById("server");
    if (server) {
      server.style.display = "none";
    }
  }

  UI.shutdown = function() {
    if (webviewIsLoaded && webview) {
      webview.send("shutdown");
    }
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

window.addEventListener("focus", UI.focusOnWebview);

window.addEventListener("contextmenu", function(e) {
  e.preventDefault();
  e.stopPropagation();
  UI.showContextMenu(e);
});

electron.ipcRenderer.on("showAlertAndQuit", function(event, msg, serverOutput, callback) {
  UI.showAlertAndQuit(msg, serverOutput, callback);
});

electron.ipcRenderer.on("showKillAlert", UI.showKillAlert);

electron.ipcRenderer.on("nodeStarted", function(event, url, settings) {
  UI.nodeStarted(url, settings);
});

electron.ipcRenderer.on("showServerLog", function(event, serverOutput) {
  UI.showServerLog(serverOutput);
});

electron.ipcRenderer.on("appendToServerLog", function(event, data) {
  UI.appendToServerLog(data);
});

electron.ipcRenderer.on("toggleStatusBar", function(event, show) {
  UI.toggleStatusBar(show);
});

electron.ipcRenderer.on("updateStatusBar", function(event, data) {
  UI.updateStatusBar(data);
});

electron.ipcRenderer.on("updateAppInfo", function(event, data) {
  electron.ipcRenderer.send("updateAppInfo", data);
});

electron.ipcRenderer.on("showUpdateAvailable", UI.showUpdateAvailable);

electron.ipcRenderer.on("showUpdateDownloaded", function(event, releaseNotes, releaseName, releaseDate) {
  UI.showUpdateDownloaded(releaseNotes, releaseName, releaseDate);
});

electron.ipcRenderer.on("showUpdateError", UI.showUpdateError);

electron.ipcRenderer.on("showCheckingForUpdate", UI.showCheckingForUpdate);

electron.ipcRenderer.on("showUpdateNotAvailable", UI.showUpdateNotAvailable);

electron.ipcRenderer.on("showPreferences", function(event, settings) {
  UI.showPreferences(settings);
});

electron.ipcRenderer.on("showNodeInfo", function() {
  UI.hideAlerts();
  UI.sendToWebview("showNodeInfo");
});

electron.ipcRenderer.on("showModal", function(event, identifier, html) {
  UI.hideAlerts();

  var modal = new tingle.modal({
    footer: false,
    cssClass: [identifier],
    onOpen: function() {
      var close = document.querySelector(".tingle-modal__close");
      var modalContent = document.querySelector(".tingle-modal-box__content");
      modalContent.appendChild(close);
      
      if (identifier == "generated-seed-modal") {
        document.getElementById("generated-seed-value").onclick = document.getElementById("generated-seed-value-copy").onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          electron.clipboard.writeText(document.getElementById("generated-seed-value").dataset.clipboardText);
        }
      }
    },
  });

  modal.setContent(html);

  modal.open();
});

electron.ipcRenderer.on("handleURL", function(event, url) {
  UI.handleURL(url);
});

electron.ipcRenderer.on("showPeers", function() {
  UI.hideAlerts();
  UI.sendToWebview("showPeers");
});

electron.ipcRenderer.on("showFAQ", function() {
  UI.hideAlerts();
  UI.sendToWebview("showFAQ");
});

electron.ipcRenderer.on("showNetworkSpammer", function() {
  UI.hideAlerts();
  UI.sendToWebview("showNetworkSpammer");
});

electron.ipcRenderer.on("generateSeed", function() {
  UI.hideAlerts();
  UI.sendToWebview("generateSeed");
});

electron.ipcRenderer.on("showClaimProcess", function() {
  UI.hideAlerts();
  UI.sendToWebview("showClaimProcess");
});

electron.ipcRenderer.on("addAndRemoveNeighbors", function(event, addedNodes, removedNodes) {
  UI.sendToWebview("addAndRemoveNeighbors", {"add": addedNodes, "remove": removedNodes});
});

electron.ipcRenderer.on("editNodeConfiguration", function(event, serverConfiguration) {
  UI.editNodeConfiguration(serverConfiguration);
});

electron.ipcRenderer.on("toggleDeveloperTools", UI.toggleDeveloperTools);

electron.ipcRenderer.on("setFocus", function(event, focus) {
  UI.setFocus(focus);
});

electron.ipcRenderer.on("hoverAmountStart", function(event, amount) {
  UI.updateStatusBar({"hoverAmount": amount});
});

electron.ipcRenderer.on("hoverAmountStop", function() {
  UI.updateStatusBar({"hoverAmount": -1});
});

electron.ipcRenderer.on("notify", function(event, type, message, options) {
  UI.notify(type, message, options);
});

electron.ipcRenderer.on("relaunch", UI.relaunch);

electron.ipcRenderer.on("shutdown", UI.shutdown);