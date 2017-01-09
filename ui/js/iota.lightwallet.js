iota.api.attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
    console.log("Light Wallet: iota.api.attachToTangle is called.. Switching to ccurl.");
    console.log("Light Wallet: ccurl path = " + connection.ccurlPath);

    ccurl.ccurlHashing(connection.ccurlProvider, trunkTransaction, branchTransaction, minWeightMagnitude, trytes, function(error, success) {
      console.log("Light Wallet: ccurl finished...");
      console.log(trytes);

        if (callback) {
            return callback(error, {"trytes": success})
        } else {
            return success;
        }
    })
}
