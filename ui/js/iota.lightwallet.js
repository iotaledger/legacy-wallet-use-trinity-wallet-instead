iota.api.attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
    // inputValidator: Check if correct hash
    if (!iota.validate.isHash(trunkTransaction)) {
        return callback("Invalid trunk transaction");
    }

    // inputValidator: Check if correct hash
    if (!iota.validate.isHash(branchTransaction)) {
        return callback("Invalid branch transaction");
    }

    // inputValidator: Check if int
    if (!iota.validate.isInt(minWeightMagnitude)) {
        return callback("Invalid min weight");
    }

    // inputValidator: Check if array of trytes
    if (!iota.validate.isArrayOfTrytes(trytes)) {
        return callback("Invalid trytes");
    }
    
    ccurl(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, connection.ccurlPath, function(error, success) {
        if (callback) {
            return callback(error, {"trytes": success})
        } else {
            return success;
        }
    })
}