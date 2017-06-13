const electron = require("electron")
const i18n     = electron.remote.getGlobal("i18n");

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
    var lang          = null;

    if (typeof(URLSearchParams) != "undefined") {
      var params = new URLSearchParams(location.search.slice(1));
      showStatusBar = params.get("showStatus") == 1;
      isFirstRun = params.get("isFirstRun") == 1;
      lightWallet = parseInt(params.get("lightWallet"), 10) == 1;
      lang = params.get("lang");
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
   
    if (electron.remote.getCurrentWindow().isFullScreen()) {
      template.push({
        label: i18n.t("exit_fullscreen"),
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

    UI.showAlert("<h1 data-i18n='server_log'>" + i18n.t("server_log") + "</h1><p><span data-i18n='last_messages_from_server_log'>" + i18n.t("last_messages_from_server_log") + "</span> (<a href='#' id='copy_server_log' data-i18n='copy'>" + i18n.t("copy") + "</a>):</p>" +
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
        document.getElementById("status-bar-giota").innerHTML = UI.convertToMiotas(data.hoverAmount);
      }
    }
  }

  UI.convertToMiotas = function(amount) {
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

    afterCommaDigits = 6;

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

    formattedAmount = "<span>" + negative + beforeComma + "</span>" + (afterComma ? "." + afterComma : "") + " Mi";

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

    modal.setContent("<h1 data-i18n='preferences'>" + i18n.t("preferences") + "</h1>" + 
                     "<div class='input-group'><label class='label--checkbox'><input type='checkbox' name='allow_short_seed_login' id='preferences_allow_short_seed_login' class='checkbox' value='1'" + (settings.allowShortSeedLogin ? " checked='checked'" : "") + " />" + i18n.t("allow_short_seed_login") + "</label>" + 
                     (process.platform != "linux" ? "<div class='input-group input-group-last'><label class='label--checkbox'><input type='checkbox' name='open_at_login' id='preferences_open_at_login' class='checkbox' value='1'" + (settings.openAtLogin ? " checked='checked'" : "") + " />" + i18n.t("open_at_login") + "</label>" : ""));
    
    modal.addFooterBtn(i18n.t("save"), "tingle-btn tingle-btn--primary", function() {
      var settings = {};

      if (process.platform != "linux") {
        settings.openAtLogin = document.getElementById("preferences_open_at_login").checked;
      }

      settings.allowShortSeedLogin = document.getElementById("preferences_allow_short_seed_login").checked;
      
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

    modal.setContent("<h1 data-i18n='add_neighbor_node'>" + i18n.t("add_neighbor_node") + "</h1>" + 
                     "<p data-i18n='confirm_add_node_to_config'>" + i18n.t("confirm_add_node_to_config") + "</p>" + 
                     "<p style='font-weight:bold'>" + String(node).escapeHTML() + "</p>");

    modal.addFooterBtn(i18n.t("yes_add_node"), "tingle-btn tingle-btn--primary", function() {
      modal.close();
      electron.ipcRenderer.send("addNeighborNode", node);
    });

    modal.addFooterBtn(i18n.t("no_cancel"), "tingle-btn tingle-btn--default", function() {
      modal.close();
    });

    modal.open();
  }

  UI.editNeighbors = function(nodes) {
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

        var el = document.getElementById("server_config_neighboring_nodes");

        var temp = el.value;
        el.value = "";
        el.value = temp;
        el.focus();
      }
    });

    var content = "";

    content = "<h1 data-i18n='edit_neighbors'></h1>" + 
    "<div class='input-group input-group'><label data-i18n='neighboring_nodes'>" + i18n.t("neighboring_nodes") + "</label>" + 
    "<textarea name='neighboring_nodes' id='server_config_neighboring_nodes' style='width:100%;height:150px;'>" + String(nodes).escapeHTML() + "</textarea></div>" + 
    "<p style='text-align:left;background:#efefef;padding:5px;color:gray;font-size:14px;'><span data-i18n='node_settings_format' style='text-align:left;font-size:14px;'>" + i18n.t("node_settings_format") + "</span>: udp://ip:12345</p>";

    modal.setContent(content);

    modal.addFooterBtn(i18n.t("save"), "tingle-btn tingle-btn--primary", function() {      
      modal.close();

      electron.ipcRenderer.send("updateNodeConfiguration", {"nodes": document.getElementById("server_config_neighboring_nodes").value});
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

        var el;

        if (configuration.lightWallet) {
          var select = document.getElementById("server_config_host_select");
          if (select) {
            select.addEventListener("change", function(e) {
              e.preventDefault();
              if (this.value == "custom") {
                document.getElementById("server_config_host").style.display = "block";
              } else {
                document.getElementById("server_config_host").style.display = "none";
              }
            });
          } else {
            el = document.getElementById("server_config_host");
          }
        } else {
          el = document.getElementById("server_config_port");
        }

        if (el) {
          var temp = el.value;
          el.value = "";
          el.value = temp;
          el.focus();
        }
      }
    });

    var content = "";

    if (configuration.lightWallet) {
      content = "<h1 data-18n='node_config'></h1>" + 
      "<div class='input-group'><label><span data-i18n='host' class='label'>" + i18n.t("host") + "</span> <span class='error' id='host-error'></span></label>";

      if (configuration.lightWalletHosts && configuration.lightWalletHosts.length) {
        content += "<select id='server_config_host_select'>";
        content += "<option value='' data-i18n='select_your_host'>" + i18n.t("select_your_host") + "</option>";

        var found = false;

        for (var i=0; i<configuration.lightWalletHosts.length; i++) {
          var lightWalletHost = configuration.lightWalletHosts[i];
          if (!found && (configuration.lightWalletHost && (configuration.lightWalletHost + ":" + configuration.lightWalletPort) == lightWalletHost)) {
            found = true;
          }
          content += "<option value='" + String(lightWalletHost).escapeHTML() + "'" + (configuration.lightWalletHost && (configuration.lightWalletHost + ":" + configuration.lightWalletPort) == lightWalletHost ? " selected='selected'" : "") + ">" + String(lightWalletHost).escapeHTML() + "</option>";
        }

        content += "<option value='custom'" + (!found ? " selected='selected'" : "") + " data-i18n='custom'>" + i18n.t("custom") + "</option>";
        content += "</select>";
        content += "<hr />";
        content += "<input type='text' id='server_config_host' placeholder='" + i18n.t("custom_host") + "' data-i18n='[placeholder]custom_host' value='" + (!found && configuration.lightWalletHost ? String(configuration.lightWalletHost).escapeHTML() + (configuration.lightWalletPort ? ":" + String(configuration.lightWalletPort).escapeHTML() : "") : "") + "' /></div>";
      } else {
        content += "<input type='text' id='server_config_host' placeholder='" + i18n.t("custom_host") + "' data-i18n='[placeholder]custom_host' value='" + (configuration.lightWalletHost ? String(configuration.lightWalletHost).escapeHTML() + (configuration.lightWalletPort ? ":" + String(configuration.lightWalletPort).escapeHTML() : "") : "") + "' /></div>";
      }

      content += "<div class='input-group'><label data-i18n='min_weight_magnitude'>" + i18n.t("min_weight_magnitude") + "</label>" + 
      "<input type='number' min='" + configuration.minWeightMagnitudeMinimum + "' name='min_weight_magnitude' id='server_config_min_weight_magnitude' placeholder='' value='" + String(configuration.minWeightMagnitude ? configuration.minWeightMagnitude : configuration.minWeightMagnitudeMinimum).escapeHTML() + "' /></div>";
    } else {
      content = "<h1 data-i18n='node_config'></h1>" + 
      "<div class='input-group'><label data-i18n='node_port'>" + i18n.t("node_port") + "</label>" + 
      "<input type='number' min='1024' name='port' id='server_config_port' placeholder='' value='" + (configuration.port ? String(configuration.port).escapeHTML() : "14265") + "' /></div>" +  
      "<div class='input-group'><label data-i18n='udp_receiver_port'>" + i18n.t("udp_receiver_port") + "</label>" + 
      "<input type='number' min='1024' name='udp_receiver_port' id='server_config_udp_receiver_port' placeholder='' value='" + (configuration.udpReceiverPort ? String(configuration.udpReceiverPort).escapeHTML() : "14600") + "' /></div>" +  
      "<div class='input-group'><label data-i18n='tcp_receiver_port'>" + i18n.t("tcp_receiver_port") + "</label>" + 
      "<input type='number' min='1024' name='tcp_receiver_port' id='server_config_tcp_receiver_port' placeholder='' value='" + (configuration.tcpReceiverPort ? String(configuration.tcpReceiverPort).escapeHTML() : "15600") + "' /></div>" +  
      "<div class='input-group'><label data-i18n='send_limit'>" + i18n.t("send_limit") + "</label>" + 
      "<input type='number' min='0' name='send_limit' id='server_config_send_limit' placeholder='' value='" + (configuration.sendLimit > 0 ? String(configuration.sendLimit).escapeHTML() : "") + "' /></div>" +  
      "<div class='input-group'><label data-i18n='depth'>" + i18n.t("depth") + "</label>" + 
      "<input type='number' min='1' name='depth' id='server_config_depth' placeholder='' value='" + (configuration.depth ? String(configuration.depth).escapeHTML() : "3") + "' /></div>" +
      "<div class='input-group'><label data-i18n='min_weight_magnitude'>" + i18n.t("min_weight_magnitude") + "</label>" + 
      "<input type='number' min='" + configuration.minWeightMagnitudeMinimum + "' name='min_weight_magnitude' id='server_config_min_weight_magnitude' placeholder='' value='" + String(configuration.minWeightMagnitude ? configuration.minWeightMagnitude : configuration.minWeightMagnitudeMinimum).escapeHTML() + "' /></div>" + 
      "<div class='input-group'><label><span data-i18n='db_location'>" + i18n.t("db_location") + "</span> <button id='db_location_select' class='small' style='display:inline-block;'>change</button></label>" + 
      "<div class='file-path' id='server_config_db_location_preview'>" + String(configuration.dbLocation).escapeHTML() + "</div>" + 
      "<input type='hidden' name='db_location' id='server_config_db_location' value='" + String(configuration.dbLocation).escapeHTML() + "' />";
    } 

    modal.setContent(content);
      
    if (!configuration.lightWallet) {
      document.getElementById('db_location_select').addEventListener('click', function(e) {
        currentLocation = document.getElementById('server_config_db_location').value;

        electron.remote.dialog.showOpenDialog({title: "Select Database Location", message: "Select Database Location", defaultPath: currentLocation, properties: ["openDirectory", "createDirectory"]}, function(filePaths) {
          if (filePaths && filePaths[0]) {
            document.getElementById('server_config_db_location').value = filePaths[0];
            document.getElementById('server_config_db_location_preview').innerHTML = String(filePaths[0]).escapeHTML();
          }
        });
      });
    }

    modal.addFooterBtn(i18n.t("save"), "tingle-btn tingle-btn--primary", function() {
      var config = {};

      config.lightWallet = configuration.lightWallet;
      
      if (configuration.lightWallet) {
        var selectedHost;

        var select = document.getElementById("server_config_host_select");
        if (select) {
          var selectedHost = select.options[select.selectedIndex].value;
          if (selectedHost == "custom") {
            selectedHost = document.getElementById("server_config_host").value;
          }
        } else {
          selectedHost = document.getElementById("server_config_host").value;
        }

        var res = selectedHost.match(/^(https?:\/\/.*):([0-9]+)$/i);

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
        config.udpReceiverPort = parseInt(document.getElementById("server_config_udp_receiver_port").value, 10);
        config.tcpReceiverPort = parseInt(document.getElementById("server_config_tcp_receiver_port").value, 10);
        config.sendLimit = parseFloat(document.getElementById("server_config_send_limit").value);
        config.depth = parseInt(document.getElementById("server_config_depth").value, 10);
        config.minWeightMagnitude = parseInt(document.getElementById("server_config_min_weight_magnitude").value, 10);
        config.dbLocation = document.getElementById("server_config_db_location").value;
      }

      modal.close();

      electron.ipcRenderer.send("updateNodeConfiguration", config);
    });

    modal.open();
  }

  UI.showUpdateAvailable = function() {
    UI.showAlert("<h1 data-i18n='update_available'>" + i18n.t("update_available") + "</h1><p data-i18n='update_being_downloaded'>" + i18n.t("update_being_downloaded") + "</p>");
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

    modal.setContent("<h1 data-i18n='new_update_available'>" + i18n.t("new_update_available") + "</h1><p data-i18n='version_is_downloaded_ready_to_install' data-i18n-options={version: " + String(releaseName).escapeHTML() + "}'>" + i18n.t("version_is_downloaded_ready_to_install", {version: String(releaseName).escapeHTML()}) + "</p>");

    modal.addFooterBtn(i18n.t("install_now"), "tingle-btn tingle-btn--primary", function() {
      modal.close();
      electron.ipcRenderer.send("installUpdate");
    });

    modal.addFooterBtn(i18n.t("install_on_quit"), "tingle-btn tingle-btn--default", function() {
      modal.close();
    });

    modal.open();
  }

  UI.showUpdateError = function() {
    UI.showAlert("<h1 data-i18n='update_error'>" + i18n.t("update_error") + "</h1><p data-i18n='error_during_update_check'>" + i18n.t("error_during_update_check") + "</p>");
  }

  UI.showCheckingForUpdate = function() {
    if (showQuitAlert) {
      return;
    }

    UI.showAlert("<h1 data-i18n='checking_for_updates'>" + i18n.t("checking_for_updates") + "</h1><p data-i18n='checking_for_updates_please_wait'>" + i18n.t("checking_for_updates_please_wait") + "</p>");
  }

  UI.showUpdateNotAvailable = function() {
    UI.showAlert("<h1 data-i18n='no_updates'>" + i18n.t("no_updates") + "</h1><p data-i18n='no_updates_available'>" + i18n.t("no_updates_available") + "</p>");
  }

  UI.showKillAlert = function() {
    showQuitAlert = true;

    UI.hideAlerts();

    var modal = new tingle.modal({
      footer: false,
      allowClose: false
    });

    modal.setContent("<h1 data-i18n='shutdown_in_progress'>" + i18n.t("shutdown_in_progress") + "</h1><p style='margin-bottom:0' data-i18n='shutting_down_iota'>" + i18n.t("shutting_down_iota") + "</p>");

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

    modal.addFooterBtn(i18n.t("ok"), "tingle-btn tingle-btn--primary", function() {
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
      msg = "<h1 data-i18n='error'>" + i18n.t("error") + "</h1><p data-i18n='error_please_restart'>" + i18n.t("error_please_restart") + "</p>";
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

    modal.addFooterBtn(i18n.t("ok"), "tingle-btn tingle-btn--primary", function() {
      modal.close();
    });

    modal.open();
  }

  UI.relaunchApplication = function(didFinalize) {
    electron.ipcRenderer.send("relaunchApplication", didFinalize);
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
    } else if (args && args.constructor == Object && args.hasOwnProperty("relaunch") && args.relaunch) {
      UI.relaunchApplication(true);
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

  UI.changeLanguage = function(language) {
    var i18nList = document.querySelectorAll('[data-i18n]');
    i18nList.forEach(function(v){
      v.innerHTML = i18n.t(v.dataset.i18n, v.dataset.i18nOptions);
    });
    if (webviewIsLoaded && webview) {
      webview.send("changeLanguage", language);
    }
  }

  UI.handleURL = function(url) {
    // Disable for now.
    return;

    UI.hideAlerts();
    
    url = decodeURI(url.replace("iota://", "").toLowerCase().replace(/\/$/, ""));

    if (url == "config" || url == "configuration" || url == "setup") {
      electron.ipcRenderer.send("editNodeConfiguration");
    } else if (url == "nodes" || url == "neighbors") {
      electron.ipcRenderer.send("editNeighbors");
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

electron.ipcRenderer.on("pasteTrytes", function() {
  UI.hideAlerts();
  UI.sendToWebview("pasteTrytes");
});

electron.ipcRenderer.on("updateSettings", function(event, settings) {
  UI.sendToWebview("updateSettings", settings);
});

electron.ipcRenderer.on("stopCcurl", function(event, data) {
  UI.sendToWebview("stopCcurl", data);
});

electron.ipcRenderer.on("editNodeConfiguration", function(event, serverConfiguration) {
  UI.editNodeConfiguration(serverConfiguration);
});

electron.ipcRenderer.on("editNeighbors", function(event, nodes) {
  UI.editNeighbors(nodes);
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

electron.ipcRenderer.on("changeLanguage", function(event, language) {
  UI.changeLanguage(language);
});

electron.ipcRenderer.on("relaunch", UI.relaunch);

electron.ipcRenderer.on("shutdown", UI.shutdown);