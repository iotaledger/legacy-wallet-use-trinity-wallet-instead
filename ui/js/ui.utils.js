var UI = (function(UI, $, undefined) {
  var i18n;

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

    long   = UI.format(long);
    short  = UI.format(short);
    amount = UI.format(negative + amount);

    if (long) {
      var output = "<span class='amount long' data-value='" + amount + "' data-short='" + short + "' data-long='" + long + "'>" + short + "</span>";
    } else {
      var output = "<span class='amount' data-value='" + amount + "' data-long='" + short + "'>" + short + "</span>";
    }

    return output;
  }

  UI.formatForClipboard = function(text, id) {
    text = UI.format(text);
    if (id) {
      id = UI.format(id);
    }

    return "<span class='clipboard' title='" + text + "' data-clipboard-text='" + text + "'" + (id ? " id='" + id + "'" : "") + ">" + text + "</span>";
  }

  UI.formatDate = function(timestamp, full) {
    if (timestamp<1262304000000) {
      timestamp = timestamp * 1000
    }
    var date = new Date(timestamp);

    return ("0"+date.getDate()).substr(-2) + "/" + ("0"+(date.getMonth()+1)).substr(-2) + (full ? "/" + date.getFullYear() : "") + " " + ("0"+date.getHours()).substr(-2) + ":" + ("0"+date.getMinutes()).substr(-2);
  }

  UI.format = function(text) {
    return String(text).escapeHTML();
  }

  UI.notify = function(type, message, options) {
    console.log("UI.notify: " + message);

    if (!options) {
      options = {};
    }

    var parsedMessage = UI.parseMessage(message, options);

    if (type == "error") {
      toastr.error(parsedMessage, "", options);
    } else if (type == "success") {
      toastr.success(parsedMessage, "", options);
    } else if (type == "warning") {
      toastr.warning(parsedMessage, "", options);
    } else {
      toastr.info(parsedMessage, "", options);
    }

    UI.notifyDesktop(message, options, true);
  }

  UI.isFocused = function() {
    return ((connection.inApp && UI.hasFocus) || (!connection.inApp && document.hasFocus()));
  }

  UI.notifyDesktop = function(message, options, ifNotFocused) {
    console.log("UI.notifyDesktop: " + message);

    if (arguments.length == 1) {
      options = {};
      ifNotFocused = false;
    } else if (arguments.length >= 2) {
      if (typeof(options) == "boolean") {
        ifNotFocused = options;
        options = {};
      }
    }

    if (ifNotFocused && UI.isFocused()) {
      return;
    }

    var parsedMessage = UI.parseMessage(message, options);

    parsedMessage = parsedMessage.replace('&quot;', '"');
    parsedMessage = parsedMessage.replace('&#39;', "'");

    if (!("Notification" in window)) {
      return;
    } else if (Notification.permission === "granted") {
      var notification = new Notification("IOTA Wallet", {"body": parsedMessage});
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission(function (permission) {
        if (permission === "granted") {
          var notification = new Notification("IOTA Wallet", {"body": parsedMessage});
        }
      });
    }
  }

  UI.makeMultilingual = function(currentLanguage, callback) {
    i18n = i18next
      .use(window.i18nextXHRBackend)
      .init({
        lng: currentLanguage,
        fallbackLng: "en",
        defaultValueFromContent: true,
        keySeparator: false,
        nsSeparator: false,
        backend: {
          loadPath: "../locales/{{lng}}/{{ns}}.json"
        },
        debug: false
    }, function(err, t) {
      jqueryI18next.init(i18next, $, {useOptionsAttr: true});
      $("*[data-i18n]").localize();
      callback();
    });
  }

  UI.changeLanguage = function(language) {
    i18n.changeLanguage(language, function(err, t) {
      connection.language = language;
      $("*[data-i18n]").localize();
    });
  }

  UI.t = function(message, options) {
    if (i18n && message.match(/^[a-z\_]+$/i)) {
      return UI.format(i18n.t(message, options));
    } else {
      return UI.format(message);
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

  UI.updateSettings = function(settings) {
    if (settings.hasOwnProperty("minWeightMagnitude")) {
      connection.minWeightMagnitude = parseInt(settings.minWeightMagnitude, 10);
    }
    if (settings.hasOwnProperty("depth")) {
      connection.depth = parseInt(settings.depth, 10);
    }

    if (settings.hasOwnProperty("ccurl")) {
      connection.ccurl = parseInt(settings.ccurl, 10);
    }
    var changeNode = false;

    if (settings.hasOwnProperty("host") && settings.host != connection.host) {
      connection.host = settings.host;
      changeNode = true;
    }
    if (settings.hasOwnProperty("port") && settings.port != connection.port) {
      connection.port = settings.port;
      changeNode = true;
    }

    if (changeNode) {
      iota.changeNode({"host": connection.host, "port": connection.port});

      if (connection.lightWallet) {
        iota.api.attachToTangle = localAttachToTangle;
        iota.api.interruptAttachingToTangle = localInterruptAttachingToTangle;
      }
    }

    if (settings.hasOwnProperty("addedNodes") && settings.addedNodes.length) {
      iota.api.addNeighbors(settings.addedNodes, function(error, addedNodes) {
        if (error || addedNodes === undefined) {
          UI.notify("error", "error_whilst_adding_neighbors");
        } else {
          UI.notify("success", "added_neighbor", {count: addedNodes});
        }
      });
    }

    if (settings.hasOwnProperty("removedNodes") && settings.removedNodes.length) {
      iota.api.removeNeighbors(settings.removedNodes, function(error, removedNodes) {
        if (error || removedNodes === undefined) {
          UI.notify("error", "error_whilst_removing_neighbors");
        } else {
          UI.notify("success", "removed_neighbor", {count: removedNodes});
        }
      });
    }

    if (settings.hasOwnProperty("allowShortSeedLogin")) {
      connection.allowShortSeedLogin = settings.allowShortSeedLogin;
    }

    if (changeNode) {
      UI.resetState();
    }
  }

  UI.parseMessage = function(message, options, returnKey) {
    console.log("UI.parseMessage");
    console.log(message);

    if (typeof message == "object" && message.message) {
      message = String(message.message);
    } else {
      message = String(message);
    }

    if (arguments.length == 1) {
      options = {};
      returnKey = false;
    } else if (arguments.length >= 2) {
      if (typeof(options) == "boolean") {
        returnKey = options;
        options = {};
      }
    }

    var match;

    if (message.match(/^Invalid Response:/i)) {
      message = "invalid_response";
    } else if (message.match(/^No connection to host:/i)) {
      message = "no_connection_to_host";
    } else if (match = message.match(/^Request Error: (.*)/i)) {
      if (match[1] && match[1].toLowerCase() == "invalid transaction hash") {
        message = "invalid_transaction_hash";
      } else {
        message = "request_error";
      }
    }

    var parsedMessage;
    var key = "";

    if (message.match(/^[a-z\_]+$/i)) {
      key           = message;
      parsedMessage = UI.t(message, options);
    } else {
      parsedMessage = UI.format(message);
    }

    if (returnKey) {
      return [parsedMessage, key];
    } else {
      return parsedMessage;
    }
  }

  return UI;
}(UI || {}, jQuery));
