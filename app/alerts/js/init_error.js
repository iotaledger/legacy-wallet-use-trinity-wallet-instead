const electron = require("electron");

var UI = (function(UI, undefined) {
  UI.initialize = function() {
    document.getElementById("quit-btn").addEventListener("click", function(e) {
      document.getElementById("quit-btn").disabled = true;
      electron.ipcRenderer.send("quit");
    });
    document.getElementById("restart-btn").addEventListener("click", function(e) {
      document.getElementById("restart-btn").disabled = true;
      UI.relaunchApplication(String(document.getElementById("java_parameters").value).trim());
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

  UI.show = function(title, msg, params) {
    if (title) {
      document.getElementById("title").innerHTML = title;
      document.getElementById("title").style.display = "block";
    } else {
      document.getElementById("title").style.display = "none";
    }
    if (msg) {
      document.getElementById("message").innerHTML = msg;
      document.getElementById("message").style.display = "block";
    } else {
      document.getElementById("message").style.display = "none";
    }
    if (params) {
      if (params.serverOutput && params.serverOutput.length) {
        var log = params.serverOutput.join("\n");
        log = log.replace(/\n\s*\n/g, "\n");

        if (!log || params.serverOutput.length == 1) {
          log = "No server output.";
        }

        document.getElementById("server_output").value = log;
        //document.getElementById("server_output").scrollTop = document.getElementById("server_output").scrollHeight;
      }

      if (params.javaArgs) {
        document.getElementById("java_parameters").value = params.javaArgs;
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

  UI.relaunchApplication = function(javaArgs) {
    electron.ipcRenderer.send("relaunchApplication", (javaArgs ? javaArgs : -1));
  }

  UI.showNoJavaInstalledWindow = function() {
    electron.ipcRenderer.send("showNoJavaInstalledWindow", {"downloadImmediatelyIfWindows": true});
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, title, msg, params) {
  UI.show(title, msg, params);
});