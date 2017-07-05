var UI = (function(UI, $, undefined) {
  UI.inAppInitialize = function() {
    console.log("UI.inAppInitialize");
    window.addEventListener("message", handleAppEvents, false);

    // Enable status bar updating
    if (connection.showStatus) {
      UI.startStatusBarTracking();
    }

    rendererIsReady();
  }

  UI.startStatusBarTracking = function() {
    console.log("UI.startStatusBarTracking");

    connection.showStatus = 1;

    $("body").on("mouseenter.status", ".amount", function(e) {
      e.preventDefault();
      e.stopPropagation();
      hoverAmountStart($(this).data("value"));
    }).on("mouseleave.status", ".amount", function(e) {
      e.preventDefault();
      e.stopPropagation();
      hoverAmountStop();
    });
  }

  UI.stopStatusBarTracking = function() {
    console.log("UI.stopStatusBarTracking");

    connection.showStatus = 0;

    $("body").off("mouseenter.status");
    $("body").off("mouseleave.status");
  }

  function handleAppEvents(evt) {
    console.log("UI.handleAppEvents: " + evt.data);

    var message;

    if (evt.origin != "file://") {
      console.log("UI.handleAppEvents: Event origin != file");
      return;
    }

    switch (evt.data) {
      case "showNodeInfo": 
        UI.showNodeInfo();
        break;
      case "showPeers": 
        UI.showPeers();
        break;
      case "hideAlerts":
        UI.hideAlerts();
        break;
      default:
        console.log("UI.handleAppEvents: Unknown command");
        break
    }
  }

  return UI;
}(UI || {}, jQuery));