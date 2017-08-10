var UI = (function(UI, $, undefined) {
  UI.isTransitioningSeed = false;

  var _modal;
  var _inputs;
  var _startIndex = 0;
  var _endIndex   = 49;
  var _seed;
  var _totalBalance = 0;

  UI.showTransitionModal = function(callback) {
    if (UI.isLocked || UI.isTransitioningSeed) {
      return;
    }

    if (connection.seed) {
      UI.notify("error", "please_log_out_first");
      return;
    }

    UI.isLocked = true;
    UI.isTransitioningSeed = true;

    resetState();

    UI.stopStateInterval();

    var $modal = $("#transition-modal");

    _modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false});
    _modal.open();

    $("#transition-seed").focus();
  }

  UI.handleTransitioning = function() {
    $(document).on("closed", "#transition-modal", function (e) {
      UI.startStateInterval();
      UI.isTransitioningSeed = false;
      UI.isLocked = false;

      oldIota = null;
      window.OldIOTA = null;

      resetState();

      if (connection.inApp && !connection.keccak) {
        finishedTransitioningToKeccak();
      }
    });

    $("#transition-restart-btn").on("click", function(e) {
      resetState();
    });

    $("#transition-stop-btn").on("click", function(e) {
      _modal.close();

      $("#transition-stop-btn").loadingReset("stop_transitioning");
    });

    $("#transition-balance-incomplete-btn").on("click", function(e) {
      $("#transition-balance-complete-btn").addClass("btn-disabled").attr("disabled", "disabled");

      _startIndex = _endIndex + 1;
      _endIndex   = _startIndex + 49;

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "cannot_close_whilst_transitioning");
        e.preventDefault();
        e.stopPropagation();
      });

      console.log(_inputs);
      console.log(_startIndex);
      console.log(_endIndex);

      checkSeedBalance(_seed, function(error, totalBalance) {
        if (error) {
          $("#transition-balance").hide();
          $("#transition-balance-incomplete-btn").loadingError(error);
        } else {
          $("#transition-balance").html(UI.t("balance") + " (" + (_endIndex+1) + " " + UI.t("addresses") + "): " + UI.formatAmount(totalBalance)).show();
          $("#transition-balance-incomplete-btn").loadingReset("balance_is_incomplete");
          $("#transition-balance-complete-btn").removeClass("btn-disabled").removeAttr("disabled");
        }

        $(".remodal-close").off("click");
      });
    });

    $("#transition-balance-complete-btn").on("click", function(e) {
      if (!_inputs || !_inputs.length || !_totalBalance) {
        $("#transition-balance-complete-btn").loadingError("account_is_empty");
        return;
      }

      $("#transition-balance-complete-btn").loadingSuccess("balance_is_complete");

      $("#transition-phase-3-group").fadeIn();
      $("#transition-phase-2-group").hide();
    });

    $("#transition-balance-btn").on("click", function(e) {
      if (!_inputs || !_inputs.length || !_totalBalance) {
        $("#transition-balance-btn").loadingError("account_is_empty");
        return;
      }

      var newSeed = String($("#transition-new-seed").val());
      var newSeedConfirmation = String($("#transition-new-seed-confirmation").val());

      try {
        checkSeed(newSeed);

        if (newSeed != newSeedConfirmation) {
          throw "Seeds do not match";
        }

        while (newSeed.length < 81) {
          newSeed += "9";
        }

        if (newSeed == _seed) {
          throw "Same as previous seed";
        }
      } catch (err) {
        console.log(err);
        $("#transition-balance-btn").loadingError(err);
        $("#transition-new-seed").focus();
        return;
      }

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "cannot_close_whilst_transitioning");
        e.preventDefault();
        e.stopPropagation();
      });

      setTimeout(function() {

        iota.api.getNewAddress(newSeed, {"index": 0, "total": 2, "checksum": false}, function(error, newAddresses) {

          if (error) {
            $("#transition-balance-incomplete-btn").removeClass("btn-disabled").removeAttr("disabled");
            $("#transition-balance-complete-btn").loadingError(error);
            $(".remodal-close").off("click");
            return;
          }

          UI.isDoingPOW = true;

          console.log("GENERATED TWO ADDRESSES", newAddresses)

          console.log("Transfer: ", {"inputs": _inputs, "address": newAddresses[1], "value": _totalBalance, "message": "", "tag": newAddresses[0].slice(0, 27)});

          oldIota.api.sendTransfer(_seed, connection.depth, connection.minWeightMagnitude, [{
              "address": newAddresses[0],
              "value": 0,
              "message": "",
              "tag": ""
          },{
              "address": newAddresses[1],
              "value": _totalBalance,
              "message": "",
              "tag": newAddresses[0].slice(0, 27)
          }], {"inputs": _inputs}, function(error, transfers) {

            UI.isDoingPOW = false;

            if (error) {
              $("#transition-balance-btn").loadingError(error);
            } else {
              $("#transition-phase-4-group").fadeIn();
              $("#transition-phase-3-group").hide();
              $("#transition-balance-btn").loadingSuccess("transition_succeeded");
            }

            $(".remodal-close").off("click");
          });
        });
      }, 1000);
    });

    $("#search-address-space-btn").on("click", function(e) {
      _seed = String($("#transition-seed").val());

      try {
        checkSeed(_seed);
      } catch (err) {
        console.log(err);
        $("#search-address-space-btn").loadingError(err);
        $("#transition-seed").focus();
        return;
      }

      while (_seed.length < 81) {
        _seed += "9";
      }

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "cannot_close_whilst_transitioning");
        e.preventDefault();
        e.stopPropagation();
      });

      addOldIotaLib(function(error) {
        if (error) {
          $("#search-address-space-btn").loadingError(error);
          return;
        }

        oldIota = new OldIOTA({
          "host": connection.host,
          "port": connection.port
        });

        if (connection.lightWallet) {
          oldIota.api.attachToTangle = localAttachToTangle;
          oldIota.api.interruptAttachingToTangle = localInterruptAttachingToTangle;
        }
        
        checkSeedBalance(_seed, function(error, totalBalance) {
          if (error) {
            $("#search-address-space-btn").loadingError(error);
          } else {
            $("#search-address-space-btn").loadingSuccess("transition_completed", {"initial": "transition"});
            $("#transition-seed").val("");
            $("#transition-phase-2-group").fadeIn();
            $("#transition-phase-1-group").hide();
            $("#transition-balance").html(UI.t("balance") + " (" + (_endIndex+1) + " " + UI.t("addresses") + "): " + UI.formatAmount(totalBalance)).show();
          }

          $(".remodal-close").off("click");
        });
      });
    });
  }

  function checkSeedBalance(seed, callback) {
    //timeout to allow the UI to update..
    setTimeout(function() {
      oldIota.api.getInputs(seed, {start: _startIndex, end: _endIndex}, function(error, inputs) {
        if (error) {
          return callback(error);
        }

        _inputs = _inputs.concat(inputs.inputs);
        _totalBalance = 0;

        for (var i=0; i<_inputs.length; i++) {
          _totalBalance += _inputs[i].balance;
        }

        console.log("total balance: " + _totalBalance +  "  -  " + UI.formatAmount(_totalBalance));

        callback(false, _totalBalance);
      });
    }, 1000);
  }

  function addOldIotaLib(callback) {
    if (!window.OldIOTA) {
      $.getScript("js/old.iota.lib.js").done(function() {
        callback();
      }).fail(function(jqxhr, settings, exception) {
        callback("Could not load old.iota.lib.js");
      });
    } else {
      callback();
    }
  }

  function resetState() {
    $("#transition-phase-1-group").show();
    $("#transition-phase-2-group").hide();
    $("#transition-phase-3-group").hide();
    $("#transition-phase-4-group").hide();

    $("#transition-modal .btn").removeClass("btn-disabled").removeAttr("disabled");

    $("#transition-seed, #transition-new-seed, #transition-new-seed-confirmation").val("");
    $("#search-address-space-btn").loadingReset("search_address_space");
    $("#transition-balance-complete-btn").loadingReset("balance_is_complete");
    $("#transition-balance-incomplete-btn").loadingReset("balance_is_incomplete");
    $("#transition-restart-btn").loadingReset("transition_another_seed");
    $("#stop_transitioning").loadingReset("stop_transitioning");

    _inputs     = [];
    _startIndex = 0;
    _endIndex   = 49;
    _seed       = "";
    _totalBalance = 0;
  }

  function checkSeed(seed) {
    console.log("checking seed");

    if (!seed) {
      throw UI.t("seed_is_required");
    } else if (seed.match(/[^A-Z9]/) || seed.match(/^[9]+$/)) {
      throw UI.t("invalid_characters");
    } else if (seed.length < 60) {
      if (!connection.allowShortSeedLogin) {
        throw UI.t("seed_too_short");
      }
    } else if (seed.length > 81) {
      throw UI.t("seed_too_long");
    }
  }

  return UI;
}(UI || {}, jQuery));
