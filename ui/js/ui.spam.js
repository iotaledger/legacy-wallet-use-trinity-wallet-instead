var UI = (function(UI, $, undefined) {
  var spamCount  = 0;

  UI.showNetworkSpammer = function() {  
    /*
    if (connection.isProofOfWorking) {
      UI.notify("error", "Proof of work is busy, cannot spam.");
      return;
    }*/

    $("#spam-cnt").html("0");

    var $modal = $("#spam-modal");

    var modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false});
    modal.open();
  }

  UI.handleNetworkSpamming = function() {
    var isSpamming = false;

    $(document).on("closed", "#spam-modal", function (e) {
      if (isSpamming) {
        isSpamming = false;
        $("#spam-btn").loadingReset("Spam the Network");
        iota.api.interruptAttachingToTangle();
        console.log("OK loading reset was called");
      }
    });

    $("#spam-btn").on("click", function(e) {
      isSpamming = true;
      spamCount  = 0;

      e.preventDefault();

      console.log("start spam");

      async.doWhilst(function(callback) {
        console.log("send async transfer");

        iota.api.sendTransfer("999999999999999999999999999999999999999999999999999999999999999999999999999999999", 3, 18, [{"address": "999999999999999999999999999999999999999999999999999999999999999999999999999999999", "value": 0, "message": "GUISPAMMER", "tag": "SPAM"}], function(error) {
          if (!error) {
            console.log("no error");
            spamCount++;
            $("#spam-cnt").html(spamCount);
            $("#spam-msg").hide();
          } else {
            console.log("we have error: " + error);
            if (isSpamming) {
              $("#spam-msg").html(error).show();
            } else {
              $("#spam-msg").hide();
            }
          }
          callback(null);
        });
      }, function() {
        return isSpamming == true;
      }, function() {
        console.log("Stopped spamming");
      });
    });
  }

  return UI;
}(UI || {}, jQuery));