var Address = (function(Address, $, undefined) {
  Address.getSeed = function(value) {
    console.log("Address.getSeed");

    value = value.toUpperCase();

    var seed = "";

    for (var i = 0; i < 81; i++) {
      var char = value.charAt(i);

      if (!char || ("9ABCDEFGHIJKLMNOPQRSTUVWXYZ").indexOf(char) < 0) {
        seed += "9";
      } else {
        seed += char;
      }
    }

    return seed;
  }

  Address.checkSeedStrength = function(value) {
    console.log("Address.checkSeedStrength");

    value = String(value);

    var invalidCharacters = value.match(/[^A-Z9]/i);

    //don't care if the user has all his characters lowercased, but we do care if he uses mixed case.
    var mixedCase = value.match(/[a-z]/) && value.match(/[A-Z]/);

    if (invalidCharacters) {
      return "Your seed contains invalid characters. Only A-Z and the number 9 are accepted." + (value.length > 81 ? " Your seed is also too long." : (value.length < 60 ? " Your seed is also too short." : ""));
    } else if (mixedCase) {
      return "Your seed contains mixed case characters. Lowercase is converted to uppercase." + (value.length > 81 ? " Your seed is also too long." : (value.length < 60 ? " Your seed is also too short." : ""));
    } else if (value.length > 81) {
      return "Your seed should not contain more than 81 characters. Extra characters are ignored.";
    } else if (value.length < 60) {
      return "Your seed does not contain enough characters. This is not secure.";
    } else {
      return "";
    }
  }

  Address.generateSeed = function() {
    console.log("Address.generateSeed");

    var cryptoObj = window.crypto || window.msCrypto; // for IE 11

    if (!cryptoObj) {
      throw "Crypto tools not available";
    }

    var seed       = "";
    var characters = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    var randomValues = new Uint32Array(81);
    cryptoObj.getRandomValues(randomValues);

    for (var i=0; i<81; i++) {
      seed += characters.charAt(randomValues[i]%27);
    }

    return seed;
  }

  Address.isAddress = function(address) {
    console.log("Address.isAddress: " + address);

    if (typeof(address) != "string") {
      return false;
    }

    return /^[a-z9]{81}([a-z9]{9})?$/i.test(address);
  }

  Address.hasChecksum = function(address) {
    if (typeof(address) != "string") {
      return false;
    }

    return address.length == 90;
  }

  Address.hasValidChecksum = function(fullAddress) {
    if (!Address.isAddress(fullAddress) || !Address.hasChecksum(fullAddress)) {
      return false;
    }

    var address  = fullAddress.substring(0, 81);
    var checksum = fullAddress.substring(81);

    return (checksum == Curl.generateChecksum(address)) || (checksum == SaM.generateChecksum(address));
  }
  
  Address.generateChecksum = function(address) {
    return Curl.generateChecksum(address);
  }

  Address.getAddressWithChecksum = function(address) {
    if (typeof(address) != "string") {
      throw "Incorrect input";
    } else if (address.length != 81) {
      throw "Address has incorrect length";
    }   

    return address + "" + Address.generateChecksum(address);
  }

  Address.getAddressWithoutChecksum = function(fullAddress) {
    if (typeof(fullAddress) != "string") {
      throw "Incorrect input";
    } else if (fullAddress.length != 90) {
      throw "Address has incorrect length";
    }

    return fullAddress.substring(0, 81);
  }

  return Address;
}(Address || {}, jQuery));