var Curl = (function(Curl, undefined) {
  var T = [1, 0, -1, 0, 1, -1, 0, 0, -1, 1, 0];
  var INDICES = [];

  initialize();

  function initialize() {
    INDICES[0] = 0;

    for (var i=0; i<729; i++) {
      INDICES[i+1] = INDICES[i] + (INDICES[i] < 365 ? 364 : -365);
    }
  }

  Curl.generateChecksum = function(address) {
    var state = [];

    for (var i = 243; i < 729; i++) {
      state[i] = 0;
    }

    Converter.trits(address, state);

    Curl.transform(state);

    var checksum = Converter.trytes(state).substring(0, 9);

    return checksum;
  }

  Curl.transform = function(state) {
    var stateCopy = [];

    for (var r = 27; r-- > 0; ) {
      stateCopy = state.slice();
      for (var i = 0; i < 729; ) {
        state[i] = T[stateCopy[INDICES[i]] + (stateCopy[INDICES[++i]] << 2) + 5];
      }
    }
  }

  return Curl;
}(Curl || {}));