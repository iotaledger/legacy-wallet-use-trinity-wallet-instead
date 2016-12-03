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
  var jarDirectory              = "";
  var serverDirectory           = "";
  var javaLocations             = [];
  var selectedJavaLocation;
  var currentLocationTest       = 0;
  var serverInitializationError = false;
  var serverOutput              = [];
  var doNotQuit                 = false;
  var callback                  = null;
  var isClosing                 = false;
  var isClosed                  = false;
  var didKillServer             = false;
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
  var isTestNet                 = false;

  App.uiIsReady                 = false;
  App.uiIsInitialized           = false;
  App.doServerStarted           = false;

  App.initialize = function() {
    if (process.platform == "darwin") {
      var appPath = electron.app.getPath("exe");
      if (process.execPath.match(/\/Volumes\/IOTA Wallet/i)) {
        App.showOtherWindow("mac_volume.html");
        return;
      }
    }

    // https://github.com/electron/electron/issues/6044#issuecomment-226061244
    if (process.platform == "win32") {
      is64BitOS = process.arch == "x64" || process.env.PROCESSOR_ARCHITECTURE == "AMD64" || process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432");
    } else {
      is64BitOS = process.arch == "x64";
    }

    console.log("Is 64 bit OS: " + is64BitOS);

    App.loadSettings();

    App.checkLaunchArguments();

    App.createWindow();

    App.findServerDirectory();

    if (!electron.app.isDefaultProtocolClient("iota")) {
      console.log("Register iota as a default protocol");
      electron.app.setAsDefaultProtocolClient("iota"); //not linux
    }

    App.startServer();
  }

  App.quit = function() {
    electron.app.quit();
  }

  App.loadSettings = function() {
    try {
      var settingsFile = path.join(electron.app.getPath("appData"), "IOTA Wallet" + path.sep + "settings.json");

      if (!fs.existsSync(settingsFile)) {
        throw "Settings file does not exist.";
      }

      settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));

      if (!settings.hasOwnProperty("bounds") || typeof(settings.bounds) != "object") {
        settings.bounds = {width: 520, height: 736};
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
        settings.port = 14265;
      }
      if (!settings.hasOwnProperty("depth")) {
        settings.depth = 3;
      }
      if (!settings.hasOwnProperty("minWeightMagnitude")) {
        settings.minWeightMagnitude = 18;
      }
      if (!settings.hasOwnProperty("nodes") || typeof settings.nodes != "object") {
        settings.nodes = [];
      }
      console.log(settings);
    } catch (err) {
      console.log("Error reading settings.");
      console.log(err);
      settings = {bounds: {width: 520, height: 736}, javaArgs: "", checkForUpdates: 1, lastUpdateCheck: 0, showStatusBar: 0, isFirstRun: 1, port: 14265, nodes: []};
    }

    try {
      if (electron.screen) {
        var displaySize = electron.screen.getPrimaryDisplay().workAreaSize;

        console.log("Display size:");
        console.log(displaySize);

        if (displaySize.width < settings.bounds.width+100 || displaySize.height < settings.bounds.height+100) {
          settings.bounds.height = displaySize.height - 100;
          settings.bounds.width = Math.round(settings.bounds.height / 16 * 11);
          console.log("Updated bounds");
        } else {
          console.log("Not updating bounds");
        }

        console.log(settings.bounds);
      }
    } catch (err) {}
  }

  App.saveSettings = function() {
    try {
      if (win && !win.isFullScreen()) {
        settings.bounds = win.getBounds();
      }

      if (selectedJavaLocation) {
        settings.javaLocation = selectedJavaLocation;
      } else {
        settings.javaLocation = "";
      }

      settings.isFirstRun = 0;

      var settingsFile = path.join(electron.app.getPath("appData"), "IOTA Wallet" + path.sep + "settings.json");

      fs.writeFileSync(settingsFile, JSON.stringify(settings));
    } catch (err) {
      console.log("Error writing settings.");
      console.log(err);
    }
  }

  App.checkLaunchArguments = function() {
    console.log("Checking launch arguments...");

    if (process.argv.length == 1 || process.argv.indexOf("--dev") != -1) {
      console.log("No launch arguments.");
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

      console.log("Launch arguments:");
      console.log(launchArguments);

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

  App.createWindow = function(onReady) {
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

    console.log("Window options:");
    console.log(windowOptions);

    win = new electron.BrowserWindow(windowOptions);

    win.loadURL("file://" + path.dirname(__dirname) + "/index.html?showStatus=" + settings.showStatusBar + "&isFirstRun=" + settings.isFirstRun);
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

      App.killServer(function() {
        isClosed = true;
        electron.app.quit();
      });
    });

    win.on("closed", function () {
      win = null
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
      win.setTitle("IOTA Wallet " + String(appVersion).escapeHTML() + (iriVersion ? " - IRI " + String(iriVersion).escapeHTML() + (isTestNet ? " Testnet" : "") : ""));

      if (onReady) {
        onReady();
      }
    });
  }

  App.createMenuBar = function() {
    console.log("Creating menu bar.");

    var toggleStatusBarText = (settings.showStatusBar ? "Hide Status Bar" : "Show Status Bar");

    const template = [
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
      },
      {
        label: "View",
        submenu: [
          {
            label: toggleStatusBarText,
            accelerator: "CmdOrCtrl+/",
            click() {
              App.toggleStatusBar();
            }
          },
          /*
          {
            label: "Reload",
            accelerator: "CmdOrCtrl+R",
            click() {
              App.serverStarted();
            }
          },*/
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
      },
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
            //accelerator: "CmdOrCtrl+N",
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
              App.editServerConfiguration();
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
          }
        ]
      },
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
      },
      {
        label: "Help",
        role: "help",
        submenu: [
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
      },
    ];

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
      // Window menu.
      template[4].submenu.push(
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

      // Remove preferences (other location on mac)
      template[3].submenu.splice(10, 2);
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

    const menu = electron.Menu.buildFromTemplate(template);
    electron.Menu.setApplicationMenu(menu);
  }

  App.findServerDirectory = function() {
    try {
      serverDirectory = path.join(electron.app.getPath("appData"), "IOTA Wallet" + path.sep + "iri");
      jarDirectory    = path.join(path.dirname(path.dirname(path.dirname(__dirname))), "iri");

      console.log("Server directory is: " + serverDirectory);
      console.log("Jar directory is: " + jarDirectory);

      if (!fs.existsSync(serverDirectory)) {
        console.log("Creating server directory.");
        fs.mkdirSync(serverDirectory);
      }
    } catch (err) {
      console.log("err:");
      console.log(err);
    }
  }

  App.startServer = function() {
    if (settings.javaLocation && (settings.javaLocation == "java" || fs.existsSync(settings.javaLocation))) {
      console.log("Using java from settings: " + settings.javaLocation);

      //make sure that java has not been uninstalled, throws an error on windows otherwise (in startServerProcess spawn)
      if (settings.javaLocation == "java") {
        console.log("Check to make sure java version still works.");

        var child = childProcess.execFile("java", ["-version"]);
        var notInstalled = false;

        child.on("error", function(err) {
          console.log("Error");
          console.log(err);
          notInstalled = true;
          App.findJavaLocations();
          App.checkJavaLocation(javaLocations[currentLocationTest]);
        });
        child.on("exit", function() {
          console.log("Exit version check.");
          if (!notInstalled) {
            App.startServerProcess(settings.javaLocation);
          }
        });
      } else {
        App.startServerProcess(settings.javaLocation);
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
        console.log("Error during glob");
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
        console.log("Error during glob");
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
              App.startServerProcess(location);
            } else if (javaVersionOK && !ia32JavaLocation) {
              console.log("Found 32-bits java.");
              ia32JavaLocation = location;
            }
          }
        });

        child.on("error", function(err) {
          console.log("Error");
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
      App.startServerProcess(ia32JavaLocation);
    } else {
      App.showNoJavaInstalledWindow();
    }
  }

  App.startServerProcess = function(javaLocation) {
    console.log("Start server process.");

    if (!javaLocation) {
      javaLocation = selectedJavaLocation;
    } else {
      selectedJavaLocation = javaLocation;
    }

    console.log(javaLocation);

    try {
      var pid = App.getAlreadyRunningProcess();

      console.log("PID = " + pid);

      if (pid) {
        App.showAlreadyRunningProcessAlert();
        if (win) {
          win.hide();
        }
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
        console.log(err);
      }

      params.push("-XX:+DisableAttachMechanism");

      params = params.unique();

      params.push("-jar");

      params.push(path.join(jarDirectory, "iri.jar"));

      if (settings.port) {
        params.push(settings.port);
      } else {
        params.push(14265);
      }

      if (settings.nodes) {
        params = params.concat(settings.nodes);
      }

      console.log(params);

      serverOutput = [];

      server = childProcess.spawn(javaLocation, params, {
        "cwd": serverDirectory,
        "detached": true
      }, function(err) {
        if (err) {
          if (!didKillServer && !isStarted && !serverInitializationError) {
            selectedJavaLocation = "";
            App.saveSettings();
            App.showInitializationAlert();
          }
        }
      });

      server.stdout.setEncoding("utf8");
      server.stderr.setEncoding("utf8");

      server.stdout.on("data", function(data) {
        App.logServerOutput(data);
        App.checkServerOutput(data);
      });

      server.stderr.on("data", function(data) {
        App.logServerOutput(data);
        App.checkServerOutput(data);

        if (!isStarted && !didKillServer && !serverInitializationError) {
          //&& data.match(/java\.lang\.ExceptionInInitializerError|java\.net\.BindException|java\.lang\.IllegalArgumentException/i)) {
          serverInitializationError = true;

          var msg = "";

          if (data.match(/java\.net\.BindException/i)) {
            msg = "The server address is already in use. Please close any other apps/services that may be running on port " + (settings.port ? String(settings.port).escapeHTML() : "14265") + ".";
          }

          App.showInitializationAlert(null, msg);
        }
      });

      server.on("exit", function(code) {
        if (code == null) {
          server.exitCode = -1;
        }

        App.logServerOutput("Process exited with status " + code);

        /*
        // Kill not initiated by user or app.
        if (!didKillServer) {
          didKillServer = false;
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
        } else if (!didKillServer) {
          if (!isStarted) {
            App.showInitializationAlert();
          } else {
            App.showAlertAndQuit("Server exited", "The Iota server process has exited.");
          }
        } else if (!doNotQuit) {
          remote.getCurrentWindow().close();
        }
      });
    } catch (err) {
      console.log(err);
      App.showInitializationAlert();
    }
  }

  App.killServer = function(fn) {
    if (server && server.exitCode == null) {
      App.showKillAlert();
    }

    setTimeout(function() {
      if (server && server.exitCode == null) {
        isStarted = false;
        serverInitializationError = false;
        didKillServer = true;
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
    console.log("Get running process");

    try {
      if (process.platform == "win32") {
        //" + String(command).replace(/\\/g, "\\\\") + "
        var output = childProcess.execSync("wmic process where \"commandline LIKE '%jar %iri.jar'\" get processid");

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
        var output = childProcess.execSync("ps gx | grep \"[j]ar .*IRI\.jar$\"");

        output = output.toString().trim();

        var pid = output.match(/^[0-9]+\s/);

        if (pid) {
          console.log("return " + pid);
          return pid;
        } else {
          console.log("PID not found");
        }
      }
    } catch (err) {
    }

    return 0;
  }

  App.relaunchApplication = function(javaArgs) {
    oneTimeJavaArgs = javaArgs;

    App.killServer(function() {
      if (otherWin) {
        otherWin.removeAllListeners("closed");

        otherWin.on("closed", function() {
          global.hasOtherWin = false;
          otherWin = null;
        });

        otherWin.close();
      }

      if (win) {
        win.webContents.send("relaunch");
        //win.reload();
        win.hide();
        App.createMenuBar();
      }

      isStarted = false;
      didKillServer = false;
      isRelaunch = true;

      if (selectedJavaLocation) {
        App.startServerProcess();
      } else {
        App.startServer();
      }
    });
  }

  App.killAlreadyRunningProcessAndRestart = function() {
    App.killAlreadyRunningProcess(true);
    App.relaunchApplication();
  }

  App.killAlreadyRunningProcess = function(wait) {
    var pid;

    pid = App.getAlreadyRunningProcess();

    console.log("PID = " + pid);

    if (pid) {
      try {
        console.log("Kill PID");
        if (process.platform == "win32") {
          var out = childProcess.exec("taskkill /T /PID " + pid);
        } else {
          var out = childProcess.exec("kill " + pid);
        }

        var then = new Date();

        if (wait) {
          while (App.getAlreadyRunningProcess()) {
            console.log("Waiting...");
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

  App.serverStarted = function() {
    console.log("Server is started");
    if (oneTimeJavaArgs) {
      if (oneTimeJavaArgs == -1) {
        settings.javaArgs = "";
      } else {
        settings.javaArgs = oneTimeJavaArgs;
      }
      oneTimeJavaArgs = false;
    }

    if (!App.uiIsInitialized) {
      App.doServerStarted = true;
      return;
    }

    isStarted = true;

    try {
      win.setTitle("IOTA Wallet " + String(appVersion).escapeHTML() + (iriVersion ? " - IRI " + String(iriVersion).escapeHTML() + (isTestNet ? " Testnet" : "") : ""));
      win.webContents.send("serverStarted", "file://" + path.join(path.dirname(path.dirname(__dirname)), "ui").replace(path.sep, "/") + "/index.html", {"inApp": 1, "showStatus": settings.showStatusBar, "depth": settings.depth, "minWeightMagnitude": settings.minWeightMagnitude});
    } catch (err) {
      console.log("err:");
      console.log(err);
    }
  }

  App.checkServerOutput = function(data) {
    if (!isStarted && !didKillServer) {
      // This can result in errors.. Need to have a real response from the console instead of just this.
      var iri = data.match(/IRI (Testnet)?\s*([0-9\.]+)/i);
      if (iri) {
        if (iri[1]) {
          isTestNet = true;
          if (settings.minWeightMagnitude < 13) {
            settings.minWeightMagnitude = 13;
          }
        } else {
          isTestNet = false;
          if (settings.minWeightMagnitude < 18) {
            settings.minWeightMagnitude = 18;
          }
        }
        iriVersion = iri[2];
        App.serverStarted();
      }
      /*
      if (data.match(/Transactions to request|Following coordinator/i)) {
        App.serverStarted();
      }*/
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
    serverOutput.push(data);
    if (isLookingAtServerLog && win && win.webContents) {
      win.webContents.send("appendToServerLog", data);
    }
    if (serverOutput.length > 1000) {
      serverOutput.shift();
    }
  }

  App.toggleStatusBar = function() {
    if (win && win.webContents) {
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
    console.log("Start tracking CPU");

    if (cpuTrackInterval) {
      clearInterval(cpuTrackInterval);
    }

    cpuTrackInterval = setInterval(App.trackCPU, 15000);

    App.trackCPU();
  }

  App.stopTrackingCPU = function() {
    console.log("Stop tracking CPU");
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
          console.log("Error tracking CPU");
          console.log(err);
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
    if (win) {
      if (!win.isVisible()) {
        win.show();
      }
    }
  }

  App.showInitializationAlert = function(title, msg) {
    serverInitializationError = true;

    // Reset selected java location. (will be saved in settings)
    var args = "";

    console.log("Show initialization alert");

    if (oneTimeJavaArgs) {
      console.log("One time java args.");
      if (oneTimeJavaArgs != -1) {
        args = oneTimeJavaArgs;
      }
      oneTimeJavaArgs = false;
    } else if (launchArguments.length) {
      console.log("Launch args.");
      args = launchArguments.join(" ");
    } else if (settings.javaArgs) {
      console.log("Settings args.");
      args = settings.javaArgs;
    }

    console.log(args);

    if (!title) {
      title = "Initialization Alert";
    }
    if (!msg) {
      msg = "A server initialization error occurred.";
    }

    if (!selectedJavaLocation) {
      selectedJavaLocation = "java";
    }

    //check if user is running 32-bit java on win 64..
    if (is64BitOS) {
      console.log("64-bit");

      console.log("Checking if user is running 32-bit java...");

      var javaVersionOK = java64BitsOK = false;

      console.log("Selected java location = " + selectedJavaLocation);

      var child = childProcess.execFile(selectedJavaLocation, ["-version"]);

      // Minimum version needed = 1.8.0_66
      child.stderr.on("data", function(data) {
        console.log(data);

        var version = data.match(/version "([0-9\.]+)(_([0-9]+))?/i);

        if (version && version[1] && App.versionCompare(version[1], "1.8.0") != -1 && (!version[3] || version[3] >= 66)) {
          javaVersionOK = true;
        }

        if (!java64BitsOK) {
          java64BitsOK = data.indexOf("64-Bit") != -1;
        }
      });

      child.on("exit", function() {
        App.showOtherWindow("init_error.html", title, msg, {"javaArgs"      : args,
                                                            "serverOutput"  : serverOutput,
                                                            "javaVersionOK" : javaVersionOK,
                                                            "java64BitsOK"  : java64BitsOK,
                                                            "is64BitOS"     : is64BitOS});
      });
    } else {
      console.log("32-bit");
      App.showOtherWindow("init_error.html", title, msg, {"javaArgs": args, "serverOutput": serverOutput});
    }

    selectedJavaLocation = "";
  }

  App.showAlertAndQuit = function(title, msg) {
    if (!App.uiIsReady) {
      App.showOtherWindow("quit.html", title, msg);
    } else {
      if (!win) { return; }
      App.showWindowIfNotVisible();
      win.webContents.send("showAlertAndQuit", "<h1>" + title + "</h1><p>" + msg + "</p>", serverOutput);
    }
  }

  App.showKillAlert = function() {
    if (!win || otherWin) { return; }
    App.showWindowIfNotVisible();

    win.webContents.send("showKillAlert");
  }

  App.showNoJavaInstalledWindow = function(initError, params) {
    console.log("Show no java installed window.");

    if (initError) {
      if (otherWin) {
        otherWin.removeAllListeners("closed");

        otherWin.on("closed", function() {
          global.hasOtherWin = false;
          otherWin = null;
          App.showOtherWindow("no_java.html", null, null, params);
        });

        otherWin.close();
      }
    } else {
      App.showOtherWindow("no_java.html");
    }
  }

  App.showAlreadyRunningProcessAlert = function() {
    App.showOtherWindow("already_running_process.html");
  }

  App.showOtherWindow = function(filename, title, msg, params) {
    console.log("Show other window: " + filename);
    if (otherWin) {
      console.log("Already have another window.");
      return;
    }

    global.hasOtherWin = true;

    if (filename == "init_error.html") {
      var height = 480;
    } else {
      var height = 300;
    }

    otherWin = new electron.BrowserWindow({"width"          : 600,
                                           "height"         : height,
                                           "show"           : false,
                                           "useContentSize" : true,
                                           "center"         : true,
                                           "resizable"      : false});

    otherWin.loadURL("file://" + path.dirname(__dirname) + "/alerts/" + filename);

    otherWin.setFullScreenable(false);

    //otherWin.center();

    otherWin.on("closed", function() {
      otherWin = null;
      App.quit();
    });

    //todo: fix normal windows also should open in new window, even if not specified
    otherWin.webContents.on("new-window", function(event, url) {
      event.preventDefault();
      shell.openExternal(url);
    });

    //ready-to-show event not working..
    otherWin.webContents.once("did-finish-load", function() {
      otherWin.setTitle("IOTA Wallet " + String(appVersion).escapeHTML());

      //otherWin.webContents.toggleDevTools({"mode": "undocked"});

      otherWin.webContents.send("show", title, msg, params);
    });

    electron.Menu.setApplicationMenu(null);
  }

  App.showNodeInfo = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showNodeInfo");
    }
  }

  App.showPeers = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showPeers");
    }
  }

  App.generateSeed = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("generateSeed");
    }
  }

  App.claimProcess = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showClaimProcess");
    }
  }
  
  App.showNetworkSpammer = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showNetworkSpammer");
    }
  }

  App.editServerConfiguration = function() {
    console.log("Edit server configuration.");

    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("editServerConfiguration", {"port": settings.port, "depth": settings.depth, "minWeightMagnitude": settings.minWeightMagnitude, "nodes": settings.nodes.join("\r\n"), "testNet": isTestNet});
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

  App.updateServerConfiguration = function(configuration) {
    console.log("Update server configuration.");

    try {
      var nodes = [];

      var newNodes = configuration.nodes.match(/[^\r\n]+/g);

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

      settings.nodes              = nodes;
      settings.port               = parseInt(configuration.port, 10);
      settings.depth              = parseInt(configuration.depth, 10);
      settings.minWeightMagnitude = parseInt(configuration.minWeightMagnitude, 10);

      if (settings.port < 1) {
        settings.port = 14265;
      }

      if (settings.depth < 1) {
        settings.depth = 3;
      }

      if (!isTestNet && settings.minWeightMagnitude < 18) {
        settings.minWeightMagnitude = 18;
      } else if (isTestNet && settings.minWeightMagnitude < 13) {
        settings.minWeightMagnitude = 13;
      }

      App.saveSettings();
      App.relaunchApplication();
    } catch (err) {
      console.log("Error");
      console.log(err);
    }
  }

  App.addNeighborNode = function(node) {
    console.log("Add neighbor node: " + node);

    try {
      node = String(node).trim();

      if (!node || !App.checkNodeValidity(node)) {
        return;
      }

      settings.nodes.push(node);
      settings.nodes = settings.nodes.unique();

      App.saveSettings();
    } catch (err) {
      console.log("Error");
      console.log(err);
    }
  }

  App.showServerLog = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      isLookingAtServerLog = true;
      win.webContents.send("showServerLog", serverOutput);
    }
  }

  App.stopLookingAtServerLog = function() {
    isLookingAtServerLog = false;
  }

  App.showModal = function(identifier, html) {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showModal", identifier, html);
    }
  }

  App.showPreferences = function() {
    if (win && win.webContents) {
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
    console.log("App.updatePreferences:");
    console.log(updatedSettings);

    settings.javaArgs = updatedSettings.javaArgs;

    if (process.platform != "linux") {
      var loginSettings = electron.app.getLoginItemSettings();

      if (updatedSettings.openAtLogin != loginSettings.openAtLogin) {
        electron.app.setLoginItemSettings({"openAtLogin": updatedSettings.openAtLogin, "openAsHidden": true});
      }
    }
  }

  App.showUpdateAvailable = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateAvailable");
    }
  }

  App.showUpdateDownloaded = function(releaseNotes, releaseName, releaseDate) {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateDownloaded", releaseNotes, releaseName, releaseDate);
    }
  }

  App.showUpdateError = function(error) {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showUpdateError", error);
    }
  }

  App.showCheckingForUpdate = function() {
    if (win && win.webContents) {
      App.showWindowIfNotVisible();
      win.webContents.send("showCheckingForUpdate");
    }
  }

  App.showUpdateNotAvailable = function() {
    if (win && win.webContents) {
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
    if (App.doServerStarted) {
      App.doServerStarted = false;
      App.serverStarted();
    }
  }

  App.rendererIsReady = function() {
    console.log("Renderer is ready");

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
    if (win && win.webContents) {
      win.webContents.send("notify", type, msg);
    }
  }

  App.handleURL = function(url) {
    console.log("Handle URL: " + url);

    if (win && win.webContents) {
      win.webContents.send("handleURL", url);
      if (url == launchURL) {
        launchURL = null;
      }
    } else if (!launchURL) {
      launchURL = url;
    }
  }

  App.updateStatusBar = function(data) {
    if (win && win.webContents) {
      win.webContents.send("updateStatusBar", data);
    }
  }

  App.upgradeIRI = function(sourceFile) {
    console.log("App.upgradeIRI: " + sourceFile);

    if (sourceFile.match(/IRI.*\.jar$/i)) {
      try {
        App.killAlreadyRunningProcess(true);

        var jarDirectory = path.join(path.dirname(path.dirname(path.dirname(__dirname))), "iri");

        var targetFile = path.join(jarDirectory, "iri.jar");

        fs.unlinkSync(targetFile);
        fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
      } catch (err) {
        console.log(err);
      }

      App.relaunchApplication();
    }
  }

  App.deleteDbIfExists = function() {
    console.log("DELETING DATABASE");

    try {
      deleteFiles(["addresses.iri", "approvers.iri", "bundles.iri", "digests.iri", "scratchpad.iri", "transactions.iri"]);
    } catch (err) {
      console.log(err);
    }
  }

  function deleteFiles(files) {
    for (var i=0; i<files.length; i++) {
      deleteFile(files[i]);
    }
  }

  function deleteFile(file) {
    if (!serverDirectory) {
      throw "Server directory is not set.";
    }

    var filename = path.join(serverDirectory, file);
    if (fs.existsSync(filename)) {
      console.log("Delete " + filename);
      fs.unlinkSync(filename);
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
  if (otherWin) {
    if (otherWin.isMinimized()) otherWin.restore();
    otherWin.focus();
  } else if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();

    if (process.platform == "win32" && commandLine.length == 2) {
      if (String(commandLine[1]).match(/^iota:\/\//i)) {
        App.handleURL(commandLine[1]);
      } else if (String(commandLine[1]).match(/IRI.*\.jar$/i)) {
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
  console.log("open url");
  console.log(url);
  App.handleURL(url);
});

electron.app.on("open-file", function(event, file) {
  if (file.match(/IRI.*\.jar$/i)) {
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

electron.ipcMain.on("relaunchApplication", function(event, javaArgs) {
  App.relaunchApplication(javaArgs);
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

electron.ipcMain.on("updateServerConfiguration", function(event, configuration) {
  App.updateServerConfiguration(configuration);
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
  App.showNoJavaInstalledWindow(true, params);
});

electron.ipcMain.on("editServerConfiguration", App.editServerConfiguration);

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
