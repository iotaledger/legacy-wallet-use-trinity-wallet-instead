var UI = (function(UI, $, undefined) {
  UI.handleTransfers = function() {
    $("#transfer-btn").on("click", function(e) {    
      console.log("UI.handleTransfers: Click");

      var $stack = $("#transfer-stack");

      if ($("#transfer-autofill").val() == "1") {
        UI.formError("transfer", i18n.t("are_you_sure"), {"initial": i18n.t("yes_send_it_now")});
        $("#transfer-autofill").val("0");
        return;
      }

      $stack.addClass("loading");

      try {
        var address = $.trim($("#transfer-address").val());

        if (!address) {
          throw i18n.t("address_is_required");
        } else if (address.length == 81) {
          throw i18n.t("missing_address_checksum");
        } else if (address.length != 90) {
          throw i18n.t("incorrect_address_length");
        } else if (!address.match(/^[A-Z9]+$/)) {
          throw i18n.t("invalid_address");
        } else if (!iota.utils.isValidChecksum(address)) {
          throw i18n.t("incorrect_address_checksum");
        }
      
        var amount = iota.utils.convertUnits(parseFloat($("#transfer-amount").val()), $("#transfer-units-value").html(), "i");

        if (!amount) {
          throw i18n.t("amount_cannot_be_zero");
        }

        var tag = "";

        if ($("#transfer-tag-container").is(":visible")) {
          tag = $.trim($("#transfer-tag").val().toUpperCase());

          if (tag && /[^A-Z9]/.test(tag)) {
            throw i18n.t("tag_is_invalid");
          }
        }
      } catch (error) {
        $stack.removeClass("loading");
        UI.formError("transfer", error);
        return;
      }

      console.log("Server.transfer: " + address + " -> " + amount);

      iota.api.sendTransfer(connection.seed, connection.depth, connection.minWeightMagnitude, [{"address": address, "value": amount, "message": "", "tag": tag}], function(error, transfers) {
        if (error) {
          console.log("UI.handleTransfers: Error");
          console.log(error);
          UI.formError("transfer", error, {"initial": i18n.t("send_it_now")});
        } else {
          console.log("UI.handleTransfers: Success");
          UI.formSuccess("transfer", i18n.t("transfer_completed"), {"initial": i18n.t("send_it_now")});
          UI.updateState(1000);
        }
        $stack.removeClass("loading");
      });
    });

    $("#transfer-units-value").on("click", function(e) {
      var $overlay = $("#overlay");
      var $select = $('<div class="dropdown" id="transfer-units-select">' + 
                        '<ul>' + 
                          '<li class="iota-i">i</li>' + 
                          '<li class="iota-ki">Ki</li>' + 
                          '<li class="iota-mi">Mi</li>' + 
                          '<li class="iota-gi">Gi</li>' + 
                          '<li class="iota-ti">Ti</li>' + 
                        '</ul>' + 
                      '</div>');

      $overlay.show();

      $("#transfer-units-select").remove();

      $("body").append($select);

      var offset = $(this).offset();

      $select.css({"position": "absolute", "top": (offset.top + $(this).innerHeight() + 15) + "px", "left": (offset.left) + "px", "width": $(this).outerWidth() + "px"}).addClass("active");

      $select.on("click", "li", function(e) {
        $select.removeClass("active");
        $("#transfer-units-value").html($(this).html());
        $overlay.hide().off("click.transfer");
        $(window).off("resize.transfer");
      });

      $overlay.on("click.transfer", function(e) {
        $select.removeClass("active");
        $(this).hide().off("click.transfer");
        $(window).off("resize.transfer");
      });

      $(window).on("resize.transfer", function() {
        var $rel = $("#transfer-units-value")
        var offset = $rel.offset();
        $select.css({"position": "absolute", "top": (offset.top + $rel.innerHeight() + 15) + "px", "left": (offset.left) + "px", "width": $rel.outerWidth() + "px"});
      });
    });

    $("#transfer-units-select").on("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $ul = $(this).find("ul");
      $ul.addClass("active");
      $ul.find("li").click(function(e) {
        e.preventDefault();
        e.stopPropagation();

        $ul.find("li").unbind();
        $ul.find("li").removeClass("selected");
        $(this).addClass("selected");
        $ul.removeClass("active");
        $("body").unbind("click.dropdown");
      });

      $("body").on("click.dropdown", function(e) {
        $ul.removeClass("active");
        $("body").unbind("click.dropdown");
      }); 
    });
  }

  UI.onOpenTransferStack = function() {
    if ($("#transfer-address").val() == "") {
      $("#transfer-address").focus();
    }
  }

  return UI;
}(UI || {}, jQuery));