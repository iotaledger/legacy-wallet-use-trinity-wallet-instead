var UI = (function(UI, $, undefined) {
  UI.updateIntervalTime = 0;

  var isUpdatingState  = false;
  var updateInterval   = null;

  function stateExecution(callback) {
    if (connection.seed) {
      iota.api.getNodeInfo(function(error, info) {
        connection.nodeInfo = info;

        iota.api.getAccountData(connection.seed, function(error, accountData) {
          connection.previousAccountData = connection.accountData;
          connection.accountData = accountData;
          callback(error, accountData);
        });
      });
    } else {
      iota.api.getNodeInfo(function(error, info) {
        connection.nodeInfo = info;
        if (callback) {
          callback(error, info);
        }
      });
    }
  }

  UI.executeState = function(callback) {
    return stateExecution(callback);
  }

  UI.updateState = function(timeout) {
    if (timeout) {
      setTimeout(function() {
        UI.createStateInterval(UI.updateIntervalTime, true);
      }, timeout);
    } else {
      UI.createStateInterval(UI.updateIntervalTime, true);
    }
  }

  UI.createStateInterval = function(ms, immediately) {
    console.log("UI.createStateInterval: " + ms);

    UI.updateIntervalTime = ms;

    // If connecting to a light wallet, minimum state interval is set to 1 minute.
    if (connection.lightWallet && ms < 60000) {
      ms = 60000;
    }

    if (updateInterval) {
      clearInterval(updateInterval);
    }

    updateInterval = setInterval(function() {
      if (!isUpdatingState && !UI.isLoggingIn) {
        isUpdatingState = true;
        stateExecution(function(error) {
          if (!error) {
            UI.update();
          }
          isUpdatingState = false;
        });
      }
    }, ms);

    if (immediately) {
      console.log("UI.createStateInterval: Execute immediately");
      if (!isUpdatingState) {
        isUpdatingState = true;
        stateExecution(function(error) {
          if (!error) {
            UI.update();
          }
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
      if (connection.nodeInfo.appName.match(/testnet/i)) {
        connection.testNet = true;
        if (connection.minWeightMagnitude < 13) {
          connection.minWeightMagnitude = 13;
        }
      } else if (connection.minWeightMagnitude < 18) {
        connection.minWeightMagnitude = 18;
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

    if (connection.nodeInfo && connection.inApp) {
      updateStatusBar({"latestMilestoneIndex": connection.nodeInfo.latestMilestoneIndex, "latestSolidSubtangleMilestoneIndex": connection.nodeInfo.latestSolidSubtangleMilestoneIndex});
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