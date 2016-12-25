iota.api.attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {   
    ccurl(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, connection.ccurlPath, function(error, success) {
        if (callback) {
            return callback(error, {"trytes": success})
        } else {
            return success;
        }
    })
}