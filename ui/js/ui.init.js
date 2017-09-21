var iota;

var connection = {"accountData"         : false,
                  "previousAccountData" : false,
                  "isLoggedIn"          : false,
                  "showStatus"          : false,
                  "inApp"               : false,
                  "isSpamming"          : false,
                  "handleURL"           : false,
                  "testNet"             : false,
                  "host"                : "http://localhost",
                  "port"                : 14265,
                  "depth"               : 3,
                  "minWeightMagnitude"  : 14,
                  "ccurl"               : 0,
                  "ccurlPath"           : null,
                  "lightWallet"         : false,
                  "allowShortSeedLogin" : false,
                  "keccak"              : false,
                  "language"            : "en"};

var __entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;'
};

String.prototype.escapeHTML = function() {
  return String(this).replace(/[&<>"']/g, function(s) {
    return __entityMap[s];
  });
};

if (typeof document.hasFocus === "undefined") {
  document.hasFocus = function () {
    return document.visibilityState == "visible";
  }
}

$(document).ready(function() {
  UI.start();
});

var UI = (function(UI, $, undefined) {
  UI.initializationTime = 0;
  UI.initialConnection  = false;

  UI.isLocked           = false;
  UI.hasFocus           = true;

  UI.start = function() {
    console.log("UI.start: Initialization");

    UI.initializationTime = new Date().getTime();

    var interruptAttachingToTangle = false;

    if (typeof(URLSearchParams) != "undefined" && parent) {
      var params = new URLSearchParams(location.search.slice(1));
      connection.inApp = params.get("inApp") == 1;
      connection.showStatus = params.get("showStatus") == 1;
      if (params.has("host")) {
        connection.host = params.get("host");
      }
      if (params.has("port")) {
        connection.port = params.get("port");
      }
      if (params.has("depth")) {
        connection.depth = parseInt(params.get("depth"), 10);
      }
      if (params.has("minWeightMagnitude")) {
        connection.minWeightMagnitude = parseInt(params.get("minWeightMagnitude"), 10);
      }
      if (params.has("ccurl")) {
        connection.ccurl = parseInt(params.get("ccurl"), 10);
      }
      if (params.has("ccurlPath")) {
        connection.ccurlPath = params.get("ccurlPath");
      }
      if (params.has("language")) {
        connection.language = params.get("language");
      }
      if (params.has("allowShortSeedLogin")) {
        connection.allowShortSeedLogin = params.get("allowShortSeedLogin") == 1;
      }
      if (params.has("interrupt")) {
        interruptAttachingToTangle = true;
      }
      if (params.has("keccak")) {
        connection.keccak = params.get("keccak") == 1;
      }
    }

    UI.makeMultilingual(connection.language, function() {
      var d = document.documentElement.style;
      var supported = ("flex" in d || "msFlex" in d || "webkitFlex" in d || "webkitBoxFlex" in d);
      if (!supported || String(2779530283277761) != "2779530283277761") {
        showOutDatedBrowserMessage();
        return;
      }

      if (connection.inApp && (typeof(backendLoaded) == "undefined" || !backendLoaded)) {
        showBackendConnectionError();
        return;
      }

      iota = new IOTA({
        "host": connection.host,
        "port": connection.port
      });

      if (connection.host != "http://localhost") {
        connection.lightWallet = true;
        if (!connection.inApp || typeof(ccurl) == "undefined" || !ccurl) {
          if (typeof(ccurl) == "undefined") {
            console.log("ccurl is undefined");
          } else if (!ccurl) {
            console.log("ccurl is false");
          } else {
            console.log("...");
          }
          showLightWalletErrorMessage();
          return;
        } else {
          connection.ccurlProvider = ccurl.ccurlProvider(connection.ccurlPath);
          if (!connection.ccurlProvider) {
            console.log("Did not get ccurlProvider from " + connection.ccurlPath);
            return;
          }
        }
        // Overwrite iota lib with light wallet functionality
        $.getScript("js/iota.lightwallet.js").done(function() {
          if (interruptAttachingToTangle) {
            iota.api.interruptAttachingToTangle(function() {});
          }
          setTimeout(initialize, 100);
        }).fail(function(jqxhr, settings, exception) {
          console.log("Could not load iota.lightwallet.js");
          showLightWalletErrorMessage();
        });
      } else {
        if (interruptAttachingToTangle) {
          iota.api.interruptAttachingToTangle(function() {});
        }
        setTimeout(initialize, 100);
      }
    });
  }

  function initialize() {
    $("body").show();

    // Set notification options
    toastr.options.positionClass = "toast-top-center";
    // Need not escape, UI.notify already does that.
    // toastr.options.escapeHtml = true;

    // Hide pages
    $("#app, #login").hide();

    // Initialize button handlers
    $(".btn:not(.btn-no-loading)").loadingInitialize();

    // Enable copy to clipboard
    var clipboard = new Clipboard(".clipboard");
    clipboard.on("success", function(e) {
      UI.notify("success", "copied_to_clipboard");
    });

    // Show full amounts on click
    $("body").on("click", ".amount.long", function(e) {
      if ($(this).hasClass("detailed")) {
        $(this).parent().removeClass("detailed");
        $(this).removeClass("detailed").html(UI.format($(this).data("short"))).hide().fadeIn();
      } else {
        $(this).parent().addClass("detailed");
        $(this).addClass("detailed").html(UI.format($(this).data("long"))).hide().fadeIn();
      }

      $(this).css("font-size", "");

      var currentFontSize = parseInt($(this).css("font-size"), 10);
      var parentWidth = $(this).parent().width();

      while ($(this).width() > parentWidth) {
        $(this).css("font-size", --currentFontSize);
      }
    });

    UI.showLoginScreen();

    // Until we have a server connection we will check every 500ms..
    UI.createStateInterval(500, true);

    // Enable app message listening
    if (connection.inApp) {
      UI.inAppInitialize();
    }
  }

  function showErrorMessage(error) {
    document.body.innerHTML = "<div style='padding: 20px;background:#efefef;border:#aaa;border-radius: 5px;max-width: 60%;margin: 100px auto;'>" + UI.format(error) + "</div>";
    document.body.style.display = "block";
  }

  function showLightWalletErrorMessage() {
    showErrorMessage(UI.t("could_not_load_light_wallet_functionality"));
  }

  function showBackendConnectionError() {
    showErrorMessage(UI.t("could_not_load_required_backend_files"));
  }

  function showOutdatedBrowserMessage() {
    console.log("showOutdatedBrowserMessage");

    var html = "";

    html += "<div style='padding: 20px;background:#efefef;border:#aaa;border-radius: 5px;max-width: 60%;margin: 100px auto;'>";
    html += "<strong data-i18n='browser_out_of_date'>" + UI.t("browser_out_of_date") + "</strong>";
    html += "<ul>";
    html += "<li><a href='https://www.google.com/chrome/browser/desktop/' rel='noopener noreferrer' data-i18n='google_chrome'>" + UI.t("google_chrome") + "</a></li>";
    html += "<li><a href='http://www.mozilla.com/firefox/' rel='noopener noreferrer' data-i18n='mozilla_firefox'>" + UI.t("mozilla_firefox") + "</a></li>";
    html += "<li><a href='http://www.opera.com/' rel='noopener noreferrer' data-i18n='opera'>" + UI.t("opera") + "</a></li>";
    html += "</ul>";
    html += "</div>";

    $("body").html(html).show();
  }

  return UI;
}(UI || {}, jQuery));
