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
    document.getElementById("quit-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      electron.ipcRenderer.send("quit");
    });
    document.getElementById("restart-btn").addEventListener("click", function(e) {
      document.getElementById("restart-btn").disabled = true;

      var settings = {};

      if (_updateNodeConfiguration) {
        settings.port  = parseInt(document.getElementById("port").value, 10);
        settings.nodes = document.getElementById("nodes").value;
      }

      UI.updateNodeConfiguration(settings, String(document.getElementById("java-parameters").value).trim());
    });
    document.getElementById("download-java").addEventListener("click", function(e) {
      document.getElementById("download-java").disabled = true;
      UI.showNoJavaInstalledWindow();
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
      if (params.updateNodeConfiguration) {
        _updateNodeConfiguration = true;
        if (msg.match(/provide port number/i)) {
          document.getElementById("server-output-section").style.display = "none";
          document.getElementById("restart-btn").innerHTML = "Start";
        } else {
          document.getElementById("server-output-section").style.display = "block";
        }
        document.getElementById("edit-launch-arguments-section").style.display = "block";

        if (params.port) {
          document.getElementById("port").value = params.port;
        }

        if (params.nodes) {
          document.getElementById("nodes").value = params.nodes.join("\r\n");
        }
      } else {
        document.getElementById("server-output-section").style.display = "block";
        document.getElementById("edit-launch-arguments-section").style.display = "none";
      }

      if (params.serverOutput && params.serverOutput.length) {
        var log = params.serverOutput.join("\n");
        log = log.replace(/\n\s*\n/g, "\n");

        if (!log || params.serverOutput.length == 1) {
          log = "No server output.";
        }

        document.getElementById("server-output").value = log;
        //document.getElementById("server-output").scrollTop = document.getElementById("server-output").scrollHeight;
      }

      if (params.javaArgs) {
        document.getElementById("java-parameters").value = params.javaArgs;
      }

      if (params.is64BitOS && !params.java64BitsOK) {
        document.getElementById("download-java-explanation").style.display = "block";
        document.getElementById("download-java").style.display = "block";
      }
    } 

    electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }

  UI.updateNodeConfiguration = function(settings, javaArgs) {
    electron.ipcRenderer.send("updateNodeConfiguration", settings, javaArgs);
  }

  UI.showNoJavaInstalledWindow = function() {
    electron.ipcRenderer.send("showNoJavaInstalledWindow", {"downloadImmediatelyIfWindows": true});
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, params) {
  UI.show(params);
});