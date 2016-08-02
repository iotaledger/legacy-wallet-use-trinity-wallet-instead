(function($){
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
            if (!$btn.find(".content").length) {
              $btn.html("<span class='content'></span>");
            }
            $btn.find(".content").html(data.msg);
            $btn.data("updated", true);
          }, data.timeout);
        } else {
          if (!$btn.find(".content").length) {
            $btn.html("<span class='content'></span>");
          }
          $btn.find(".content").html(data.msg);
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
            if (!$btn.data("updated")) {
              var message = ($btn.data("loading") ? $btn.data("loading") : "Loading...");
              var icon = "<i class='fa fa-cog fa-spin fa-fw'></i> ";

              if (!$btn.find(".content").length) {
                $btn.html("<span class='content'></span>");
              }

              $btn.find(".content").html(icon + message.toUpperCase().escapeHTML());
            }

            $btn.append($bar);
            $bar.fadeIn(800);
          }, msTimeout);
        } else {
          e.preventDefault();
          // Prevent the event from propagating to other click handlers (IMMEDIATEPropagation)
          e.stopImmediatePropagation();

          if ($(this).hasClass("wait")) {
            clearTimeout(messageTimeout);
            $btn.removeClass("loading success error reset wait").addClass("reset").find(".content").html($btn.data("initial").toUpperCase().escapeHTML());
          }
        }
      });

      $btn.on("finished", function(e, data) {
        console.log("In on finished");
        console.log(data);
        $("body").css("cursor", "default");

        $bar.remove();

        clearTimeout(barTimeout);

        var icon = message = "";

        if (data && data.msg) {
          message = data.msg;
        } else if (data.type) {
          message = $btn.data(data.type);
        }

        if (data && data.hasOwnProperty("icon")) {
          icon = "<i class='fa " + data.icon + "'></i>";
        }

        if (data.type == "success") {
          if (!icon) {
            icon = "<i class='fa fa-check'></i> ";
          }
          if (!message) {
            message = "Success";
          }
        } else if (data.type == "error") {
          if (!icon) {
            icon = "<i class='fa fa-times'></i> ";
          }
          if (!message) {
            message = "Error";
          }
        } else if (!message) {
          message = "Submit";
        }

        if (data && data.hasOwnProperty("initial")) {
          $btn.data("initial", data.initial);
        }

        if (data && data.hasOwnProperty("loading")) {
          $btn.data("loading", data.loading);
        }

        $btn.data("updated", "");

        $btn.removeClass("loading success error reset").addClass(data.type);

        if (!$btn.find(".content").length) {
          $btn.html("<span class='content'></span>");
        }

        clearTimeout(messageTimeout);

        $btn.find(".content").html(icon + message.toUpperCase().escapeHTML());

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
              $btn.removeClass("loading success error reset").addClass("reset").removeAttr("disabled").find(".content").html($btn.data("initial").toUpperCase().escapeHTML());
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
    
    console.log(options);

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

    console.log(options);

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

    var icon = (options && options.hasOwnProperty("icon") ? options.icon : "fa fa-cog fa-spin fa-fw");

    var $btn = this.first();

    if (options && options.hasOwnProperty("initial")) {
      $btn.data("initial", options.initial);
    }

    if (options && options.hasOwnProperty("loading")) {
      $btn.data("loading", options.loading);
    }

    var msg = (icon ? "<i class='" + icon.escapeHTML() + "'></i> " : "") + msg.toUpperCase().escapeHTML();

    var timeout = (options && options.timeout ? options.timeout : 0);

    return this.first().trigger("updateMessage", {"msg": msg, "timeout": timeout});
  };
})(jQuery);