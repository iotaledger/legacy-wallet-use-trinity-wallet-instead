iota.api.attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {   
    console.log("Light Wallet: iota.api.attachToTangle is called.. Switching to ccurl.");
    console.log("Light Wallet: ccurl path = " + connection.ccurlPath);

    ccurl(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, connection.ccurlPath, function(error, success) {
      console.log("Light Wallet: ccurl finished...");
      console.log(trytes);

        if (callback) {
            return callback(error, {"trytes": success})
        } else {
            return success;
        }
    })
}