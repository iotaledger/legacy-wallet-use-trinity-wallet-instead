function isAboveMaxDepth (tx) {
  if (!tx) {
    return false
  }

  if (tx.attachmentTimestamp > Date.now()) {
    return false
  }

  return (Date.now() - parseInt(tx.attachmentTimestamp)) < (11 * 60 * 1000)
}

function getPromotableTail (tails, i) {
  if (!Number.isInteger(i)) {
    i = 0
  }

  if (i === 0) {
    tails = tails.filter(tx => isAboveMaxDepth(tx)).sort((a, b) => b.attachmentTimestamp - a.attachmentTimestamp)
  }

  if (!tails[i]) {
    return Promise.resolve(false)
  }

  return iota.api.isPromotable(tails[i].hash).then(state => {
    if (state && isAboveMaxDepth(tails[i])) {
      return tails[i]
    }

    return getPromotableTail(tails, ++i)
  }).catch(() => {
    return false
  })
}

var UI = (function(UI, $, undefined) {

  UI.handleHistory = function() {
    var modal;

    const bundlesToTailsMap = new Map()

    $("#history-stack").on("click", ".show-bundle", function(e) {
      e.preventDefault();

      var hash = $(this).closest("li").data("hash");
      var bundleHash = $(this).closest("li").data("bundle")
      var $modal = $("#bundle-modal");

      var persistence = $(this).closest("li").data("persistence");
      var options = {hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false};

      console.log("UI.handleHistory: Show bundle modal for hash " + hash);

      iota.api.getBundle(hash, (error, transactions) => {
        if (error) {

          return
        }

        /*
        var inputAddresses = [];

        for (var i=0; i<transactions.length; i++) {
          if (transactions[i].value < 0) {
            inputAddresses.push(transactions[i].address);
          }
        }
        */

        function renderBundleModal (persistence, isPromotable, isReattachable, status) {
          var html = "<div class='list'><ul>";

          for (var i=0; i<transactions.length; i++) {
            var tag = String(transactions[i].tag).replace(/[9]+$/, "");
            html += "<li><div class='details'><div class='address'>" + (tag ? "<div class='tag'>" + UI.format(tag) + "</div>" : "") + UI.formatForClipboard(iota.utils.addChecksum(transactions[i].address)) + "</div></div><div class='value'>" + UI.formatAmount(transactions[i].value) + "</div></li>";
          }

          html += "</ul></div>";

          $modal.find(".contents").html(html);
          $modal.find(".hash").html("<strong><span data-i18n='hash'>" + UI.t("hash") + "</span>:</strong> " + UI.formatForClipboard(hash));

          $modal.find(".persistence").html("<span data-i18n='persistence'>" + UI.t("persistence") + "</span>: <span data-i18n='" + status + "'>" + UI.t(status) + "</span>").show();
          $modal.find(".btn").data("hash", hash);
          $modal.find(".btn").data("bundle", bundleHash)

          $modal.find(".btn").each(function() {
            $(this).loadingReset($(this).data("initial"));
          });

          if (!persistence) {
            if (isPromotable) {
              $("#rebroadcast-btn").show();
              $("#promote-btn").show()
              $("#reattach-btn").hide()
            } else if (isReattachable) {
              $("#rebroadcast-btn").show();
              $("#promote-btn").hide()
              $("#reattach-btn").show();
            } else {
              $modal.find(".btn").hide();
            } 
          } else {
            $modal.find(".btn").hide();
          }

          modal = $modal.remodal(options);
          modal.open();
        }

        if (persistence) {
          bundlesToTailsMap.delete(transactions[0].bundle)

          renderBundleModal(persistence, false, false, 'confirmed')
        } else {
          iota.api.findTransactionObjects({bundles: [transactions[0].bundle]}, (err, txs) => {
            if (err) {
              return
            }

            const bundleHash = txs[0].bundle
            const tail = bundlesToTailsMap.get(bundleHash)
            let tails = txs.filter(tx => tx.currentIndex === 0)

            iota.api.getLatestInclusion(tails.map(tx => tx.hash), (err, inclusionStates) => {
              if (err) {
                return
              }

              if (inclusionStates.some(state => state)) {
                let status
                if (inclusionStates[tails.findIndex(tx => tx.hash === hash)]) {
                  status = 'confirmed'
                } else {
                  status = 'reattachment_confirmed'
                }

                renderBundleModal(persistence, false, false, status)
              } else if (tail && isAboveMaxDepth(tail)) {
                renderBundleModal(false, true, false, 'pending')
              } else {
                getPromotableTail(tails, 0)
                  .then(consistentTail => {
                    if (consistentTail) {
                      bundlesToTailsMap.set(bundleHash, consistentTail)
                      renderBundleModal(false, true, false, 'pending')
                    } else {
                      bundlesToTailsMap.delete(bundleHash)
                      renderBundleModal(false, false, true, 'pending')
                    }
                  }).catch(() => {
                    renderBundleModal(false, false, true, 'pending')
                  })
              }
            })
          })
        }
      })
    })

    $("#promote-btn, #reattach-btn, #rebroadcast-btn").on("click", function(e) {
      e.preventDefault();

      const hash = $(this).data("hash");
      const bundleHash = $(this).data("bundle")

      if (!hash) {
        console.log("UI.reattach/rebroadcast: No hash");
        return;
      }

      var isPromote = $(this).attr("id") == "promote-btn"
      var isRebroadcast = $(this).attr("id") == "rebroadcast-btn";

      if (isRebroadcast) {
        $("#reattach-btn").attr("disabled", "disabled");
        $("#promote-btn").attr("disabled", "disabled")
      } else if (isPromote) {
        $("#reattach-btn").attr("disabled", "disabled")
        $('#rebroadcast-btn').attr("disabled", "disabled")
      } else {
        $("#promote-btn").attr("disabled", "disabled")
        $("#rebroadcast-btn").attr("disabled", "disabled");
      }

      $(".remodal-close").on("click", function(e) {
        UI.notify("error", isRebroadcast ? "cannot_close_whilst_rebroadcasting" : (isPromote ? "cannot_close_whilst_promoting" : "cannot_close_whilst_reattaching"));
        e.preventDefault();
        e.stopPropagation();
      });

      console.log("UI.handleHistory: Do " + (isRebroadcast ? "rebroadcast" : (isPromote ? "promote" : "reattach")) + " for hash " + hash);

      UI.isLocked = true;

      if (isRebroadcast) {
        UI.isDoingPOW = true;
        iota.api.broadcastBundle(hash, function(error, bundle) {
          UI.isDoingPOW = false;
          if (error) {
            console.log("UI.rebroadcast: Error");
            console.log(error);
            $("#rebroadcast-btn").loadingError(error); //todo: not a key
          } else {
            console.log("UI.rebroadcast: Success");
            if (!UI.isFocused()) {
              UI.notifyDesktop("transaction_rebroadcasted_successfully");
            }
            $("#rebroadcast-btn").loadingSuccess("rebroadcast_completed");
            UI.updateState(1000);
          }

          UI.isLocked = false;
          $(".remodal-close").off("click");
          $("#reattach-btn").removeAttr("disabled");
          $("#promote-btn").removeAttr("disabled")
        });
      } else if (isPromote) {
        function _resetUI (err, success, desktopNotification) {
          $('#promote-btn .progress').hide()

          if (err) {
            $('#promote-btn').loadingError(err)
          } else {
            $('#promote-btn').loadingSuccess(success)
          }

          if (!UI.isFocused()) {
            UI.notifyDesktop(err || desktopNotification)
          }

          UI.isDoingPOW = false
          UI.isLocked = false

          $('.remodal-close').off('click')
          $('#rebroadcast-btn').removeAttr('disabled')
          $('#reattach-btn').removeAttr('disabled')
        }

        function _promote (tail, count, i, skipCheck) {
          iota.api.getLatestInclusion([tail.hash], (err, states) => {
            if (err) {
              _resetUI(err.message)
              return
            }

            if (states[0]) {
              $('#bundle-modal').find('.btn').hide()
              $('#bundle-modal').find(".persistence").html("<span data-i18n='persistence'>" + UI.t("persistence") + "</span>: <span data-i18n='confirmed'>" + UI.t('confirmed') + "</span>").show()

              UI.updateState(1000)

              _resetUI(null, 'promote_completed', 'transaction_promoted_successfully')
              return
            }

            const spamTransfer = [{address: '9'.repeat(81), value: 0, message: '', tag: ''}]

            if (!skipCheck && !isAboveMaxDepth(tail)) {
              _resetUI('promote_bellow_max_depth_error')

              bundlesToTailsMap.delete(bundleHash)

              $('#reattach-btn').show()
              $('#promote-btn').loadingReset('promote')
              $('#promote-btn').hide()
              return
            }

            $('#promote-btn').loadingReset()

            var $bar = $('<span class="progress" style="display:block"><div class="slider"><div class="line"></div><div class="break dot1"></div><div class="break dot2"></div><div class="break dot3"></div></div></span>')

            if (i === 1) {
              $('#promote-btn').append($bar)
            }
            $('#promote-btn .progress').show()

            $('#promote-btn').loadingUpdate(UI.t('promoting') + ' ' + i + '/' + count)

            UI.isDoingPOW = true

            iota.api.promoteTransaction(
              tail.hash,
              connection.depth,
              connection.minWeightMagnitude,
              spamTransfer,
              {interrupt: false, delay: 0},
              (err, res) => {
                UI.isDoingPOW = false

                if (err) {
                  if (err.message.indexOf('Inconsistent subtangle') > -1) {
                    _resetUI('promote_inconsistent_subtangle_error')

                    bundlesToTailsMap.delete(bundleHash)

                    $('#promote-btn').hide()
                    $('#promote-btn').loadingReset('promote')
                    $('#reattach-btn').show()
                  } else {
                    _resetUI(err.message)
                  }
                } else {
                  if (i < count) {
                    setTimeout(() => _promote(tail, count, ++i, true), 1000)
                    return
                  }

                  UI.updateState(1000)

                  _resetUI(null, 'promote_completed', 'transaction_promoted_successfully')
                }
              }
            )
          })
        }
        _promote(bundlesToTailsMap.get(bundleHash), 5, 1, false)
      } else {
        UI.isDoingPOW = true;
        iota.api.replayBundle(hash, connection.depth, connection.minWeightMagnitude, function(error, bundle) {
          UI.isDoingPOW = false;
          if (error) {
            console.log("UI.reattach: Error");
            console.log(error);
            $("#reattach-btn").loadingError(error); //todo: not a key
          } else {
            console.log("UI.reattach: Success");
            if (!UI.isFocused()) {
              UI.notifyDesktop("transaction_reattached_successfully");
            }
            //$("#reattach-btn").loadingSuccess("reattach_completed");
            $("#bundle-modal .persistence").hide();

            $('#reattach-btn').hide()
            $('#promote-btn').show()
            $('#promote-btn').removeAttr('disabled')

            UI.updateState(1000);

            bundlesToTailsMap.set(bundle[0].bundle, bundle[0])
          }

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
    //no changes..
    if (JSON.stringify(connection.accountData) == JSON.stringify(connection.previousAccountData)) {
      return;
    }

    var $transfersBtn = $("#history-stack li[data-type=transfers]");
    var $addressesBtn = $("#history-stack li[data-type=addresses]");

    var $transfers = $("#history-stack .transfers");
    var $addresses = $("#history-stack .addresses");

    var transfersHtml = addressesHtml = "";

    var spentAddresses = [];

    if (connection.accountData) {
      var addresses = iota.utils.addChecksum(connection.accountData.addresses).reverse();

      var categorizedTransfers = iota.utils.categorizeTransfers(connection.accountData.transfers, connection.accountData.addresses);

      $.each(connection.accountData.transfers.reverse(), function(i, bundle) {
        var persistence = bundle[0].persistence ? bundle[0].persistence : false;
        var isSent = false;
        $.each(categorizedTransfers.sent, function(i, sentBundle) {
          if (sentBundle[0].hash == bundle[0].hash) {
            isSent = true;
            return false;
          }
        });

        var totalValue = 0;
        var tags = [];

        var address = "";

        $.each(bundle, function(i, item) {
          var isOurAddress = connection.accountData.addresses.indexOf(item.address) != -1;

          if (isSent && isOurAddress  && item.value < 0 && spentAddresses.indexOf(item.address) == -1) {
            spentAddresses.push(item.address);
          }

          if (!address) {
            if (!isSent && isOurAddress) {
              address = item.address;
            } else if (isSent && !isOurAddress) {
              address = item.address;
            }
          }

          if (item.value !== 0 && isOurAddress) {
            totalValue += item.value;
          }
          var tag = String(item.tag).replace(/[9]+$/, "");
          if (tag && tags.indexOf(tag) == -1) {
            tags.push(tag);
          }
        });

        if (!address) {
          address = bundle[0].address;
        }

        transfersHtml += "<li data-bundle='" + UI.format(bundle[0].bundle) + "' data-hash='" + UI.format(bundle[0].hash) + "' data-type='" + (isSent ? "spending" : "receiving") + "' data-persistence='" + UI.format(persistence*1) + "'>";
        transfersHtml += "<div class='type'><i class='fa fa-arrow-circle-" + (isSent ? "left" : "right") + "'></i></div>";
        transfersHtml += "<div class='details'>";
        transfersHtml += "<div class='date'>" + (bundle[0].attachmentTimestamp != 0 ? UI.formatDate(bundle[0].attachmentTimestamp, true) :
                                      (bundle[0].timestamp != 0 ? UI.formatDate(bundle[0].timestamp, true) : "")) + "</div>";
        transfersHtml += "<div class='address'>" + (address ? UI.formatForClipboard(iota.utils.addChecksum(address)) : "/") + "</div>";
        transfersHtml += "<div class='action'>";
        if (tags.length) {
          for (var i=0; i<tags.length; i++) {
            transfersHtml += "<div class='tag'>" + UI.format(tags[i]) + "</div>";
          }
        }
        transfersHtml += (bundle[0].hash ? "<a href='#' class='show-bundle' data-i18n='show_bundle'>" + UI.t("show_bundle") + "</a> " : "") + "<span data-i18n='" + (persistence ? "confirmed" : "pending") + "'>" + UI.t(persistence ? "confirmed" : "pending") + "</span></div>";
        transfersHtml += "</div>";
        transfersHtml += "<div class='value'>" + UI.formatAmount(totalValue) + "</div>";
        transfersHtml += "</li>";
      });
    }

    $.each(addresses, function(i, address) {
      addressesHtml += "<li>";
      addressesHtml += "<div class='details'>";
      addressesHtml += "<div class='address'" + (spentAddresses.indexOf(iota.utils.noChecksum(address)) != -1 ? " style='text-decoration:line-through'" : "") + ">" + UI.formatForClipboard(address) + "</div>";
      addressesHtml += "</div>";
      addressesHtml += "<div class='value'></div>";
      addressesHtml += "</div>";
      addressesHtml += "</li>";
    });

    var nrTransfers = parseInt(connection.accountData.transfers.length, 10);
    var nrAddresses = parseInt(connection.accountData.addresses.length, 10);

    $transfersBtn.localize({count: nrTransfers}).data("i18n-options", {count: nrTransfers});
    $addressesBtn.localize({count: nrAddresses}).data("i18n-options", {count: nrAddresses});

    if (!transfersHtml) {
      $transfers.find("ul").empty().hide();
      $transfers.find("p").show();
    } else {
      $transfers.find("ul").html(transfersHtml).show();
      $transfers.find("p").hide();
    }

    if (!addressesHtml) {
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
    $("#available-balance, #available-balance-always").html(UI.formatAmount(connection.accountData.balance));
    $("#available-balance span").css("font-size", "");
  }

  return UI;
}(UI || {}, jQuery));
