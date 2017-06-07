var UI = (function(UI, $, undefined) {
  UI.showPeers = function(callback) {
    console.log("UI.showPeers");

    if (!callback && UI.isLocked) {
      console.log("UI.showPeers: UI is locked");
      return;
    }

    iota.api.getNeighbors(function(error, neighbors) {
      if (error) {
        return (callback ? callback(error) : error);
      }

      var html = "";

      if (!neighbors) {
        html = "<p data-i18n='no_neighbors_found'>" + i18n.t("no_neighbors_found") + "</p>"; 
      } else {
        for (var i=0; i<neighbors.length; i++) {
          var peer = neighbors[i];

          html += "<div class='list'><ul>";
 
          $.each(peer, function(key, value) {
            html += "<li><div class='details'><div class='address'>" + String(key).escapeHTML() + "</div></div><div class='value'>" + String(value).escapeHTML() + "</div></li>";
          });

          html += "</ul></div>";

          if (i<neighbors.length-1) {
            html += "<br><br>";
          }
        }

        if (callback) {
          callback(null, "peers-modal", "<h1 id='neighbors' data-i18n='neighbors' data-i18n-options='{count: " + neighbors.length + "}'>" + i18n.t("neighbors", neighbors.length) + "</h1><div class='contents'>" + html + "</div>");
        } else {
          var $modal = $("#peers-modal");

          $("h1#neighbors").localize(neighbors.length);
  
          $modal.find(".contents").html(html);

          var modal = $modal.remodal({hashTracking: false});
          modal.open();
        }
      }
    });
  }

  UI.showNodeInfo = function(callback) {
    console.log("UI.showNodeInfo");

    if (!callback && UI.isLocked) {
      console.log("UI.showNodeInfo: UI is locked");
      return;
    }

    iota.api.getNodeInfo(function(error, info) {
      if (error) {
        return (callback ? callback(error) : error);
      }

      var html = "<div class='list'><ul>";

      $.each(info, function(key, value) {
        if (key != "duration") {
          html += "<li><div class='details details-" + String(key).escapeHTML() + "' title='" + String(key).escapeHTML() + "'><div class='address'>" + String(key).escapeHTML() + "</div></div><div class='value value-" + String(key).escapeHTML() + "' title='" + String(value).escapeHTML() + "'>" + String(value).escapeHTML() + "</div></li>";
        }
      });

      html += "</ul></div>";

      if (callback) {
        callback(null, "node-info-modal", "<h1 data-i18n='node_info'>" + i18n.t("node_info") + "</h1><div class='contents'>" + html + "</div>");
      } else {
        var $modal = $("#node-info-modal");

        $modal.find(".contents").html(html);

        var modal = $modal.remodal({hashTracking: false});
        modal.open();
      }
    });
  }

  return UI;
}(UI || {}, jQuery));