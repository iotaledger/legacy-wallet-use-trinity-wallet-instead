var Server = (function(Server, $, undefined) {
  var userSeed  = "";
  var seedError = "";
  var emptyHash = "999999999999999999999999999999999999999999999999999999999999999999999999999999999";

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

    if (isPow || command == "getTransactionsToApprove" || command == "pushTransactions") {
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
        var isException = false;

        if (data.exception) {
          data.exception = data.exception.replace(/java\.lang\./i, "").replace("Exception", "");
          isException = true;
        }

        //hackety
        if (data.error == "The confirmed subtangle is not solid" || data.error == "The subtangle is not solid") {
          data.error = "Subtangle not solid";
        }

        console.log("Server.sendRequest: " + command + ": " + (data.error ? data.error : data.exception));

        deferred.reject(data.error ? data.error : data.exception, isException);
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
      }).fail(function(err) {
        console.log("Server.updateState: Error");
        console.log(err);
        deferred.reject(err);
      });
    } else {
      Server.getNodeInfo().done(function(info) {
        connection.nodeInfo = info;
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

  Server.getMilestone = function(milestoneIndex) {
    console.log("Server.getMilestone: " + milestoneIndex);
    var deferred = $.Deferred();

    if (!milestoneIndex) {
      console.log("No milestone index, get from node info.");
      Server.getNodeInfo().done(function(info) {
        console.log("Got milestone index from node info: " + info.milestoneIndex);

        Server.sendRequest("getMilestone", {"index": info.milestoneIndex}, "milestone").done(function(milestone) {
          console.log(milestone);
          deferred.resolve(milestone, info.milestoneIndex);
        }).fail(function(err) {
          console.log(err);
          deferred.reject(err);
        });
      }).fail(function(err) {
        console.log(err);
        deferred.reject(err);
      });
    } else {
      Server.sendRequest("getMilestone", {"index": milestoneIndex}, "milestone").done(function(milestone) {
        console.log(milestone);
        deferred.resolve(milestone, milestoneIndex);
      }).fail(function(err) {
        console.log(err);
        deferred.reject(err);
      });
    }

    return deferred.promise();
  }

  Server.getTransactionsToApprove = function(milestone) {
    console.log("Server.getTransactionsToApprove: " + milestone);
    return Server.sendRequest("getTransactionsToApprove", {"milestone": milestone});
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

  Server.attachToTangle = function(trytes, trunkTransaction, branchTransaction, minWeightMagnitude) {
    console.log("Server.attachToTangle:");

    var deferred = $.Deferred();

    if (!$.isArray(trytes)) {
      trytes = [trytes];
    }

    if (minWeightMagnitude == null) {
      minWeightMagnitude = 13;
    }

    Server.sendRequest("attachToTangle", {"trytes": trytes, "trunkTransaction": trunkTransaction, "branchTransaction": branchTransaction, "minWeightMagnitude": minWeightMagnitude}, "trytes").done(function(trytes) {
      console.log("Server.attachToTangle: Result:");
      console.log(trytes);

      if (trytes.length == 0) {
        deferred.reject("No trytes returned");
      } else {
        deferred.resolve(trytes);
      }
    }).fail(function(err, isException) {
      console.log("Server.attachToTangle: Error:");
      console.log(err);
      deferred.reject(err, isException);
    })

    return deferred.promise();
  }

  Server.startSpamming = function() {
    console.log("Server.startSpamming");

    var deferred = $.Deferred();

    repeatUntilNotNull(function(data) {
      return Server.transfer(emptyHash, 0, "", 1, emptyHash).progress(function(msg) {
        if (msg) {
          deferred.notify(msg);
        }
      }).then(function(data) {
        deferred.notify("finished");
        return null;
      }).fail(function(err) {
        deferred.notify(err);
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

    deferred.notify("Preparing...");

    doPrepareTransfers([{"address" : address, "value" : value, "message": message}], securityLevel, seed).then(function(trytes) {
      Server.attachStoreAndBroadcast(trytes).progress(function(msg) {
        if (msg) {
          deferred.notify(msg);
        }
      }).done(function() {
        deferred.resolve("Transfer completed");
      }).fail(function(err) {
        console.log("Server.transfer: Error");
        console.log(err);
        deferred.reject(err);
      });
    }, function(err) {
      console.log("Server.transfer: Error");
      console.log(err);
      deferred.reject(err);
    });

    return deferred.promise();
  }

  Server.rebroadcast = function(transaction) {
    console.log("Server.rebroadcast: " + transaction);

    var deferred = $.Deferred();

    Server.getTrytesFromBundle(transaction).done(function(trytes) {
      Server.pushTransactions(trytes).done(function() {
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

      var reversedTrytes = trytes.reverse();

      Server.attachStoreAndBroadcast(reversedTrytes).progress(function(msg) {
        if (msg) {
          deferred.notify(msg);
        }
      }).done(function() {
        console.log("Server.replay: completed");
        deferred.resolve("Replay completed");
      }).fail(function(err) {
        console.log("Server.replay: Error");
        console.log(err);
        deferred.reject("Not synced");
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

  Server.pushTransactions = function(trytes) {
    console.log("Server.pushTransactions");
    return Server.sendRequest("pushTransactions", {"trytes": trytes});
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

  Server.getPeers = function() {
    return Server.sendRequest("getPeers");
  }

  Server.attachStoreAndBroadcast = function(trytes) {
    var deferred = $.Deferred();

    deferred.notify("Getting tips...");
    doGetTransactionsToApprove().then(function(data) {
      if (data.trunkTransaction && data.branchTransaction) {
        deferred.notify("Attaching to tangle...");
        doAttachToTangle(trytes, data.trunkTransaction, data.branchTransaction).then(function(signedTrytes) {
          deferred.notify("Store Transaction...");
          doStoreTransactions(signedTrytes).then(function() {
            deferred.notify("Broadcast Transaction...");
            doPushTransactions(signedTrytes).then(function() {
              console.log("Server.attachStoreAndBroadcast: Completed");
              deferred.resolve();
            }, function(err) {
              deferred.reject(err);
            });
          }, function(err) {
            deferred.reject(err);
          });
        }, function(err) {
          deferred.reject(err);
        });
      } else {
        deferred.reject("Not synced");
      }
    }, function(err) {
      deferred.reject(err);
    });

    return deferred.promise();
  }

  function repeatUntilNotNull(callback) {
    function delay() {
      return $.Deferred(function(dfrd) {
        setTimeout(dfrd.resolve, 1);
      });
    }

    function poll() {
      console.log("repeatUntilFinished: Poll");
      return $.when(callback()).then(function(data) {
        console.log("repeatUntilFinished: Data:");
        console.log(data);
        return (data === null) ? delay().then(poll) : data;
      }, function(err, isException) {
        console.log("repeatUntilFinished: Error:");
        console.log(err);

        if (isException) {
          console.log("Is exception");
          return err;
        } else if (err && err.isException) {
          console.log("Is exception");
          return err.error;
        } else {
          return delay().then(poll);
        }
      });
    }

    return poll();
  }

  function doGetTransactionsToApprove() {
    var startIndex     = null;
    var milestoneIndex = null;

    return repeatUntilNotNull(function() {
      return Server.getMilestone(milestoneIndex).then(function(milestone, index) {
        if (!milestoneIndex) {
          milestoneIndex = startIndex = index;
        }

        if (milestone == null || startIndex - milestoneIndex > 100) {
          return "Not synced";
        }

        return Server.getTransactionsToApprove(milestone).then(function(data) {
          return data;
        }, function(err, isException) {
          console.log(err);

          if (isException) {
            return {"error": err, "isException": true};
          } else {
            milestoneIndex--;
          }
        });
      }, function(err, isException) {
        console.log(err);
        if (isException) {
          return {"error": err, "isException": true};
        }
      });
    });
  }

  function doAttachToTangle(trytes, trunkTransaction, branchTransaction) {
    console.log("doAttachToTangle");

    return repeatUntilNotNull(function() {
      return Server.attachToTangle(trytes, trunkTransaction, branchTransaction);
    });
  }

  function doPushTransactions(trytes) {
    console.log("doPushTransactions");

    return repeatUntilNotNull(function() {
      return Server.pushTransactions(trytes).then(function(data) {
        console.log("doPushTransactions: Result:");
        console.log(data);
        return (data.hasOwnProperty("duration") ? true : null);
      })
    });
  }

  function doStoreTransactions(trytes) {
    console.log("doStoreTransactions");

    return repeatUntilNotNull(function() {
      return Server.storeTransactions(trytes).then(function(data) {
        console.log("doStoreTransactions: Result:");
        console.log(data);
        return (data.hasOwnProperty("duration") ? true : null);
      });
    });
  }

  function doPrepareTransfers(transfers, securityLevel, seed) {
    console.log("doPrepareTransfers");

    return repeatUntilNotNull(function() {
      return Server.prepareTransfers(transfers, securityLevel, seed).then(function(trytes) {
        console.log("doPrepareTransfers: Result:");
        console.log(trytes);
        return trytes || null;
      }, function(err, isException) {
        if (isException || err == "Illegal 'value'" || err == "Not enough iotas") {
          return {"error": err, "isException": true};
        } else {
          return err;
        }
      });
    });
  }

  return Server;
}(Server || {}, jQuery));
