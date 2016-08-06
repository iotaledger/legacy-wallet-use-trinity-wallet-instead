var UI = (function(UI, $, undefined) { 
  UI.showGeneratedSeed = function(returnHTML) {
    console.log("UI.showGeneratedSeed");

    var seed = Address.generateSeed();

    var html = "<p>Your generated seed is" + (connection.inApp ? " (<a href='#' id='generated-seed-value-copy'>copy</a>)" : "") + ":</p>";

    html += "<div style='font-family:courier;background:black;color:white;word-break:break-all;font-size:120%;padding:10px'>" + UI.formatForClipboard(seed, "generated-seed-value") + "</div>";

    if (returnHTML) {
      return "<h1>Generated Seed</h1><div class='contents'>" + html + "</div>";
    } else {
      var $modal = $("#generated-seed-modal");

      $modal.find(".contents").html(html);

      var modal = $modal.remodal({hashTracking: false});
      modal.open();
    }
  }

  UI.showPeers = function(returnHTML) {
    console.log("UI.showPeers");

    if (returnHTML) {
      var deferred = $.Deferred();
    } else {
      if (UI.isLocked) {
        console.log("UI.showPeers: UI is locked");
        return;
      }
    }

    Server.getPeers(true).done(function(activity) {
      var html = "";

      if (!activity.peers) {
        html = "<p>No peers found.</p>"; 
      } else {
        for (var i=0; i<activity.peers.length; i++) {
          var peer = activity.peers[i];

          html += "<div class='list'><ul>";
 
          $.each(peer, function(key, value) {
            html += "<li><div class='details'><div class='address'>" + String(key).escapeHTML() + "</div></div><div class='value'>" + String(value).escapeHTML() + "</div></li>";
          });

          html += "</ul></div>";

          if (i<activity.peers.length-1) {
            html += "<br><br>";
          }
        }

        if (returnHTML) {
          deferred.resolve("peers-modal", "<h1>Peers (" + activity.peers.length + ")</h1><div class='contents'>" + html + "</div>");
        } else {
          var $modal = $("#peers-modal");

          $("#peer-count").html(activity.peers.length);
  
          $modal.find(".contents").html(html);

          var modal = $modal.remodal({hashTracking: false});
          modal.open();
        }
      }
    }).fail(function(err) {
      if (returnHTML) {
        deferred.reject(err);
      }
    });

    if (returnHTML) {
      return deferred.promise();
    }
  }

  UI.showNodeInfo = function(returnHTML) {
    console.log("UI.showNodeInfo");

    if (returnHTML) {
      var deferred = $.Deferred();
    } else {
      if (UI.isLocked) {
        console.log("UI.showNodeInfo: UI is locked");
        return;
     }
    }

    Server.getNodeInfo().done(function(nodeInfo) {
      console.log(nodeInfo);
      var html = "<div class='list'><ul>";

      $.each(nodeInfo, function(key, value) {
        if (key != "duration") {
          html += "<li><div class='details details-" + String(key).escapeHTML() + "' title='" + String(key).escapeHTML() + "'><div class='address'>" + String(key).escapeHTML() + "</div></div><div class='value value-" + String(key).escapeHTML() + "' title='" + String(value).escapeHTML() + "'>" + String(value).escapeHTML() + "</div></li>";
        }
      });

      html += "</ul></div>";

      if (returnHTML) {
        deferred.resolve("node-info-modal", "<h1>Node Info</h1><div class='contents'>" + html + "</div>");
      } else {
        var $modal = $("#node-info-modal");

        $modal.find(".contents").html(html);

        var modal = $modal.remodal({hashTracking: false});
        modal.open();
      }
    }).fail(function(err) {
      if (returnHTML) {
        deferred.reject(err);
      }
    })

    if (returnHTML) {
      return deferred.promise();
    }
  }

  return UI;
}(UI || {}, jQuery));