var UI = (function(UI, $, undefined) {
  var isBusy = false;
  var hasGenerated = false;

  UI.onOpenAddressStack = function() {
    if (isBusy || hasGenerated) {
      return;
    }

    var $stack  = $("#generate-address-stack");

    var $loader = $stack.find(".loading-ring");
    var $result = $stack.find(".padded");
    var $btn    = $stack.find(".btn").first();

    $result.css("visibility", "hidden");
    $btn.css("visibility", "hidden");
    $loader.css("bottom", 0).show();
  }

  UI.onOpenAddressStackCompleted = function() {
    if (isBusy || hasGenerated) {
      return;
    }

    isBusy = true;

    var $stack  = $("#generate-address-stack");

    var $loader = $stack.find(".loading-ring");
    var $result = $stack.find(".padded");
    var $btn    = $stack.find(".btn").first();

    iota.api.getNewAddress(connection.seed, {"checksum": true}, function(error, newAddress) {
      setTimeout(function() {
        isBusy = false;
      }, 3000);

      $loader.fadeOut();

      if (error) {
        console.log(error);
        $btn.css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);
        $btn.loadingReset(i18n.t("generate_new_address"), {"initial": i18n.t("generate_new_address"), "loading": i18n.t("attaching_to_tangle")});
      } else {
        if (newAddress != $btn.data("address")) {
          updateGeneratedAddress(newAddress, true);
        }
        
        $result.css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);
        
        $btn.css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);
        $btn.loadingUpdate("Attach to Tangle", {"icon": false, "initial": "Attach to Tangle", "loading": "Attaching to Tangle..."});
      }

      UI.animateStacks(0);
    });
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
        }

        iota.api.getNewAddress(connection.seed, {"checksum": true}, function(error, newAddress) {
          $loader.fadeOut();

          if (error) {
            console.log(error);
            UI.formError("generate-address", error);
            $stack.removeClass("loading");
            return;
          }

          if (newAddress != $btn.data("address")) {
            updateGeneratedAddress(newAddress);
            $result.css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);
          } else {
            $("#generate-address-result, #generate-address-qr-code").off("click.notyetgenerated");
            $result.css("visibility", "visible");
          }

          UI.animateStacks(200);

          newAddress = iota.utils.noChecksum(newAddress);
          
          iota.api.sendTransfer(connection.seed, connection.depth, connection.minWeightMagnitude, [{"address": newAddress, "value": 0, "message": "", "tag": ""}], function(error, transfers) {
           if (error) {
              UI.formError("generate-address", error);
            } else {
              $btn.data("address", "");
              console.log("UI.handleAddressGeneration: Attached to Tangle");
              UI.formSuccess("generate-address", i18n.t("address_attached"), {"initial": i18n.t("generate_new_address"), "loading": i18n.t("attaching_to_tangle")});
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

    $btn.data("address", address);

    if ($(document).height() <= 620 || $(document).width() <= 440) {
      var qrCodeSize = 110;
    } else {
      var qrCodeSize = 150;
    }

    $("#generate-address-result").html(String(address).escapeHTML());
    $("#generate-address-qr-code").empty().qrcode({text: JSON.stringify({"address": address}), fill: "#000", background: "#fff", size: qrCodeSize});

    if (notYetGenerated) {
      $("#generate-address-result, #generate-address-qr-code").on("click.notyetgenerated", function(e) {
        UI.notify("error", "attach_tangle_before_using_address");
      });
    } else {
      $("#generate-address-result, #generate-address-qr-code").off("click.notyetgenerated");
    }

    $stack.find(".clipboard").attr("data-clipboard-text", address);
  }

  return UI;
}(UI || {}, jQuery));