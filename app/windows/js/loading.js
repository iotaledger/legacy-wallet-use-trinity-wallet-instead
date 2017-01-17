window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, title, msg, params) {
  UI.show(title, msg, params);
});