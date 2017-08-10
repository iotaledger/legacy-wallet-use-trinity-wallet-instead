var UI = (function(UI, $, undefined) {
  UI.showLoginForm      = false;
  UI.loginFormShown     = false;
  UI.isLoggingIn        = false;
  UI.isLoggingOut       = false;
  UI.isShuttingDown     = false;

  var loginGradientInterval;
  var _seedError;
  var _loginFormShownCallback;

  UI.showLoginScreen = function() {
    console.log("UI.showLoginScreen");

    $("#app").hide();

    $("#login").show();

    loginGradientInterval = UI.applyGradientAnimation("#login", [[77, 193, 181], [40, 176, 162], [0, 132, 118], [0, 104, 93]]);

    setTimeout(function() {
      clearInterval(loginGradientInterval);
    }, 60000);

    if (!connection.keccak) {
      _loginFormShownCallback = UI.showTransitionModal;
    }

    UI.handleTransitioning();
    UI.handleHelpMenu();
    UI.handleNetworkSpamming();
    UI.handlePastingTrytes();

    $("#login .logo").hide().fadeIn(1000, function() {
      if (UI.showLoginForm) {
        UI.fadeInLoginForm();
      } else {
        UI.showLoginForm = true;
      }
    });

    $("#login-password").on("keydown keyup", function(e) {
      if (e.keyCode == 13 && !$("#login-btn").is(":disabled")) {
        $("#login-btn").trigger("click");
      }

      var seed = $(this).val();

      $checksum = $("#login-checksum");

      $checksum.removeClass();

      if (!seed) {
        $checksum.html("<i class='fa fa-question-circle'></i>").addClass("help icon").attr("title", "");;
      } else if (seed.match(/[^A-Z9]/) || seed.match(/^[9]+$/)) {
        $checksum.html("<i class='fa fa-exclamation-circle'></i>").addClass("invalid icon").attr("title", UI.t("seed_character_set"));
      } else if (seed.length < 60 && !connection.allowShortSeedLogin) {
        $checksum.html("&lt;60").addClass("invalid").show().attr("title", UI.t("seed_too_short"));
      } else if (seed.length > 81) {
        $checksum.html("&gt;81").addClass("invalid").show().attr("title", UI.t("seed_too_long"));
      } else {
        try {
          var checksum = iota.utils.addChecksum(seed, 3, false).substr(-3);
          if (checksum != "999") {
            $checksum.html(UI.format(checksum)).attr("title", UI.t("seed_checksum"));
          } else {
            $checksum.html("<i class='fa fa-exclamation-circle'></i>").addClass("invalid icon").attr("title", UI.t("seed_character_set"));
          }
        } catch (err) {
          console.log(err);
          $checksum.html("<i class='fa fa-exclamation-circle'></i>").addClass("invalid icon").attr("title", UI.t("seed_character_set"));
        }
      }

      seed = "";
    });

    $("#login-checksum").on("click", function(e) {
      if ($(this).hasClass("icon")) {
        UI.openHelpMenu();
      }
    });

    $("#error-btn").on("click", function(e) {
      e.preventDefault();

      if (connection.inApp) {
        editNodeConfiguration();
      }
    });

    $("#login-btn").on("click", function(e) {
      try {
        var seed = String($("#login-password").val());

        if (!seed) {
          throw UI.t("seed_is_required");
        } else if (seed.match(/[^A-Z9]/) || seed.match(/^[9]+$/)) {
          throw UI.t("invalid_characters");
        } else if (seed.length < 60) {
          if (connection.allowShortSeedLogin) {
            _seedError = UI.t("seed_not_secure");
          } else {
            throw UI.t("seed_too_short");
          }
        } else if (seed.length > 81) {
          throw UI.t("seed_too_long");
        }

        if (connection.inApp) {
          clearSeedFromClipboard(seed);
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

      seed = "";

      UI.isLoggingIn = true;

      setTimeout(function() {
        iota.api.getAccountData(connection.seed, function(error, accountData) {
          UI.isLoggingIn = false;

          connection.accountData = accountData;

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
            $("#login-btn").loadingReset("login", {"icon": "fa-cog fa-spin fa-fw"});

            UI.showAppScreen();
          }
        });
      }, 150);
    });
  }

  UI.showAppScreen = function() {
    oldIota = null;
    UI.isTransitioningSeed = false;
    
    console.log("UI.showAppScreen");

    clearInterval(loginGradientInterval);

    // After logging in, update state every minute
    UI.createStateInterval(60000, false);

    UI.update();

    $("#app").css("z-index", 1000).fadeIn(400, function() {
      $("#login").remove();
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

      if (UI.isLoggingOut) {
        return;
      }

      UI.isLoggingOut = true;

      var params = {
        "inApp": 1,
        "showStatus": connection.showStatus ? 1 : 0,
        "host": connection.host,
        "port": connection.port,
        "depth": connection.depth,
        "minWeightMagnitude": connection.minWeightMagnitude,
        "ccurlPath": connection.ccurlPath,
        "language": connection.language,
        "allowShortSeedLogin": connection.allowShortSeedLogin ? 1 : 0,
        "interrupt": 1,
        "keccak": connection.keccak ? 1 : 0
      }

      window.location.href = "index.html?" + $.param(params);
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

      var $stack = $(this);

      var onOpen = $stack.data("onopen");
      
      if (onOpen && UI[onOpen]) {
        UI[onOpen]();
      }

      // Should be done in callback instead..
      setTimeout(function() {
        $(".stack.closing").removeClass("closing");
        $(".stack:not(.open)").addClass("closed");
        $(".stack.open").removeClass("opening");

        var onOpenCompleted = $stack.data("onopencompleted");

        if (onOpenCompleted && UI[onOpenCompleted]) {
          setTimeout(function() {
            UI[onOpenCompleted]();
          }, 25);
        }
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
            $("#error-btn").addClass("no-connection").html(UI.t("connecting")).fadeIn();
          }
        }
      } else {
        $("#login-btn, #login-password").hide();
        $("#error-btn").removeClass("no-connection").html(UI.t("connection_refused")).show();
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

      if (_loginFormShownCallback) {
        _loginFormShownCallback();
      }
    }
  }

  UI.shutdown = function() {
    UI.isShuttingDown = true;
  }

  return UI;
}(UI || {}, jQuery));