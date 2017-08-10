const electron         = require("electron");
const fs               = require("fs-extra");
const path             = require("path");
const childProcess     = require("child_process");
const autoUpdater      = electron.autoUpdater;
const powerSaveBlocker = electron.powerSaveBlocker;
const shell            = electron.shell;
const clipboard        = electron.clipboard;
const pusage           = require("pidusage");
const i18n             = require("i18next");
const i18nBackend      = require("i18next-sync-fs-backend");
const https            = require("https");

global.i18n            = i18n;

let win;
let otherWin;
let loadingWin;
let server;
let powerSaver = -1;
let cpuTrackInterval;

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

Array.prototype.unique = function(a){
    return function(){ return this.filter(a) }
}(function(a,b,c){ return c.indexOf(a,b+1) < 0 });

var App = (function(App, undefined) {
  var isStarted                 = false;
  var appDirectory              = "";
  var appDataDirectory          = "";
  var resourcesDirectory        = "";
  var databaseDirectory         = "";
  var jarDirectory              = "";
  var javaLocations             = [];
  var selectedJavaLocation;
  var currentLocationTest       = 0;
  var nodeInitializationError   = false;
  var serverOutput              = [];
  var doNotQuit                 = false;
  var callback                  = null;
  var isClosing                 = false;
  var isClosed                  = false;
  var didKillNode               = false;
  var settings                  = {};
  var isDevelopment             = String(process.env.NODE_ENV).trim() === "development";
  var isDebug                   = process.argv.indexOf("debug") !== -1;
  var didCheckForUpdates        = false;
  var appVersion                = require("../../package.json").version;
  var isLookingAtServerLog      = false;
  var is64BitOS                 = 64;
  var rendererPid               = null;

  var launchURL                 = null;
  var iriVersion                = "";
  var lastError                 = "";

  var isTestNet                 = String(appVersion).match(/\-testnet$/) !== null;

  App.uiIsReady                 = false;
  App.uiIsInitialized           = false;
  App.doNodeStarted             = false;

  var minWeightMagnitudeMinimum = (isTestNet ? 9 : 15);
  var deleteDb                  = false;
  var deleteAnyways             = false;
  var isFullScreen              = false;

  App.initialize = function() {
    App.loadEnvironment();
 
    if (process.platform == "darwin") {
      var appPath = electron.app.getPath("exe");
      if (process.execPath.match(/\/Volumes\/IOTA Wallet/i)) {
        App.showWindow("mac_volume.html");
        return;
      }
    }

    // https://github.com/electron/electron/issues/6044#issuecomment-226061244
    if (process.platform == "win32") {
      is64BitOS = process.arch == "x64" || process.env.PROCESSOR_ARCHITECTURE == "AMD64" || process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432");
    } else {
      is64BitOS = process.arch == "x64";
    }

    App.checkLaunchURL();

    App.showDefaultWindow();

    App.registerProtocol();

    if (process.platform == "win32" && !is64BitOS) {
      App.showAlertAndQuit("not_supported", "windows_32_bit_unsupported");
      return;
    }

    App.start();
  }

  App.quit = function() {
    electron.app.quit();
  }

  App.loadSettings = function() {
    try {
      var settingsFile = path.join(appDataDirectory, "settings.json");

      if (fs.existsSync(settingsFile)) {
        settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
      } else {
        settings = {};
      }

      if (!settings.hasOwnProperty("language")) {
        settings.language = "en";
      }
      if (!settings.hasOwnProperty("version")) {
          // If no version defined yet or it's the first run
          // Delete the iri folder anyways
          deleteAnyways = true;
          settings.version = appVersion;
      }
      if (!settings.hasOwnProperty("bounds") || typeof(settings.bounds) != "object" || !settings.bounds.width || !settings.bounds.height) {
        settings.bounds = {width: 520, height: 780};
      }
      if (!settings.hasOwnProperty("lightWallet")) {
        settings.lightWallet = -1;
      }
      if (!settings.hasOwnProperty("checkForUpdates")) {
        settings.checkForUpdates = 1;
      }
      if (!settings.hasOwnProperty("lastUpdateCheck")) {
        settings.lastUpdateCheck = 0;
      }
      if (!settings.hasOwnProperty("showStatusBar")) {
        settings.showStatusBar = 1;
      }
      if (!settings.hasOwnProperty("isFirstRun")) {
        settings.isFirstRun = 1;
      }
      if (!settings.hasOwnProperty("port")) {
        settings.port = (isTestNet ? 14900 : 14265);
      }
      if (!settings.hasOwnProperty("udpReceiverPort") || settings.udpReceiverPort == 0) {
        settings.udpReceiverPort = 14600;
      }
      if (!settings.hasOwnProperty("tcpReceiverPort") || settings.tcpReceiverPort == 0) {
        settings.tcpReceiverPort = 15600;
      }
      if (!settings.hasOwnProperty("sendLimit")) {
        settings.sendLimit = 0;
      }
      if (!settings.hasOwnProperty("depth")) {
        settings.depth = 3;
      }
      if (!settings.hasOwnProperty("minWeightMagnitude")) {
        settings.minWeightMagnitude = minWeightMagnitudeMinimum;
      } else if (settings.minWeightMagnitude < minWeightMagnitudeMinimum) {
        settings.minWeightMagnitude = minWeightMagnitudeMinimum;
      }
      if (!settings.hasOwnProperty("nodes") || typeof settings.nodes != "object") {
        settings.nodes = [];
      }
      if (!settings.hasOwnProperty("dbLocation") || (settings.dbLocation && !fs.existsSync(settings.dbLocation))) {
        settings.dbLocation = "";
      }
      if (!settings.hasOwnProperty("allowShortSeedLogin")) {
        settings.allowShortSeedLogin = 0;
      }
      if (!settings.hasOwnProperty("keccak")) {
        settings.keccak = 0;
      }
    } catch (err) {
      console.log("Error reading settings:");
      console.log(err);
      settings = {bounds: {width: 520, height: 780}, checkForUpdates: 1, lastUpdateCheck: 0, showStatusBar: 0, isFirstRun: 1, port: (isTestNet ? 14900 : 14265), udpReceiverPort: 14600, tcpReceiverPort: 15600, sendLimit: 0, nodes: [], dbLocation: "", allowShortSeedLogin: 0, keccak: 0};
    }

    try {
      if (electron.screen) {
        var displaySize = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()).workAreaSize;

        if (displaySize.width < settings.bounds.width + 100 || displaySize.height < settings.bounds.height+100) {
          settings.bounds.height = displaySize.height - 100;
          settings.bounds.width = Math.round(settings.bounds.height / 16 * 11);
        }

        if (settings.bounds.hasOwnProperty("x") && settings.bounds.hasOwnProperty("y")) {
          if (settings.bounds.x > displaySize.width || settings.bounds.y > displaySize.height) {
            delete settings.bounds.x;
            delete settings.bounds.y;
          }
        }
      }
    } catch (err) {
      settings.bounds = {width: 520, height: 780};
    }
  }

  App.saveSettings = function() {
    if (!appDataDirectory) {
      return;
    }

    try {
      if (App.windowIsReady() && !win.isFullScreen()) {
        settings.bounds = win.getBounds();
      }

      if (selectedJavaLocation) {
        settings.javaLocation = selectedJavaLocation;
      } else {
        settings.javaLocation = "";
      }

      settings.isFirstRun = 0;

      var settingsFile = path.join(appDataDirectory, "settings.json");

      fs.writeFileSync(settingsFile, JSON.stringify(settings));
    } catch (err) {
      console.log("Error writing settings:");
      console.log(err);
    }
  }

  App.checkLaunchURL = function() {
    if (process.argv.length == 1 || process.argv.indexOf("--dev") != -1) {
      return;
    } else {
      // Disable for now
      return;
      // Ignore first argument
      for (var i=1; i<process.argv.length; i++) {
        if (/^iota:\/\//i.test(process.argv[i])) {
          launchURL = process.argv[i];
          console.log("Launch URL: " + launchURL);
          break;
        }
      }
    }
  }

  App.registerProtocol = function() {
    // Disable for now
    return;

    if (!electron.app.isDefaultProtocolClient("iota")) {
      console.log("Register iota as a default protocol");
      electron.app.setAsDefaultProtocolClient("iota"); //not linux
    }
  }

  App.autoUpdate = function() {
    //Auto update is disabled for now.
    return;

    if (isDevelopment || process.platform == "linux") {
      return;
    }

    autoUpdater.addListener("update-available", function(event) {
      if (didCheckForUpdates) {
        App.showUpdateAvailable();
      }
    });

    autoUpdater.addListener("update-downloaded", function(event, releaseNotes, releaseName, releaseDate, updateURL) {
      App.showUpdateDownloaded(releaseNotes, releaseName, releaseDate);
    });

    autoUpdater.addListener("error", function(error) {
      if (didCheckForUpdates) {
        App.showUpdateError(error);
      }
    });

    //We don't need to show this
    /*
    autoUpdater.addListener("checking-for-update", function(event) {
      if (didCheckForUpdates) {
        App.showCheckingForUpdate();
      }
    });*/

    autoUpdater.addListener("update-not-available", function(event) {
      if (didCheckForUpdates) {
        App.showUpdateNotAvailable();
      }
    });

    if (process.platform == "darwin") {
      var feedURL = "https://iota.org/latest-osx.php?v=" + appVersion;
    } else {
      var feedURL = "https://iota.org/latest-win.php?v=" + appVersion + "&arch=" + (is64BitOS ? "64" : "32");
    }

    autoUpdater.setFeedURL(feedURL);

    if (settings.checkForUpdates == 0) {
      return;
    } else if (settings.checkForUpdates == 1) {
      App.checkForUpdates();
    } else {
      if (settings.hasOwnProperty("lastUpdateCheck")) {
        var lastUpdateCheck = settings.lastUpdateCheck;
        if (settings.checkForUpdates == 2) {
          // Daily
          if (new Date().getTime() - lastUpdateCheck > 86400000) {
            App.checkForUpdates();
          }
        } else if (settings.checkForUpdates == 3) {
          // Weekly
          if (new Date().getTime() - lastUpdateCheck > 86400000 * 7) {
            App.checkForUpdates();
          }
        }
      } else {
        App.checkForUpdates();
      }
    }
  }

  App.checkForUpdates = function(manual) {
    if (manual) {
      didCheckForUpdates = true;
    }

    if (isDevelopment || process.platform == "linux") {
      return;
    }

    autoUpdater.checkForUpdates();
    settings.lastUpdateCheck = new Date().getTime();
  }

  App.installUpdate = function() {
    autoUpdater.quitAndInstall();
  }

  App.showDefaultWindow = function() {
    if (loadingWin) {
      loadingWin.hide();
      loadingWin.destroy();
      loadingWin = null;
    }

    if (otherWin) {
      otherWin.hide();
      otherWin.destroy();
      otherWin = null;
    }

    App.uiIsInitialized = false;
    App.uiIsReady = false;

    if (!win) {
      var windowOptions = {"width"           : settings.bounds.width,
                           "height"          : settings.bounds.height,
                           "minWidth"        : 375,
                           "minHeight"       : 546,
                           "maxWidth"        : 825,
                           "maxHeight"       : 1200,
                           "backgroundColor" : "#4DC1B5",
                           "center"          : true,
                           "show"            : false,
                           "fullscreenable"  : process.platform != "win32"};

      if (settings.bounds.width < windowOptions.minWidth) {
        settings.bounds.width = windowOptions.minWidth;
      } else if (settings.bounds.width > windowOptions.maxWidth) {
        settings.bounds.width = windowOptions.maxWidth;
      }

      if (settings.bounds.height < windowOptions.minHeight) {
        settings.bounds.height = windowOptions.minHeight;
      } else if (settings.bounds.height > windowOptions.maxHeight) {
        settings.bounds.height = windowOptions.maxHeight;
      }

      if (settings.bounds.hasOwnProperty("x") && settings.bounds.hasOwnProperty("y")) {
        windowOptions.x = settings.bounds.x;
        windowOptions.y = settings.bounds.y;
      }

      win = new electron.BrowserWindow(windowOptions);
      if (isDebug) {
        win.toggleDevTools({mode: "undocked"});
      }
      win.setAspectRatio(11 / 16);

      win.on("close", function(e) {
        if (win.webContents) {
          win.webContents.send("shutdown");

          if (win.webContents.isDevToolsOpened()) {
            win.webContents.closeDevTools();
          }
        }

        if (isClosed) {
          return;
        } else if (isClosing) {
          e.preventDefault();
          return;
        } else {
          e.preventDefault();
        }

        isClosing   = true;
        doNotQuit   = true;

        App.saveSettings();

        App.killNode(function() {
          isClosed = true;
          electron.app.quit();
        });
      });

      win.on("closed", function () {
        win = null;
      });

      win.on("enter-full-screen", function() {
        isFullScreen = true;
        App.createMenuBar();
      });

      win.on("leave-full-screen", function() {
        isFullScreen = false;
        App.createMenuBar();
      });

      var handleRedirect = function(e, url) {
        if (url != win.webContents.getURL()) {
          e.preventDefault();
          shell.openExternal(url);
        }
      }

      win.webContents.on("new-window", handleRedirect);
      win.webContents.on("will-navigate", handleRedirect);
    }

    win.loadURL("file://" + appDirectory.replace(path.sep, "/") + "/index.html?showStatus=" + settings.showStatusBar + "&isFirstRun=" + settings.isFirstRun + "&lightWallet=" + settings.lightWallet + "&isDebug=" + (isDebug ? "1" : "0"));

    win.webContents.once("did-finish-load", function() {
      App.updateTitle(true);
    });

    App.createMenuBar();
  }

  App.createMenuBar = function(simple) {
    var template = [];

    template.push(
    {
      label: App.t("edit"),
      submenu: [
        {
          label: App.t("undo"),
          accelerator: "CmdOrCtrl+Z",
          role: "undo"
        },
        {
          label: App.t("redo"),
          accelerator: "Shift+CmdOrCtrl+Z",
          role: "redo"
        },
        {
          type: "separator"
        },
        {
          label: App.t("cut"),
          accelerator: "CmdOrCtrl+X",
          role: "cut"
        },
        {
          label: App.t("copy"),
          accelerator: "CmdOrCtrl+C",
          role: "copy"
        },
        {
          label: App.t("paste"),
          accelerator: "CmdOrCtrl+V",
          role: "paste"
        },
        {
          label: App.t("select_all"),
          accelerator: "CmdOrCtrl+A",
          role: "selectall"
        },
      ]
    });

    template.push(
    {
      label: App.t("view"),
      submenu: [
        {
          label: (settings.showStatusBar ? App.t("hide_status_bar") : App.t("show_status_bar")),
          accelerator: "CmdOrCtrl+/",
          click() {
            App.toggleStatusBar();
          }
        },
        {
          label: App.t("toggle_web_inspector"),
          accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
          click() {
            if (otherWin) {
              otherWin.toggleDevTools({mode: "undocked"});
            } else if (App.uiIsReady) {
              win.webContents.send("toggleDeveloperTools");
            }
          }
        },
        {
          label: (isFullScreen ? App.t("exit_full_screen") : App.t("enter_full_screen")),
          accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
          click() {
            App.toggleFullScreen();
          },
        },
        {
          label: App.t("change_language"),
          submenu: []
        }
      ]
    });

    var languages = [["de", App.t("german"), "Deutsch"], 
                     ["el", App.t("greek"), "Ελληνικά"], 
                     ["en", App.t("english"), "English"], 
                     ["es-ES", App.t("spanish"), "Español"], 
                     ["fr", App.t("french"), "Français"], 
                     ["it", App.t("italian"), "Italiano"], 
                     ["ja", App.t("japanese"), "日本語"],
                     ["ko", App.t("korean"), "한국어"],
                     ["nl", App.t("dutch"), "Nederlands"], 
                     ["pt-PT", App.t("portugese"), "Português"], 
                     ["ru", App.t("russian"), "Русский"], 
                     ["sv-SE", App.t("swedish"), "Svenska"], 
                     ["tr", App.t("turkish"), "Türkçe"], 
                     ["zh-CN", App.t("chinese_simplified"), "中文（简体)"],
                     ["zh-TW", App.t("chinese_traditional"), "中文 (繁體)"]];

    languages.sort(function(a, b) {
      if (a[0] == settings.language) {
        return -1;
      } else if (b[0] == settings.language) {
        return 1;
      } else {
        return a[1].localeCompare(b[1], settings.language);
      }
    });

    for (var i=0; i<languages.length; i++) {
      var shortCode          = languages[i][0];
      var translatedLanguage = languages[i][1].trim();
      var originalLanguage   = languages[i][2].trim();

      template[1].submenu[3].submenu.push({
        label: (translatedLanguage != originalLanguage ? translatedLanguage + " - " + originalLanguage : translatedLanguage),
        click(item) {
          App.changeLanguage(item.id.replace("language-", ""));
        },
        id: "language-" + shortCode,
        type: "checkbox",
        checked: settings.language == shortCode
      });
    }

    if (simple) {
      template[1].submenu.splice(0, 1);
      template[1].submenu.splice(1, 1);
    } else {
      if (process.platform == "win32") {
        template[1].submenu.splice(2, 1);
      }

      template.push(
      {
        label: App.t("tools"),
        submenu: [
          {
            label: App.t("view_node_info"),
            accelerator: "CmdOrCtrl+I",
            click(item) {
              App.showNodeInfo();
            }
          },
          {
            label: App.t("view_neighbors"),
            click(item) {
              App.showPeers();
            }
          },
          {
            label: App.t("view_server_log"),
            accelerator: "CmdOrCtrl+L",
            click(item) {
              App.showServerLog();
            }
          },
          {
            type: "separator"
          },
          {
            label: App.t("paste_trytes"),
            click(item) {
              App.pasteTrytes();
            }
          },
          {
            label: App.t("transition"),
            click(item) {
              App.showTransition();
            }
          },
          {
            label: App.t("network_spammer"),
            click(item) {
              App.showNetworkSpammer();
            }
          },
          {
            type: "separator"
          },
          {
            label: App.t("open_database_folder"),
            //accelerator: "CmdOrCtrl+I",
            click(item) {
              App.openDatabaseFolder();
            }
          },
          {
            label: App.t("edit_node_configuration"),
            //accelerator: "CmdOrCtrl+E",
            click(item) {
              App.editNodeConfiguration();
            }
          },
          {
            label: App.t("edit_neighbors"),
            //accelerator: "CmdOrCtrl+E",
            click(item) {
              App.editNeighbors();
            }
          },
          {
            type: "separator"
          },
          {
            label: App.t("options"),
            accelerator: "CmdOrCtrl+O",
            click() {
              App.showPreferences();
            }
          },
          {
            type: "separator",
          },
          {
            label: App.t("switch_to_light_node"),
            click() {
              App.switchNodeType();
            }
          }
        ]
      });

      if (settings.lightWallet == 1) {
        template[2].submenu[14].label = App.t("switch_to_full_node");
        // Remove "view neighbors and view server log" options.
        template[2].submenu.splice(1, 3);
        // Remove "network spammer and open database folder" options.
        template[2].submenu.splice(3, 3);
        // Remove "edit neighbors" option.
        template[2].submenu.splice(4, 1);
        if (process.platform == "darwin") {
          // Remove options from mac platforms
          template[2].submenu.splice(5, 2);
        }
      } else {
        if (settings.lightWallet == -1) {
          //remove the switch to light / full node link
          template[2].submenu.splice(12, 2);
        }
        if (process.platform == "darwin") {
          // Remove options from mac platform
          template[2].submenu.splice(10, 2);
        }
      }
    }

    template.push(
    {
      label: App.t("window"),
      role: "window",
      submenu: [
        {
          label: App.t("minimize"),
          accelerator: "CmdOrCtrl+M",
          role: "minimize"
        },
        {
          label: App.t("close"),
          accelerator: "CmdOrCtrl+W",
          role: "close"
        },
      ]
    });

    template.push(
    {
      label: App.t("help"),
      role: "help",
      submenu: [
        {
          label: App.t("faq"),
          click() {
            App.showFAQ();
          }
        },
        {
          label: App.t("official_website"),
          click() { shell.openExternal("https://iota.org/"); }
        },
        {
          label: App.t("forum"),
          click() { shell.openExternal("https://forum.iota.org/"); }
        },
        {
          label: App.t("chat"),
          click() { shell.openExternal("https://slack.iota.org/"); }
        },
        {
          label: App.t("documentation"),
          click() { shell.openExternal("https://iota.readme.io/docs"); }
        },
        {
          label: App.t("submit_bug_report"),
          click() { shell.openExternal("https://github.com/iotaledger/wallet/issues"); }
        }
      ]
    });

    if (simple) {
      //remove FAQ
      template[2].submenu.splice(0, 1);
    }

    if (process.platform === "darwin") {
      const name = App.format(electron.app.getName());
      template.unshift({
        label: name,
        submenu: [
          {
            label: App.t("about") + " " + name,
            role: "about"
          },/*
          {
            label: "Check for Updates...",
            click() {
              App.checkForUpdates(true);
            }
          },*/
          {
            type: "separator"
          },
          {
            label: App.t("preferences"),
            accelerator: "Command+,",
            click() {
              App.showPreferences();
            }
          },
          {
            type: "separator"
          },
          {
            label: App.t("services"),
            role: "services",
            submenu: []
          },
          {
            type: "separator"
          },
          {
            label: App.t("hide") + " " + name,
            accelerator: "Command+H",
            role: "hide"
          },
          {
            label: App.t("hide_others"),
            accelerator: "Command+Alt+H",
            role: "hideothers"
          },
          {
            label: App.t("show_all"),
            role: "unhide"
          },
          {
            type: "separator"
          },
          {
            label: App.t("quit"),
            accelerator: "Command+Q",
            click() { electron.app.quit(); }
          },
        ]
      });

      if (simple) {
        template[0].submenu.splice(1, 2);
      }

      // Window menu.
      template[!simple ? 4 : 2].submenu.push(
        {
          type: "separator"
        },
        {
          label: App.t("bring_all_to_front"),
          role: "front"
        }
      );

      /*
      if (isDevelopment) {
        // Remove check for updates
        template[0].submenu.splice(1, 1);
      }*/
    } else if (process.platform == "win32") {
      if (!isDevelopment) {
        /*
        template[4].submenu.push(
        {
          type: "separator"
        },
        {
          label: "Check for Updates...",
          click() {
            App.checkForUpdates(true);
          }
        });*/
      }
    }

    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template));
  }

  App.loadEnvironment = function() {
    appDirectory = path.dirname(__dirname);

    resourcesDirectory = path.dirname(appDirectory);

    if (!isDevelopment) {
      resourcesDirectory = path.dirname(resourcesDirectory);
    }

    if (process.platform == "win32" && process.env.LOCALAPPDATA) {
      var oldAppDataDirectory = path.join(electron.app.getPath("appData"), "IOTA Wallet" + (isTestNet ? " Testnet" : ""));

      electron.app.setPath("appData", process.env.LOCALAPPDATA);
      electron.app.setPath("userData", path.join(process.env.LOCALAPPDATA, "IOTA Wallet" + (isTestNet ? " Testnet" : "")));

      var newAppDataDirectory = path.join(electron.app.getPath("appData"), "IOTA Wallet" + (isTestNet ? " Testnet" : ""));

      if (fs.existsSync(path.join(oldAppDataDirectory, "settings.json"))) {
        if (!fs.existsSync(newAppDataDirectory)) {
          fs.mkdirSync(newAppDataDirectory);
        }

        var files = fs.readdirSync(oldAppDataDirectory);

        console.log("Files to move:");
        console.log(files);

        for (var i=0; i<files.length; i++) {
          try {
            var oldFile = path.join(oldAppDataDirectory, path.basename(files[i]))
            var newFile = path.join(newAppDataDirectory, path.basename(files[i]));

            if (!fs.existsSync(newFile)) {
              console.log("Renaming " + oldFile + " to " + newFile);
              fs.renameSync(oldFile, newFile);
            } else {
              console.log(newFile + " already exists");
            }
          } catch (err) {
            console.log(err);
          }
        }
      }

      appDataDirectory = newAppDataDirectory;
    } else {
      appDataDirectory = path.join(electron.app.getPath("appData"), "IOTA Wallet" + (isTestNet ? " Testnet" : ""));
    }

    App.loadSettings();

    databaseDirectory = (settings.dbLocation ? settings.dbLocation : path.join(appDataDirectory, "iri"));

    jarDirectory = path.join(resourcesDirectory, "iri");

    if (!fs.existsSync(appDataDirectory)) {
      fs.mkdirSync(appDataDirectory);
    }

    if (!fs.existsSync(databaseDirectory)) {
      fs.mkdirSync(databaseDirectory);
    }

    // Delete the database if the deleteDb flag is set
    // Also if it's the first run and settings.version is not set, deleteAnyways
    // Else only delete if the new appVersion > previous app version
    if (deleteDb && (deleteAnyways || appVersion > settings.version) && fs.existsSync(databaseDirectory)) {
      console.log("Deleting Database Directory " + databaseDirectory);
      settings.version = appVersion;
      App.deleteDatabase();
    }

    App.makeMultilingual(settings.language);
  }

  App.moveDatabase = function(newDatabaseDirectory) {
    //Doing it synchronous for now, easier..

    if (!databaseDirectory || !newDatabaseDirectory) {
      return -1;
    }

    console.log("Moving database to " + newDatabaseDirectory);

    if (!fs.existsSync(newDatabaseDirectory)) {
      fs.mkdirSync(newDatabaseDirectory);
    }

    if (isTestNet) {
      var paths = [{"from": path.join(databaseDirectory, "ixi"), "to": path.join(newDatabaseDirectory, "ixi")},
                   {"from": path.join(databaseDirectory, "testnet.log"), "to": path.join(newDatabaseDirectory, "testnet.log")},
                   {"from": path.join(databaseDirectory, "testnetdb"), "to": path.join(newDatabaseDirectory, "testnetdb")}];

      var paths = [path.join(databaseDirectory, "ixi"),
                   path.join(databaseDirectory, "testnet.log"),
                   path.join(databaseDirectory, "testnetdb")];
    } else {
      var paths = [{"from": path.join(databaseDirectory, "ixi"), "to": path.join(newDatabaseDirectory, "ixi")},
                   {"from": path.join(databaseDirectory, "mainnet.log"), "to": path.join(newDatabaseDirectory, "mainnet.log")},
                   {"from": path.join(databaseDirectory, "mainnetdb"), "to": path.join(newDatabaseDirectory, "mainnetdb")}];
    }

    try {
      for (var i=0; i<paths.length; i++) {
        if (fs.existsSync(paths[i].to)) {
          console.log(paths[i].to + " already exists.");
          return 0;
        }
      }

      for (var i=0; i<paths.length; i++) {
        if (fs.existsSync(paths[i].from)) {
          console.log("Renaming " + paths[i].from + " to " + paths[i].to);
          fs.renameSync(paths[i].from, paths[i].to);
        }
      }
      return 1;
    } catch (err) {
      console.log(err);
      return -1;
    }
  }

  App.deleteDatabase = function() {
    //Doing it synchronous for now, easier..
    console.log("Delete database");

    if (!databaseDirectory) {
      return -1;
    }

    if (isTestNet) {
      var paths = [path.join(databaseDirectory, "ixi"),
                   path.join(databaseDirectory, "testnet.log"),
                   path.join(databaseDirectory, "testnetdb")];
    } else {
      var paths = [path.join(databaseDirectory, "ixi"),
                   path.join(databaseDirectory, "mainnet.log"),
                   path.join(databaseDirectory, "mainnetdb")];
    }

    for (var i=0; i<paths.length; i++) {
      if (fs.existsSync(paths[i])) {
        console.log("Delete " + paths[i]);
        fs.removeSync(paths[i]);
      }
    }
  }

  App.start = function() {  
    if (settings.lightWallet == 1 && (!settings.lightWalletHost || !settings.lightWalletPort)) {
      App.showSetupWindow({"section": "light-node"});
    } else if (settings.lightWallet == 0 && settings.nodes.length == 0) {
      App.showSetupWindow({"section": "full-node"});
    } else if (settings.lightWallet == -1) {
      App.showSetupWindow();
    } else if (settings.lightWallet == 1) {
      global.lightWallet = true;
      App.startLightNode();
    } else {
      global.lightWallet = false;
      App.showLoadingWindow();
      App.startFullNode();
    }
  }

  App.startFullNode = function() {
    if (selectedJavaLocation) {
      App.startFullNodeProcess();
      return;
    }

    if (settings.javaLocation && (settings.javaLocation == "java" || fs.existsSync(settings.javaLocation))) {
      //make sure that java has not been uninstalled, throws an error on windows otherwise (in startFullNodeProcess spawn)
      if (settings.javaLocation == "java") {
        var child = childProcess.execFile("java", ["-version"]);
        var notInstalled = false;

        child.on("error", function(err) {
          console.log("Error:");
          console.log(err);
          notInstalled = true;
          App.findJavaLocations();
          App.checkJavaLocation(javaLocations[currentLocationTest]);
        });
        child.on("exit", function() {
          if (!notInstalled) {
            App.startFullNodeProcess(settings.javaLocation);
          }
        });
      } else {
        App.startFullNodeProcess(settings.javaLocation);
      }
    } else {
      App.findJavaLocations();
      App.checkJavaLocation(javaLocations[currentLocationTest]);
    }
  }

  App.findJavaLocations = function() {
    console.log("Find java locations.");

    javaLocations = [];

    if (process.platform == "darwin") {
      javaLocations.push("/Library/Internet Plug-Ins/JavaAppletPlugin.plugin/Contents/Home/bin/java");
      // /usr/libexec/java_home -v 1.8
      // /Library/Java/JavaVirtualMachines/jdk1.8.0_31.jdk/Contents/Home
    } else if (process.platform == "win32") {
      try {
        var glob = require("glob");
        var files = glob.sync("C:\\Program Files\\Java\\jre*", null);

        if (files && files.length) {
          for (var i=0; i<files.length; i++) {
            javaLocations.push(files[i].replace(/\//g, "\\") + "\\bin\\java.exe");
          }
        }

        var files = glob.sync("C:\\Program Files (x86)\\Java\\jre*", null);

        if (files && files.length) {
          for (var i=0; i<files.length; i++) {
            javaLocations.push(files[i].replace(/\//g, "\\") + "\\bin\\java.exe");
          }
        }
      } catch (err) {
        console.log("Error during glob:");
        console.log(err);
      }
    } else {
      javaLocations.push("/usr/bin/java");
      try {
        var glob = require("glob");
        var files = glob.sync("/usr/java/jre*", null);
        if (files && files.length) {
          for (var i=0; i<files.length; i++) {
            javaLocations.push(files[i] + "/bin/java");
          }
        }
        var files = glob.sync("/usr/lib64/jvm/jre*", null);
        if (files && files.length) {
          for (var i=0; i<files.length; i++) {
            javaLocations.push(files[i] + "/bin/java");
          }
        }
      } catch (err) {
        console.log("Error during glob:");
        console.log(err);
      }
      javaLocations.push(path.join(appDataDirectory, "java/bin/java" ));
    }

    javaLocations.push("java");

    console.log("Possible java locations:");
    console.log(javaLocations);

    if (settings.javaLocation) {
      var index = javaLocations.indexOf(settings.javaLocation);
      if (index != -1) {
        javaLocations.splice(index, 1);
      }
      javaLocations.unshift(settings.javaLocation);
    }
  }

  // execFile is asynchronous...
  App.checkJavaLocation = function(location) {
    console.log("Checking " + location);

    if (location == "java" || fs.existsSync(location)) {
      try {
        var error = found = javaVersionOK = java64BitsOK = false;

        var child = childProcess.execFile(location, ["-version"]);

        // Minimum version needed = 1.8.0_66
        child.stderr.on("data", function(data) {
          console.log(data);

          if (!found) {
            if (!javaVersionOK) {
              var version = data.match(/version "([0-9\.]+)(_([0-9]+))?/i);

              if (version && version[1] && App.versionCompare(version[1], "1.8.0") != -1 && (!version[3] || version[3] >= 66)) {
                console.log("java version is ok.");
                javaVersionOK = true;
              }
            }

            if (!java64BitsOK) {
              java64BitsOK = data.indexOf("64-Bit") != -1;
            }

            if (javaVersionOK && java64BitsOK) {
              console.log("Found 64-bits java, starting.");
              found = true;
              App.startFullNodeProcess(location);
            }
          }
        });

        child.on("error", function(err) {
          console.log("Error:");
          console.log(err);
          error = true;
          App.checkNextJavaLocation();
        });

        child.on("exit", function() {
          // Wait 1 second before going to the next one...
          // Why are we doing this again?
          setTimeout(function() {
            if (!found && !error) {
              App.checkNextJavaLocation();
            }
          }, 1000);
        });
      } catch (err) {
        App.checkNextJavaLocation();
      }
    } else {
      App.checkNextJavaLocation();
    }
  }

  App.checkNextJavaLocation = function() {
    console.log("Checking next java location.");
    currentLocationTest++;
    if (javaLocations[currentLocationTest]) {
      App.checkJavaLocation(javaLocations[currentLocationTest]);
    } else {
      App.showNoJavaInstalledWindow({"java64BitsOK": java64BitsOK});
    }
  }

  App.startLightNode = function() {
    App.nodeStarted();
  }

  App.startFullNodeProcess = function(javaLocation) {
    console.log("Start server process.");

    if (!javaLocation) {
      javaLocation = selectedJavaLocation;
    } else {
      selectedJavaLocation = javaLocation;
    }

    console.log("Java: " + javaLocation);

    try {
      var pid = App.getAlreadyRunningProcess();

      if (pid) {
        console.log("PID: " + pid);
        App.showAlreadyRunningProcessAlert();
        return;
      }

      var params = [];

      params.push("-XX:+DisableAttachMechanism");

      params = params.unique();

      params.push("-jar");

      params.push(path.join(jarDirectory, "iri" + (isTestNet ? "-testnet" : "") + ".jar"));

      // temporary !
      // Only rescan once 
      if (!('rescan' in settings) || settings.rescan) {
          params.push("--rescan");

          settings.rescan = false;
      }

      if (isTestNet) {
        console.log("TESTNET VERSION")
        params.push("--testnet");
      }

      params.push("-p");
      params.push(settings.port);

      if (settings.udpReceiverPort != 14600) {
        params.push("-u");
        params.push(settings.udpReceiverPort);
      }

      if (settings.tcpReceiverPort != 15600) {
        params.push("-t");
        params.push(settings.tcpReceiverPort);
      }

      if (settings.sendLimit > 0) {
        params.push("--send-limit");
        params.push(settings.sendLimit);
      }

      if (settings.nodes) {
        params.push("-n");
        params.push(settings.nodes.join(" "));
      }

      console.log(params.join(" "));

      serverOutput = [];

      server = childProcess.spawn(javaLocation, params, {
        "cwd": databaseDirectory,
        "detached": true
      }, function(err) {
        if (err) {
          if (!didKillNode && !isStarted && !nodeInitializationError)   {
            selectedJavaLocation = "";
            App.saveSettings();
            App.showInitializationAlertWindow();
          }
        }
      });

      server.stdout.setEncoding("utf8");
      server.stderr.setEncoding("utf8");

      server.stdout.on("data", function(data) {
        App.logServerOutput(data);
        App.checkServerOutput(data, "data");
      });

      server.stderr.on("data", function(data) {
        App.logServerOutput(data);
        App.checkServerOutput(data, "error");
      });

      server.on("exit", function(code) {
        if (code == null) {
          server.exitCode = -1;
        }

        App.logServerOutput("Process exited with status " + code);

        /*
        // Kill not initiated by user or app.
        if (!didKillNode) {
          didKillNode = false;
          if (code == 143) {
            App.relaunchApplication();
            return;
          }
        }*/

        if (callback) {
          callback();
          callback = null;
          return;
        // System is not closing automatically, wait for user to click the alert button.
        } else if (!didKillNode) {
          if (!isStarted) {
            App.showInitializationAlertWindow();
          } else {
            App.showAlertAndQuit("server_exited", "iota_server_process_exited");
            return;
          }
        } else if (!doNotQuit) {
          remote.getCurrentWindow().close();
        }
      });
    } catch (err) {
      console.log("Error:");
      console.log(err);
      App.showInitializationAlertWindow();
    }
  }

  App.killNode = function(fn) {
    var hasServer = server && server.exitCode == null;

    if (hasServer) {
      App.showKillAlert();
    }

    setTimeout(function() {
      if (server && server.exitCode == null) {
        isStarted = false;
        nodeInitializationError = false;
        didKillNode = true;
        isRelaunch = false;
        App.killAlreadyRunningProcess(true);
        callback = fn;
        server.kill();
      } else {
        // killAlreadyRunningProcess(true);
        // callback = null;
        fn();
      }
    }, (!hasServer ? 0 : 500));
  }

  App.openDatabaseFolder = function() {
    try {
      shell.showItemInFolder(path.join(databaseDirectory, (isTestNet ? "testnetdb" : "mainnetdb")));
    } catch (err) {}
  }

  App.getAlreadyRunningProcess = function() {
    try {
      if (process.platform == "win32") {
        //" + String(command).replace(/\\/g, "\\\\") + "
        var output = childProcess.execSync("wmic process where \"commandline LIKE '%jar %iri" + (isTestNet ? "-testnet" : "") + ".jar'\" get processid");

        process.stdout.write(output);

        output = output.toString();

        var lines = output.match(/[^\r\n]+/g);

        if (lines.length >= 2) {
          var pid = String(lines[1]).trim();
          if (pid.match(/^[0-9]+$/)) {
            return pid;
          }
        }
      } else {
        //var escapeStringRegexp = require("escape-string-regexp");
        //+ escapeStringRegexp(command.replace(/\"/g, '')) +
        var output = childProcess.execSync("ps gx | grep \"[j]ar .*iri" + (isTestNet ? "\-testnet" : "") + "\.jar\"");

        output = output.toString().trim();

        var pid = output.match(/^[0-9]+\s/);

        if (pid) {
          return pid;
        } else {
          console.log("PID not found");
        }
      }
    } catch (err) {
    }

    return 0;
  }

  App.switchNodeType = function() {
    /*
    if (win) {
      win.hide();
    }*/
    var lightWallet = settings.lightWallet == 1 ? 0 : 1;

    if ((lightWallet && (!settings.lightWalletHost || !settings.lightWalletPort))) {
      App.editNodeConfiguration(lightWallet);
    } else {
      App.updateNodeConfiguration({"lightWallet": lightWallet});
    }
  }

  App.relaunchApplication = function(didFinalize) {
    console.log("App.relaunchApplication: " + didFinalize);
    // For light wallet, we want to make sure that everything is cleaned properly before restarting..
    if (global.lightWallet && App.windowIsReady && !didFinalize) {
      console.log("Sending stopCcurl message to renderer");
      win.webContents.send("stopCcurl", {"relaunch": true});
      return;
    }

    console.log("Doing relaunch");

    App.killNode(function() {
      if (win) {
        win.hide();
      }

      setTimeout(function() {
        App.showDefaultWindow();

        isStarted = false;
        didKillNode = false;
        nodeInitializationError   = false;
        lastError = "";
        isRelaunch = true;
        iriVersion = "";
        serverOutput = [];

        if (settings.dbLocation && settings.dbLocation != databaseDirectory) {
          //Todo: During db move, user should not close the app? How to prevent..
          App.moveDatabase(settings.dbLocation);
          databaseDirectory = settings.dbLocation; //because this is not reloaded during relaunch.. 
        }

        App.start();
      }, 300);
    });
  }

  App.killAlreadyRunningProcessAndRestart = function() {
    App.killAlreadyRunningProcess(true);
    App.relaunchApplication();
  }

  App.killAlreadyRunningProcess = function(wait) {
    var pid;

    pid = App.getAlreadyRunningProcess();

    if (pid) {
      try {
        console.log("Kill PID: " + pid);
        if (process.platform == "win32") {
          var out = childProcess.exec("taskkill /T /PID " + pid);
        } else {
          var out = childProcess.exec("kill " + pid);
        }

        var then = new Date();

        if (wait) {
          while (App.getAlreadyRunningProcess()) {
          }
        }
      } catch (err) {
      }
    }
  }

  App.versionCompare = function(v1, v2) {
    if (v2 == undefined) {
      return -1;
    } else if (v1 == undefined) {
      return -1;
    }

    // https://gist.github.com/TheDistantSea/8021359 (based on)

    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    function isValidPart(x) {
      return /^\d+$/.test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
      return NaN;
    }

    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);

    for (var i = 0; i < v1parts.length; ++i) {
      if (v2parts.length == i) {
        return 1;
      }
      if (v1parts[i] == v2parts[i]) {
        continue;
      } else if (v1parts[i] > v2parts[i]) {
        return 1;
      } else {
        return -1;
      }
    }

    if (v1parts.length != v2parts.length) {
      return -1;
    }

    return 0;
  }

  App.nodeStarted = function() {
    if (isStarted) {
      return;
    }

    if (!App.uiIsInitialized) {
      App.doNodeStarted = true;
      return;
    }

    isStarted = true;

    try {
      if (loadingWin) {
        loadingWin.hide();
        loadingWin.destroy();
        loadingWin = null;
      }

      App.updateTitle(true);

      var ccurlPath;

      if (process.platform == "win32") {
        ccurlPath = path.join(resourcesDirectory, "ccurl", "win" + (is64BitOS ? "64" : "32"));
      } else if (process.platform == "darwin") {
        ccurlPath = path.join(resourcesDirectory, "ccurl", "mac");
      } else {
        ccurlPath = path.join(resourcesDirectory, "ccurl", "lin" + (is64BitOS ? "64" : "32"));
      }

      win.webContents.send("nodeStarted", "file://" + path.join(resourcesDirectory, "ui").replace(path.sep, "/") + "/index.html", {
          "inApp": 1,
          "showStatus": settings.showStatusBar,
          "host": (settings.lightWallet == 1 ? settings.lightWalletHost : "http://localhost"),
          "port": (settings.lightWallet == 1 ? settings.lightWalletPort : settings.port),
          "depth": settings.depth,
          "minWeightMagnitude": settings.minWeightMagnitude,
          "ccurlPath": ccurlPath,
          "language": settings.language,
          "allowShortSeedLogin": settings.allowShortSeedLogin,
          "keccak": (settings.keccak ? 1 : 0)
      });
    } catch (err) {
      console.log("Error:");
      console.log(err);
    }
  }

  App.checkServerOutput = function(data, type) {
    if (!isStarted && !didKillNode && !nodeInitializationError)   {
      if (type == "error") {
        if (data.match(/java\.net\.BindException/i)) {
          lastError = App.t("server_address_already_in_use", {port: App.format(settings.port)});
        } else {
          var error = data.match(/ERROR\s*com\.iota\.iri\.IRI\s*\-\s*(.*)/i);
          if (error && !lastError.match(/URI Syntax Exception|Illegal Argument Exception/i)) {
            lastError = error[1];
          }
        }
      } else {
        // This can result in errors.. Need to have a real response from the console instead of just this.
        var iri = data.indexOf("Welcome to IRI");
        var iriVersion = "";

        if (iri !== -1) {
            var newString = data.slice(iri, data.length);
            var iriVersion = newString.replace(/[^0-9\.]+/g,"");
        }

        if (iri !== -1) {

          var initTestnet = data.indexOf("Testnet") != -1;
          //don't run mainnet IRI in testnet GUI, and other way around
          if (isTestNet && !initTestnet || !isTestNet && initTestnet) {
            App.quit();
          }
        }

        if (data.match(/IOTA Node initialised correctly/i)) {
          App.nodeStarted();
        }
      }
    } else if (type == "error") {
      var regex = /ERROR\s*[a-z\.]+\s*\-\s*(.*)/ig;
      var error = regex.exec(data);
      while (error != null) {
        if (error[1] != lastError) {
          lastError = error[1];
          if (!lastError.match(/doesn\'t look a valid address/i)) {
            App.notify("error", lastError);
          }
        }
        error = regex.exec(data);
      }
    }

    if (settings.showStatusBar) {
      var milestone = {};

      var latestSolid = data.match(/Latest SOLID SUBTANGLE milestone has changed from #[0-9]+ to #([0-9]+)/i);
      var latest      = data.match(/Latest milestone has changed from #[0-9]+ to #([0-9]+)/i);

      if (latestSolid) {
        milestone.latestSolidSubtangleMilestoneIndex = latestSolid[1];
      }

      if (latest) {
        milestone.latestMilestoneIndex = latest[1];
      }

      if (latestSolid || latest) {
        App.updateStatusBar(milestone);
      }
    }
  }

  App.logServerOutput = function(data) {
    console.log(data);
    if (!data.match(/Requesting command getNodeInfo/i)) {
      serverOutput.push(data);
      if (isLookingAtServerLog && win && win.webContents) {
        win.webContents.send("appendToServerLog", data);
      }
    }
    if (serverOutput.length > 500) {
      serverOutput.shift();
    }
  }

  App.toggleFullScreen = function() {
    if (win) {
      win.setFullScreen(!win.isFullScreen());
    }
  }

  App.toggleStatusBar = function() {
    if (App.windowIsReady()) {
      if (settings.showStatusBar) {
        settings.showStatusBar = 0;
      } else {
        settings.showStatusBar = 1;
      }

      App.createMenuBar();

      win.webContents.send("toggleStatusBar", settings.showStatusBar);

      if (settings.showStatusBar) {
        App.startTrackingCPU();
      } else {
        App.stopTrackingCPU();
      }
    }
  }

  App.makeMultilingual = function(currentLanguage) {
    i18n
      .use(i18nBackend)
      .init({
        lng: currentLanguage,
        fallbackLng: "en",
        initImmediate: false, //Needed to make it work synchronously
        backend: {
          loadPath: path.join(resourcesDirectory, "locales", "{{lng}}", "{{ns}}.json")
        },
        debug: false
    });
  }

  App.t = function(message, options) {
    if (message.match(/^[a-z\_]+$/i)) {
      return App.format(i18n.t(message, options));
    } else {
      return App.format(message);
    }
  }

  App.format = function(text) {
    return String(text).escapeHTML();
  }

  App.changeLanguage = function(language) {
    i18n.changeLanguage(language, function(err, t) {
      settings.language = language;

      App.saveSettings();

      if (otherWin) {
        App.createMenuBar(true);
        otherWin.webContents.send("changeLanguage", language);
      } else {
        App.createMenuBar();

        if (App.windowIsReady()) {
          win.webContents.send("changeLanguage", language);
        }
      }
    });
  }

  App.finishedTransitioningToKeccak = function() {
    settings.keccak = 1;
    App.saveSettings();
  }

  App.startTrackingCPU = function() {
    if (cpuTrackInterval) {
      clearInterval(cpuTrackInterval);
    }

    cpuTrackInterval = setInterval(App.trackCPU, 5000);

    App.trackCPU();
  }

  App.stopTrackingCPU = function() {
    if (cpuTrackInterval) {
      clearInterval(cpuTrackInterval);
    }
    App.updateStatusBar({"cpu": ""});
  }

  App.trackCPU = function() {
    var pid;

    if (settings.lightWallet == 1) {
      pid = rendererPid;
    } else if (server && server.pid) {
      pid = server.pid;
    }

    if (pid) {
      pusage.stat(pid, function(err, stat) {
        if (err) {
          App.updateStatusBar({"cpu": ""});
        } else {
          App.updateStatusBar({"cpu": Math.round(stat.cpu).toFixed(2)});
        }
       });

      pusage.unmonitor(pid);
    } else {
      console.log("Track CPU: No server PID");
      if (cpuTrackInterval) {
        console.log("Clear the interval");
        clearInterval(cpuTrackInterval);
      }
    }
  }

  App.hoverAmountStart = function(amount) {
    if (settings.showStatusBar && App.windowIsReady()) {
      win.webContents.send("hoverAmountStart", amount);
    }
  }

  App.hoverAmountStop = function() {
    if (settings.showStatusBar && App.windowIsReady()) {
      win.webContents.send("hoverAmountStop");
    }
  }

  App.showWindowIfNotVisible = function() {
    if (App.windowIsReady() && !win.isVisible()) {
      win.show();
    }
  }

  App.showSetupWindow = function(params) {
    App.showWindow("setup.html", {"lightWallet"     : settings.lightWallet,
                                  "lightWalletHost" : settings.lightWalletHost,
                                  "lightWalletPort" : settings.lightWalletPort,
                                  "port"            : settings.port,
                                  "nodes"           : settings.nodes,
                                  "section"         : params && params.section ? params.section : null});
  }

  App.showInitializationAlertWindow = function(title, msg) {
    if (nodeInitializationError)   {
      return;
    }

    nodeInitializationError   = true;

    if (!title) {
      title = "Initialization Alert";
    }

    if (!msg) {
      msg = (lastError ? lastError : App.t("server_initialization_error_occurred"));
    }

    if (!selectedJavaLocation) {
      selectedJavaLocation = "java";
    }

    //check if user is running 32-bit java on win 64..
    if (is64BitOS) {
      var javaVersionOK = java64BitsOK = false;

      var child = childProcess.execFile(selectedJavaLocation, ["-version"]);

      // Minimum version needed = 1.8.0_66
      child.stderr.on("data", function(data) {
        var version = data.match(/version "([0-9\.]+)(_([0-9]+))?/i);

        if (version && version[1] && App.versionCompare(version[1], "1.8.0") != -1 && (!version[3] || version[3] >= 66)) {
          javaVersionOK = true;
        }

        if (!java64BitsOK) {
          java64BitsOK = data.indexOf("64-Bit") != -1;
        }
      });

      child.on("exit", function() {
        App.showWindow("init_error.html", {"title"                   : title,
                                           "message"                 : msg,
                                           "serverOutput"            : serverOutput,
                                           "javaVersionOK"           : javaVersionOK,
                                           "java64BitsOK"            : java64BitsOK,
                                           "is64BitOS"               : is64BitOS,
                                           "port"                    : settings.port,
                                           "nodes"                   : settings.nodes});
      });
    } else {
      App.showWindow("init_error.html", {"title"                   : title,
                                         "message"                 : msg,
                                         "serverOutput"            : serverOutput,
                                         "port"                    : settings.port,
                                         "nodes"                   : settings.nodes});
    }

    selectedJavaLocation = "";
  }

  App.showAlertAndQuit = function(title, msg) {
    if (!App.windowIsReady()) {
      App.showWindow("quit.html", {"title": title, "message": msg});
    } else {
      App.showWindowIfNotVisible();
      win.webContents.send("showAlertAndquit", title, msg, serverOutput);
    }
  }

  App.showKillAlert = function() {
    if (!App.windowIsReady()) { return; }
    App.showWindowIfNotVisible();

    win.webContents.send("showKillAlert");
  }

  App.showNoJavaInstalledWindow = function(params) {
    App.showWindow("no_java.html", params);
  }

  App.showAlreadyRunningProcessAlert = function() {
    App.showWindow("already_running_process.html");
  }

  App.showLoadingWindow = function() {
    loadingWin = new electron.BrowserWindow({"width"           : 120,
                                             "height"          : 80,
                                             "show"            : false,
                                             "backgroundColor" : "#4DC1B5",
                                             "frame"           : false,
                                             "center"          : true,
                                             "alwaysOnTop"     : true,
                                             "minimizable"     : false,
                                             "maximizable"     : false,
                                             "fullscreenable"  : false,
                                             "resizable"       : false});

    loadingWin.loadURL("file://" + appDirectory.replace(path.sep, "/") + "/windows/loading.html");

    loadingWin.webContents.once("did-finish-load", function() {
      loadingWin.show();
    });
  }

  App.showWindow = function(filename, params) {
    if (!filename) {
      App.showDefaultWindow();
      return;
    }

    if (!params) {
      params = {};
    }

    params.language = settings.language;

    if (filename == "init_error.html") {
      var height = 480;
    } else {
      var height = 300;
    }

    if (loadingWin) {
      loadingWin.hide();
      loadingWin.destroy();
      loadingWin = null;
    }

    if (win) {
      win.hide();
    }

    App.uiIsInitialized = false;
    App.uiIsReady = false;

    if (!otherWin) {
      otherWin = new electron.BrowserWindow({"width"          : 600,
                                             "height"         : height,
                                             "show"           : false,
                                             "useContentSize" : true,
                                             "center"         : true,
                                             "resizable"      : false});
      otherWin.setFullScreenable(false);
      var isClosing;

      otherWin.on("close", function(e) {
        //For some reason this results in a never-ending loop if we don't add this variable..
        if (isClosing) {
          return;
        }

        isClosing = true;
        App.quit();
      });
    }

    otherWin.loadURL("file://" + appDirectory.replace(path.sep, "/") + "/windows/" + filename);

    //todo: fix normal windows also should open in new window, even if not specified
    otherWin.webContents.on("new-window", function(event, url) {
      event.preventDefault();
      shell.openExternal(url);
    });

    //ready-to-show event not working..
    otherWin.webContents.once("did-finish-load", function() {
      App.updateTitle();
      //win.webContents.toggleDevTools({"mode": "undocked"});
      otherWin.webContents.send("show", params);
    });

    App.createMenuBar(true);
  }

  App.showNodeInfo = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showNodeInfo");
    }
  }

  App.showPeers = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showPeers");
    }
  }

  App.showFAQ = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showFAQ");
    }
  }

  App.showTransition = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showTransition");
    }
  }

  App.pasteTrytes = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("pasteTrytes");
    }
  }

  App.showNetworkSpammer = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showNetworkSpammer");
    }
  }

  App.editNodeConfiguration = function(walletType) {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      if (walletType === undefined) {
        walletType = settings.lightWallet;
      }
      if (walletType == 1) {
        var config = {"lightWallet": 1, "lightWalletHost": settings.lightWalletHost, "lightWalletPort": settings.lightWalletPort, "minWeightMagnitude": settings.minWeightMagnitude, "testNet": isTestNet, "minWeightMagnitudeMinimum": minWeightMagnitudeMinimum};

        var req = https.get('https://iotasupport.com/providers.json?' + (new Date().getTime()));
        req.on('response', function (res) {
          var body = '';
          res.on('data', function (chunk) {
            body += chunk.toString();
          });
          res.on('end', function () {
            try {
              config.lightWalletHosts = shuffleArray(JSON.parse(body)).filter(function(host) {
                return host.match(/^(https?:\/\/.*):([0-9]+)$/i);
              });
            } catch (err) {
              console.log(err);
            } finally {
              win.webContents.send("editNodeConfiguration", config);
            }
          });
        });

        req.on('error', function(err) {
          console.log(err);
          win.webContents.send("editNodeConfiguration", config);
        });

        req.end();
      } else {
        var config = {"lightWallet": 0, "port": settings.port, "udpReceiverPort": settings.udpReceiverPort, "tcpReceiverPort": settings.tcpReceiverPort, "sendLimit": settings.sendLimit, "depth": settings.depth, "minWeightMagnitude": settings.minWeightMagnitude, "testNet": isTestNet, "dbLocation": databaseDirectory, "minWeightMagnitudeMinimum": minWeightMagnitudeMinimum};
        win.webContents.send("editNodeConfiguration", config);
      }
    }
  }

  App.editNeighbors = function() {
    if (App.windowIsReady() && !settings.lightWallet) {
      App.showWindowIfNotVisible();
      win.webContents.send("editNeighbors", settings.nodes.join("\r\n"));
    }
  }

  App.checkNodeValidity = function(node) {
    var getInside = /^(udp|tcp):\/\/([\[][^\]\.]*[\]]|[^\[\]:]*)[:]{0,1}([0-9]{1,}$|$)/i;

    var stripBrackets = /[\[]{0,1}([^\[\]]*)[\]]{0,1}/;

    var uriTest = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|(^\s*((?=.{1,255}$)(?=.*[A-Za-z].*)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*)\s*$)/;

    if(!getInside.test(node)) {
        console.log(node + " formatting is invalid!")
        return false;
    }

    return uriTest.test(stripBrackets.exec(getInside.exec(node)[1])[1]);
  }

  App.updateNodeConfiguration = function(configuration) {
    try {
      if (!configuration) {
        configuration = {};
      }

      var relaunch              = false;
      var lightWalletHostChange = false;
      var addedNodes            = [];
      var removedNodes          = [];

      if (configuration.hasOwnProperty("lightWallet")) {
        var lightWallet = parseInt(configuration.lightWallet, 10);
        if (lightWallet != settings.lightWallet) {
          settings.lightWallet = lightWallet;
          relaunch = true;
        }
      }

      if (settings.lightWallet == 1) {
        if (configuration.hasOwnProperty("lightWalletHost")) {
          var lightWalletHost = configuration.lightWalletHost;
          if (lightWalletHost != settings.lightWalletHost) {
            settings.lightWalletHost = lightWalletHost;
            lightWalletHostChange = true;
          }
        }

        if (configuration.hasOwnProperty("lightWalletPort")) {
          var lightWalletPort = parseInt(configuration.lightWalletPort, 10);
          if (lightWalletPort != settings.lightWalletPort) {
            settings.lightWalletPort = lightWalletPort;
            lightWalletHostChange = true;
          }
        }
      } else {
        if (configuration.hasOwnProperty("nodes")) {
          var nodes = [];

          var newNodes = configuration.nodes.match(/[^\s]+/g);

          if (newNodes) {
            newNodes = newNodes.unique();
          } else {
            newNodes = [];
          }

          for (var i=0; i<newNodes.length; i++) {
            newNodes[i] = String(newNodes[i]).trim();

            if (newNodes[i] && App.checkNodeValidity(newNodes[i])) {
              nodes.push(newNodes[i]);
            }
          }

          addedNodes = nodes.filter(function(n) {
            return settings.nodes.indexOf(n) == -1;
          });

          removedNodes = settings.nodes.filter(function(n) {
            return nodes.indexOf(n) == -1;
          });

          settings.nodes = nodes;
        }

        if (configuration.hasOwnProperty("port")) {
          var port = parseInt(configuration.port, 10);
          if (port != settings.port) {
            settings.port = port;
            relaunch = true;
          }
        }

        if (configuration.hasOwnProperty("udpReceiverPort")) {
          var udpReceiverPort = parseInt(configuration.udpReceiverPort, 10);
          if (udpReceiverPort != settings.udpReceiverPort) {
            settings.udpReceiverPort = udpReceiverPort;
            relaunch = true;
          }
        }

        if (configuration.hasOwnProperty("tcpReceiverPort")) {
          var tcpReceiverPort = parseInt(configuration.tcpReceiverPort, 10);
          if (tcpReceiverPort != settings.tcpReceiverPort) {
            settings.tcpReceiverPort = tcpReceiverPort;
            relaunch = true;
          }
        }

        if (configuration.hasOwnProperty("sendLimit")) {
          var sendLimit = parseFloat(configuration.sendLimit);
          if (sendLimit != settings.sendLimit) {
            settings.sendLimit = sendLimit;
            relaunch = true;
          }
        }

        if (configuration.hasOwnProperty("depth")) {
          settings.depth = parseInt(configuration.depth, 10);
        }

        if (configuration.hasOwnProperty("dbLocation") && fs.existsSync(configuration.dbLocation)) {
          if (configuration.dbLocation != databaseDirectory) {
            settings.dbLocation = configuration.dbLocation;
            relaunch = true;
          }
        }
      }

      if (configuration.hasOwnProperty("minWeightMagnitude")) {
        settings.minWeightMagnitude = parseInt(configuration.minWeightMagnitude, 10);
        if (settings.minWeightMagnitude < minWeightMagnitudeMinimum) {
          settings.minWeightMagnitude = minWeightMagnitudeMinimum;
        }
      }

      App.saveSettings();

      if (relaunch || !App.windowIsReady()) {
        App.relaunchApplication();
      } else if (lightWalletHostChange && settings.lightWallet == 1) {
        win.webContents.send("updateSettings", {
          "host": settings.lightWalletHost,
          "port": settings.lightWalletPort
        });
      } else {
        win.webContents.send("updateSettings", {
          "depth": settings.depth,
          "minWeightMagnitude": settings.minWeightMagnitude,
          "addedNodes": addedNodes,
          "removedNodes": removedNodes
        });
      }
    } catch (err) {
      console.log("Error:");
      console.log(err);
    }
  }

  App.addNeighborNode = function(node) {
    if (settings.lightWallet == 1) {
      return;
    }
    try {
      node = String(node).trim();

      if (!node || !App.checkNodeValidity(node)) {
        return;
      }

      if (settings.nodes.indexOf(node) == -1) {
        settings.nodes.push(node);
        App.saveSettings();

        if (App.windowIsReady()) {
          win.webContents.send("updateSettings", {"addedNodes": [node]});
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  App.showServerLog = function() {
    if (App.windowIsReady() && settings.lightWallet != 1) {
      App.showWindowIfNotVisible();
      isLookingAtServerLog = true;
      win.webContents.send("showServerLog", serverOutput);
    }
  }

  App.stopLookingAtServerLog = function() {
    isLookingAtServerLog = false;
  }

  App.showModal = function(identifier, html) {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showModal", identifier, html);
    }
  }

  App.showPreferences = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();

      if (process.platform != "linux") {
        var loginSettings = electron.app.getLoginItemSettings();
      } else {
        var loginSettings = {"openAtLogin": false};
      }

      win.webContents.send("showPreferences", {"openAtLogin": loginSettings.openAtLogin, "allowShortSeedLogin": settings.allowShortSeedLogin});
    }
  }

  App.updatePreferences = function(updatedSettings) {
    if (process.platform != "linux") {
      var loginSettings = electron.app.getLoginItemSettings();

      if (updatedSettings.openAtLogin != loginSettings.openAtLogin) {
        electron.app.setLoginItemSettings({"openAtLogin": updatedSettings.openAtLogin, "openAsHidden": true});
      }
    }

    if (updatedSettings.allowShortSeedLogin != settings.allowShortSeedLogin) {
      settings.allowShortSeedLogin = updatedSettings.allowShortSeedLogin;
      win.webContents.send("updateSettings", {"allowShortSeedLogin": settings.allowShortSeedLogin});
    }
  }

  App.showUpdateAvailable = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateAvailable");
    }
  }

  App.showUpdateDownloaded = function(releaseNotes, releaseName, releaseDate) {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateDownloaded", releaseNotes, releaseName, releaseDate);
    }
  }

  App.showUpdateError = function(error) {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateError", error);
    }
  }

  App.showCheckingForUpdate = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showCheckingForUpdate");
    }
  }

  App.showUpdateNotAvailable = function() {
    if (App.windowIsReady()) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateNotAvailable");
    }
  }

  App.setFocus = function(focus) {
    if (win && win.webContents) {
      win.webContents.send("setFocus", focus);
    }
  }

  App.rendererIsInitialized = function() {
    App.uiIsInitialized = true;
    if (App.doNodeStarted) {
      App.doNodeStarted = false;
      App.nodeStarted();
    }
  }

  App.rendererIsReady = function(pid) {
    rendererPid = pid;
    App.uiIsReady = true;

    setTimeout(function() {
      if (settings.showStatusBar) {
        App.startTrackingCPU();
      }
    }, 1000);

    if (launchURL) {
      App.handleURL(launchURL);
    }

    //Disable auto-update for now
    //App.autoUpdate();
  }

  App.notify = function(type, message, options) {
    if (App.windowIsReady()) {
      win.webContents.send("notify", type, message, options);
    }
  }

  App.handleURL = function(url) {
    console.log("App.handleURL: " + url);

    if (App.windowIsReady()) {
      win.webContents.send("handleURL", url);
      if (url == launchURL) {
        launchURL = null;
      }
    } else if (!launchURL) {
      launchURL = url;
    }
  }

  App.updateStatusBar = function(data) {
    if (App.windowIsReady()) {
      win.webContents.send("updateStatusBar", data);
    }
  }

  App.updateAppInfo = function(data) {
    if (data.testnet != isTestNet) {
      App.notify("error", "You are connecting to a " + (data.testnet ? "testnet" : "mainnet") + " node from the " + (isTestNet ? "testnet" : "mainnet") + " wallet. This is not recommended...", {"timeOut": 15000, "extendedTimeOut": 15000});
    }

    iriVersion = data.version;

    App.updateTitle(true, data.testnet);
  }

  App.updateTitle = function(includeNodeType, _isTestNet) {
    if (_isTestNet === undefined) {
      _isTestNet = isTestNet;
    }

    var title = "IOTA " + (includeNodeType && settings.lightWallet == 1 ? "Light " : "") + "Wallet " + App.format(appVersion.replace("-testnet", "")) + (_isTestNet ? " - Testnet" : "") + (iriVersion ? " - IRI " + App.format(iriVersion) : "");

    try {
      if (win) {
        win.setTitle(title);
      }
      if (otherWin) {
        otherWin.setTitle(title);
      }
    } catch (err) {
      console.log(err);
    }
  }

  App.windowIsReady = function() {
    return (App.uiIsReady && win && win.webContents);
  }

  function shuffleArray(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  return App;
}(App || {}));

// For windows
const shouldQuit = electron.app.makeSingleInstance(function(commandLine, workingDirectory) {
  if (!App.uiIsReady) {
    return;
  }

  // Someone tried to run a second instance, we should focus our window.
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();

    if (process.platform == "win32" && commandLine.length == 2) {
      if (String(commandLine[1]).match(/^iota:\/\//i)) {
        App.handleURL(commandLine[1]);
      }
    }
  }
});

if (shouldQuit) {
  console.log("Quit this instance.");
  electron.app.quit();
  return;
}

electron.app.on("ready", function() {
  App.initialize();
});

electron.app.on("open-url", function(event, url) {
  App.handleURL(url);
});

electron.app.on("window-all-closed", function () {
  App.quit();
});

electron.app.on("browser-window-focus", function() {
  App.setFocus(true);
});

electron.app.on("browser-window-blur", function() {
  App.setFocus(false);
});

electron.ipcMain.on("relaunchApplication", function(event, didFinalize) {
  App.relaunchApplication(didFinalize);
});

electron.ipcMain.on("killAlreadyRunningProcessAndRestart", App.killAlreadyRunningProcessAndRestart);

electron.ipcMain.on("rendererIsInitialized", function() {
  App.rendererIsInitialized();
});

electron.ipcMain.on("rendererIsReady", function(event, pid) {
  App.rendererIsReady(pid);
});

electron.ipcMain.on("updatePreferences", function(event, checkForUpdatesOption) {
  App.updatePreferences(checkForUpdatesOption);
});

electron.ipcMain.on("updateNodeConfiguration", function(event, configuration) {
  App.updateNodeConfiguration(configuration);
});

electron.ipcMain.on("installUpdate", function() {
  App.installUpdate();
});

electron.ipcMain.on("quit", function() {
  App.quit();
});

electron.ipcMain.on("hoverAmountStart", function(event, amount) {
  App.hoverAmountStart(amount);
});

electron.ipcMain.on("hoverAmountStop", App.hoverAmountStop);

electron.ipcMain.on("stopLookingAtServerLog", App.stopLookingAtServerLog);

electron.ipcMain.on("showNoJavaInstalledWindow", function(event, params) {
  App.showNoJavaInstalledWindow(params);
});

electron.ipcMain.on("showSetupWindow", function(event, params) {
  App.showSetupWindow(params);
});

electron.ipcMain.on("editNodeConfiguration", function(event) {
  App.editNodeConfiguration();
});

electron.ipcMain.on("addNeighborNode", function(event, node) {
  App.addNeighborNode(node);
});

electron.ipcMain.on("showServerLog", App.showServerLog);

electron.ipcMain.on("showModal", function(event, identifier, html) {
  App.showModal(identifier, html);
});

electron.ipcMain.on("updateStatusBar", function(event, data) {
  App.updateStatusBar(data);
});

electron.ipcMain.on("updateAppInfo", function(event, data) {
  App.updateAppInfo(data);
});

electron.ipcMain.on("finishedTransitioningToKeccak", App.finishedTransitioningToKeccak);