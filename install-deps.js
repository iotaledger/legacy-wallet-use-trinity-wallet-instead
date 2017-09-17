const https = require('follow-redirects').https;
const fs    = require("fs");
const URL   = require("url");
const path  = require("path");

console.log("Fetching ccurl dependencies...");;

var paths = ["ccurl", "ccurl/win64", "ccurl/lin64", "ccurl/mac"];

for (var i=0; i<paths.length; i++) {
  if (!fs.existsSync(paths[i])) {
    fs.mkdirSync(paths[i]);
  }
}

var req = https.get({"host"    : "api.github.com", 
                     "path"    : "/repos/iotaledger/ccurl/releases/latest",
                     "headers" : {"User-Agent": "IOTA Wallet"}}, function(res) {
  if (res.statusCode !== 200) {
    throw ("HTTP Error: " + response.statusCode);
  }

  var body = "";
  res.on("data", function(chunk) {
    body += chunk;
  });

  res.on("end", function() {
    try {
      var latestRelease = JSON.parse(body);

      var downloads = [];

      if (latestRelease.assets) {
        for (var i=0; i<latestRelease.assets.length; i++) {
          var asset = latestRelease.assets[i];

          if (asset.name == "libccurl.so") {
            downloads.push({"target": "lin64", "url": asset.browser_download_url, "filename": "libccurl.so"});
          } else if (asset.name == "ccurl.dll") {
            downloads.push({"target": "win64", "url": asset.browser_download_url, "filename": "libccurl.dll"});
          } else if (asset.name == "libccurl.dylib") {
            downloads.push({"target": "mac", "url": asset.browser_download_url, "filename": "libccurl.dylib"});
          }
        }
      }

      if (downloads.length != 3) {
        throw("Could not find ccurl dependencies.");
      }

      var downloaded = 0;

      for (var i=0; i<downloads.length; i++) {
        download(downloads[i].url, path.join("ccurl", downloads[i].target, downloads[i].filename), function(err) {
          if (err) {
            throw(err);
          } else {
            downloaded++;
            if (downloaded == 3) {
              console.log("All ccurl dependencies have been downloaded.");
            }
          }
        });
      }
    } catch (err) {
      throw(err);
    }
  });
}).on("error", function(err) {
  throw(err);
});

req.end();

var download = function(url, dest, cb) {
  var parsed = URL.parse(url);

  var file = fs.createWriteStream(dest);
  var req = https.get({"host"   : parsed.host, 
                       "path"   : parsed.path,
                       "headers": {"user-agent": "IOTA Wallet", "Accept": "application/octet-stream"}}, function(response) {
    response.pipe(file);
    file.on("finish", function() {
      file.close(cb);
    });
  }).on("error", function(err) {
    fs.unlink(dest);
    if (cb) cb(err.message);
  });

  req.end();
};