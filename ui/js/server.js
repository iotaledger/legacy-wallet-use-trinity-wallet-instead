var Server = (function(Server, $, undefined) {
  var userSeed  = "";
  var seedError = "";
  var emptyHash = "999999999999999999999999999999999999999999999999999999999999999999999999999999999";

  var busyGettingTransactionsToApprove = false;

  Server.login = function(seed) {
    try {
      if (!seed) {
        console.log("Server.login: Seed / Password is required");
        throw "Seed is required";
      }
      userSeed = Address.getSeed(seed);
      seedError = Address.checkSeedStrength(seed);
      connection.isLoggedIn = true;
    } catch (err) {
      console.log("Server.login: Error");
      console.log(err);
      userSeed = "";
      seedError = "";
      connection.isLoggedIn = false;
      throw err;
    }
  }

  Server.getSeedError = function() {
    console.log("Server.getSeedError");
    return seedError;
  }

  Server.logout = function() {
    console.log("Server.logout");
    userSeed = "";
    connection.isLoggedIn = false;
  }

  Server.sendRequest = function(command, params, returnKey) {
    var deferred = $.Deferred();

    if (typeof(params) == "undefined") {
      params = {};
    }

    params.command = command;

    var isPow = (command == "attachToTangle");

    if (isPow) {
      console.log("Server.sendRequest: " + command + ": Is POW");

      if (connection.isProofOfWorking) {
        console.log("Server.sendRequest: " + command + ": Proof of Work is busy");
        return deferred.reject("Proof of Work is busy");
      } else {
        connection.isProofOfWorking = true;
      }
    }

    if (isPow || command == "getTransactionsToApprove" || command == "broadcastTransactions") {
      var time = 10000000000; // This simply never times out
    } else if (command == "getTransfers") {
      var time = 55000; // 55 seconds
    } else {
      var time = 10000; // 10 seconds
    }

    var options = {type    : "POST", 
                   url     : "http://localhost:14265", 
                   data    : JSON.stringify(params),
                   timeout : time};

    var saveTransactionsTxt = (command == "getTransfers" && params.seed == userSeed);

    if (saveTransactionsTxt) {
      options.dataType = "text";
    }

    // Notify the Server
    if (isPow && connection.inApp) {
      powStarted();
    }
    
    if (command != "getNodeInfo") {
      // Log to console, hide the seed
      if (params.seed && Object && Object.assign) {
        var logParams = Object.assign(params);
        logParams.seed = "***"
        console.log(logParams);
        logParams = null;
      } else {
        console.log(params);
      }
    }

    $.ajax(options).done(function(data) {
      // Special case for getTransfers call.. to easily see if there were any changes
      if (saveTransactionsTxt) {
        if (connection.transactionsTxt != data) {
          console.log("Server.sendRequest: " + command + ": Changes in user's transactions");
          connection.transactionsTxt = data;
          connection.transactionsChange = true;
        } else {
          connection.transactionsChange = false;
        }
        try {
          data = JSON.parse(data);
        } catch (err) {
          data = {"error": err};
        }
      }

      if (command != "getNodeInfo") {
        console.log(data);
      }

      if (data.error || data.exception) {
        if (data.exception) {
          data.exception = data.exception.replace(/java\.lang\./i, "").replace("Exception", "");
        }

        //hackety
        if (data.error == "The confirmed subtangle is not solid") {
          data.error = "Subtangle not solid";
        }

        console.log("Server.sendRequest: " + command + ": " + (data.error ? data.error : data.exception));

        deferred.reject(data.error ? data.error : data.exception);
      } else {
        // If the optional returnKey was specified, we return only that field (or fields) from response data.
        if (returnKey) {
          if ($.isArray(returnKey)) {
            var result = {};

            $.each(returnKey, function(i, key) {
              result[key] = data[key];
            });

            deferred.resolve(result);
          } else {
            deferred.resolve(data[returnKey]);
          }
        } else {
          deferred.resolve(data);
        }
      }
    }).fail(function(jqXhr) {
      if (UI.isLoggingOut || UI.isShuttingDown) {
        return;
      }
      // If we cannot connect to the server, readyState is zero.
      if (jqXhr.readyState == 0) {
        console.log("Server.sendRequest: " + command + ": Connection refused");
        deferred.reject("Connection refused");
      } else {
        if (jqXhr.statusText == "error") {
          console.log("Server.sendRequest: " + command + ": Unknown error - ready state: " + jqXhr.readyState);
          deferred.reject("Unknown error");
        } else {
          console.log("Server.sendRequest: " + command + ": " + jqXhr.statusText + " - ready state: " + jqXhr.readyState);
          deferred.reject(jqXhr.statusText);
        }
      }
    }).always(function() {
      if (UI.isLoggingOut || UI.isShuttingDown) {
        return;
      }

      if (isPow) {
        console.log("Server.sendRequest: " + command + ": POW ended");
        connection.isProofOfWorking = false;
        if (connection.inApp) {
          powEnded();
        }
      }
    });

    return deferred.promise();
  }

  // The state is updated every minute. 
  Server.updateState = function() {
    var deferred = $.Deferred();

    if (userSeed) {
      $.when(
        Server.getNodeInfo().done(function(info) {
          connection.nodeInfo = info;
        }).fail(function(err) {
          console.log("Server.updateState: getNodeInfo failed");
          connection.nodeInfo = null;
        }),
        Server.getTransfers().done(function(transactions) {
          var availableBalance = 0;
          var firstTime = connection.hashes.length == 0;
          if (transactions) {
            $.each(transactions, function(i, transaction) {
              if ($.inArray(transaction.hash, connection.hashes) == -1) {
                if (!firstTime) {
                  console.log("Server.updateState: Got a new transaction " + transaction.hash);
                  transaction.new = true;
                } else {
                  transaction.new = false;
                }
                connection.hashes.push(transaction.hash);
              } else {
                transaction.new = false;
              }
              if (transaction.value != "0") {
                var value = parseInt(transaction.value, 10);
                if (value < 0 && $.inArray(transaction.address, connection.spentAddresses) == -1) {
                  connection.spentAddresses.push(transaction.address);
                }
                if (transaction.persistence >= 95) {
                  availableBalance += value;
                }
              }
            });
          }
          connection.transactions = transactions;
          connection.balance = availableBalance;
        })
      ).then(function() {
        deferred.resolve();
        Server.checkMilestoneSolidity();
      }).fail(function(err) {
        console.log("Server.updateState: Error");
        console.log(err);
        deferred.reject(err);
      });
    } else {
      Server.getNodeInfo().done(function(info) {
        connection.nodeInfo = info;
        if (connection.isSpamming) {
          Server.checkMilestoneSolidity();
        }
        deferred.resolve();
      }).fail(function(err) {
        console.log("err");
        console.log(err);
        connection.nodeInfo = null;
        deferred.reject();
      })
    }

    return deferred.promise();
  }

  Server.checkMilestoneSolidity = function() {
    console.log("Server.checkMilestoneSolidity");

    var milestone = connection.nodeInfo.milestone;

    if (milestone != emptyHash) {
      console.log("Checking milestone solidity: " + milestone);

      Server.getTransactionsToApprove(milestone);
    } else {
      console.log("No new milestone to process.");
    }
  }

  Server.getTransactionsToApprove = function(milestone) {
    console.log("Server.getTransactionsToApprove: " + milestone);

    if (busyGettingTransactionsToApprove) {
      console.log("Busy");
      return $.Deferred().reject();
    }

    if (milestone == null) {
      milestone = connection.lastSolidMilestone;
    }

    if (milestone == null || milestone == emptyHash) {
      if (connection.nodeInfo.milestone != emptyHash) {
        console.log("Get milestone from connection.nodeInfo");
        milestone = connection.nodeInfo.milestone;
      } else {
        console.log("No milestone found.");
        return $.Deferred().reject("No milestone yet");
      }
    }

    busyGettingTransactionsToApprove = true;

    return Server.sendRequest("getTransactionsToApprove", {"milestone": milestone}).done(function(data) {
      console.log("Server.getTransactionsToApprove:");
      console.log(data);
      connection.lastSolidMilestone = milestone;
    }).always(function() {
      busyGettingTransactionsToApprove = false;
    });
  }
 
  // Immediately returns a new address, does not do POW
  Server.getNewAddress = function(seed) {
    var deferred = $.Deferred();

    if (seed == null) {
      seed = userSeed;
    }

    Server.sendRequest("getNewAddress", {"seed"          : seed, 
                                         "securityLevel" : 1}).done(function(result) {
      if (!result.address || !Address.isAddress(result.address)) {
        console.log("Server.getNewAddress: Invalid address: " + result.address);
        deferred.reject("Invalid address");
      } else {
        console.log("Server.getNewAddress: " + result.address);
        try {
          var checksummedAddress = Address.getAddressWithChecksum(result.address);
        } catch (err) {
          deferred.reject(err);
          return;
        }
        deferred.resolve({"address": result.address, "checksummedAddress": checksummedAddress});
      }
    }).fail(function(err) {
      console.log("Server.getNewAddress: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  };

  // Gets a new address and does POW to save it to the tangle
  Server.generateNewAddress = function(seed) {
    console.log("Server.generateNewAddress");

    var deferred = $.Deferred();

    Server.getNewAddress(seed).done(function(result) {
      deferred.notify(result.checksummedAddress);

      Server.transfer(result.address, 0).progress(function(msg) {
        if (msg) {
          deferred.notify(msg);
        }
      }).done(function(data) {
        console.log("Server.generateNewAddress: Complete");
        console.log(data);
        deferred.resolve("Address generated");
      }).fail(function(err) {
        console.log("Server.generateNewAddress: Error");
        console.log(err);
        deferred.reject(err);
      });
    }).fail(function(err) {
      console.log("Server.generateNewAddress: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.prepareTransfers = function(transfers, securityLevel, seed) {
    console.log("Server.prepareTransfers:");

    var deferred = $.Deferred();

    if (!$.isArray(transfers)) {
      transfers = [transfers];
    }

    if (securityLevel == null) {
      securityLevel = 1;
    }

    if (seed == null) {
      seed = userSeed;
    }

    for (var i=0; i<transfers.length; i++) {
      if (typeof(transfers[i].value) != "string") {
        transfers[i].value = String(transfers[i].value);
      }
      if (!transfers[i].hasOwnProperty("message")) {
        transfers[i].message = "";
      }
    }

    Server.sendRequest("prepareTransfers", {"transfers": transfers, "securityLevel": securityLevel, "seed": seed}, "trytes").done(function(trytes) {
      console.log("Server.prepareTransfers: Result:");
      console.log(trytes);

      if (trytes.length == 0) {
        deferred.reject("No trytes returned");
      } else {
        deferred.resolve(trytes);
      }
    }).fail(function(err) {
      console.log("Server.prepareTransfers: Error:");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.attachToTangle = function(trytes, trunkTransactionToApprove, branchTransactionToApprove, minWeightMagnitude) {
    console.log("Server.attachToTangle:");

    var deferred = $.Deferred();

    if (!$.isArray(trytes)) {
      trytes = [trytes];
    }

    if (minWeightMagnitude == null) {
      minWeightMagnitude = 13;
    }

    Server.sendRequest("attachToTangle", {"trytes": trytes, "trunkTransactionToApprove": trunkTransactionToApprove, "branchTransactionToApprove": branchTransactionToApprove, "minWeightMagnitude": minWeightMagnitude}, "trytes").done(function(trytes) {
      console.log("Server.attachToTangle: Result:");
      console.log(trytes);

      if (trytes.length == 0) {
        deferred.reject("No trytes returned");
      } else {
        deferred.resolve(trytes);
      }
    }).fail(function(err) {
      console.log("Server.attachToTangle: Error:");
      console.log(err);
      deferred.reject(err);
    })

    return deferred.promise();
  }

  Server.startSpamming = function() {
    console.log("Server.startSpamming");

    var deferred = $.Deferred();

    repeatUntilNotNull(function(data) {
      return Server.transfer(emptyHash, 0, "", 1, emptyHash).then(function(data) {
        console.log("SPAM FINISHED");
        deferred.notify(data);
        console.log("Spam finished:");
        console.log(data);
        return null;
      });
    });

    return deferred.promise();
  }

  Server.transfer = function(address, value, message, securityLevel, seed) {
    console.log("Server.transfer: " + address + " -> " + value);

    var deferred = $.Deferred();

    if (value == null) {
      value = "0";
    } else if (typeof(value) != "string") {
      value = String(value);
    }

    if (message == null) {
      message = "";
    }

    if (securityLevel == null) {
      securityLevel = 1;
    }

    if (seed == null) {
      seed = userSeed;
    }

    if (!Address.isAddress(address)) {
      return deferred.reject("Invalid address");
    } else if (Address.hasChecksum(address) && !Address.hasValidChecksum(address)) {
      return deferred.reject("Invalid checksum");
    }

    deferred.notify("Preparing Transfer...");

    doPrepareTransfers([{"address" : address, "value" : value, "message": message}], securityLevel, seed).then(function(trytes) {
      Server.attachStoreAndBroadcast(trytes).progress(function(msg) {
        if (msg) {
          deferred.notify(msg);
        }
      }).done(function() {
        deferred.resolve("Transfer completed");
      });
    }, function(err) {
      console.log("Server.transfer: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.setConfig = function(lines) {
    var deferred = $.Deferred();

    Server.sendRequest("setConfig", {"lines": lines}).done(function() {
      deferred.resolve("Configuration applied.");
      setTimeout(function() {
        Server.resetNeighborsActivityCounters();
      }, 1000);
    }).fail(function(err) {
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.resetNeighborsActivityCounters = function() {
    return Server.sendRequest("resetNeighborsActivityCounters");
  }

  Server.rebroadcast = function(transaction) {
    console.log("Server.rebroadcast: " + transaction);

    var deferred = $.Deferred();

    Server.getTrytesFromBundle(transaction).done(function(trytes) {
      Server.broadcastTransactions(trytes).done(function() {
        console.log("Server.rebroadcast: Completed");
        deferred.resolve("Rebroadcast completed");
      }).fail(function(err) {
        console.log("Server.rebroadcast: Error");
        console.log(err);
        deferred.reject(err);
      });
    }).fail(function(err) {
      console.log("Server.rebroadcast: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.replay = function(transaction) {
    console.log("Server.replay: " + transaction);

    var deferred = $.Deferred();

    deferred.notify("Getting Trytes...");

    Server.getTrytesFromBundle(transaction).done(function(trytes) {
      Server.attachStoreAndBroadcast(trytes).progress(function(msg) {
        if (msg) {
          deferred.notify(msg);
        }
      }).done(function() {
        console.log("Server.replay: completed");
        deferred.resolve("Replay completed");
      });
    }).fail(function(err) {
      console.log("Server.replay: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.getTrytesFromBundle = function(transaction) {
    var deferred = $.Deferred();

    Server.getBundle(transaction).done(function(transactions) {
      if (transactions.length == 0) {
        console.log("Server.getTrytesFromBundle: No transactions");
        deferred.reject("No transactions found");
      } else {
        var hashes = [];
        for (var i=0; i<transactions.length; i++) {
          hashes.push(transactions[i].hash);
        }
        Server.getTrytes(hashes).done(function(trytes) {
          console.log("Server.getTrytesFromBundle:");
          console.log(trytes);
          deferred.resolve(trytes);
        }).fail(function(err) {
          console.log("Server.getTrytesFromBundle: Error");
          console.log(err);
          deferred.reject(err);
        });
      }
    }).fail(function(err) {
      console.log("Server.getTrytesFromBundle: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.getTrytes = function(hashes) {
    var deferred = $.Deferred();

    if (typeof(hashes) == "string") {
      hashes = [hashes];
    }

    Server.sendRequest("getTrytes", {"hashes": hashes}, "trytes").done(function(trytes) {
      if (!trytes || trytes.length == 0) {
        console.log("Server.getTrytes: No trytes found");
        deferred.reject("No trytes found");
      } else {
        console.log("Server.getTrytes: OK");
        deferred.resolve(trytes);
      }
    }).fail(function(err) {
      console.log("Server.getTrytes: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.broadcastTransactions = function(trytes) {
    console.log("Server.broadcastTransactions");
    return Server.sendRequest("broadcastTransactions", {"trytes": trytes});
  }

  Server.storeTransactions = function(trytes) {
    console.log("Server.storeTransactions");
    return Server.sendRequest("storeTransactions", {"trytes": trytes});
  }

  Server.getTransfers = function(seed) {
    var deferred = $.Deferred();

    if (seed == null) {
      seed = userSeed;
    }

    Server.sendRequest("getTransfers", {"seed"          : seed, 
                                        "securityLevel" : 1}).done(function(result) {
      console.log("Server.getTransfers: " + result.transfers.length + " transactions");
      deferred.resolve(result.transfers.reverse());
    }).fail(function(err) {
      console.log("Server.getTransfers: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.getBundle = function(transaction) {
    return Server.sendRequest("getBundle", {"transaction": transaction}, "transactions");
  }

  Server.getNodeInfo = function() {
    return Server.sendRequest("getNodeInfo");
  }

  Server.getNeighborsActivity = function() {
    return Server.sendRequest("getNeighborsActivity");
  }

  Server.attachStoreAndBroadcast = function(trytes) {
    var deferred = $.Deferred();

    doAttachToTangle(trytes, deferred).then(function(signedTrytes) {
      deferred.notify("Store Transaction...");
      doStoreTransactions(signedTrytes).then(function() {
        deferred.notify("Broadcast Transaction...");
        doBroadcastTransactions(signedTrytes).then(function() {
          console.log("Server.attachStoreAndBroadcast: Completed");
          deferred.resolve();
        });
      });
    });

    return deferred.promise();
  }

  function repeatUntilNotNull(callback, t) {
    function delay() {
      return $.Deferred(function(dfrd) {
        setTimeout(dfrd.resolve, t);
      });
    }

    function poll() {
      console.log("repeatUntilFinished: Poll");
      
      return $.when(callback()).then(function(data) {
        console.log("repeatUntilFinished: Data:");
        console.log(data);
        return (data === null) ? delay().then(poll) : data;
      }, function(err) {
        console.log("repeatUntilFinished: Error:");
        console.log(err);

        if (err && err.stop && err.err) {
          return err.err;
        } else {
          return delay().then(poll);
        }
      });
    }

    return poll();
  }

  function doAttachToTangle(trytes, deferred) {
    console.log("doAttachToTangle");

    return repeatUntilNotNull(function() {
      if (deferred) {
        deferred.notify("Getting Tips...");
      }
      return Server.getTransactionsToApprove().then(function(data) {
        console.log("doAttachToTangle: Result:");
        console.log(data);
        if (deferred) {
          deferred.notify("Attaching to Tangle...");
        }
        return Server.attachToTangle(trytes, data.trunkTransactionToApprove, data.branchTransactionToApprove);
      }, function(err) {
        if (deferred && err) {
          deferred.notify(err + "...");
        }
      }).then(function(signedTrytes) {
        console.log("doAttachToTangle: Result:");
        console.log(signedTrytes);
        return signedTrytes || null;
      });
    }, 5000);
  }

 function doBroadcastTransactions(trytes) {
    console.log("doBroadcastTransactions");

    return repeatUntilNotNull(function() {
      return Server.broadcastTransactions(trytes).then(function(data) {
        console.log("Server.tryToBroadcast: Result:");
        console.log(data);
        return ($.isPlainObject(data) && $.isEmptyObject(data) ? true : null);
      })
    }, 5000);
  }

  function doStoreTransactions(trytes) {
    console.log("doStoreTransactions");

    return repeatUntilNotNull(function() {
      return Server.storeTransactions(trytes).then(function(data) {
        console.log("doStoreTransactions: Result:");
        console.log(data);
        return ($.isPlainObject(data) && $.isEmptyObject(data) ? true : null);
      });
    }, 5000);
  }

  function doPrepareTransfers(transfers, securityLevel, seed) {
    console.log("doPrepareTransfers");

    return repeatUntilNotNull(function() {
      return Server.prepareTransfers(transfers, securityLevel, seed).then(function(trytes) {
        console.log("doPrepareTransfers: Result:");
        console.log(trytes);
        return trytes || null;
      }, function(err) {
        if (err == "Illegal 'value'" || err == "Not enough iotas") {
          return {"stop": true, "err": err};
        } else {
          return err;
        }
      });
    }, 5000);
  }

  return Server;
}(Server || {}, jQuery));