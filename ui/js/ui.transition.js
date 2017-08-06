var UI = (function(UI, $, undefined) {
  UI.isTransitioningSeed = false;
  var modal;

  UI.showTransitionModal = function(callback) {
    if (UI.isLocked || UI.isTransitioningSeed) {
      return;
    }

    if (connection.seed) {
      UI.notify("error", "please_log_out_first");
      return;
    }

    UI.isTransitioningSeed = true;

    $("#transition-phase-1-group").show();
    $("#transition-phase-2-group").hide();

    UI.stopStateInterval();

    var $modal = $("#transition-modal");

    modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false});
    modal.open();

    $("#transition-process-seed").val("").focus();
  }

  UI.handleTransitioning = function() {
    $(document).on("closed", "#transition-modal", function (e) {
      $("#transition-process-seed").val("");
      UI.startStateInterval();
      UI.isTransitioningSeed = false;
      oldIota = null;
      $("#transition-btn").loadingReset("transition");

      if (connection.inApp && !connection.keccak) {
        finishedTransitioningToKeccak();
      }
    });

    $("#transition-restart-btn").on("click", function(e) {
      $("#transition-restart-btn").loadingReset("transition_again");

      $("#transition-phase-1-group").show();
      $("#transition-phase-2-group").hide();
      $("#transition-process-seed").val("").focus();
    });

    $("#transition-stop-btn").on("click", function(e) {
      modal.close();

      $("#transition-stop-btn").loadingReset("stop_transitioning");
    });

    $("#transition-btn").on("click", function(e) {

      var seed = String($("#transition-process-seed").val());

      try {
        if (!seed) {
          throw UI.t("seed_is_required");
        } else if (seed.match(/[^A-Z9]/) || seed.match(/^[9]+$/)) {
          throw UI.t("invalid_seed");
        } else if (seed.length < 60) {
          if (!connection.allowShortSeedLogin) {
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
      } catch (error) {
        console.log(error);
        $("#transition-btn").loadingError(error);
        $("#transition-process-seed").focus();
        return;
      }

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "cannot_close_whilst_transitioning");
        e.preventDefault();
        e.stopPropagation();
      });

      UI.isLocked = true;

      transitionAddressBalance(seed, function(error) {
        if (error) {
          $("#transition-btn").loadingError(error);
          UI.notifyDesktop(error, true);
        } else {
          //remove seed
          $("#transition-btn").loadingSuccess("transition_completed", {"initial": "transition"});
          UI.notifyDesktop("transition_completed", true);
        
          $("#transition-process-seed").val("");
          $("#transition-phase-2-group").show();
          $("#transition-phase-1-group").hide();
        }

        UI.isLocked = false;

        $(".remodal-close").off("click");
      });
    });
  }

  function transitionAddressBalance(seed, callback) {
    addOldIotaLib(function(error) {
      if (error) {
        return callback(error);
      }

      oldIota = new OldIOTA({
        "host": connection.host,
        "port": connection.port
      });

      oldIota.api.attachToTangle = localAttachToTangle;
      oldIota.api.interruptAttachingToTangle = localInterruptAttachingToTangle;

      findEndIndex(seed, 50, function(error, endIndex) {
        if (error) {
          return callback(error);
        }

        oldIota.api.getInputs(seed, {start: 0, end: endIndex}, function(error, inputs) {
          if (error) {
            return callback(error);
          } else if (!inputs || !inputs.inputs || !inputs.inputs.length || !inputs.totalBalance) {
            return callback("account_is_empty");
          }

          iota.api.getNewAddress(seed, {"checksum": true}, function(error, newAddress) {
            if (error) {
              return callback(error);
            }

            UI.isDoingPOW = true;

            console.log({"inputs": inputs.inputs, "address": newAddress, "value": inputs.totalBalance, "message": "", "tag": ""});

            oldIota.api.sendTransfer(seed, connection.depth, connection.minWeightMagnitude, [{"address": newAddress, "value": inputs.totalBalance, "message": "", "tag": ""}], {"inputs": inputs.inputs}, function(error, transfers) {
              UI.isDoingPOW = false;

              if (error) {
                return callback(error);
              } else {
                return callback();
              }
            });
          });
        });
      });
    });
  }

  function findEndIndex(seed, endIndex, callback) {
    if (endIndex < 50) {
      endIndex = 50;
    } 

    oldIota.api.getNewAddress(seed, {index: endIndex, total: 1}, function(error, addresses) {
      if (error) {
        callback(error);
        return;
      }

      oldIota.api.findTransactions({"addresses": addresses}, function(error, transactions) {
        if (error) {
          callback(error);
          return;
        }

        if (transactions && transactions.length) {
          findEndIndex(seed, endIndex + 50, callback);
        } else {
          callback(false, endIndex);
        }
      });
    });
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

  return UI;
}(UI || {}, jQuery));