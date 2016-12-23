const electron         = require("electron");
const fs               = require("fs");
const path             = require("path");
const childProcess     = require("child_process");
const autoUpdater      = electron.autoUpdater;
const powerSaveBlocker = electron.powerSaveBlocker;
const shell            = electron.shell;
const clipboard        = electron.clipboard;
const pusage           = require("pidusage");

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
  var serverDirectory           = "";
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
  var isDevelopment             = process.env.NODE_ENV === "development";
  var didCheckForUpdates        = false;
  var appVersion                = require("../../package.json").version;
  var isLookingAtServerLog      = false;
  var oneTimeJavaArgs           = null;
  var ia32JavaLocation          = null;
  var is64BitOS                 = 64;

  var launchArguments           = [];
  var launchURL                 = null;
  var iriVersion                = "";
  var lastError                 = "";

  var isTestNet                 = String(appVersion).match(/\-testnet$/) != null;

  App.uiIsReady                 = false;
  App.uiIsInitialized           = false;
  App.doNodeStarted             = false;

  App.initialize = function() {
    appDirectory = path.dirname(__dirname);
    resourcesDirectory = path.dirname(appDirectory);

    if (!isDevelopment) {
      resourcesDirectory = path.dirname(resourcesDirectory);
    }

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

    App.loadSettings();

    App.checkLaunchArguments();

    App.showDefaultWindow();

    App.findDirectories();

    if (!electron.app.isDefaultProtocolClient("iota")) {
      console.log("Register iota as a default protocol");
      electron.app.setAsDefaultProtocolClient("iota"); //not linux
    }

    App.start();
  }

  App.quit = function() {
    electron.app.quit();
  }

  App.loadSettings = function() {
    try {
      var settingsFile = path.join(electron.app.getPath("appData"), "IOTA Wallet" + (isTestNet ? " Testnet" : "") + path.sep + "settings.json");

      if (!fs.existsSync(settingsFile)) {
        throw "Settings file does not exist.";
      }

      settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));

      if (!settings.hasOwnProperty("bounds") || typeof(settings.bounds) != "object") {
        settings.bounds = {width: 520, height: 736};
      }
      if (!settings.hasOwnProperty("lightWallet")) {
        settings.lightWallet = -1;
      }
      if (settings.hasOwnProperty("javaArgs") && settings.javaArgs == "undefined") {
        settings.javaArgs = "";
      }
      if (!settings.hasOwnProperty("checkForUpdates")) {
        settings.checkForUpdates = 1;
      }
      if (!settings.hasOwnProperty("lastUpdateCheck")) {
        settings.lastUpdateCheck = 0;
      }
      if (!settings.hasOwnProperty("showStatusBar")) {
        settings.showStatusBar = 0;
      }
      if (!settings.hasOwnProperty("isFirstRun")) {
        settings.isFirstRun = 1;
      }
      if (!settings.hasOwnProperty("port")) {
        settings.port = (isTestNet ? 14999 : 14265);
      }
      if (!settings.hasOwnProperty("depth")) {
        settings.depth = 3;
      }
      if (!settings.hasOwnProperty("minWeightMagnitude")) {
        settings.minWeightMagnitude = 18;
      }
      if (!isTestNet && settings.minWeightMagnitude < 18) {
        settings.minWeightMagnitude = 18;
      } else if (isTestNet && settings.minWeightMagnitude < 13) {
        settings.minWeightMagnitude = 13;
      }
      if (!settings.hasOwnProperty("nodes") || typeof settings.nodes != "object") {
        settings.nodes = [];
      }
    } catch (err) {
      console.log("Error reading settings:");
      console.log(err);
      settings = {bounds: {width: 520, height: 736}, javaArgs: "", checkForUpdates: 1, lastUpdateCheck: 0, showStatusBar: 0, isFirstRun: 1, port: (isTestNet ? 14999 : 14265), nodes: []};
    }

    try {
      if (electron.screen) {
        var displaySize = electron.screen.getPrimaryDisplay().workAreaSize;

        if (displaySize.width < settings.bounds.width+100 || displaySize.height < settings.bounds.height+100) {
          settings.bounds.height = displaySize.height - 100;
          settings.bounds.width = Math.round(settings.bounds.height / 16 * 11);
        }
      }
    } catch (err) {}
  }

  App.saveSettings = function() {
    try {
      if (App.uiIsReady && !win.isFullScreen()) {
        settings.bounds = win.getBounds();
      }

      if (selectedJavaLocation) {
        settings.javaLocation = selectedJavaLocation;
      } else {
        settings.javaLocation = "";
      }

      settings.isFirstRun = 0;

      var settingsFile = path.join(electron.app.getPath("appData"), "IOTA Wallet" + (isTestNet ? " Testnet" : "") + path.sep + "settings.json");

      fs.writeFileSync(settingsFile, JSON.stringify(settings));
    } catch (err) {
      console.log("Error writing settings:");
      console.log(err);
    }
  }

  App.checkLaunchArguments = function() {
    if (process.argv.length == 1 || process.argv.indexOf("--dev") != -1) {
      return [];
    } else {
      launchArguments = [];

      // Ignore first argument
      for (var i=1; i<process.argv.length; i++) {
        if (/^iota:\/\//i.test(process.argv[i])) {
          launchURL = process.argv[i];
        // Mac has this argument on first launch: -psn_0_93145295
        // main.js is added when npm run start from App folder..
        } else if (!/^\-psn/i.test(process.argv[i]) && process.argv[i] != "app/js/main.js") {
          launchArguments.push(process.argv[i]);
        }
      }

      if (launchArguments && launchArguments.length) {
        console.log("Launch arguments:");
        console.log(launchArguments);
      }

      if (launchURL) {
        console.log("Launch URL:");
        console.log(launchURL);
      }
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
      var feedURL = "https://iotatoken.com/latest-osx.php?v=" + appVersion;
    } else {
      var feedURL = "https://iotatoken.com/latest-win.php?v=" + appVersion + "&arch=" + (is64BitOS ? "64" : "32");
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
    var windowOptions = {"width"           : settings.bounds.width,
                         "height"          : settings.bounds.height,
                         "minWidth"        : 305,
                         "minHeight"       : 424,
                         "backgroundColor" : "#4DC1B5",
                         "center"          : true,
                         "show"            : false};

    if (settings.bounds.hasOwnProperty("x") && settings.bounds.hasOwnProperty("y")) {
      windowOptions.x = settings.bounds.x;
      windowOptions.y = settings.bounds.y;
    }

    if (loadingWin) {
      loadingWin.hide();
      loadingWin.destroy();
      loadingWin = null;
    }

    if (otherWin) {
      console.log("destory it");
      otherWin.hide();
      otherWin.destroy();
    }

    App.uiIsInitialized = false;
    App.uiIsReady = false;

    win = new electron.BrowserWindow(windowOptions);

    win.loadURL("file://" + appDirectory.replace(path.sep, "/") + "/index.html?showStatus=" + settings.showStatusBar + "&isFirstRun=" + settings.isFirstRun);
    //win.toggleDevTools({mode: "undocked"});
    win.setAspectRatio(11 / 16);

    // Run the following from the Console tab of your app's DevTools
    // require('devtron').install()
    // http://electron.atom.io/devtron/

    App.createMenuBar();

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

    var handleRedirect = function(e, url) {
      if (url != win.webContents.getURL()) {
        e.preventDefault();
        shell.openExternal(url);
      }
    }

    win.webContents.on("new-window", handleRedirect);
    win.webContents.on("will-navigate", handleRedirect);

    win.webContents.once("did-finish-load", function() {
      App.updateTitle(true);
    });
  }

  App.createMenuBar = function(simple) {
    var template = [];

    template.push(
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          role: "undo"
        },
        {
          label: "Redo",
          accelerator: "Shift+CmdOrCtrl+Z",
          role: "redo"
        },
        {
          type: "separator"
        },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut"
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy"
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste"
        },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          role: "selectall"
        },
      ]
    });

    if (!simple) {
      template.push(
      {
        label: "View",
        submenu: [
          {
            label: (settings.showStatusBar ? "Hide Status Bar" : "Show Status Bar"),
            accelerator: "CmdOrCtrl+/",
            click() {
              App.toggleStatusBar();
            }
          },
          {
            label: "Toggle Web Inspector",
            accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
            click() {
              win.webContents.send("toggleDeveloperTools");
            }
          },
          {
            label: "Enter Full Screen",
            accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
            click() {
              win.setFullScreen(!win.isFullScreen());
            }
          }
        ]
      });

      template.push(
      {
        label: "Tools",
        submenu: [
          {
            label: "View Node Info",
            accelerator: "CmdOrCtrl+I",
            click(item) {
              App.showNodeInfo();
            }
          },
          {
            label: "View Neighbors",
            click(item) {
              App.showPeers();
            }
          },
          {
            label: "View Server Log",
            accelerator: "CmdOrCtrl+L",
            click(item) {
              App.showServerLog();
            }
          },
          {
            type: "separator"
          },
          {
            label: "Generate Seed",
            click(item) {
              App.generateSeed();
            }
          },
          {
            label: "Claim Process",
            click(item) {
              App.claimProcess();
            }
          },
          {
            label: "Network Spammer",
            click(item) {
              App.showNetworkSpammer();
            }
          },
          {
            type: "separator"
          },
          {
            label: "Open Database Folder",
            //accelerator: "CmdOrCtrl+I",
            click(item) {
              App.openDatabaseFolder();
            }
          },
          {
            label: "Edit Server Configuration",
            //accelerator: "CmdOrCtrl+E",
            click(item) {
              App.editNodeConfiguration();
            }
          },
          {
            type: "separator"
          },
          {
            label: "Options",
            accelerator: "CmdOrCtrl+O",
            click() {
              App.showPreferences();
            }
          },
          {
            type: "separator",
          },
          {
            label: "Switch to Light Node",
            click() {
              App.switchNodeType();
            }
          }
        ]
      });

      if (settings.lightWallet == 1) {
        template[2].submenu[13].label = "Switch to Full Node";
        // Remove "open database folder" and "edit server config" options.
        template[2].submenu.splice(2, 1);
        template[2].submenu.splice(7, (process.platform == "darwin" ? 4 : 2)); //Remove "preferences" on mac too
      } else {
        if (settings.lightWallet == -1) {
          //remove the switch to light / full node link
          template[2].submenu.splice(12, 2);
        }
        if (process.platform == "darwin") {
          template[2].submenu.splice(10, 2);
        }
      }
    }

    template.push(
    {
      label: "Window",
      role: "window",
      submenu: [
        {
          label: "Minimize",
          accelerator: "CmdOrCtrl+M",
          role: "minimize"
        },
        {
          label: "Close",
          accelerator: "CmdOrCtrl+W",
          role: "close"
        },
      ]
    });

    template.push(
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          label: "FAQ",
          click() {
            App.showFAQ();
          }
        },
        {
          label: "Official Website",
          click() { shell.openExternal("https://iotatoken.com/"); }
        },
        {
          label: "Forum",
          click() { shell.openExternal("https://forum.iotatoken.com/"); }
        },
        {
          label: "Chat",
          click() { shell.openExternal("https://slack.iotatoken.com/"); }
        },
        {
          label: "Documentation",
          click() { shell.openExternal("https://iota.readme.io/docs"); }
        }
      ]
    });

    if (simple) {
      //remove FAQ
      template[2].submenu.splice(0, 1);
    }

    if (process.platform === "darwin") {
      const name = electron.app.getName();
      template.unshift({
        label: name,
        submenu: [
          {
            label: "About " + name,
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
            label: "Preferences...",
            accelerator: "Command+,",
            click() {
              App.showPreferences();
            }
          },
          {
            type: "separator"
          },
          {
            label: "Services",
            role: "services",
            submenu: []
          },
          {
            type: "separator"
          },
          {
            label: "Hide " + name,
            accelerator: "Command+H",
            role: "hide"
          },
          {
            label: "Hide Others",
            accelerator: "Command+Alt+H",
            role: "hideothers"
          },
          {
            label: "Show All",
            role: "unhide"
          },
          {
            type: "separator"
          },
          {
            label: "Quit",
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
          label: "Bring All to Front",
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

  App.findDirectories = function() {
    try {
      appDataDirectory = path.join(electron.app.getPath("appData"), "IOTA Wallet" + (isTestNet ? " Testnet" : ""));
      
      if (settings.hasOwnProperty("db")) {
        serverDirectory = settings.db;
      } else {
        serverDirectory = path.join(appDataDirectory, "iri");
      }

      jarDirectory     = path.join(resourcesDirectory, "iri");

      if (!fs.existsSync(appDataDirectory)) {
        fs.mkdirSync(appDataDirectory);
      }

      if (!fs.existsSync(serverDirectory)) {
        fs.mkdirSync(serverDirectory);
      }
    } catch (err) {
      console.log("Error:");
      console.log(err);
    }
  }

  App.start = function() {
    if (settings.lightWallet == -1 || (settings.lightWallet == 1 && (!settings.lightWalletHost || !settings.lightWalletPort)) || (settings.lightWallet == 0 && settings.nodes.length == 0)) {
      App.showSetupWindow();
    } else if (settings.lightWallet == 1) {
      App.startLightNode();
    } else {
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
      javaLocations.push(path.join(electron.app.getPath("appData"), "IOTA Wallet/java/bin/java" ));
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
            } else if (javaVersionOK && !ia32JavaLocation) {
              console.log("Found 32-bits java.");
              ia32JavaLocation = location;
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
    } else if (ia32JavaLocation) {
      console.log("Start 32 bit java.");
      App.startFullNodeProcess(ia32JavaLocation);
    } else {
      App.showNoJavaInstalledWindow();
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

      try {
        if (oneTimeJavaArgs) {
          if (oneTimeJavaArgs != -1) {
            var spawnargs = require("spawn-args");
            params = spawnargs(oneTimeJavaArgs);
          }
        } else if (launchArguments.length) {
          params = launchArguments;
        } else if (settings.javaArgs) {
          var spawnargs = require("spawn-args");
          params = spawnargs(settings.javaArgs);
        }
      } catch (err) {
        console.log("Error:");
        console.log(err);
      }

      params.push("-XX:+DisableAttachMechanism");

      params = params.unique();

      params.push("-jar");

      params.push(path.join(jarDirectory, "iri" + (isTestNet ? "-testnet" : "") + ".jar"));

      params.push("-e");

      params.push("-p");
      params.push(settings.port);

      if (settings.nodes) {
        params.push("-n");
        params.push(settings.nodes.join(" "));
      }

      params.push("--headless");

      console.log(params.join(" "));

      serverOutput = [];

      server = childProcess.spawn(javaLocation, params, {
        "cwd": serverDirectory,
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
            App.showAlertAndQuit("Server exited", "The Iota server process has exited.");
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
    if (server && server.exitCode == null) {
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
    }, 500);
  }

  App.openDatabaseFolder = function(file) {
    if (!file) {
      file = "transactions.iri";
    }

    try {
      shell.showItemInFolder(path.join(serverDirectory, file));
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
    App.updateNodeConfiguration({"lightWallet": settings.lightWallet == 1 ? 0 : 1});
  }

  App.relaunchApplication = function(javaArgs) {
    if (javaArgs) {
      oneTimeJavaArgs = javaArgs;
    } else {
      oneTimeJavaArgs = -1;
    }

    App.killNode(function() {
      App.showDefaultWindow();

      isStarted = false;
      didKillNode = false;
      nodeInitializationError   = false;
      lastError = "";
      isRelaunch = true;
      iriVersion = "";
      serverOutput = [];

      App.start();
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

    if (oneTimeJavaArgs) {
      if (oneTimeJavaArgs == -1) {
        settings.javaArgs = "";
      } else {
        settings.javaArgs = oneTimeJavaArgs;
      }
      oneTimeJavaArgs = false;
    }

    try {
      if (loadingWin) {
        loadingWin.hide();
        loadingWin.destroy();
      }
      App.updateTitle(true);
      win.webContents.send("nodeStarted", "file://" + path.join(resourcesDirectory, "ui").replace(path.sep, "/") + "/index.html", {"inApp": 1, "showStatus": settings.showStatusBar, "host": (settings.lightWallet == 1 ? settings.lightWalletHost : "http://localhost"), "port": (settings.lightWallet == 1 ? settings.lightWalletPort : settings.port), "depth": settings.depth, "minWeightMagnitude": settings.minWeightMagnitude});
    } catch (err) {
      console.log("Error:");
      console.log(err);
    }
  }

  App.checkServerOutput = function(data, type) {
    if (!isStarted && !didKillNode && !nodeInitializationError)   {
      if (type == "error") {        
        if (data.match(/java\.net\.BindException/i)) {
          lastError = "The server address is already in use. Please close any other apps/services that may be running on port " + String(settings.port).escapeHTML() + ".";
        } else if (data.match(/URI Syntax Exception/i) || data.match(/Illegal Argument Exception/i)) {
          lastError == "Invalid arguments list.";
        } else {
          var error = data.match(/ERROR\s*com\.iota\.iri\.IRI\s*\-\s*(.*)/i);
          if (error && !lastError.match(/Invalid arguments list|server address is already in use/i)) {
            lastError = error[1];
          }
        }
      } else {
        // This can result in errors.. Need to have a real response from the console instead of just this.
        var iri = data.match(/Welcome to IRI (Testnet)?\s*([0-9\.]+)/i);
        if (iri) {
          //don't run mainnet IRI in testnet GUI, and other way around
          if (isTestNet && !iri[1] || !isTestNet && iri[1]) {
            App.quit();
          }
          iriVersion = iri[2];
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
    }
    if (isLookingAtServerLog && win && win.webContents) {
      win.webContents.send("appendToServerLog", data);
    }
    if (serverOutput.length > 1000) {
      serverOutput.shift();
    }
  }

  App.toggleStatusBar = function() {
    if (App.uiIsReady) {
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

  App.startTrackingCPU = function() {
    if (cpuTrackInterval) {
      clearInterval(cpuTrackInterval);
    }

    cpuTrackInterval = setInterval(App.trackCPU, 15000);

    App.trackCPU();
  }

  App.stopTrackingCPU = function() {
    if (cpuTrackInterval) {
      clearInterval(cpuTrackInterval);
    }
    App.updateStatusBar({"cpu": ""});
  }

  App.trackCPU = function() {
    if (server && server.pid) {
      var pid = server.pid;

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
    if (settings.showStatusBar && win && win.webContents) {
      win.webContents.send("hoverAmountStart", amount);
    }
  }

  App.hoverAmountStop = function() {
    if (settings.showStatusBar && win && win.webContents) {
      win.webContents.send("hoverAmountStop");
    }
  }

  App.showWindowIfNotVisible = function() {
    if (App.uiIsReady && win && !win.isVisible()) {
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

    // Reset selected java location. (will be saved in settings)
    var args = "";

    if (oneTimeJavaArgs) {
      if (oneTimeJavaArgs != -1) {
        args = oneTimeJavaArgs;
      }
      oneTimeJavaArgs = false;
    } else if (launchArguments.length) {
      args = launchArguments.join(" ");
    } else if (settings.javaArgs) {
      args = settings.javaArgs;
    }

    if (!title) {
      title = "Initialization Alert";
    }

    if (!msg) {
      msg = (lastError ? lastError : "A server initialization error occurred.");
    }

    if (msg.match(/Invalid arguments list/i)) {
      msg = "Invalid arguments list.";
    }

    if (!selectedJavaLocation) {
      selectedJavaLocation = "java";
    }

    var updateNodeConfiguration = msg.match(/Exception during IOTA node initialisation|Invalid arguments list/i) != null;

    if (updateNodeConfiguration && (!settings.nodes || settings.nodes.length == 0)) {
      title = "Initialization";
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
                                           "javaArgs"                : args,
                                           "serverOutput"            : serverOutput,
                                           "javaVersionOK"           : javaVersionOK,
                                           "java64BitsOK"            : java64BitsOK,
                                           "is64BitOS"               : is64BitOS,
                                           "updateNodeConfiguration" : updateNodeConfiguration,
                                           "port"                    : settings.port,
                                           "nodes"                   : settings.nodes});
      });
    } else {
      App.showWindow("init_error.html", {"title"                   : title,
                                         "message"                 : msg,
                                         "javaArgs"                : args, 
                                         "serverOutput"            : serverOutput, 
                                         "updateNodeConfiguration" : updateNodeConfiguration,
                                         "port"                    : settings.port,
                                         "nodes"                   : settings.nodes});
    }

    selectedJavaLocation = "";
  }

  App.showAlertAndQuit = function(title, msg) {
    if (!App.uiIsReady) {
      App.showWindow("quit.html", {"title": title, "message": msg});
    } else {
      App.showWindowIfNotVisible();
      win.webContents.send("showAlertAndQuit", "<h1>" + title + "</h1><p>" + msg + "</p>", serverOutput);
    }
  }

  App.showKillAlert = function() {
    if (!App.uiIsReady) { return; }
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
      otherWin.toggleDevTools({mode: "undocked"});
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
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showNodeInfo");
    }
  }

  App.showPeers = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showPeers");
    }
  }

  App.showFAQ = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showFAQ");
    }
  }

  App.generateSeed = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("generateSeed");
    }
  }

  App.claimProcess = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showClaimProcess");
    }
  }
  
  App.showNetworkSpammer = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showNetworkSpammer");
    }
  }

  App.editNodeConfiguration = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("editNodeConfiguration", {"port": settings.port, "depth": settings.depth, "minWeightMagnitude": settings.minWeightMagnitude, "nodes": settings.nodes.join("\r\n"), "testNet": isTestNet});
    }
  }

  App.checkNodeValidity = function(node) {
    var result = /^udp:\/\/(.*):([0-9]+)$/i.exec(node);

    if (!result) {
      console.log("Node: " + node + " is invalid.");
      return false;
    }

    return true;

    //ipv6: https://bitbucket.org/intermapper/ipv6-validator/
    var REGEX_IPV6 = /^((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/;

    //ipv4: https://github.com/subchen/snack-validation/blob/7526a73831276d33115ee090575428b7cb2ec639/lib/ipv4.js
    var REGEX_IPV4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}?(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    var valid = REGEX_IPV4.exec(result[1]) || REGEX_IPV6.exec(result[1]);

    if (!valid) {
      console.log("Node: " + node + " is invalid.");
    }

    return valid;
  }

  App.updateNodeConfiguration = function(configuration, javaArgs) {
    try {
      if (!configuration) {
        configuration = {};
      }

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

        settings.nodes = nodes;
      }

      if (configuration.hasOwnProperty("port")) {
        settings.port = parseInt(configuration.port, 10);
      }

      if (configuration.hasOwnProperty("depth")) {
        settings.depth = parseInt(configuration.depth, 10);
      }

      if (configuration.hasOwnProperty("minWeightMagnitude")) {
        settings.minWeightMagnitude = parseInt(configuration.minWeightMagnitude, 10);

        if (!isTestNet && settings.minWeightMagnitude < 18) {
          settings.minWeightMagnitude = 18;
        } else if (isTestNet && settings.minWeightMagnitude < 13) {
          settings.minWeightMagnitude = 13;
        }
      }

      if (configuration.hasOwnProperty("lightWallet")) {
        settings.lightWallet = parseInt(configuration.lightWallet, 10);
      }

      if (configuration.hasOwnProperty("lightWalletHost")) {
        settings.lightWalletHost = configuration.lightWalletHost;
      }

      if (configuration.hasOwnProperty("lightWalletPort")) {
        settings.lightWalletPort = parseInt(configuration.lightWalletPort, 10);
      }

      App.saveSettings();
      App.relaunchApplication(javaArgs);
    } catch (err) {
      console.log("Error:");
      console.log(err);
    }
  }

  App.addNeighborNode = function(node) {
    try {
      node = String(node).trim();

      if (!node || !App.checkNodeValidity(node)) {
        return;
      }

      settings.nodes.push(node);
      settings.nodes = settings.nodes.unique();

      App.saveSettings();
    } catch (err) {
      console.log("Error:");
      console.log(err);
    }
  }

  App.showServerLog = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      isLookingAtServerLog = true;
      win.webContents.send("showServerLog", serverOutput);
    }
  }

  App.stopLookingAtServerLog = function() {
    isLookingAtServerLog = false;
  }

  App.showModal = function(identifier, html) {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showModal", identifier, html);
    }
  }

  App.showPreferences = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();

      if (process.platform != "linux") {
        var loginSettings = electron.app.getLoginItemSettings();
      } else {
        var loginSettings = {"openAtLogin": false};
      }

      win.webContents.send("showPreferences", {"javaArgs": settings.javaArgs, "openAtLogin": loginSettings.openAtLogin});
    }
  }

  App.updatePreferences = function(updatedSettings) {
    settings.javaArgs = updatedSettings.javaArgs;

    if (process.platform != "linux") {
      var loginSettings = electron.app.getLoginItemSettings();

      if (updatedSettings.openAtLogin != loginSettings.openAtLogin) {
        electron.app.setLoginItemSettings({"openAtLogin": updatedSettings.openAtLogin, "openAsHidden": true});
      }
    }
  }

  App.showUpdateAvailable = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateAvailable");
    }
  }

  App.showUpdateDownloaded = function(releaseNotes, releaseName, releaseDate) {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateDownloaded", releaseNotes, releaseName, releaseDate);
    }
  }

  App.showUpdateError = function(error) {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateError", error);
    }
  }

  App.showCheckingForUpdate = function() {
    if (App.uiIsReady) {
      App.showWindowIfNotVisible();
      win.webContents.send("showCheckingForUpdate");
    }
  }

  App.showUpdateNotAvailable = function() {
    if (App.uiIsReady) {
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

  App.rendererIsReady = function() {
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

  App.notify = function(type, msg) {
    if (App.uiIsReady) {
      win.webContents.send("notify", type, msg);
    }
  }

  App.handleURL = function(url) {
    console.log("App.handleURL: " + url);

    if (App.uiIsReady) {
      win.webContents.send("handleURL", url);
      if (url == launchURL) {
        launchURL = null;
      }
    } else if (!launchURL) {
      launchURL = url;
    }
  }

  App.updateStatusBar = function(data) {
    if (App.uiIsReady) {
      win.webContents.send("updateStatusBar", data);
    }
  }

  App.updateAppInfo = function(data) {
    var _isTestNet = data.name.match(/testnet/i);
    if (_isTestNet != isTestNet) {
      //user is connecting to a testnet node with non-testnet app, do not allow... TODO
    }

    iriVersion = data.version;

    App.updateTitle(true);
  }

  App.updateTitle = function(includeNodeType) {
    if (win) {
      win.setTitle("IOTA " + (includeNodeType && settings.lightWallet == 1 ? "Light " : "") + "Wallet " + String(appVersion.replace("-testnet", "")).escapeHTML() + (isTestNet ? " - Testnet" : "") + (iriVersion ? " - IRI " + String(iriVersion).escapeHTML() : ""));
    }
  }

  App.upgradeIRI = function(sourceFile) {
    console.log("App.upgradeIRI: " + sourceFile);

    if (sourceFile.match(/iri.*\.jar$/i)) {
      try {
        App.killAlreadyRunningProcess(true);

        var jarDirectory = path.join(resourcesDirectory, "iri");

        var targetFile = path.join(jarDirectory, "iri" + (isTestNet ? "-testnet" : "") + ".jar");

        fs.unlinkSync(targetFile);
        fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
      } catch (err) {
        console.log("Error:");
        console.log(err);
      }

      App.relaunchApplication();
    }
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
      } else if (String(commandLine[1]).match(/iri.*\.jar$/i)) {
        App.upgradeIRI(commandLine[1]);
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

electron.app.on("open-file", function(event, file) {
  if (file.match(/iri.*\.jar$/i)) {
    App.upgradeIRI(commandLine[1]);
  }
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

electron.ipcMain.on("relaunchApplication", function(event, config, javaArgs) {
  App.relaunchApplication(config, javaArgs);
});

electron.ipcMain.on("killAlreadyRunningProcessAndRestart", App.killAlreadyRunningProcessAndRestart);

electron.ipcMain.on("rendererIsInitialized", function() {
  App.rendererIsInitialized();
});

electron.ipcMain.on("rendererIsReady", function() {
  App.rendererIsReady();
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

electron.ipcMain.on("editNodeConfiguration", App.editNodeConfiguration);

electron.ipcMain.on("addNeighborNode", function(event, node) {
  App.addNeighborNode(node);
});

electron.ipcMain.on("upgradeIRI", function(event, sourceFile) {
  App.upgradeIRI(sourceFile);
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