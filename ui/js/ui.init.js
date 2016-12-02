var iota = new IOTA();

var connection = {"accountData"         : false,
                  "previousAccountData" : false,
                  "isLoggedIn"          : false,
                  "showStatus"          : false,
                  "inApp"               : false,
                  "isSpamming"          : false,
                  "handleURL"           : false,
                  "depth"               : 3,
                  "minWeightMagnitude"  : 18};

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

    var d = document.documentElement.style;
    var supported = ("flex" in d || "msFlex" in d || "webkitFlex" in d || "webkitBoxFlex" in d);
    if (!supported || String(2779530283277761) != "2779530283277761") {
      showOutDatedBrowserMessage();
    } else {
      if (typeof(URLSearchParams) != "undefined" && parent) {
        var params = new URLSearchParams(location.search.slice(1));
        connection.inApp = params.get("inApp") == "true";
        connection.showStatus = params.get("showStatus") == 1;
        connection.depth = parseInt(params.get("depth"), 10);
        connection.minWeightMagnitude = parseInt(params.get("minWeightMagnitude"), 10);
      } else {
        connection.inApp = false;
        connection.showStatus = false;
        connection.depth = 3;
        connection.minWeightMagnitude = 18;
      }
      setTimeout(initialize, 100);
   }
  }

  function initialize() {
    $("body").show();

    // Set notification options
    toastr.options.positionClass = "toast-top-center";
    toastr.options.escapeHtml = true;

    // Hide pages
    $("#app, #login").hide();

    // Initialize button handlers
    $(".btn:not(.btn-no-loading)").loadingInitialize();

    // Enable copy to clipboard  
    var clipboard = new Clipboard(".clipboard");
    clipboard.on("success", function(e) {
      UI.notify("success", "Copied to clipboard.");
    });

    // Show full amounts on click
    $("body").on("click", ".amount.long", function(e) {
      if ($(this).hasClass("detailed")) {
        $(this).parent().removeClass("detailed");
        $(this).removeClass("detailed").html($(this).data("short")).hide().fadeIn();
      } else {
        $(this).parent().addClass("detailed");
        $(this).addClass("detailed").html($(this).data("long")).hide().fadeIn();
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
  
  function showOutdatedBrowserMessage() {
    console.log("showOutdatedBrowserMessage");

    var html = "";

    html += "<div style='padding: 20px;background:#efefef;border:#aaa;border-radius: 5px;max-width: 60%;margin: 100px auto;'>";
    html += "<strong>Your browser is out-of date. Please download one of these up-to-date, free and excellent browsers:</strong>";
    html += "<ul>";
    html += "<li><a href='https://www.google.com/chrome/browser/desktop/' rel='noopener noreferrer'>Google Chrome</a></li>";
    html += "<li><a href='http://www.mozilla.com/firefox/' rel='noopener noreferrer'>Mozilla Firefox</a></li>";
    html += "<li><a href='http://www.opera.com/' rel='noopener noreferrer'>Opera</a></li>";
    html += "</ul>";
    html += "</div>";

    $("body").html(html).show();
  }

  return UI;
}(UI || {}, jQuery));