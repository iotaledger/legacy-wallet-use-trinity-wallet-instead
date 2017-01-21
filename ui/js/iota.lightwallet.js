iota.api.attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
    console.log("Light Wallet: iota.api.attachToTangle");

    ccurl.ccurlHashing(connection.ccurlProvider, trunkTransaction, branchTransaction, minWeightMagnitude, trytes, function(error, success) {
        console.log("Light Wallet: ccurl.ccurlHashing finished:");
        if (error) {
            console.log(error);
        } else {
            console.log(success);
        }
        if (callback) {
            return callback(error, {"trytes": success})
        } else {
            return success;
        }
    })
}

iota.api.interruptAttachingToTangle_ = iota.api.interruptAttachingToTangle;

iota.api.interruptAttachingToTangle = function(callback) {
    console.log("Light Wallet: iota.api.interruptAttachingToTangle");

    iota.api.interruptAttachingToTangle_(function(error) {
        if (!error) {
            ccurl.ccurlInterrupt(connection.ccurlProvider);
        }
        if (callback) {
            return callback(error);
        }
    });
}