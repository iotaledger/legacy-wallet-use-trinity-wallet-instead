var UI = (function(UI, $, undefined) {
  UI.showPasteTrytes = function(callback) {
    console.log("UI.showPasteTrytes");

    if (UI.isLocked) {
      console.log("UI.showPasteTrytes: UI is locked");
      return;
    } else if (!connection.seed) {
      UI.notify("error", "Please log in first.");
      return;
    }

    $("#paste-trytes-modal h1").html("Paste Trytes");
    $("#process-trytes, #pasted-trytes").val("");
    $("#paste-trytes-group").show();
    $("#process-trytes-group").hide();

    $("#pasted-trytes").focus();

    var $modal = $("#paste-trytes-modal");

    var modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false});
    modal.open();
  }

  //999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999A9RGRKVGWMWMKOLVMDFWJUHNUNYWZTJADGGPZGXNLERLXYWJE9WQHWWBMCPZMVVMJUMWWBLZLNMLDCGDJ999999999999999999999999999999999999999999999999999999YGYQIVD99999999999999999999TXEFLKNPJRBYZPORHZU9CEMFIFVVQBUSTDGSJCZMBTZCDTTJVUFPTCCVHHORPMGCURKTH9VGJIXUQJVHK999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
  UI.handlePastingTrytes = function() {
    $("#verify-pasted-trytes-btn").on("click", function(e) {
      var trytes = $("#pasted-trytes").val();

      if (iota.validate.isTrytes(trytes)) {
        var transaction = iota.utils.transactionObject(trytes);
      } else {
        // We conver to trytes, then back to transaction so that no extra json key/value pairs are added..
        try {
          var transaction = JSON.parse($("#pasted-trytes").val());
        } catch (err) {
          transaction = null;
        }
        if (transaction) {
          trytes = iota.utils.transactionTrytes(transaction);
          transaction = iota.utils.transactionObject(trytes);
        }
      }

      $("#process-trytes").val(trytes);

      if (!transaction) {
        $("#verify-pasted-trytes-btn").loadingError("Invalid trytes", {"initial": "Verify Trytes"});
        return;
      }

      var html = "<div class='list'><ul>";
      $.each(transaction, function(key, value) {
        html += "<li><div class='details details-" + String(key).escapeHTML() + "' title='" + String(key).escapeHTML() + "'><div class='address'>" + String(key).escapeHTML() + "</div></div><div class='value value-" + String(key).escapeHTML() + "' title='" + String(value).escapeHTML() + "'>" + String(value).escapeHTML() + "</div></li>";
      });

      html += "</ul></div>";

      $("#paste-trytes-modal h1").html("Verify Trytes");
      $("#verify-trytes").html(html); 
      $("#process-trytes-group").show();
      $("#paste-trytes-group").hide();
      $("#verify-pasted-trytes-btn").loadingReset("Verify Trytes");
    });

    $("#process-pasted-trytes-btn").on("click", function(e) {
      iota.api.sendTrytes($("#process-trytes").val(), connection.depth, connection.minWeightMagnitude, function(error, transfers) {
       if (error) {
          console.log("Process Pasted Trytes: Error");
          console.log(error);


        } else {
          console.log("Process Pasted Trytes: Success");
          $("#process-pasted-trytes-btn").loadingSuccess("Transaction Completed");
          UI.updateState(1000);
        }
        $stack.removeClass("loading");
      });
    });
  }

  return UI;
}(UI || {}, jQuery));