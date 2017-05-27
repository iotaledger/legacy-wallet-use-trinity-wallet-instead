var UI = (function(UI, $, undefined) {
  UI.showGeneratedSeed = function(returnHTML) {
    console.log("UI.showGeneratedSeed");

    var seed = generateSeed();

    var html = "<p><span data-i18n='your_generated_seed_is'>" + i18n.t("your_generated_seed_is") + "</span>" + (connection.inApp ? " (<a href='#' id='generated-seed-value-copy' data-i18n='copy'>" + i18n.t("copy") + "</a>)" : "") + ":</p>";

    html += "<div style='font-family:courier;background:black;color:white;word-break:break-all;font-size:120%;padding:10px'>" + UI.formatForClipboard(seed, "generated-seed-value") + "</div>";

    if (returnHTML) {
      return "<h1 data-i18n='generated_seed'>" + i18n.t("generated_seed") + "</h1><div class='contents'>" + html + "</div>";
    } else {
      var $modal = $("#generated-seed-modal");

      $modal.find(".contents").html(html);

      var modal = $modal.remodal({hashTracking: false});
      modal.open();
    }
  }

  function generateSeed() {
    var cryptoObj = window.crypto || window.msCrypto; // for IE 11

    if (!cryptoObj) {
      throw i18n.t("crypto_tools_not_available");
    }

    var seed       = "";
    var characters = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    var randomValues = new Uint32Array(81);
    cryptoObj.getRandomValues(randomValues);

    for (var i=0; i<81; i++) {
      seed += characters.charAt(randomValues[i]%27);
    }

    return seed;
  }
  
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