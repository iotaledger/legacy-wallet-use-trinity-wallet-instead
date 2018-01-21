var UI = (function (UI, $, undefined) {

  var _step = 0
  var _lastStep = 2;

  UI.showSeedGenerator = function (callback) {
    if (UI.isLocked) {
      return
    }
    UI.stopStateInterval()
    UI.isLocked = true
    var $modal = $('#seed-generator-modal')
    _modal = $modal.remodal({
      hashTracking: false, 
      closeOnOutsideClick: false, 
      closeOnEscape: false,
      open: function() { setStep(1) } 
    })
    _modal.open()
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
  