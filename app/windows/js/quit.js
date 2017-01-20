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
  UI.initialize = function() {
    document.getElementById("quit-btn").addEventListener("click", function(e) {
      electron.ipcRenderer.send("quit");
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
    }

    electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, params) {
  UI.show(params);
});
