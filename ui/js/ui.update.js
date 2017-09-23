var UI = (function(UI, $, undefined) {
  UI.updateIntervalTime = 0;
  UI.isDoingPOW         = false;

  var isUpdatingState   = false;
  var updateInterval    = null;

  var stopStateInterval = false;

  UI.resetState = function(timeout) {
    console.log("UI.resetState");

    if (!connection.seed) {
      UI.loginFormShown = false;
    }
    UI.initializationTime = new Date().getTime();
    UI.initialConnection = false;
    isUpdatingState = false;
    UI.updateState(timeout);
  }

  UI.updateState = function(timeout) {
    console.log("UI.updateState: " + timeout);

    if (timeout) {
      setTimeout(function() {
        UI.createStateInterval(UI.updateIntervalTime, true);
      }, timeout);
    } else {
      UI.createStateInterval(UI.updateIntervalTime, true);
    }
  }

  UI.createStateInterval = function(ms, immediately) {
    if (stopStateInterval) {
      return;
    }
    // If connecting to a light wallet, minimum state interval is set to 1 minute.
    if (connection.lightWallet && ms < 60000) {
      ms = 60000;
    }

    UI.updateIntervalTime = ms;

    if (updateInterval) {
      clearTimeout(updateInterval);
    }

    if (immediately) {
      ms = 0;
    }

    console.log("UI.createStateInterval: " + UI.updateIntervalTime + ", " + ms);
    console.log(new Date());

    updateInterval = setTimeout(function() {
      console.log("In update interval: " + isUpdatingState + ", " + UI.isLoggingIn + ", " + UI.isDoingPOW);
      console.log(new Date());

      if (!isUpdatingState && !UI.isLoggingIn && !UI.isDoingPOW) {
        isUpdatingState = true;

        console.log("Execute interval");

        iota.api.getNodeInfo(function(error, info) {
          connection.nodeInfo = info;

          console.log("Got node info");
          console.log(new Date());

          if (connection.seed) {
            iota.api.getAccountData(connection.seed, function(error, accountData) {
              console.log("Got account data");
              console.log(new Date());

              if (!error) {
                connection.previousAccountData = connection.accountData;
                connection.accountData = accountData;
              }
              
              isUpdatingState = false;

              UI.createStateInterval(UI.updateIntervalTime);
              if (!error) {
                UI.update();
              }
            });
          } else {
            if (error && connection.lightWallet) {
              //Show error specifically for light nodes...
              UI.notify("error", "could_not_connect_to_remote_node");
              $("#error-btn").addClass("no-connection");
              if (!connection.seed) {
                UI.showLoginForm = true;
              }
            }
            UI.createStateInterval(UI.updateIntervalTime);
            isUpdatingState = false;
            UI.update();
          }
        });
      } else {
        console.log("Skipping update interval");
      }
    }, ms);
  }

  UI.stopStateInterval = function() {
    clearTimeout(updateInterval);
    stopStateInterval = true;
  }

  UI.startStateInterval = function() {
    stopStateInterval = false;
  }

  UI.update = function() {
    if (!UI.initialConnection && connection.nodeInfo) {
      console.log("We have an initial connection.");
      UI.initialConnection = true;
      if (connection.nodeInfo.appName.match(/testnet/i)) {
        connection.testNet = true;
        if (connection.minWeightMagnitude < 9) {
          connection.minWeightMagnitude = 9;
        }
      } else if (connection.minWeightMagnitude < 14) {
        connection.minWeightMagnitude = 14;
      }
      if (connection.inApp && connection.lightWallet) {
        updateAppInfo({"name": connection.nodeInfo.appName, "version": connection.nodeInfo.appVersion, "testnet": connection.testNet});
      }
      $(document).trigger("initialConnection");
      if (!connection.seed) {
        // After initial connection, update state every 2 seconds
        UI.createStateInterval(2000, false);
      }
    }

    if (connection.nodeInfo && connection.inApp && connection.lightWallet) {
      var data = {};
      if (connection.nodeInfo.latestSolidSubtangleMilestoneIndex) {
        data.latestSolidSubtangleMilestoneIndex = connection.nodeInfo.latestSolidSubtangleMilestoneIndex;
      }
      if (connection.nodeInfo.latestMilestoneIndex) {
        data.latestMilestoneIndex = connection.nodeInfo.latestMilestoneIndex;
      }
      updateStatusBar(data);
    }

    if (!connection.seed) {
      if (!UI.showLoginForm) {
        UI.showLoginForm = true;
      } else if (!UI.loginFormShown) {
        UI.fadeInLoginForm();
      } else {
        UI.updateLoginForm();
      }
    } else {
      if (connection.accountData) {
        UI.updateBalance();
      }

      UI.updateHistory();
    }
  }

  return UI;
}(UI || {}, jQuery));
