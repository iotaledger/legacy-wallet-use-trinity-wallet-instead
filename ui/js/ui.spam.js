var UI = (function(UI, $, undefined) {
  var spamCount  = 0;

  UI.showNetworkSpammer = function() {  
    if (connection.isProofOfWorking) {
      UI.notify("error", "Proof of work is busy, cannot spam.");
      return;
    }

    $("#spam-cnt").html("0");

    var $modal = $("#spam-modal");

    var modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false});
    modal.open();
  }

  UI.handleNetworkSpamming = function() {
    $(document).on("closed", "#spam-modal", function (e) {
      if (connection.isSpamming && connection.inApp) {
        relaunchApplication();
      }
    });

    $("#spam-btn").on("click", function(e) {
      connection.isSpamming = true;

      if (!connection.isLoggedIn) {
        UI.createStateInterval(60000, false);
        console.log("create a check for the milestones");
      }

      spamCount  = 0;

      e.preventDefault();

      Server.startSpamming().progress(function(data) {
        console.log("in progress");
        console.log(data);

        if (data == "finished") {
          spamCount++;
          $("#spam-cnt").html(spamCount);
        } else {
          data = String(data).escapeHTML();
          if (data == "Not synced") {
            $("#spam-not-synced").show();
          } else if (data == "Attaching to tangle...") {
            $("#spam-not-synced").hide();
          }

          if (data != $("#spam-msg").html()) {
            $("#spam-msg").html(data);
          }
        }
      });
    });
  }

  return UI;
}(UI || {}, jQuery));