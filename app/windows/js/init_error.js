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
  var isLightWallet = false;

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
   
    const menu = electron.remote.Menu.buildFromTemplate(template);
    menu.popup(electron.remote.getCurrentWindow(), e.x, e.y);
  }

  UI.show = function(params) {
    if (params) {
      isLightWallet = params.lightWallet == 1;
      if (params.title) {
        document.getElementById("title").innerHTML = String(params.title).escapeHTML();
        document.getElementById("title").style.display = "block";
      } else {
        document.getElementById("title").style.display = "none";
      }
      if (params.message) {
        document.getElementById("message").innerHTML = String(params.message).escapeHTML();
        document.getElementById("message").style.display = "block";
      } else {
        document.getElementById("message").style.display = "none";
      }

      if (params.serverOutput && params.serverOutput.length) {
        var log = params.serverOutput.join("\n");
        log = log.replace(/\n\s*\n/g, "\n");

        if (!log || params.serverOutput.length == 1) {
          log = "No server output.";
        }

        document.getElementById("server-output").value = log;
        document.getElementById("server-output-section").style.display = "block";
        //document.getElementById("server-output").scrollTop = document.getElementById("server-output").scrollHeight;
      } else {
        document.getElementById("server-output-section").style.display = "none";
      }
    } 

    electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }

  UI.showNoJavaInstalledWindow = function() {
    electron.ipcRenderer.send("showNoJavaInstalledWindow", {"downloadImmediatelyIfWindows": true});
  }

  UI.showSetupWindow = function(section) {
    electron.ipcRenderer.send("showSetupWindow", {"section": section});
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, params) {
  UI.show(params);
});