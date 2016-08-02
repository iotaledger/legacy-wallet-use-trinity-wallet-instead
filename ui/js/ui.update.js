var UI = (function(UI, $, undefined) {
  UI.updateIntervalTime = 0;

  var isUpdatingState  = false;
  var updateInterval   = null;

  UI.createStateInterval = function(ms, immediately) {
    console.log("UI.createStateInterval: " + ms);

    UI.updateIntervalTime = ms;

    if (updateInterval) {
      clearInterval(updateInterval);
    }

    updateInterval = setInterval(function() {
      if (!isUpdatingState && !UI.isLoggingIn) {
        isUpdatingState = true;
        Server.updateState().done(UI.update).fail(UI.update).always(function() {
          isUpdatingState = false;
        });
      }
    }, ms);

    if (immediately) {
      console.log("UI.createStateInterval: Execute immediately");
      if (!isUpdatingState) {
        isUpdatingState = true;
        Server.updateState().done(UI.update).fail(UI.update).always(function() {
          isUpdatingState = false;
        });
      } else {
        console.log("UI.createStateInterval: Cannot execute immediately, already updating state");
      }
    }
  }

  UI.update = function() {
    if (!UI.initialConnection && connection.nodeInfo) {
      console.log("We have an initial connection.");
      UI.initialConnection = true;
      $(document).trigger("initialConnection");
      if (!connection.isLoggedIn) {
        // After initial connection, update state every 2 seconds
        UI.createStateInterval(2000, false);
      }

      if (connection.nodeInfo.neighbors < 7) {
        var options = {timeOut: 30000, 
                       extendedTimeOut: 30000};

        if (connection.inApp) {
          options.onclick = function() {
            editServerConfiguration();
          }
        }

        UI.notify("error", "Add more nodes, you only have " + parseInt(connection.nodeInfo.neighbors, 10) + ". Try to have between 7-10 nodes.", options);
      }
    }

    if (!connection.isLoggedIn) {
      if (!UI.showLoginForm) {
        UI.showLoginForm = true;
      } else if (!UI.loginFormShown) {
        UI.fadeInLoginForm();
      } else {
        UI.updateLoginForm();
      }
    } else {
      if (connection.balance != -1) {
        UI.updateBalance();
      }

      UI.updateHistory();
    }
  }

  return UI;
}(UI || {}, jQuery));