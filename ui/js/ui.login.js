var UI = (function(UI, $, undefined) {
  UI.showLoginForm      = false;
  UI.loginFormShown     = false;
  UI.isLoggingIn        = false;
  UI.isLoggingOut       = false;
  UI.isShuttingDown     = false;

  var loginGradientInterval;
  var _seedError;

  UI.showLoginScreen = function() {
    console.log("UI.showLoginScreen");

    $("#app").hide();

    $("#login").show();

    loginGradientInterval = UI.applyGradientAnimation("#login", [[77, 193, 181], [40, 176, 162], [0, 132, 118], [0, 104, 93]]);

    setTimeout(function() {
      clearInterval(loginGradientInterval);
    }, 60000);

    $("#login .logo").hide().fadeIn(1000, function() {
      if (UI.showLoginForm) {
        UI.fadeInLoginForm();
      } else {
        UI.showLoginForm = true;
      }
    });

    $("#login-password").on("keydown", function(e) {
      if (e.keyCode == 13 && !$("#login-btn").is(":disabled")) {
        $("#login-btn").trigger("click");
      }
    });

    $("#login-btn").on("click", function(e) {
      try {
        var seed = String($("#login-password").val());

        if (!seed) {
          throw i18n.t("seed_is_required");
        } else if (seed.match(/[^A-Z9]/) || seed.match(/^[9]+$/)) {
          throw i18n.t("invalid_seed");
        } else if (seed.length < 60) {
          if (connection.allowShortSeedLogin) {
            _seedError = i18n.t("seed_not_secure");
          } else {
            throw i18n.t("invalid_seed");
          }
        } else if (seed.length > 81) {
          throw i18n.t("invalid_seed");
        }

        while (seed.length < 81) {
          seed += "9";
        }

        connection.seed = seed;
      } catch (error) {
        console.log("UI.login: Error");
        console.log(error);
        $("#login-btn").loadingError(error);
        $("#login-password").focus();
        return;
      }

      UI.isLoggingIn = true;

      if (connection.inApp) {
        clearClipboard();
      }

      setTimeout(function() {
        UI.executeState(function(error) {
          if (error) {
            connection.seed = "";
            console.log(error);
            if (error.message.match(/This operations cannot be executed: The subtangle has not been updated yet/i)) {
              $("#login-btn").loadingError("not_synced");
            } else {
              $("#login-btn").loadingError("connection_refused");
            }
            UI.initialConnection = false;
            UI.createStateInterval(500, false);
          } else {
            $("#login-password").val("");
            $("#login-btn").loadingReset("logging_in", {"icon": "fa-cog fa-spin fa-fw"});
            UI.showAppScreen();
          }
          UI.isLoggingIn = false;
        });
      }, 150);
    });

    UI.handleHelpMenu();
    UI.handleNetworkSpamming();
    UI.handlePastingTrytes();
  }

   UI.showAppScreen = function() {
    console.log("UI.showAppScreen");

    clearInterval(loginGradientInterval);

    // After logging in, update state every minute
    UI.createStateInterval(60000, false);

    UI.update();

    $("#app").css("z-index", 1000).fadeIn(400, function() {
      $("#login").hide();
    });

    UI.animateStacks(0);

    if (_seedError) {
      var options = {timeOut: 10000, 
                     extendedTimeOut: 10000};

      UI.notify("error", _seedError, options);
    }

    $(window).on("resize", function() {
      UI.animateStacks(0);
    });

    $(".logout").on("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      UI.isLoggingOut = true;
      
      iota.api.interruptAttachingToTangle(function() {
        window.location.reload();
      });
    });

    UI.handleTransfers();
    UI.handleAddressGeneration();
    UI.handleHistory();

    $("#app").on("click", ".stack:not(.open)", function(e) {
      e.preventDefault();
      e.stopPropagation();
      $(".stack.open").removeClass("open").addClass("closing");
      $(this).removeClass("closed").addClass("open opening");

      UI.animateStacks(200);

      var onOpen = $(this).data("onopen");
      
      if (onOpen && UI[onOpen]) {
        UI[onOpen]();
      }

      // Should be done in callback instead..
      setTimeout(function() {
        $(".stack.closing").removeClass("closing");
        $(".stack:not(.open)").addClass("closed");
        $(".stack.open").removeClass("opening");
      }, 205);
    });

    if (connection.handleURL) {
      UI.handleURL();
    }
  }

  UI.fadeInLoginForm = function() {
    UI.loginFormShown = true;

    var $form = $("#login-form");

    $form.find(":input").hide();
    // Hackety hack
    if ($("#error-btn").hasClass("no-connection")) {
      $("#error-btn").show();
    }
    $form.fadeIn(400);

    UI.updateLoginForm();
  }

  UI.updateLoginForm = function() {
    if (!connection.nodeInfo) {
      console.log("UI.updateLoginForm: No node info");
      if (connection.inApp && !UI.initialConnection) {
        var timeTaken = new Date().getTime() - UI.initializationTime;
        if (timeTaken >= 500 && timeTaken < 10000) {
          if (!$("#error-btn").hasClass("no-connection")) {
            $("#login-btn, #login-password").hide();
            $("#error-btn").addClass("no-connection").html(i18n.t("connecting")).fadeIn();
          }
        }
      } else {
        $("#login-btn, #login-password").hide();
        $("#error-btn").removeClass("no-connection").html(i18n.t("connection_refused")).show();
        if (UI.updateIntervalTime != 500) {
          UI.createStateInterval(500, false);
        }
      }
    } else if (!$("#login-password").is(":visible")) {
      console.log("UI.updateLoginForm: Fade in");

      var fadeIn = false;

      if ($("#error-btn").hasClass("no-connection") && $("#error-btn").is(":visible")) {
        fadeIn = true;
      }

      $("#error-btn").hide();

      if (fadeIn) {
        $("#login-btn, #login-password").fadeIn();
      } else {
        $("#login-btn, #login-password").show();
      }

      $("#login-password").focus();
    }
  }

  UI.shutdown = function() {
    UI.isShuttingDown = true;
  }
  
  return UI;
}(UI || {}, jQuery));