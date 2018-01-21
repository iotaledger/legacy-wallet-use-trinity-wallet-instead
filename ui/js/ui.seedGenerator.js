var UI = (function (UI, $, undefined) {

  var _step = 0
  var _lastStep = 2;
  var _generatedSeed = null;
  var _seedChunkIndex = 0;
  var _showPreviousChunkButtonUi = null;
  var _showNextChunkButtonUi = null;
  var _generatedSeedChunkNumberUi = null;
  var _generatedSeedChunkValueUi = null;

  UI.showSeedGenerator = function (callback) {
    if (UI.isLocked) {
      return
    }

    var array = new Uint32Array(81)
    window.crypto.getRandomValues(array)

    var charArray = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('')
    var seedChars = new Array(81)
    
    for(i = 0; i < 81; i++) {
      var tryteIndex = array[i] % 27
      seedChars[i] = charArray[tryteIndex]
    }

    _generatedSeed = seedChars.join("")

    UI.stopStateInterval()
    UI.isLocked = true
    var $modal = $('#seed-generator-modal')
    _modal = $modal.remodal({ hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false, showFooter: false })
    _modal.open()

    setStep(1)
    hookupUI()
    setSeedChunkIndex(0)
  }

  function hookupUI() {
    _generatedSeedChunkNumberUi = $("#generated-seed-chunk-number");
    _generatedSeedChunkValueUi = $("#generated-seed-chunk-value");
    _showPreviousChunkButtonUi = $("#show-previous-seed-chunk-btn")
    _showPreviousChunkButtonUi.on("click", function() { setSeedChunkIndex(_seedChunkIndex - 1) })
    _showNextChunkButtonUi = $("#show-next-seed-chunk-btn")
    _showNextChunkButtonUi.on("click", function() { setSeedChunkIndex(_seedChunkIndex + 1) })
  }

  function setSeedChunkIndex(newSeedChunkIndex) {
    if (newSeedChunkIndex < 0 || newSeedChunkIndex >= 14) {
      return
    }
    _seedChunkIndex = newSeedChunkIndex

    var firstCharIndex = _seedChunkIndex * 6;
    _generatedSeedChunkNumberUi.text(UI.t("generated_seed_chunk_number") + " " + (_seedChunkIndex + 1))
    _generatedSeedChunkValueUi.text(_generatedSeed.substring(firstCharIndex, firstCharIndex + 6))

    _showPreviousChunkButtonUi.disabled = _seedChunkIndex == 0;
    _showNextChunkButtonUi.disabled = _seedChunkIndex == 13;
  }

  function setStep(newStep) {
    if (newStep == _step) {
      return
    }

    for(i = 1; i <= _lastStep; i++) {
      $("#seed-generator-step-" + i).hide();
    }

    _step = newStep
    var visibleStepUi = $("#seed-generator-step-" + _step);
    if (visibleStepUi == null) {
      throw new Error("UiElement not found #seed-generator-step-" + _step)
    }
    visibleStepUi.fadeIn()
  }

  return UI
  }(UI || {}, jQuery))
  