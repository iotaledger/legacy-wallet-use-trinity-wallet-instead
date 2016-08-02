var UI = (function(UI, $, undefined) {
  UI.handleHistory = function() {
    var modal;

    $("#history-stack").on("click", ".show-bundle", function(e) {
      e.preventDefault();

      var hash = $(this).closest("li").data("hash");
      var $modal = $("#bundle-modal");

      var persistence = $(this).closest("li").data("persistence");
      var options = {hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false};

      console.log("UI.handleHistory: Show bundle modal for hash " + hash);

      Server.getBundle(hash).done(function(transactions) {
        var html = "<div class='list'><ul>";

        for (var i=0; i<transactions.length; i++) {
          html += "<li><div class='details'><div class='address'>" + UI.formatForClipboard(Address.getAddressWithChecksum(transactions[i].address)) + "</div></div><div class='value'>" + UI.formatAmount(transactions[i].value) + "</div></li>";
        }

        html += "</ul></div>";
      
        $modal.find(".contents").html(html);
        $modal.find(".hash").html("<strong>Hash:</strong> " + UI.formatForClipboard(hash));

        /*
        if (bundle.transactions[0].signatureMessageChunk != "999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999") {
          $modal.find(".message").html("<strong>Message:</strong> " + String(bundle.transactions[0].signatureMessageChunk.replace(/[9]+$/, "")).escapeHTML()).show();
        } else {
          $modal.find(".message").html("").hide();
        }*/

        $modal.find(".persistence").html("Persistence: " + String(persistence).escapeHTML() + "%");  
        $modal.find(".btn").data("hash", hash);

        $modal.find(".btn").each(function() {
          $(this).loadingReset($(this).data("initial"));
        });

        if (persistence < 95) {
          $modal.find(".btn").show();
        } else {
          $modal.find(".btn").hide();
        }
        
        modal = $modal.remodal(options);
        modal.open();
      });
    });

    $("#replay-btn, #rebroadcast-btn").on("click", function(e) {
      e.preventDefault();

      var hash = $(this).data("hash");

      if (!hash) {
        console.log("UI.replay/rebroadcast: No hash");
        return;
      }

      var isRebroadcast = $(this).attr("id") == "rebroadcast-btn";

      if (isRebroadcast) {
        $("#replay-btn").attr("disabled", "disabled");
      } else {
        $("#rebroadcast-btn").attr("disabled", "disabled");
      }

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", "Cannot close whilst " + (isRebroadcast ? "rebroadcasting" : "replaying") + ".");
        e.preventDefault();
        e.stopPropagation();
      });

      console.log("UI.handleHistory: Do " + (isRebroadcast ? "rebroadcast" : "replay") + " for hash " + hash);

      UI.isLocked = true;

      if (isRebroadcast) {
        Server.rebroadcast(hash).done(function(msg) {
          console.log("UI.rebroadcast: Success: " + msg);
          $("#rebroadcast-btn").loadingSuccess(msg);
          UI.createStateInterval(60000, true);
        }).fail(function(err) {
          console.log("UI.rebroadcast: Error");
          console.log(err);
          $("#rebroadcast-btn").loadingError(err);
        }).always(function() {
          UI.isLocked = false;
          $(".remodal-close").off("click");
          $("#replay-btn").removeAttr("disabled");
        });
      } else {
        Server.replay(hash).progress(function(msg) {
          $("#replay-btn").loadingUpdate(msg, {"timeout": 500});
        }).done(function(msg) {
          console.log("UI.replay: Success: " + msg);
          if (!UI.isFocused()) {
            UI.notifyDesktop(msg);
          }
          $("#replay-btn").loadingSuccess(msg);
          UI.createStateInterval(60000, true);
        }).fail(function(err) {
          console.log("UI.replay: Error");
          console.log(err);
          $("#replay-btn").loadingError(err);
        }).always(function() {
          UI.isLocked = false;
          $(".remodal-close").off("click");
          $("#rebroadcast-btn").removeAttr("disabled");
        });
      }
    });

    $("#history-stack .submenu li").on("click", function(e) {
      e.preventDefault();

      $("#history-stack .active").removeClass("active");
      $(this).addClass("active");

      var type = $(this).data("type");
      if (type == "transfers") {
        $("#history-stack .addresses").hide();
        $("#history-stack .transfers").show();
      } else {
        $("#history-stack .transfers").hide();
        $("#history-stack .addresses").show();
      }
      UI.animateStacks(200);
    });
  }

  UI.updateHistory = function() {
    if (!connection.transactionsChange) {
      return;
    } else {
      connection.transactionsChange = false;
    }

    var $transfersBtn = $("#history-stack li[data-type=transfers]");
    var $addressesBtn = $("#history-stack li[data-type=addresses]");

    var $transfers = $("#history-stack .transfers");
    var $addresses = $("#history-stack .addresses");

    var nrTransfers = nrAddresses = 0;

    var transfersHtml = addressesHtml = "";

    if (connection.transactions) {
      //$("#history-stack h1 span").html(" (" + connection.transactions.length + ")");

      $.each(connection.transactions, function(key, transaction) {
        if (transaction.address) {
          transaction.isSpentAddress = $.inArray(transaction.address, connection.spentAddresses) != -1;

          var checkSummedAddress = Address.getAddressWithChecksum(transaction.address);

          if (!checkSummedAddress) {
            checkSummedAddress = "";
          } else {
            checkSummedAddress = String(checkSummedAddress).escapeHTML();
          }
        } else {
          checkSummedAddress = "";
        }

        if (transaction.value == "0") {
          nrAddresses++;

          addressesHtml += "<li " + (transaction.isSpentAddress ? " class='spent'" : "") + " data-hash='" + String(transaction.hash).escapeHTML() + "' data-persistence='" + String(transaction.persistence).escapeHTML() + "'>";
          addressesHtml += "<div class='details'>";
          addressesHtml += "<div class='address'>" + (checkSummedAddress ? UI.formatForClipboard(checkSummedAddress) : "/") + "</div>";
          addressesHtml += "<div class='action'>" + (transaction.hash ? "<a href='#' class='show-bundle'>Show bundle</a> " : "") + "<span>" + String(transaction.persistence).escapeHTML() + "%</span></div>";
          addressesHtml += "</div>";
          addressesHtml += "<div class='value'>" + UI.formatDate(transaction.timestamp) + "</div>";
          addressesHtml += "</div>";
          addressesHtml += "</li>";
        } else {
          nrTransfers++;

          var value = parseInt(transaction.value, 10);

          transfersHtml += "<li data-hash='" + String(transaction.hash).escapeHTML() + "' data-type='" + (transaction.value < 0 ? "spending" : "receiving") + "' data-persistence='" + String(transaction.persistence).escapeHTML() + "'>";
          transfersHtml += "<div class='type'><i class='fa fa-arrow-circle-" + (transaction.value < 0 ? "left" : "right") + "'></i></div>";
          transfersHtml += "<div class='details'>";
          transfersHtml += "<div class='date'>" + (transaction.timestamp != "0" ? UI.formatDate(transaction.timestamp, true) : "Genesis") + "</div>";
          transfersHtml += "<div class='address'>" + (checkSummedAddress ? UI.formatForClipboard(checkSummedAddress) : "/") + "</div>";
          transfersHtml += "<div class='action'>" + (transaction.hash ? "<a href='#' class='show-bundle'>Show bundle</a> " : "") + "<span>" + String(transaction.persistence).escapeHTML() + "%</span></div>";
          transfersHtml += "</div>";
          transfersHtml += "<div class='value'>" + UI.formatAmount(transaction.value) + "</div>";
          transfersHtml += "</li>";
        }
      });
    } else {
      //$("#history-stack h1 span").html("");
    }

    $transfersBtn.html("<span>" + nrTransfers + " </span>Transfer" + (nrTransfers != "1" ? "s" : ""));
    $addressesBtn.html("<span>" + nrAddresses + " </span>Address" + (nrAddresses != "1" ? "es" : ""));

    if (!transfersHtml) {
      $transfers.find("ul").empty().hide();
      $transfers.find("p").show();
    } else {
      $transfers.find("ul").html(transfersHtml).show();
      $transfers.find("p").hide();
    }

    if (!addressesHtml) {
      $addressesBtn.html("0 Addresses");
      $addresses.find("ul").empty().hide();
      $addresses.find("p").show();
    } else {
      $addresses.find("ul").html(addressesHtml).show();
      $addresses.find("p").hide();
    }

    if ($("#history-stack").hasClass("open")) {
      UI.animateStacks(200);
    }
  }

  UI.updateBalance = function() {
    $("#available-balance, #available-balance-always").html(UI.formatAmount(connection.balance));
  }

  return UI;
}(UI || {}, jQuery));