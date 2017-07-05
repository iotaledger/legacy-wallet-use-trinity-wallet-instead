const electron      = require("electron");
const fs            = require("fs");
const path          = require("path");
const childProcess  = require("child_process");

var isDevelopment = String(process.env.NODE_ENV).trim() === "development";
var resourcesDirectory = isDevelopment ? "../../" : "../../../";

var __entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

String.prototype.escapeHTML = function() {
  return String(this).replace(/[&<>"'\/]/g, function(s) {
    return __entityMap[s];
  });
}

var UI = (function(UI, undefined) {
  UI.isDebian              = false;
  UI.onQuit                = null;
  UI.directDownloadLink    = "";
  UI.localDownloadLocation = "";
  UI.is64BitOS             = false;

  UI.initialize = function() {
    if (process.platform == "win32") {
      UI.is64BitOS = process.arch == "x64" || process.env.PROCESSOR_ARCHITECTURE == "AMD64" || process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432");
    } else {
      UI.is64BitOS = process.arch == "x64";
    }

    console.log("Platform: " + process.platform + ", 64 bit OS: " + UI.is64BitOS);

    if (process.platform == "win32") {
      document.getElementById("message-win").style.display = "inline";
    } else if (process.platform == "darwin") {
      document.getElementById("message-mac").style.display = "inline";
    } else {
      try {
        UI.isDebian = fs.existsSync("/etc/debian_version");
      } catch (err) {}
      if (UI.isDebian) {
        document.getElementById("message-lin-default").style.display = "inline";
        document.getElementById("message-lin-apt-get").style.display = "inline";
      } else {
        try {
          var output = childProcess.execSync("which yum");
          process.stdout.write(output);
          output = output.toString();

          var noYum = output == "" || output.match(/no yum/i);
          if (!noYum) {
            document.getElementById("message-lin-default").style.display = "inline";
            document.getElementById("message-lin-yum").style.display = "inline";
          } else {
            document.getElementById("message-lin-alternative").style.display = "inline";
          }
        } catch (err) {
          document.getElementById("message-lin-alternative").style.display = "inline";
        }
      }
    }

    document.getElementById("download-btn").addEventListener("click", function(e) {
      var btns = document.getElementsByClassName("btn");
      for (var i=0; i<btns.length; i++) {
        btns[i].disabled = true;
      }
      UI.downloadJava();
    });

    document.getElementById("quit-btn").addEventListener("click", function(e) {
      if (UI.onQuit) {
        UI.onQuit();
      }
      electron.remote.getCurrentWindow().close();
    });

    document.getElementById("light-node-btn").addEventListener("click", function(e) {
      electron.ipcRenderer.send("showSetupWindow", {"section": "light-node"});
    });
  }

  UI.show = function(params) {
    // Only download immediately on windows.
    if (params && params.downloadImmediatelyIfWindows && process.platform == "win32") {
      UI.changeElementLanguage("title", "downloading_java");
      UI.changeElementLanguage("message", "java_being_downloaded");
      document.getElementById("footer").style.display = "none";
      document.getElementById("download-btn").click();
    }

    UI.updateContentSize();

    if (params && !params.java64BitsOK) {
      document.getElementById("message-64-bit").style.display = "inline";
    }

    document.body.addEventListener("contextmenu", UI.showContextMenu, false);

    setTimeout(function() {
      electron.remote.getCurrentWindow().show();
    }, 20);
  }

  UI.downloadJava = function() {
    var url    = require("url");
    var http   = require("http");
    var https  = require("https");

    document.getElementById("java-download-progress").style.display = "block";

    UI.updateContentSize();

    document.getElementById("java-download-progress").style.visibility = "visible";
  //  document.getElementById("java-download-progress").style.opacity = "0";
    document.getElementById("java-download-progress").className = "progress-wrap progress fadein";
    document.getElementById("java-download-progress-bar").style.width = "1%";

    electron.remote.getCurrentWindow().setProgressBar(0.01);

    var mainPageReq = http.get("http://www.oracle.com/technetwork/java/javase/downloads/index.html", function(res) {
      var body = "";

      res.on("data", function(chunk) {
        body += chunk;
      }).on("end", function() {
        mainPageReq.end();

        document.getElementById("java-download-progress-bar").style.width = "2%";
        electron.remote.getCurrentWindow().setProgressBar(0.02);

        var regex = new RegExp("/technetwork\/java\/javase\/downloads\/jre[0-9]+\-downloads\-[0-9]+\.html", "i");

        var jreUrl = body.match(regex);
          
        if (jreUrl && jreUrl[0]) {
          var downloadPageUrl = "http://www.oracle.com" + jreUrl[0];

         //downloadPageUrl = "http://www.google.com/";

          setTimeout(function() {
            var downloadPageReq = http.get(downloadPageUrl, function(res) {
              var body = "";

              res.on("data", function(chunk) {
                body += chunk;
              }).on("end", function() {
                document.getElementById("java-download-progress-bar").style.width = "4%";
                electron.remote.getCurrentWindow().setProgressBar(0.04);

                var filename, regexFilename, extension;

                switch (process.platform) {
                  case "win32":
                    if (!UI.is64BitOS) {
                      filename = "windows-i586.exe";
                      regexFilename = "windows\-i586\.exe";
                      extension = "exe";
                    } else {
                      filename = "windows-x64.exe";
                      regexFilename = "windows\-x64\.exe";
                      extension = "exe";
                    }
                    break;
                  case "darwin":
                    filename = "macosx-x64.dmg";
                    regexFilename = "macosx\-x64\.dmg";
                    extension = "dmg";
                    break;
                  case "linux":
                    if (UI.isDebian) {
                      if (!UI.is64BitOS) {
                        filename = "linux-i586.tar.gz";
                        regexFilename = "linux\-i586\.tar\.gz";
                        extension = "tar.gz";
                      } else {
                        filename = "linux-x64.tar.gz";
                        regexFilename = "linux\-x64\.tar\.gz";
                        extension = "tar.gz";
                      }
                    } else {
                      if (!UI.is64BitOS) {
                        filename = "linux-i586.rpm";
                        regexFilename = "linux\-i586\.rpm";
                        extension = "rpm";
                      } else {
                        filename = "linux-x64.rpm";
                        regexFilename = "linux\-x64\.rpm";
                        extension = "rpm";
                      }
                    }
                    break;
                }

                var regex = new RegExp("http:\/\/download\.oracle\.com\/otn\-pub\/java\/jdk\/[a-z0-9\-]+\/[a-z0-9]+\/jre\-[a-z0-9\-]+" + regexFilename, "ig");

                var downloadUrl = body.match(regex);

                if (downloadUrl) {
                  downloadUrl = downloadUrl.pop();
                }

                console.log("Download URL: " + downloadUrl);

                if (!downloadUrl) {
                  UI.downloadJavaFailed("Could not find java download URL.");
                  return;
                }
   
                downloadUrl = downloadUrl.replace(/http:\/\//i, "https://");
                downloadUrl = downloadUrl.replace(/download\.oracle\.com/i, "edelivery.oracle.com/osdc-otn");

                var downloadUrlParts = url.parse(downloadUrl);

                var options = {
                  hostname: downloadUrlParts.hostname,
                  path: downloadUrlParts.path,
                  port: 443,
                  method: "GET",
                  rejectUnauthorized: false,
                  headers: {
                    "Host": "edelivery.oracle.com",
                    "User-Agent": "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:46.0) Gecko/20100101 Firefox/46.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip,deflate",
                    "DNT": "1",
                    "Referer": downloadPageUrl,
                    "Cookie": "s_nr=" + new Date().getTime() + "; notice_preferences=2:cb8350a2759273dccf1e483791e6f8fd; s_cc=true; gpw_e24=" + encodeURIComponent(downloadPageUrl) + "; s_sq=%5B%5BB%5D%5D; oraclelicense=accept-securebackup-cookie",
                    "Connection": "keep-alive"
                  }
                };

                var fileReq = https.request(options, function(res) {
                  if (res.statusCode == 302 && res.headers.location) {
                    UI.directDownloadLink = res.headers.location;

                    downloadUrlParts = url.parse(res.headers.location);

                    options.hostname = downloadUrlParts.hostname;
                    options.port = 443;
                    options.path = downloadUrlParts.path;
                    options.headers["Host"] = downloadUrlParts.hostname;

                    UI.localDownloadLocation = path.join(electron.remote.app.getPath("downloads"), "iota-java-install." + extension);

                    try {
                      if (fs.existsSync(UI.localDownloadLocation)) {
                        fs.unlinkSync(UI.localDownloadLocation);
                      }
                    } catch (err) {}

                    var downloadReq = https.request(options, function(res) {
                      var len = parseInt(res.headers["content-length"], 10);
                      var cur = 0;
                      var total = len / 1048576; //bytes in 1 MB

                      if (total < 5) {
                        UI.downloadJavaFailed("Total < 5");
                        return;
                      }

                      var percentDownloaded = 0;
                      var isEnded = false;
                      var checkDownload;

                      /*
                      var checkDownload = setTimeout(function() {
                        if (!isEnded && percentDownloaded < 3) {
                          isEnded = true;
                          res.destroy();
                          out.destroy();
                          UI.downloadJavaFailed();
                        } else {
                          checkDownload = setTimeout(function() {
                            if (!isEnded && percentDownloaded < 6) {
                              isEnded = true;
                              res.destroy();
                              out.destroy();
                              UI.downloadJavaFailed();
                            }
                          }, 25000);
                        }
                      }, 25000);
                      */

                      var out = fs.createWriteStream(UI.localDownloadLocation);

                      res.pipe(out);

                      res.on("data", function(chunk) {
                        cur += chunk.length;
                        percentDownloaded =  (100.0 * cur / len).toFixed(2);
                        if (percentDownloaded >= 5) {
                          electron.remote.getCurrentWindow().setProgressBar(percentDownloaded / 100);
                          document.getElementById("java-download-progress-bar").style.width = percentDownloaded + "%";
                        }
                        // If no response in 15 seconds, consider it failed.
                        clearTimeout(checkDownload);
                        checkDownload = setTimeout(function() {
                          if (!isEnded) {
                            isEnded = true;
                            res.destroy();
                            out.destroy();
                            UI.downloadJavaFailed(UI.t("no_response_15s"));
                          }
                        }, 15000);
                      }).on("end", function() {
                        console.log("Download ended.");

                        if (isEnded) {
                          return;
                        }

                        isEnded = true;

                        if (checkDownload) {
                          clearTimeout(checkDownload);
                        }

                        if (process.platform == "win32") {
                          //do silent install
                          UI.updateMessage("installing_java", "java_being_installed");
                          document.getElementById("java-download-progress-bar").style.width = "0%";
                          document.getElementById("java-download-progress-bar").className += " indeterminate";
                          electron.remote.getCurrentWindow().setProgressBar(1.1); //set progress bar to indeterminate

                          // Wait 2.5 sec before accessing file, it may still be writing to it. Should find a better way!
                          setTimeout(function() {
                            try {
                              console.log("Installing on windows...");
                              var child = childProcess.exec(UI.localDownloadLocation + " /s", function(error, stdout, stderr) {
                                if (error != null) {
                                  console.log("Error");
                                  console.log(error);
                                  UI.showMessageAndQuit("installation_failed", "installation_failed_install_manually", {"location": UI.localDownloadLocation});
                                } else {
                                  console.log("Installed OK.");
                                  //ok, it's installed
                                  child.kill();

                                  try {
                                    fs.unlinkSync(UI.localDownloadLocation);
                                  } catch (err) {}

                                  UI.relaunchApplication();
                                }
                              });
                            } catch (err) {
                              console.log("Error");
                              console.log(err);
                              UI.showMessageAndQuit("installation_failed", "installation_failed_install_manually", {"location": UI.localDownloadLocation});
                            }
                          }, 2500);
                        } else if (process.platform == "darwin") {
                          electron.remote.getCurrentWindow().setProgressBar(-1); //remove progress bar
                          electron.remote.shell.openItem(UI.localDownloadLocation);
                          setTimeout(function() {
                            electron.remote.getCurrentWindow().close();
                          }, 2000);
                        } else {
                          if (UI.isDebian) {
                            //add settimeout to prevent errors with tar too soon.. i guess
                            setTimeout(function() {
                              try {
                                var javaDirectory = path.join(electron.remote.app.getPath("appData"), "IOTA Wallet" + path.sep + "java");

                                if (!fs.existsSync(javaDirectory)) {
                                  fs.mkdirSync(javaDirectory);
                                }

                                console.log("tar -xvzf '" + UI.localDownloadLocation + "' -C '" + javaDirectory + "' --strip-components=1");

                                var output = childProcess.execSync("tar -xvzf '" + UI.localDownloadLocation + "' -C '" + javaDirectory + "' --strip-components=1");

                                process.stdout.write(output);
                                output = output.toString();

                                try {
                                  fs.unlinkSync(UI.localDownloadLocation);
                                } catch (err) {}

                                UI.relaunchApplication();
                              } catch (err) {
                                UI.downloadJavaFailed(err);
                              }
                            }, 500);
                          } else {
                            UI.showMessageAndQuit("java_downloaded", "java_downloaded_please_install", {"location": UI.localDownloadLocation});
                            UI.onQuit = function() {
                              electron.remote.shell.showItemInFolder(UI.localDownloadLocation);
                            };
                          }
                        }
                      }).on("error", function(err) {
                        isEnded = true;
                        if (checkDownload) {
                          clearTimeout(checkDownload);
                        }
                        UI.downloadJavaFailed(err);
                      });
                    }).on("error", function(err) {
                      isEnded = true;
                      if (checkDownload) {  
                        clearTimeout(checkDownload);
                      }
                      UI.downloadJavaFailed(err);
                    });

                    downloadReq.end();
                  } else {
                    UI.downloadJavaFailed(UI.t("incorrect_status_code"));
                  }
                }).on("error", function(err) {
                  UI.downloadJavaFailed(err);
                });

                fileReq.end();
              });
            }).on("error", function(err) {
              UI.downloadJavaFailed(err);
            });
          }, 100);
        } else {
          UI.downloadJavaFailed(UI.t("could_not_match_regex"));
        }
      });
    }).on("error", function(err) {
      UI.downloadJavaFailed(err);
    });
  }

  UI.showMessageAndQuit = function(title, content, options) {
    electron.remote.getCurrentWindow().setProgressBar(-1); //remove progress bar
    document.getElementById("java-download-progress").style.display = "none";

    UI.updateMessage(title, content, options);

    var btns = document.getElementsByClassName("btn");
    for (var i=0; i<btns.length; i++) {
      btns[i].style.display = "none";
    }
    document.getElementById("quit-btn").style.display = "block";
    document.getElementById("quit-btn").innerHTML = "OK";
    document.getElementById("quit-btn").disabled = false;

    UI.updateContentSize();
  }

  UI.updateMessage = function(title, content, options) {
    UI.changeElementLanguage("title", title, options);
    UI.changeElementLanguage("message", content, options);
  }

  UI.downloadJavaFailed = function(err) {
    console.log("Download java failed:");
    console.log(err);

    try {
      if (fs.existsSync(UI.localDownloadLocation)) {
        fs.unlinkSync(UI.localDownloadLocation);
      }
    } catch (err) {}

    /*
    if (UI.directDownloadLink) {
      UI.showMessageAndQuit("download_failed", "[html]download_java_manually", {url: UI.directDownloadLink});
    } else {
      UI.showMessageAndQuit("download_failed", "[html]download_java_jre_manually");
    }*/

    //For now just show the normal download location, as UI.directDownloadLink may fail also..


    UI.showMessageAndQuit("download_failed", "download_java_jre_manually");

    var html = document.getElementById("message").innerHTML;

    html = html.replace(/\*\*([^\*]+)\*\*/, '<a href="http://www.oracle.com/technetwork/java/javase/downloads/index.html" target="_blank">$1</a>', html);

    document.getElementById("message").innerHTML = html;

    var aTags = document.getElementById("message").getElementsByTagName("a");
    for (var i = 0; i < aTags.length; i++) {
      aTags[i].onclick = function(e) {
        electron.remote.shell.openExternal(e.target.href);
        electron.remote.getCurrentWindow().close();
        return false;
      }
    }
  }

  UI.relaunchApplication = function() {
    electron.ipcRenderer.send("relaunchApplication");
  }

  UI.updateContentSize = function() {
    //if (params && params.downloadImmediatelyIfWindows && process.platform == "win32") {
    //  electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10), false);
    //} else {
      electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);
    //}
  }

  UI.makeMultilingual = function(currentLanguage, callback) {
    i18n = i18next
      .use(window.i18nextXHRBackend)
      .init({
        lng: currentLanguage,
        fallbackLng: "en",
        backend: {
          loadPath: path.join(resourcesDirectory, "locales", "{{lng}}", "{{ns}}.json")
        },
        debug: false
    }, function(err, t) {
      updateUI();
      callback();
    });
  }

  UI.t = function(message, options) {
    if (message.match(/^[a-z\_]+$/i)) {
      return UI.format(i18n.t(message, options));
    } else {
      return UI.format(message);
    }
  }

  UI.format = function(text) {
    return String(text).escapeHTML();
  }

  UI.changeLanguage = function(language, callback) {
    i18n.changeLanguage(language, function(err, t) {
      updateUI();
      if (callback) {
        callback();
      }
    });
  }

  UI.changeElementLanguage = function(el, key) {
    document.getElementById(el).innerHTML = UI.t(key);
    document.getElementById(el).setAttribute("data-i18n", key.match(/^[a-z\_]+$/i ? key : ""));
  }

  function updateUI() {
    var i18nList = document.querySelectorAll('[data-i18n]');
    i18nList.forEach(function(v){
      if (v.dataset.i18n) {
        v.innerHTML = UI.t(v.dataset.i18n, v.dataset.i18nOptions);
      }
    });
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, params) {
  UI.makeMultilingual(params.language, function() {
    UI.show(params);
  });
});

electron.ipcRenderer.on("changeLanguage", function(event, language) {
  UI.changeLanguage(language, function() {
    UI.updateContentSize();
  });
});