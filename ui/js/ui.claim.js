var UI = (function(UI, $, undefined) {
  UI.showClaimProcess = function(callback) {
    console.log("UI.showClaimProcess");

    if (UI.isLocked) {
      console.log("UI.showClaimProcess: UI is locked");
      return;
    }

    var $modal = $("#claim-modal");

    var modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false});
    modal.open();
  }

  UI.handleClaiming = function() {
    $(document).on("closed", "#claim-modal", function (e) {
      $("#claim_process_old_seed").val("");
      $("#claim_process_new_seed").val("");
      $("#claim_process_repeat_new_seed").val("");
    });

    $("#claim-btn").on("click", function(e) {
      var oldSeed = $("#claim_process_old_seed").val();
      var newSeed = $("#claim_process_new_seed").val();
      var newSeedRepeat = $("#claim_process_repeat_new_seed").val();

      console.log(oldSeed);
      console.log(newSeed);
      console.log(newSeedRepeat);
      console.log("--");

      if (!oldSeed || !newSeed || !newSeedRepeat) {
        return $("#claim-btn").loadingError("Fill all fields");
      } else if (newSeed.match(/[^A-Z9]/i)) {
        return $("#claim-btn").loadingError("Invalid characters");
      } else if (newSeed.match(/[a-z]/) && newSeed.match(/[A-Z]/)) {
        return $("#claim-btn").loadingError("Mixed case characters");
      } else if (newSeed.length < 41) {
        return $("#claim-btn").loadingError("New seed too short");
      } else if (newSeed.length > 81) {
        return $("#claim-btn").loadingError("New seed too long");
      } else if (newSeed != newSeedRepeat) {
        return $("#claim-btn").loadingError("Not matching");
      }

      oldSeed = oldSeed.toUpperCase().replace(/[^A-Z9]/ig, "9");

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "Cannot close whilst claiming.");
        e.preventDefault();
        e.stopPropagation();
      });

      UI.isLocked = true;

      doProcessClaim(oldSeed, newSeed, function(error, amount) {
        if (error) {
          console.log("UI.claim: Error");
          console.log(error);
          $("#claim-btn").loadingError(error);
        } else {
          console.log("UI.claim: Success");
          if (!UI.isFocused()) {
            UI.notifyDesktop("Claimed successfully");
          }
          if (amount) {
            $("#claim-btn").loadingSuccess("Claimed " + String(amount).escapeHTML() + "Gi");
          } else {
            $("#claim-btn").loadingSuccess("Claim Completed");
          }
          UI.updateState(1000);
        }

        UI.isLocked = false;
        $(".remodal-close").off("click");
      });
    });
  }

  function doProcessClaim(oldSeed, newSeed, callback) {
    console.log("in do it");
    console.log(oldSeed);
    console.log(newSeed);
    console.log("---");

    iota.api.getNewAddress(newSeed, {"checksum": true}, function(error, newAddress) {
      if (error) {
        return callback(error);
      }

      console.log("Got new address: " + newAddress);

      iota.api.sendTransfer(newSeed, connection.depth, connection.minWeightMagnitude, [{"address": newAddress, "value": 0, "message": "", "tag": ""}], function(error, transfers) {
        if (error) {
          return callback(error);
        }

        console.log("attached new address");
        console.log(transfers);

        var options = {type    : "GET",
                       url     : "https://service.iotatoken.com/upgrade?seed=" + oldSeed + "&address=" + newAddress,
                       timeout : 10000000000};

        $.ajax(options).done(function(data) {
          console.log("got data");
          console.log(data);

          if (data == "The seed provided by you contains 0 iotas") {
            return callback("Empty seed");
          }

          var match = data.match(/To claim these iotas send the following message to address \"([A-Z9]+)\": ([A-Z9]+)\r\n\r\nThe message must have tag \"([A-Z9]+)\"/);
          if (!match || !match[1] || !match[2] || !match[3]) {
            return callback("Invalid input");
          }

          var iotaAmount = data.match(/The seed provided by you contains ([0-9]+) iotas/i);
          if (iotaAmount) {
            iotaAmount = iota.utils.convertUnits(parseInt(iotaAmount[1], 10), "i", "Gi");
          }

          console.log("got match");
          console.log(match);

          console.log("sending transfer");

          iota.api.sendTransfer(newSeed, connection.depth, connection.minWeightMagnitude, [{"address": match[1], "value": 0, "message": match[2], "tag": match[3]}], function(error) {
            if (error) {
              return callback(error);
            }
            callback(null, iotaAmount);
          });
        }).fail(function(error) {
          console.log(error);
          return callback("Invalid input");
        });
      });
    });
  }

  return UI;
}(UI || {}, jQuery));