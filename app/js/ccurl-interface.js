var ffi = require('ffi');
var isInitialized = false;

let libcurl = require('curl.lib.js');
let webglAvailable = false;
try {
  libcurl.init();
  webglAvailable = true;
} catch (e) {}
const MAX_TIMESTAMP_VALUE = (Math.pow(3,27) - 1) / 2;

var ccurlProvider = function(ccurlPath) {
  if (!ccurlPath) {
    console.log("ccurl-interface: no path supplied, returning");
    return false;
  }

  var fullPath = ccurlPath + '/libccurl';

  try {
    // Define libccurl to be used for finding the nonce
    var libccurl = ffi.Library(fullPath, {
      ccurl_pow : [ 'string', [ 'string', 'int'] ],
      ccurl_pow_finalize : [ 'void', [] ],
      ccurl_pow_interrupt: [ 'void', [] ]
    });

    // Check to make sure the functions are available
    if (!libccurl.hasOwnProperty("ccurl_pow") || !libccurl.hasOwnProperty("ccurl_pow_finalize") || !libccurl.hasOwnProperty("ccurl_pow_interrupt")) {
      throw new Error("Could not load hashing library.");
    }

    return libccurl;
  } catch (err) {
    console.log(err);
    return false;
  }
}

var ccurlFinalize = function(libccurl) {
  if (isInitialized) {
    try {
      if (libccurl && libccurl.hasOwnProperty("ccurl_pow_finalize")) {
        libccurl.ccurl_pow_finalize();
      }
    } catch (err) {
      console.log(err);
    }
  }
}

var ccurlInterrupt = function(libccurl) {
  if (isInitialized) {
    try {
      if(connection.ccurl && libccurl && libccurl.hasOwnProperty("ccurl_pow_interrupt")) {
        libccurl.ccurl_pow_interrupt();
      } else {
        libcurl.interrupt();
      }
    } catch (err) {
      console.log(err);
    }
  }
}

var ccurlInterruptAndFinalize = function(libccurl) {
  ccurlInterrupt(libccurl);
  ccurlFinalize(libccurl);
}

var ccurlHashing = function(libccurl, trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
  if (!libccurl.hasOwnProperty("ccurl_pow")) {
    return callback(new Error("Hashing not available"));
  }

  var iotaObj = iota;

  // inputValidator: Check if correct hash
  if (!iotaObj.valid.isHash(trunkTransaction)) {

    return callback(new Error("Invalid trunkTransaction"));
  }

  // inputValidator: Check if correct hash
  if (!iotaObj.valid.isHash(branchTransaction)) {

    return callback(new Error("Invalid branchTransaction"));
  }

  // inputValidator: Check if int
  if (!iotaObj.valid.isValue(minWeightMagnitude)) {

    return callback(new Error("Invalid minWeightMagnitude"));
  }

  // inputValidator: Check if array of trytes
  // if (!iotaObj.valid.isArrayOfTrytes(trytes)) {
  //
  //     return callback(new Error("Invalid trytes supplied"));
  // }

  isInitialized = true;

  var finalBundleTrytes = [];
  var previousTxHash;
  var i = 0;

  function loopTrytes() {

    getBundleTrytes(trytes[i], function(error) {

      if (error) {

        return callback(error);

      } else {

        i++;

        if (i < trytes.length) {

          loopTrytes();

        } else {

          // reverse the order so that it's ascending from currentIndex
          return callback(null, finalBundleTrytes.reverse());

        }
      }
    });
  }

  function getBundleTrytes(thisTrytes, callback) {
    // PROCESS LOGIC:
    // Start with last index transaction
    // Assign it the trunk / branch which the user has supplied
    // IF there is a bundle, chain  the bundle transactions via
    // trunkTransaction together

    var txObject = iotaObj.utils.transactionObject(thisTrytes);
    txObject.tag = txObject.obsoleteTag;
    txObject.attachmentTimestamp = Date.now();
    txObject.attachmentTimestampLowerBound = 0;
    txObject.attachmentTimestampUpperBound = MAX_TIMESTAMP_VALUE;
    // If this is the first transaction, to be processed
    // Make sure that it's the last in the bundle and then
    // assign it the supplied trunk and branch transactions
    if (!previousTxHash) {


      // Check if last transaction in the bundle
      if (txObject.lastIndex !== txObject.currentIndex) {
        return callback(new Error("Wrong bundle order. The bundle should be ordered in descending order from currentIndex"));
      }

      txObject.trunkTransaction = trunkTransaction;
      txObject.branchTransaction = branchTransaction;
    } else {
      // Chain the bundle together via the trunkTransaction (previous tx in the bundle)
      // Assign the supplied trunkTransaciton as branchTransaction
      txObject.trunkTransaction = previousTxHash;
      txObject.branchTransaction = trunkTransaction;
    }

    var newTrytes = iotaObj.utils.transactionTrytes(txObject);

    switch (connection.ccurl) {
      case 0: {
        libcurl.pow({trytes: newTrytes, minWeight: minWeightMagnitude}).then(function(nonce) {
          var returnedTrytes = newTrytes.substr(0, 2673-81).concat(nonce);
          var newTxObject= iotaObj.utils.transactionObject(returnedTrytes);

          // Assign the previousTxHash to this tx
          var txHash = newTxObject.hash;
          previousTxHash = txHash;

          finalBundleTrytes.push(returnedTrytes);
          callback(null);
        }).catch(callback);
        break;
      }
      default: {
        // cCurl updates the nonce as well as the transaction hash
        libccurl.ccurl_pow.async(newTrytes, minWeightMagnitude, function(error, returnedTrytes) {

          if (error) {
            return callback(error);
          } else if (returnedTrytes == null) {
            return callback("Interrupted");
          }

          var newTxObject= iotaObj.utils.transactionObject(returnedTrytes);

          // Assign the previousTxHash to this tx
          var txHash = newTxObject.hash;
          previousTxHash = txHash;

          finalBundleTrytes.push(returnedTrytes);

          return callback(null);
        });
      }
    }
  }
  loopTrytes();
}

module.exports = {
  'ccurlProvider': ccurlProvider,
  'ccurlHashing': ccurlHashing,
  'ccurlInterrupt': ccurlInterrupt,
  'ccurlFinalize': ccurlFinalize,
  'ccurlInterruptAndFinalize': ccurlInterruptAndFinalize
}
