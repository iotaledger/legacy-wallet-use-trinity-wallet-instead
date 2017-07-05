var UI = (function(UI, $, undefined) {
    var spamCount  = 0;

    var validTrytes = '9ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var spamTag = '';

    for (var i = 0; i < 27; i++) {

        spamTag += validTrytes[ Math.floor( Math.random() * 27 + 0 ) ];

    }

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
            $("#spam-btn").loadingReset("spam_the_network");
            iota.api.interruptAttachingToTangle(function() {
              console.log("Attaching to tangle was interrupted.");
            });
        }
    });

    $("#spam-btn").on("click", function(e) {
        isSpamming = true;
        spamCount  = 0;

        e.preventDefault();

        console.log("start spam");
        console.log("Your spam tag is: ", spamTag);

        async.doWhilst(function(callback) {
            console.log("send async transfer");

            iota.api.getNodeInfo(function(error, nodeInfo) {

                if (error) {
                    console.log("we have error: " + error);
                    if (isSpamming) {
                        $("#spam-msg").html(UI.format(error)).show();
                    } else {
                        $("#spam-msg").hide();
                    }
                }

                // check if synced
                if (nodeInfo.latestSolidSubtangleMilestoneIndex === nodeInfo.latestMilestoneIndex) {

                    iota.api.sendTransfer("999999999999999999999999999999999999999999999999999999999999999999999999999999999", connection.depth, connection.minWeightMagnitude, [{"address": "999999999999999999999999999999999999999999999999999999999999999999999999999999999", "value": 0, "tag": spamTag}], function(error) {
                        if (!error) {
                            console.log("no error");
                            spamCount++;
                            $("#spam-cnt").html(spamCount);
                            $("#spam-msg").hide();
                        } else {
                            console.log("we have error: " + error);
                            if (isSpamming) {
                                $("#spam-msg").html(UI.format(error)).show();
                            } else {
                                $("#spam-msg").hide();
                            }
                        }

                        // 1sec delay for each spam
                        setTimeout(function() {
                            callback(null);
                        }, 1000)

                    });

                } else {

                    console.log("You are not synced, cannot spam! Retrying in 30secs");
                    // 5sec delay for each spam
                    setTimeout(function() {
                        callback(null);
                    }, 30000)
                }
            })

        }, function() {
            return isSpamming == true;
        }, function() {
            console.log("Stopped spamming");
        });
    });
}

return UI;
}(UI || {}, jQuery));
