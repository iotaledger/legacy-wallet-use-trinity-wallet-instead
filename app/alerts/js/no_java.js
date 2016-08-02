const electron      = require("electron");
const fs            = require("fs");
const path          = require("path");
const childProcess  = require("child_process");

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

    /*
    document.getElementById("download-manually-btn").addEventListener("click", function(e) {
      if (UI.directDownloadLink) {
        electron.remote.shell.openExternal(UI.directDownloadLink);
        electron.remote.getCurrentWindow().close();
      }
    });*/
  }

  UI.show = function(title, contents, params) {
    // Only download immediately on windows.
    if (params && params.downloadImmediatelyIfWindows && process.platform == "win32") {
      document.getElementById("title").innerHTML = "Downloading Java...";
      document.getElementById("message").innerHTML = "Java is being downloaded. Please wait...";
      document.getElementById("footer").style.display = "none";
      document.getElementById("download-btn").click();

      electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10), false);
    } else {
      electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);
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

    electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);

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

                var regex = new RegExp("http:\/\/download\.oracle\.com\/otn\-pub\/java\/jdk\/[a-z0-9\-]+\/jre\-[a-z0-9\-]+" + regexFilename, "ig");

                var downloadUrl = body.match(regex);

                if (downloadUrl) {
                  downloadUrl = downloadUrl.pop();
                }

                if (!downloadUrl) {
                  downloadUrl = "http://download.oracle.com/otn-pub/java/jdk/8u92-b14/jre-8u92-" + filename;
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
                            UI.downloadJavaFailed("No response in 15 seconds.");
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
                          UI.updateMessage("Installing Java...", "Java is being installed, please wait...");
                          document.getElementById("java-download-progress-bar").style.width = "0%";
                          document.getElementById("java-download-progress-bar").className += " indeterminate";
                          electron.remote.getCurrentWindow().setProgressBar(1.1); //set progress bar to indeterminate

                          // Wait 500 ms before accessing file, it may still be writing to it. Should find a better way!
                          setTimeout(function() {
                            try {
                              console.log("Installing on windows...");
                              var child = childProcess.exec(UI.localDownloadLocation + " /s", function(error, stdout, stderr) {
                                if (error != null) {
                                  console.log("Error");
                                  console.log(error);
                                  UI.showMessageAndQuit("Installation Failed", "The installation has failed, please install manually. The setup filed is located at " + UI.localDownloadLocation + ".");
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
                              UI.showMessageAndQuit("Installation Failed", "The installation has failed, please install Java manually. The setup filed is located at " + UI.localDownloadLocation + ".");
                            }
                          }, 500);
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
                            UI.showMessageAndQuit("Java is Downloaded", "Java has been downloaded to " + UI.localDownloadLocation + " - please install it and reopen this app after installation.");
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
                    UI.downloadJavaFailed("Incorrect status code.");
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
          UI.downloadJavaFailed("Could not match regex.");
        }
      });
    }).on("error", function(err) {
      UI.downloadJavaFailed(err);
    });
  }

  UI.showMessageAndQuit = function(title, content) {
    electron.remote.getCurrentWindow().setProgressBar(-1); //remove progress bar
    document.getElementById("java-download-progress").style.display = "none";

    UI.updateMessage(title, content);

    var btns = document.getElementsByClassName("btn");
    for (var i=0; i<btns.length; i++) {
      btns[i].style.display = "none";
    }
    document.getElementById("quit-btn").style.display = "block";
    document.getElementById("quit-btn").innerHTML = "OK";
    document.getElementById("quit-btn").disabled = false;

    electron.remote.getCurrentWindow().setContentSize(600, parseInt(document.documentElement.scrollHeight, 10) + parseInt(document.getElementById("footer").scrollHeight, 10), false);
  }

  UI.updateMessage = function(title, content) {
    document.getElementById("title").innerHTML = title;
    document.getElementById("message").innerHTML = content;
  }

  UI.downloadJavaFailed = function(err) {
    console.log("Download java failed:");
    console.log(err);

    try {
      if (fs.existsSync(UI.localDownloadLocation)) {
        fs.unlinkSync(UI.localDownloadLocation);
      }
    } catch (err) {}

    if (UI.directDownloadLink) {
      UI.showMessageAndQuit("Download failed", "Please <a href='" + String(UI.directDownloadLink).escapeHTML() + "' target='_blank'>click here</a> to download and install java manually.");
    } else {
      UI.showMessageAndQuit("Download failed", "Please <a href='http://www.oracle.com/technetwork/java/javase/downloads/index.html' target='_blank'>click here</a> to download and install java manually (JRE version).");
    }
  }

  UI.relaunchApplication = function() {
    electron.ipcRenderer.send("relaunchApplication");
  }

  return UI;
}(UI || {}));

window.addEventListener("load", UI.initialize, false);

electron.ipcRenderer.on("show", function(event, title, msg, params) {
  UI.show(title, msg, params);
});