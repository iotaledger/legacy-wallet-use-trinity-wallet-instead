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
        html = "<p data-i18n='no_neighbors_found'>" + UI.t("no_neighbors_found") + "</p>"; 
      } else {
        var nrNeighbors = parseInt(neighbors.length, 10);

        for (var i=0; i<nrNeighbors; i++) {
          var neighbor = neighbors[i];

          html += "<div class='list'><ul>";
 
          $.each(neighbor, function(key, value) {
            html += "<li><div class='details'><div class='address'>" + UI.format(key) + "</div></div><div class='value'>" + UI.format(value) + "</div></li>";
          });

          html += "</ul></div>";

          if (i<length-1) {
            html += "<br><br>";
          }
        }

        if (callback) {
          callback(null, "peers-modal", "<h1 id='neighbors' data-i18n='neighbors' data-i18n-options='{count: " + nrNeighbors + "}'>" + UI.t("neighbors", nrNeighbors) + "</h1><div class='contents'>" + html + "</div>");
        } else {
          var $modal = $("#peers-modal");

          $("h1#neighbors").localize(nrNeighbors);
  
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
          html += "<li><div class='details details-" + UI.format(key) + "' title='" + UI.format(key) + "'><div class='address'>" + UI.format(key) + "</div></div><div class='value value-" + UI.format(key) + "' title='" + UI.format(value) + "'>" + UI.format(value) + "</div></li>";
        }
      });

      html += "</ul></div>";

      if (callback) {
        callback(null, "node-info-modal", "<h1 data-i18n='node_info'>" + UI.t("node_info") + "</h1><div class='contents'>" + html + "</div>");
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