(function($){
  function updateButtonContent($btn, message, iconType) {
    switch (iconType) {
      case "loading": 
        icon = "<i class='fa fa-cog fa-spin fa-fw'></i> ";
        break;
      case "success":
        icon = "<i class='fa fa-check'></i> ";
        break;
      case "error":
        icon = "<i class='fa fa-times'></i> ";
        break;
      default:
        icon = "";
        break;
    }

    var parsed, i18nKey;

    parsed  = UI.parseMessage(message, true);
    message = icon + parsed[0];
    i18nKey = parsed[1];

    if (!$btn.find(".content").length) {
      $btn.html("<span class='content'></span>");
    }

    $btn.find(".content").html(message);

    if (i18nKey) {
      $btn.data("i18n", i18nKey);
    } else {
      $btn.data("i18n", "");
    }  
  }

  $.fn.loadingInitialize = function(){
    return this.each(function(){
      var resetTimeout;
      var barTimeout;
      var messageTimeout;

      var startTime;

      var $btn = $(this);
      var $bar = $('<span class="progress" style="display:none"><div class="slider"><div class="line"></div><div class="break dot1"></div><div class="break dot2"></div><div class="break dot3"></div></div></span>');

      //todo: if updateMessage is called before barTimeout it is overwritten by it!
      $btn.on("updateMessage", function(e, data) {
        clearTimeout(messageTimeout);

        if (data.timeout) {
          messageTimeout = setTimeout(function() {
            updateButtonContent($btn, data.msg, data.icon);
            $btn.data("updated", true);
          }, data.timeout);
        } else {
          updateButtonContent($btn, data.msg, data.icon);
          $btn.data("updated", true);
        }
      });

      $btn.on("click", function(e) {
        if (!$btn.hasClass("loading") && !$btn.hasClass("success") && !$btn.hasClass("error")) {
          $btn.removeClass("loading success error reset").addClass("loading").attr("disabled", "disabled");

          startTime = new Date().getTime();

          $("body").css("cursor", "progress");
   
          var msTimeout = $btn.data("bar-timeout");

          if (!msTimeout) {
            msTimeout = 200;
          }

          // Only start showing the bar if the action is not finished within 200 ms.
          barTimeout = setTimeout(function() {
            // If the message has already been updated before barTimeout is called, then of course we do not overwrite it again.
            //if (!$btn.data("updated")) {
            updateButtonContent($btn, $btn.data("loading") ? $btn.data("loading") : "loading", "loading");   

            if (!$btn.hasClass("btn-no-progress-bar")) {    
              $btn.append($bar);
              $bar.fadeIn(800);
            }
          }, msTimeout);
        } else {
          e.preventDefault();
          // Prevent the event from propagating to other click handlers (IMMEDIATEPropagation)
          e.stopImmediatePropagation();

          if ($(this).hasClass("wait")) {
            clearTimeout(messageTimeout);
            $btn.removeClass("loading success error reset wait").addClass("reset").find(".content").html(UI.t($btn.data("initial")).toUpperCase());
            $btn.data("i18n", $btn.data("initial"));
          }
        }
      });

      $btn.on("finished", function(e, data) {
        if (!data) {
          data = {};
        }

        $("body").css("cursor", "default");

        $bar.remove();

        clearTimeout(barTimeout);

        var message = "";

        if (data.msg) {
          message = data.msg;
        } else if (data.type) {
          message = $btn.data(data.type);
        }

        if (!message && data.type) {
          message = data.type;
        } else if (!message) {
          message = "submit";
        }

        if (data.initial && data.initial.match(/^[a-z\_]+$/i)) {
          $btn.data("initial", data.initial);
        }
        if (data.loading && data.loading.match(/^[a-z\_]+$/i)) {
          $btn.data("loading", data.loading);
        }

        $btn.data("updated", "");

        $btn.removeClass("loading success error reset").addClass(data.type);

        clearTimeout(messageTimeout);

        updateButtonContent($btn, message, data.type);

        if (data.type == "success" || data.type == "error") {
          var timeTaken = new Date().getTime() - startTime;

          clearTimeout(resetTimeout);

          var autoReset = $btn.data("auto-reset");

          if (!autoReset && timeTaken > 5000) {
            // If time taken is larger than 5 seconds, user must click the button.
            $btn.addClass("wait").removeAttr("disabled");
          } else {
            //Else, The user will have to click the button to reset it.
            resetTimeout = setTimeout(function() {
              clearTimeout(messageTimeout);
              $btn.removeClass("loading success error reset").addClass("reset").removeAttr("disabled").find(".content").html(UI.t($btn.data("initial")).toUpperCase());
              $btn.data("i18n", $btn.data("initial"));
            }, 2500);
          }
        } else {
          $btn.removeAttr("disabled");
        }
      });
    });
  };

  $.fn.loadingSuccess = function(msg, options) {
    if (typeof msg == "object") {
      msg = (msg.message ? msg.message : "");
    }

    console.log("$.fn.loadingSuccess: " + msg);

    if (!options) {
      options = {};
    }

    $.extend(options, {"type": "success", "msg": msg});
    
    return this.first().trigger("finished", options);
  };

  $.fn.loadingError = function(msg, options) {
    if (typeof msg == "object") {
      msg = (msg.message ? msg.message : "");
    }

    console.log("$.fn.loadingError: " + msg);

    if (!options) {
      options = {};
    }

    $.extend(options, {"type": "error", "msg": msg});

    return this.first().trigger("finished", options);
  };

  $.fn.loadingReset = function(msg, options) {
    console.log("$.fn.loadingReset: " + msg);

    if (!options) {
      options = {};
    }

    $.extend(options, {"type": "reset", "msg": msg});

    return this.first().trigger("finished", options);
  };

  $.fn.loadingUpdate = function(msg, options) {
    console.log("$.fn.loadingUpdate: " + msg);

    var $btn = this.first();

    if (!options) {
      options = {};
    }
  
    if (options.initial && options.initial.match(/^[a-z\_]+$/i)) {
      $btn.data("initial", options.initial);
    }
    if (options.loading && options.loading.match(/^[a-z\_]+$/i)) {
      $btn.data("loading", options.loading);
    }

    var timeout = (options.timeout ? options.timeout : 0);

    return this.first().trigger("updateMessage", {"msg": msg, "icon": options.noIcon ? "" : "loading", "timeout": timeout});
  };
})(jQuery);