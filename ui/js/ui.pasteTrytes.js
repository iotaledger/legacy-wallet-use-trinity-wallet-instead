var UI = (function(UI, $, undefined) {
  var isProcessing = false;

  UI.showPasteTrytes = function(callback) {
    console.log("UI.showPasteTrytes");

    if (UI.isLocked) {
      console.log("UI.showPasteTrytes: UI is locked");
      return;
    } else if (!connection.seed) {
      UI.notify("error", "please_log_in_first");
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

  function parseTrytesToBundle(trytes) {
    var bundleTxs = [];

    if (iota.valid.isTrytes(trytes)) {
      var bundle = [trytes];
    } else {
      try {
        var bundle = JSON.parse(trytes);
      } catch (err) {
        bundle = null;
      }
    } 

    var trytesError = false;

    if ($.isArray(bundle)) {
      $.each(bundle, function(index, trytes) {
        if (!iota.valid.isTrytes(trytes)) {
          trytesError = true;
          return false;
        } else {
          var transaction = iota.utils.transactionObject(trytes);
          if (transaction) {
            bundleTxs.push(transaction);
          } else {
            trytesError = true;
            return false;
          }
        }
      }); 
    }

    if (trytesError || !bundleTxs || bundleTxs.length == 0) {
      return false;
    } 

    return bundleTxs;
  }

  UI.handlePastingTrytes = function() {
    $(document).on("closed", "#paste-trytes-modal", function (e) {
      if (isProcessing) {
        isProcessing = false;
        $("#process-pasted-trytes-btn").loadingReset("process_trytes");
        iota.api.interruptAttachingToTangle();
      }
    });

    $("#verify-pasted-trytes-btn").on("click", function(e) {
      var trytes = $("#pasted-trytes").val();

      var bundleTxs = parseTrytesToBundle($("#pasted-trytes").val());

      if (!bundleTxs) {
        $("#verify-pasted-trytes-btn").loadingError("invalid_trytes_or_input", {"initial": "verify_trytes"});
        return;
      } else if (!iota.utils.isBundle(bundleTxs)) {
        $("#verify-pasted-trytes-btn").loadingError("invalid_signature", {"initial": "process_trytes"});
        return;
      }
      
      var html = "<div class='list'><ul>";

      for (var i=0; i<bundleTxs.length; i++) {
        html += "<li><div class='details'><div class='address'>" + UI.formatForClipboard(iota.utils.addChecksum(bundleTxs[i].address)) + "</div></div><div class='value'>" + UI.formatAmount(bundleTxs[i].value) + "</div></li>";
      }

      html += "</ul></div>";
      
      $("#process-trytes").html(html);
      $("#paste-trytes-modal h1").html(UI.t("verify_trytes"));
      $("#process-trytes-group").show();
      $("#paste-trytes-group").hide();
      $("#process-pasted-trytes-completed").val(0);

      $("#verify-pasted-trytes-btn").loadingReset("verify_trytes");
    });

    $("#process-pasted-trytes-btn").on("click", function(e) {
      var bundleTxs = parseTrytesToBundle($("#pasted-trytes").val());

      if ($("#process-pasted-trytes-completed").val() == 1) {
        $("#process-pasted-trytes-btn").loadingError("already_processed", {"initial": "process_trytes"});
        return;
      } else if (!bundleTxs) {
        $("#process-pasted-trytes-btn").loadingError("invalid_trytes_or_input", {"initial": "process_trytes"});
        return;
      } else if (!iota.utils.isBundle(bundleTxs)) {
        $("#process-pasted-trytes-btn").loadingError("invalid_signature", {"initial": "process_trytes"});
        return;
      }

      var trytes = [];

      $.each(bundleTxs, function(index, transaction) {
        trytes.push(iota.utils.transactionTrytes(transaction));
      });

      trytes = trytes.reverse();

      console.log(trytes);

      isProcessing = true;

      UI.isDoingPOW = true;
      iota.api.sendTrytes(trytes, connection.depth, connection.minWeightMagnitude, function(error, transfers) {
        UI.isDoingPOW = false;
        if (error) {
          console.log("Process Pasted Trytes: Error");
          console.log(error);
          $("#process-pasted-trytes-btn").loadingError(error);
        } else {
          console.log("Process Pasted Trytes: Success");
          $("#process-pasted-trytes-btn").loadingSuccess("transaction_completed");
          $("#process-pasted-trytes-completed").val(1);
          UI.updateState(1000);
        }
      });
    });
  }

  return UI;
}(UI || {}, jQuery));