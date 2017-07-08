var UI = (function(UI, $, undefined) {
  var hasGenerated = false;

  UI.onOpenAddressStack = function() {
    if (hasGenerated) {
      return;
    }

    var $stack  = $("#generate-address-stack");

    var $loader = $stack.find(".loading-ring");
    var $result = $stack.find(".padded");
    var $btn    = $stack.find(".btn").first();

    $loader.hide();

    var latestAddress = iota.utils.addChecksum(connection.accountData.latestAddress);

    if (latestAddress != $btn.data("address")) {
      updateGeneratedAddress(latestAddress, true);

      $btn.loadingUpdate("attach_to_tangle", {"noIcon": true, "initial": "attach_to_tangle", "loading": "attaching_to_tangle"});
    
      UI.animateStacks(0);
    }
  }

  UI.handleAddressGeneration = function() {
    $("#generate-address-btn").on("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      hasGenerated = true;
      
      var $stack = $("#generate-address-stack");
      
      var $loader = $stack.find(".loading-ring");
      var $result = $stack.find(".padded");
      var $btn    = $stack.find(".btn").first();

      $stack.addClass("loading");

      try {
        var gotAddress = $btn.data("address");

        if (!gotAddress) {
          $result.css("visibility", "hidden");
          $loader.css("bottom", $btn.outerHeight() + 10).show();
        } else {
          $loader.hide();
        }

        UI.isDoingPOW = true;

        iota.api.getNewAddress(connection.seed, {"checksum": true}, function(error, newAddress) {
          $loader.fadeOut();

          if (error) {
            console.log(error);
            UI.formError("generate-address", error);
            $stack.removeClass("loading");
            UI.isDoingPOW = false;
            return;
          }

          if (newAddress != $btn.data("address")) {
            updateGeneratedAddress(newAddress);
            $result.css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);
          } else {
            $result.css("visibility", "visible");
          }

          newAddress = iota.utils.noChecksum(newAddress);

          UI.animateStacks(200);
            
          iota.api.sendTransfer(connection.seed, connection.depth, connection.minWeightMagnitude, [{"address": newAddress, "value": 0, "message": "", "tag": ""}], function(error, transfers) {
            UI.isDoingPOW = false;
            if (error) {
              UI.formError("generate-address", error);
            } else {
              $btn.data("address", "");
              console.log("UI.handleAddressGeneration: Attached to Tangle");
              UI.formSuccess("generate-address", "address_attached", {"initial": "generate_new_address", "loading": "attaching_to_tangle"});
              UI.updateState(1000);
            }
            $stack.removeClass("loading");
          });
        });
      } catch (error) {
        console.log(error);
        UI.formError("generate-address", error);
      }
    });
  }

  function updateGeneratedAddress(address, notYetGenerated) {
    var $stack = $("#generate-address-stack");
    var $btn = $stack.find(".btn").first();

    address = UI.format(address);

    $btn.data("address", address);

    if ($(document).height() <= 620 || $(document).width() <= 440) {
      var qrCodeSize = 110;
    } else {
      var qrCodeSize = 150;
    }

    $("#generate-address-result").html(address);
    $("#generate-address-qr-code").empty().qrcode({text: JSON.stringify({"address": address}), fill: "#000", background: "#fff", size: qrCodeSize});

    $stack.find(".clipboard").attr("data-clipboard-text", address);
  }

  return UI;
}(UI || {}, jQuery));