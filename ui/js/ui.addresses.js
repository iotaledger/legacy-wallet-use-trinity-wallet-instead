var UI = (function(UI, $, undefined) {
  var didClickGenerateAddress = false;

  UI.handleAddressGeneration = function() {
    $("#generate-address-stack").on("click", function(e) {
      if ($(this).hasClass("open") || $(this).hasClass("opening")) {
        return;
      }
      
      console.log("UI.handleAddressGeneration: Open stack.");

      var $stack = $("#generate-address-stack");

      // Don't proceed if the user has already clicked the button.
      if (didClickGenerateAddress) {
        console.log("UI.handleAddressGeneration: Already clicked, return.");
        return;
      }

      var $btn = $stack.find(".btn").first();

      //$btn.loadingUpdate("Generate New Address", {"icon": false, "initial": "Generate New Address", "loading": "Generating Address..."});

      // Always get the newest address on click of stack, in case the user was out of sync, update
      Server.getNewAddress().done(function(result) {
        if (didClickGenerateAddress) {
          // User already clicked the button, don't update. Abort..
          console.log("UI.handleAddressGeneration: Abort updating address.");
          return;
        }

        $btn.loadingUpdate("Attach to Tangle", {"icon": false, "initial": "Attach to Tangle", "loading": "Attaching to Tangle..."});

        // Different from the previous result, update...
        if (result.checksummedAddress != $btn.data("address")) {
          console.log("UI.handleAddressGeneration: Address is different, update.");

          updateGeneratedAddress(result.checksummedAddress, true);

          $stack.find(".padded").css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);

          UI.animateStacks(0);
        } else {
          console.log("UI.handleAddressGeneration: Address has not changed.");
        }
      }).fail(function(err) {
        console.log("UI.handleAddressGeneration: GetNewAddress Error:");
        console.log(err);
        $stack.find(".padded").css("visibility", "hidden");
        $btn.loadingUpdate("Generate New Address", {"initial": "Generate New Address", "loading": "Generating Address..."});
        UI.animateStacks(0);
      });
    });

    $("#generate-address-btn").on("click", function(e) {
      // Make sure other click event above is not triggered...
      e.preventDefault();
      e.stopPropagation();

      console.log("UI.handleAddressGeneration: Click");

      didClickGenerateAddress = true;
      
      try {
        var $stack = $("#generate-address-stack");
        var $btn = $stack.find(".btn").first();

        $stack.addClass("loading");

        if (!$btn.data("address")) {
          $stack.find(".padded").css("visibility", "hidden");
          var gotAddress = false;
        } else {
          var gotAddress = true;
        }

        Server.generateNewAddress().progress(function(msg) {
          if (Address.isAddress(msg)) {
            var address = msg;

            console.log("UI.handleAddressGeneration: Got address: " + address);

            gotAddress = true;

            if (address != $btn.data("address")) {
              updateGeneratedAddress(address);
              $stack.find(".padded").css("opacity", 0).css("visibility", "visible").fadeTo("slow", 1);
            } else {
              $("#generate-address-result, #generate-address-qr-code").off("click.notyetgenerated");
              $stack.find(".padded").css("visibility", "visible");
            }

            //$btn.loadingUpdate("Attaching to tangle...", {"timeout": 200, "initial": "Attach to Tangle", "loading": "Attaching to Tangle..."});

            UI.animateStacks(200);
          } else {
            $btn.loadingUpdate(msg, {"timeout": 500});
          }
        }).done(function() {
          $btn.data("address", "");

          console.log("UI.handleAddressGeneration: Attached to Tangle");

          UI.formSuccess("generate-address", "Address Attached", {"initial": "Generate New Address", "loading": "Generating Address..."});

          UI.createStateInterval(60000, true);
        }).fail(function(err) {
          console.log("UI.handleAddressGeneration: Error:");
          console.log(err);

          UI.formError("generate-address", err);
        }).always(function() {
          $stack.removeClass("loading");
        });
      } catch (err) {
        console.log("UI.handleAddressGeneration: Error:");
        console.log(err);
        UI.formError("generate-address", err);
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
    $("#generate-address-qr-code").empty().qrcode({text: address, fill: "#fff", size: qrCodeSize});

    if (notYetGenerated) {
      $("#generate-address-result, #generate-address-qr-code").on("click.notyetgenerated", function(e) {
        UI.notify("error", "Be sure to attach to the Tangle before using the address.");
      });
    } else {
      $("#generate-address-result, #generate-address-qr-code").off("click.notyetgenerated");
    }

    $stack.find(".clipboard").attr("data-clipboard-text", address);
  }

  return UI;
}(UI || {}, jQuery));