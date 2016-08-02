var UI = (function(UI, $, undefined) {
  UI.handleHelpMenu = function() {    
    var $help = $("#help");
    var $overlay = $("#overlay");

    $("#app .menu").on("click", function(e) {    
      UI.openHelpMenu();
    });

    $help.find(".sections li").on("click", function(e) {
      var section = $(this).attr("class");
      $help.css("width", "100%");
      $help.find(".start").hide();
      $help.find(".section[data-section='" + section + "']").fadeIn();
    });

    $help.find(".back").on("click", function(e) {
      var menuWidth = ($(document).width() <= 440 ? 300 : 400);
      $help.css({"left": 0, "width": menuWidth + "px"});
      $help.find(".section").hide();
      $help.find(".start").fadeIn();
    });

    $help.find("dt").on("click", function(e) {
      var isOpen = $(this).hasClass("open");
      var $dd = $(this).next("dd");

      if (isOpen) {
        $(this).removeClass("open");
        $dd.slideUp("fast");
      } else {
        $(this).addClass("open");
        $dd.slideDown("fast");
      }
    });
  }

  UI.openHelpMenu = function() {
    var $help = $("#help");
    var $overlay = $("#overlay");

    if ($help.hasClass("active")) {
      return;
    }

    var menuWidth = ($(document).width() <= 440 ? 300 : 400);
    $help.css({"left": "-" + menuWidth + "px", "width": menuWidth + "px"}).addClass("active");

    $overlay.show();

    setTimeout(function() {
      $help.css("left", 0);
      $("#help .close, #overlay").on("click.help", function(e) {
        $("#help .close, #overlay").off("click.help");
        $overlay.hide();
        $help.addClass("closing").css({"left" :"-" + menuWidth + "px"});
        $help.one("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function(e) {
          if ($help.hasClass("closing")) {
            $help.removeClass("active closing");
          }
        });
      });
    }, 10);

    $help.on("click", function(e) {
      e.stopPropagation();
    });
  }

  return UI;
}(UI || {}, jQuery));