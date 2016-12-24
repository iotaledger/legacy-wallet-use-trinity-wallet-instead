var UI = (function(UI, $, undefined) {
  UI.hideAlerts = function() {
    $(".remodal-wrapper, .remodal-overlay").remove();
    $("html").removeClass("remodal-is-locked");
  }

  UI.formatAmount = function(amount) {
    if (typeof(amount) != "integer") {
      amount = parseInt(amount, 10);
    }

    var units = negative = formattedAmount = "", afterComma = "", beforeComma = "", hidden = "", afterCommaDigits = 0;

    if (amount < 0) {
      amount = Math.abs(amount);
      negative = "-";
    }

    /*
    1 Kiota = 10³ iota = 1,000 iota
    1 Miota = 10⁶ iota = 1,000,000 iota
    1 Giota = 10⁹ iota = 1,000,000,000 iota
    1 Tiota = 10¹² iota = 1,000,000,000,000 iota
    1 Piota = 10¹⁵ iota = 1,000,000,000,000,000 iota
    */

    if (amount >= 1000000000000000) {
      units = "Pi";
      afterCommaDigits = 15;
    } else if (amount >= 1000000000000) {
      units = "Ti";
      afterCommaDigits = 12;
    } else if (amount >= 1000000000) {
      units = "Gi";
      afterCommaDigits = 9;
    } else if (amount >= 1000000) {
      units = "Mi";
      afterCommaDigits = 6;
    } else {
      units = "";
      afterCommaDigits = 0;
    }

    amount = amount.toString();

    var digits = amount.split("").reverse();

    for (var i=0; i<afterCommaDigits; i++) {
      afterComma = digits[i] + afterComma;
    }

    if (/^0*$/.test(afterComma)) {
      afterComma = "";
    }

    var j = 0;

    for (var i=afterCommaDigits; i<digits.length; i++) {
      if (j > 0 && j % 3 == 0) {
        beforeComma = "'" + beforeComma;
      }
      beforeComma = digits[i] + beforeComma;
      j++;
    }

    if (afterComma.length > 1) {
      hidden = afterComma.substring(1).replace(/0+$/, "");
      afterComma = afterComma[0];
    }

    var short = negative + beforeComma + (afterComma ? "." + afterComma : "") + (hidden ? "+" : "") + " " + units;
    var long  = (hidden ? short.replace("+", hidden) : "");

    long = long.escapeHTML();
    short = short.escapeHTML();

    if (long) {
      var output = "<span class='amount long' data-value='" + negative + amount + "' data-short='" + short + "' data-long='" + long + "'>" + short + "</span>";
    } else {
      var output = "<span class='amount' data-value='" + negative + amount + "' data-long='" + short + "'>" + short + "</span>";
    }

    return output;
  }

  UI.formatForClipboard = function(text, id) {
    text = String(text).escapeHTML();

    return "<span class='clipboard' title='" + text + "' data-clipboard-text='" + text + "'" + (id ? " id='" + id + "'" : "") + ">" + text + "</span>";
  }

  UI.formatDate = function(timestamp, full) {
    var date = new Date(timestamp*1000);

    return ("0"+date.getDate()).substr(-2) + "/" + ("0"+(date.getMonth()+1)).substr(-2) + (full ? "/" + date.getFullYear() : "") + " " + date.getHours() + ":" + date.getMinutes();
  }

  UI.notify = function(type, message, options) {
    console.log("UI.notify: " + message);

    message = String(message).escapeHTML();

    if (type == "error") {
      toastr.error(message, "", options);
    } else if (type == "success") {
      toastr.success(message, "", options);
    } else if (type == "warning") {
      toastr.warning(message, "", options);
    } else {
      toastr.info(message, "", options);
    }

    UI.notifyDesktop(message, true);
  }

  UI.isFocused = function() {
    return ((connection.inApp && UI.hasFocus) || (!connection.inApp && document.hasFocus()));
  }

  UI.notifyDesktop = function(message, ifNotFocused) {
    console.log("UI.notifyDesktop: " + message);

    if (ifNotFocused && UI.isFocused()) {
      return;
    }

    if (!("Notification" in window)) {
      return;
    } else if (Notification.permission === "granted") {
      var notification = new Notification("Iota Wallet", {"body": message});
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission(function (permission) {
        if (permission === "granted") {
          var notification = new Notification("Iota Wallet", {"body": message});
        }
      });
    }
  }

  UI.formSuccess = function(form, message, options) {
    var $stack = $("#" + form + "-stack");

    $stack.find("input[type=text], input[type=number], textarea").val("");
    $stack.find("select option:first-child").attr("selected", true);

    var $btn = $stack.find(".btn").first();

    $btn.loadingSuccess(message, options);

    if (!$stack.hasClass("open")) {
      UI.notify("success", message);
    } else {
      UI.notifyDesktop(message, true);
    }
  }

  UI.formError = function(form, message, options) {
    var $stack = $("#" + form + "-stack");
    var $btn = $stack.find(".btn").first();

    $btn.loadingError(message, options);

    if (!$stack.hasClass("open")) {
      UI.notify("error", message);
    } else {
      UI.notifyDesktop(message, true);
    }
  }

  UI.formUpdate = function(form, message, options) {
    var $stack = $("#" + form + "-stack");
    var $btn = $stack.find(".btn").first();

    $btn.loadingUpdate(message, options);
  }

  UI.addAndRemoveNeighbors = function(addNodes, removeNodes) {
    if (addNodes && addNodes.length) {
      iota.api.addNeighbors(addNodes, function(error, success) {
        if (error) {
          UI.notify("error", "Error whilst adding neighbors.");
        } else {
          UI.notify("success", "Added " + addNodes.length + " neighbor" + (addNodes.length != 1 ? "s" : "") + ".");
        }
      });
    }

    if (removeNodes && removeNodes.length) {
      iota.api.addNeighbors(removeNodes, function(error, success) {
        if (error) {
          UI.notify("error", "Error whilst removing neighbors.");
        } else {
          UI.notify("success", "Removed " + removeNodes.length + " neighbor" + (removeNodes.length != 1 ? "s" : "") + ".");
        }
      });
    }
  }

  return UI;
}(UI || {}, jQuery));