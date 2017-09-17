var localInterruptAttachingToTangle = function(callback) {
    console.log("Light Wallet: localInterruptAttachingToTangle");

    if(!libcurl) {
      ccurl.ccurlInterrupt(connection.ccurlProvider);
    } else {
      libcurl.interrupt();
    }

    if (callback) {
      return callback();
    }
}
var localAttachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
    console.log("Light Wallet: localAttachToTangle");

    ccurl.ccurlHashing(connection.ccurlProvider, trunkTransaction, branchTransaction, minWeightMagnitude, trytes, function(error, success) {
        console.log("Light Wallet: ccurl.ccurlHashing finished:");
        if (error) {
            console.log(error);
        } else {
            console.log(success);
        }
        if (callback) {
            return callback(error, success);
        } else {
            return success;
        }
    })
}

if(!libcurl) {
  iota.api.attachToTangle = localAttachToTangle;
} else {
  libcurl.overrideAttachToTangle(iota.api);
}
iota.api.interruptAttachingToTangle = localInterruptAttachingToTangle;
