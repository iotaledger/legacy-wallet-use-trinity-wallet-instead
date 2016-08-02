var Converter = (function(Converter, undefined) {
  var TRYTES = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ", TRYTE_TO_TRITS_MAPPING = [[0, 0, 0], [1, 0, 0], [-1, 1, 0], [0, 1, 0], [1, 1, 0], [-1, -1, 1], [0, -1, 1], [1, -1, 1], [-1, 0, 1], [0, 0, 1], [1, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [-1, -1, -1], [0, -1, -1], [1, -1, -1], [-1, 0, -1], [0, 0, -1], [1, 0, -1], [-1, 1, -1], [0, 1, -1], [1, 1, -1], [-1, -1, 0], [0, -1, 0], [1, -1, 0], [-1, 0, 0]];

  Converter.trytes = function(trits) {
    var trytes = "", i;

    for (i = 0; i < trits.length; i += 3) {
      j = (trits[i] ? trits[i] : 0) + (trits[i + 1] ? trits[i + 1] : 0) * 3 + (trits[i + 2] ? trits[i + 2] : 0) * 9;
      if (j < 0) {
          j += 27;
      }
      trytes += TRYTES.charAt(j);
    }

    return trytes;
  }

  Converter.trits = function(trytes, destination) {
    var i, tryte;

    for (i = 0; i < trytes.length; i++) {
      tryte = TRYTES.indexOf(trytes.charAt(i));
      if (tryte < 0) {
        tryte = 0;
      }
      destination[i * 3] = TRYTE_TO_TRITS_MAPPING[tryte][0];
      destination[i * 3 + 1] = TRYTE_TO_TRITS_MAPPING[tryte][1];
      destination[i * 3 + 2] = TRYTE_TO_TRITS_MAPPING[tryte][2];
    }
  }

  return Converter;
}(Converter || {}));