var localInterruptAttachingToTangle = function(callback) {
    console.log("Light Wallet: localInterruptAttachingToTangle");

    curl.interrupt();

    if (callback) {
      return callback();
    }
}

curl.overrideAttachToTangle(iota.api);
iota.api.interruptAttachingToTangle = localInterruptAttachingToTangle;
