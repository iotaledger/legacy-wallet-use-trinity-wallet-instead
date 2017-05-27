var UI = (function(UI, $, undefined) {
  UI.showClaimProcess = function(callback) {
    console.log("UI.showClaimProcess");

    if (UI.isLocked) {
      console.log("UI.showClaimProcess: UI is locked");
      return;
    }

    $("#claim-output").html("");

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

      if (!oldSeed || !newSeed || !newSeedRepeat) {
        return $("#claim-btn").loadingError("fill_all_fields");
      } else if (newSeed.match(/[^A-Z9]/i)) {
        return $("#claim-btn").loadingError("invalid_characters");
      } else if (newSeed.match(/[a-z]/) && newSeed.match(/[A-Z]/)) {
        return $("#claim-btn").loadingError("mixed_case_characters");
      } else if (newSeed.length < 41) {
        return $("#claim-btn").loadingError("new_seed_too_short");
      } else if (newSeed.length > 81) {
        return $("#claim-btn").loadingError("new_seed_too_long");
      } else if (newSeed != newSeedRepeat) {
        return $("#claim-btn").loadingError("not_matching");
      }

      oldSeed = oldSeed.toUpperCase().replace(/[^A-Z9]/ig, "9");
      if (oldSeed.length > 81) {
        oldSeed = oldSeed.substr(0, 81);
      }
      newSeed = newSeed.toUpperCase();

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "cannot_close_whilst_claiming");
        e.preventDefault();
        e.stopPropagation();
      });

      UI.isLocked = true;

      doProcessClaim(oldSeed, newSeed, function(error, amount) {
        if (error) {
          console.log("UI.claim: Error");
          console.log(error);
          $("#claim-btn").loadingError(error); //todo: not a key
        } else {
          console.log("UI.claim: Success");
          if (!UI.isFocused()) {
            UI.notifyDesktop("claimed_successfully");
          }
          $("#claim-btn").loadingSuccess("claim_completed");
          UI.updateState(1000);
        }

        UI.isLocked = false;
        $(".remodal-close").off("click");
      });
    });
  }

  function doProcessClaim(oldSeed, newSeed, callback) {
    console.log("doProcessClaim");

    iota.api.getNewAddress(newSeed, function(error, newAddress) {
      if (error) {
        return callback(error);
      }

      console.log("Got new address: " + newAddress);

      var options = {type    : "GET",
                     url     : "https://service.iotatoken.com/upgrade?seed=" + oldSeed + "&address=" + newAddress,
                     timeout : 10000000000};

      console.log("Calling https://service.iotatoken.com");
      
      $.ajax(options).done(function(data) {
        console.log("got data");
        console.log(data);

        if (data == "The seed provided by you contains 0 iotas") {
          return callback(i18n.t("empty_seed"));
        }

        var match = data.match(/To claim these iotas send the following message to address \"([A-Z9]+)\": ([A-Z9]+)\r\n\r\nThe message must have tag \"([A-Z9]+)\"/);
        if (!match || !match[1] || !match[2] || !match[3]) {
          return callback(i18n.t("invalid_input"));
        }

        var iotaAmount = data.match(/The seed provided by you contains ([0-9]+) iotas/i);
        if (iotaAmount) {
          var formattedAmount = UI.formatAmount(iotaAmount[1]);
          $("#claim-output").data("i18n", "seed_contains").localize({value: formattedAmoun});

          /*
          //TODO?? 
          if (String($("#claim-output span.amount").data("long")).match(/^[0-9\'\s]+$/)) {
            $("#claim-output span.amount").html($("#claim-output span.amount").html() + "i");
          }*/
        }

        console.log("Amount = " + iotaAmount);
        console.log("sending transfer");

        iota.api.sendTransfer(newSeed, connection.depth, connection.minWeightMagnitude, [{"address": match[1], "value": 0, "message": match[2], "tag": match[3]}], function(error, transfers) {
          console.log("Transfer sent");
          console.log(error);
          console.log(transfers);
          if (error) {
            return callback(error);
          }
          callback(null, iotaAmount);
        });
      }).fail(function(error) {
        console.log(error);
        return callback(i18n.t("invalid_input"));
      });
    });
  }

  return UI;
}(UI || {}, jQuery));