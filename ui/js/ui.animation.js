var UI = (function(UI, $, undefined) {
  UI.applyGradientAnimation = function(element, colors) {
    var step = 0;
    var colorIndices = [0,1,2,3];
    var gradientSpeed = 0.002;

    function updateGradient() {      
      var c0_0 = colors[colorIndices[0]];
      var c0_1 = colors[colorIndices[1]];
      var c1_0 = colors[colorIndices[2]];
      var c1_1 = colors[colorIndices[3]];

      var istep = 1 - step;
      var r1 = Math.round(istep * c0_0[0] + step * c0_1[0]);
      var g1 = Math.round(istep * c0_0[1] + step * c0_1[1]);
      var b1 = Math.round(istep * c0_0[2] + step * c0_1[2]);
      var color1 = "rgb("+r1+","+g1+","+b1+")";

      var r2 = Math.round(istep * c1_0[0] + step * c1_1[0]);
      var g2 = Math.round(istep * c1_0[1] + step * c1_1[1]);
      var b2 = Math.round(istep * c1_0[2] + step * c1_1[2]);
      var color2 = "rgb("+r2+","+g2+","+b2+")";

     $(element).css({
       background: "-webkit-gradient(linear, left top, right top, from("+color1+"), to("+color2+"))"}).css({
       background: "-moz-linear-gradient(left, "+color1+" 0%, "+color2+" 100%)"});
      
      step += gradientSpeed;

      if (step >= 1) {
        step %= 1;
        colorIndices[0] = colorIndices[1];
        colorIndices[2] = colorIndices[3];
        
        colorIndices[1] = ( colorIndices[1] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;
        colorIndices[3] = ( colorIndices[3] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;
      }
    }

    return setInterval(updateGradient,10);
  }

  UI.animateStacks = function(delay) {
    var $openStack        = $(".stack.open");

    var documentHeight = $(document).height();
    var documentWidth  = $(document).width();

    if (documentHeight <= 582 || documentWidth <= 414) {
      var headerHeight = 51;
    } else if (documentHeight <= 735 || documentWidth <= 519) {
      var headerHeight = 61;
    } else {
      var headerHeight = 81;
    }

    var neededHeight      = $openStack.find(".inner").outerHeight();

    //console.log("needed height = " + neededHeight);

    var windowHeight      = $(window).height() - headerHeight;
    var leftOverHeight    = windowHeight - neededHeight;

    //console.log("left over height: " + leftOverHeight);

    var closedStackHeight = leftOverHeight / 3;

    //console.log("closed stack height: " + closedStackHeight);

    var positions         = {};

    positions["balance-stack"]          = [0, 0];
    positions["transfer-stack"]         = [headerHeight+neededHeight, headerHeight+windowHeight-neededHeight-closedStackHeight*2];
    positions["generate-address-stack"] = [headerHeight+neededHeight+closedStackHeight, headerHeight+windowHeight-neededHeight-closedStackHeight];
    positions["history-stack"]          = [headerHeight+neededHeight+closedStackHeight*2, headerHeight+windowHeight-neededHeight];

    var foundOpen = false;

    $(".stack").each(function() {
      var stack  = $(this).attr("id");
      var change = null;

      if ($(this).hasClass("open")) {
        change = positions[stack][1];
        foundOpen = true;
      } else {
        var field = (!foundOpen ? $(this).data("higher") : $(this).data("lower"));
        if (field) {
          change = positions[stack][(field == "closed" ? 0 : 1)];
        }
      }
      if (change) {
        $(this).animate({"top": change + "px", "bottom": 0}, delay);
      }
    });
  }

  return UI;
}(UI || {}, jQuery));