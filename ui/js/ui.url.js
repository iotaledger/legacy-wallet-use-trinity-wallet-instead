var UI = (function(UI, $, undefined) {
  UI.handleURL = function(url) {
    if (url == "faq" || url == "help") {
      UI.openHelpMenu();
    } else if (!connection.seed) {
      UI.notify("error", "please_log_in_first");
      connection.handleURL = url;
    } else {
      if (!url) {
        url = connection.handleURL;
        connection.handleURL = false;
      }
      if (url == "history") {
        var $stack = $("#history-stack");

        if (!$stack.hasClass("open")) {
          $stack.trigger("click");
        }
      } else if (url == "generateaddress" || url == "generate-address" || url == "address") {
        var $stack = $("#generate-address-stack");

        if (!$stack.hasClass("open")) {
          $stack.trigger("click");
        }
      } else if (url == "balance") {
        var $stack = $("#balance-stack");

        if (!$stack.hasClass("open")) {
          $stack.trigger("click");
        }
      } else if (url == "transfer") {
        var $stack = $("#transfer-stack");

        if (!$stack.hasClass("open")) {
          $stack.trigger("click");
        }
      } else {
        var match = url.match(/(?:transfer|send)\/([A-Z9]{90})\/([0-9\.]+)\-?([TGMK]?i)?(\/.*)?$/i);
        var submatch = false;

        if (match && match[1] && match[2]) {
          if (match[4]) {
            submatch = match[4].match(/^\/([A-Z9]{1,27})\/?$/i);
            if (!submatch) {
              UI.notify("error", "ignoring_invalid_tag_value");
              return;
            }
          }

          if ($("#transfer-address").val() || $("#transfer-amount").val() || (submatch && submatch[1] && $("#transfer-tag").val())) {
            UI.notify("error", "wont_overwrite_transfer_fields");
          } else {
            UI.notify("success", "transfer_fields_prefilled_link");

            $("#transfer-address").val(match[1].toUpperCase());
            $("#transfer-amount").val(match[2]);
            $("#transfer-autofill").val("1");

            if (!match[3] || match[3] == "i") {
              $("#transfer-units-value").html("i");
            } else {
              $("#transfer-units-value").html(match[3].charAt(0).toUpperCase() + match[3].charAt(1).toLowerCase());          
            }

            if (submatch && submatch[1]) {
              $("#transfer-tag").val(submatch[1].toUpperCase());
            }
            var $stack = $("#transfer-stack");

            if (!$stack.hasClass("open")) {
              $stack.trigger("click");
            }
          }
        } else {
          UI.notify("error", "unknown_or_invalid_url");
        }
      }
    }
  }

  return UI;
}(UI || {}, jQuery));