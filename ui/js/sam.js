var SaM = (function(SaM, undefined) {
  var INDICES = [], F = [0, -1, 1, 0, 1, -1, -1, 1, 0], leftPart = [], rightPart = [];

  initialize();

  function initialize() {
    var index = 0, i;

    for (i = 0; i < 729; i++) {
      INDICES[i] = index += index <= 364 ? 364 : -365;
    }
  }

  SaM.generateChecksum = function(address) {
    var state = [];

    for (var i = 0; i < 729; i++) {
      state[i] = 0;
    }

    Converter.trits(address, state);

    SaM.transform(state);

    var checksum = Converter.trytes(state).substring(0, 9);

    return checksum;
  }

  SaM.transform = function(state) {
    var round = 9, i, index = 0, a, b;

    while (round-- > 0) {
      for (i = 0; i < 729; i++) {
        leftPart[i] = f(a = state[index], b = state[index = INDICES[i]]);
        rightPart[i] = f(b, a);
      }
      for (i = 0; i < 729; i++) {
        state[i] = f(leftPart[index], rightPart[index = INDICES[i]]);
      }
    }
  }

  function f(a, b) {
    return F[a * 3 + b + 4];
  }

  return SaM;
}(SaM || {}));