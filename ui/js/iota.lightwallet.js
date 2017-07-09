var localAttachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
    console.log("Light Wallet: iota.api.attachToTangle");

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

var localInterruptAttachingToTangle = function(callback) {
    console.log("Light Wallet: iota.api.interruptAttachingToTangle");

    ccurl.ccurlInterrupt(connection.ccurlProvider);

    if (callback) {
      return callback();
    }
}

iota.api.attachToTangle = localAttachToTangle;
iota.api.interruptAttachingToTangle = localInterruptAttachingToTangle;