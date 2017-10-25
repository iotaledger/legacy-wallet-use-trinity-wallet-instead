var UI = (function (UI, $, undefined) {
  var HASH_LENGTH = 81
  var CONFIRMATION_CHECK_TIMEOUT = 30 * 1000
  var TAG = '9'.repeat(27)
  var CONSTANT = 'SELF9TAUGHT9AI9IS9BEST9YET9AT9STRATEGY9GAME9GOSELF9TAUGHT9AI9IS9BEST9YET9AT9STRAT'

  var _modal
  var _proofTx = null
  var _step = 1

  UI.showRecoveryModal = function (callback) {
    if (UI.isLocked) {
      return
    }
    UI.stopStateInterval()
    UI.isLocked = true
    UI.isRecoveryOpen = true
    var $modal = $('#recovery-modal')
    _modal = $modal.remodal({hashTracking: false, closeOnOutsideClick: false, closeOnEscape: false})
    _modal.open()
    if (_step === 1) {
      $('#recovery-old-seed').val('')
      $('#recovery-new-seed').val('')
    }
    $('#recovery-old-seed').focus()
  }

  UI.handleRecovery = function () {
    var publishProofBtn = $('#recovery-publish-proof-btn')
    var reattachBtn = $('#recovery-reattach-btn')
    var recoveryCloseBtn = $('#recovery-step-2-close')
    $(document).on('closed', '#recovery-modal', function (e) {
      UI.startStateInterval()
      UI.isRecoveryOpen = false
      UI.isLocked = false
      $('#recovery-old-seed').val('')
    })

    publishProofBtn.on('click', function () {
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_recovering')
        e.preventDefault()
        e.stopPropagation()
      })
      var oldSeed = String($('#recovery-old-seed').val())
      var newSeed = String($('#recovery-new-seed').val())

      if (oldSeed.length === 0 || !iota.valid.isTrytes(oldSeed)) {
        UI.formError('recover', 'invalid_old_seed', {initial: 'publish_proof'})
        $('.remodal-close').off('click')
        publishProofBtn.loadingReset('publish_proof')
        $('#recovery-old-seed').val('')
        $('#recovery-old-seed').focus()
        return
      }
      if (newSeed.length != 81 || !iota.valid.isTrytes(newSeed)) {
        UI.formError('recover', 'invalid_new_seed', {initial: 'publish_proof'})
        $('.remodal-close').off('click')
        publishProofBtn.loadingReset('publish_proof')
        $('#recovery-new-seed').val('')
        $('#recovery-new-seed').focus()
        return
      }

      if (oldSeed === newSeed) {
        UI.formError('recover', 'old_new_identical', {initial: 'publish_proof'})
        $('.remodal-close').off('click')
        publishProofBtn.loadingReset('publish_proof')
        $('#recovery-new-seed').val('')
        $('#recovery-new-seed').focus()
        return;
      }


      var newAddress
      {
        var key = IOTACrypto.signing.key(IOTACrypto.converter.trits(newSeed), 0, 2)
        var digests = IOTACrypto.signing.digests(key)
        var addressTrits = IOTACrypto.signing.address(digests)
        newAddress = IOTACrypto.converter.trytes(addressTrits)
        newAddress = IOTACrypto.utils.addChecksum(newAddress)
      }

      
      filterSpentAddresses([{address: newAddress}])
      .then(unspentAddresses => {
        if (unspentAddresses.length === 0) {
          UI.formError('recover', 'sent_to_key_reuse_error', {initial: 'publish_proof'})
          $('.remodal-close').off('click')
          publishProofBtn.loadingReset('publish_proof')
          $('#recovery-new-seed').val('')
          $('#recovery-new-seed').focus()
          return
        }
        attachBundle(generateBundle(newAddress, generateProof(oldSeed, newSeed, newAddress), TAG))
        .then(tx => {
          publishProofBtn.loadingReset('publish_proof')
          UI.formSuccess('recover', 'proof_published', {initial: 'publish_proof'})
          $('.remodal-close').off('click')
          $('#recovery-step-1').hide()
          $('#recovery-step-2').fadeIn()
          $('#recovery-transaction-hash-clipboard').html(UI.formatForClipboard(tx[0].hash))
          _step++
          checkInclusionStates(tx[0], CONFIRMATION_CHECK_TIMEOUT, function (err, confirmed) {
            if (err) {
              UI.formError('recover', err.message, {initial: 'publish_proof'})
              return
            }
            _proofTx = tx
            if (confirmed) {
              UI.formSuccess('recover', 'recovery_proof_transaction_confirmed')
              document.getElementById('recovery-confirmed-status').classList.remove('pending-proof')
              $('#recovery-proof-transaction-pending').hide()
              $('#recovery-proof-transaction-confirmed').show()
              $('#recovery-reattach-prompt').hide()
              reattachBtn.hide()
              $('#recovery-step-2-close').fadeIn()
            }
          })
        }).catch(() => {
          UI.formError('recover', 'recovery_attachment_error', {initial: 'publish_proof'})
          publishProofBtn.loadingReset('publish_proof')
          $('.remodal-close').off('click')
        })
      }).catch(err => {
        UI.formError('recover', err.message, {initial: 'publish_proof'})
        publishProofBtn.loadingReset('publish_proof')
        $('.remodal-close').off('click')
      })
    })

    reattachBtn.on('click', function () {
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_reattaching')
        e.preventDefault()
        e.stopPropagation()
      })
      if (!_proofTx) {
        UI.formError('recover', 'reattach_not_required', {initial: 'reattach'})
        reattachBtn.loadingReset('reattach')
        $('.remodal-close').off('click')
        return
      }
      reattach(_proofTx[0].hash).then(res => {
        reattachBtn.loadingReset('reattach')
        UI.formSuccess('recover', 'reattach_completed', {initial: 'reattach'})
        $('.remodal-close').off('click')
      }).catch(err => {
        reattachBtn.loadingReset('reattach')
        UI.formError('recover', err.message, {initial: 'reattach'})
        $('.remodal-close').off('click')
      })
    })

    recoveryCloseBtn.on('click', function () {
      _modal.close()
      _resetState()
    })

    function _resetState () {
      $('#recovery-step-2').hide()
      $('#recovery-step-1').show()
      $('#recovery-reattach-prompt').show()
      $('#recovery-confirmed-status').show()
      $('#recovery-step-2-close').hide()
      $('#recovery-reattach-btn').show()
      $('#recovery-proof-transaction-confirmed').hide()
      $('#recovery-proof-transaction-pending').show()
      document.getElementById('recovery-confirmed-status').classList.add('pending-proof')
      $('#recovery-new-seed').val('')
      $('#recovery-old-seed').val('')
      _proofTx = null
      _step = 1
    }
  }

  function checkInclusionStates (tx, timeout, cb) {
    setTimeout(() => {
      findTransactionObjects({bundles: [tx.bundle]}).then(allTxs => {
        var allBundleInstances = allTxs.filter(tx => tx.currentIndex === 0)
        getLatestInclusion(allBundleInstances.map(tx => tx.hash)).then(states => {
          var confirmed = states.filter(state => state).length > 0
          cb(null, confirmed)
          if (!confirmed) {
            checkInclusionStates(tx, timeout, cb)
          }
        }).catch(err => {
          cb(err)
          checkInclusionStates(tx, timeout, cb)
        })
      })
    }, timeout)
  }

  function getLatestInclusion (tails) {
    return new Promise((resolve, reject) => iota.api.getLatestInclusion(tails, (err, res) => err ? reject(err) : resolve(res)))
  }

  function findTransactionObjects (query) {
    return new Promise((resolve, reject) => iota.api.findTransactionObjects(query, (err, res) => err ? reject(err) : resolve(res)))
  }

  function attachBundle (bundle) {
    return new Promise((resolve, reject) =>
      iota.api.sendTrytes(
        bundle.bundle.map(tx => iota.utils.transactionTrytes(tx)).reverse(),
        3,
        connection.minWeightMagnitude || 14,
        (err, res) => err ? reject(err) : resolve(res)
      )
    )
  }

  function reattach (hash) {
    return new Promise((resolve, reject) =>
      iota.api.replayBundle(
        hash,
        3,
        connection.minWeightMagnitude || 14,
        (err, res) => err ? reject(err) : resolve(res)
      )
    )
  }

  function generateBundle (address, pepperAndProof, tag) {
    var bundle = new IOTACrypto.bundle()
    bundle.addEntry(1, pepperAndProof[1], 0, tag, Math.floor(Date.now() / 1000))
    bundle.bundle[0].tag = pepperAndProof[0]
    bundle.bundle[0].obsoleteTag = tag
    bundle.finalize()
    bundle.addTrytes(['9'.repeat(27*81)])

    return bundle
  }


  function generateProof (oldSeed, newSeed, newAddress) {
    var kerl = new IOTACrypto.kerl()

    var oldTrits = addPadding(IOTACrypto.converter.trits(oldSeed))
    var newTrits = addPadding(IOTACrypto.converter.trits(newSeed))

    var trits = []
    kerl.initialize()
    kerl.absorb(IOTACrypto.converter.trits(CONSTANT), 0, HASH_LENGTH * 3)
    kerl.absorb(newTrits, 0, HASH_LENGTH * 3)
    kerl.squeeze(trits, 0, HASH_LENGTH * 3)

    var pepperStart = IOTACrypto.converter.trytes(trits).slice(0, 27)

    kerl = new IOTACrypto.kerl()
    kerl.initialize()
    kerl.absorb(trits, 0, HASH_LENGTH * 3)
    kerl.absorb(IOTACrypto.converter.trits(iota.utils.noChecksum(newAddress)), 0, HASH_LENGTH * 3)
    kerl.absorb(oldTrits, 0, HASH_LENGTH * 3)
    kerl.squeeze(trits, 0, HASH_LENGTH * 3)

    return [pepperStart, IOTACrypto.converter.trytes(trits)]
  }

  function addPadding (trits) {
    while (trits.length % 243 !== 0) {
      trits.push(0)
    }
    return trits
  }

  function filterSpentAddresses (inputs) {
    return new Promise((resolve, reject) => {
      iota.api.findTransactionObjects({addresses: inputs.map(input => iota.utils.noChecksum(input.address))}, (err, txs) => {
        if (err) {
          reject(err)
        }
        txs = txs.filter(tx => tx.value < 0)
        if (txs.length > 0) {
          var bundles = txs.map(tx => tx.bundle)
          iota.api.findTransactionObjects({bundles: bundles}, (err, txs) => {
            if (err) {
              reject(err)
            }
            var hashes = txs.filter(tx => tx.currentIndex === 0)
            hashes = hashes.map(tx => tx.hash)
            iota.api.getLatestInclusion(hashes, (err, states) => {
              if (err) {
                reject(err)
              }
              var confirmedHashes = hashes.filter((hash, i) => states[i])
              var unconfirmedHashes = hashes.filter(hash => confirmedHashes.indexOf(hash) === -1).map(hash => {
                return { hash: hash, validate: true }
              })
              var getBundles = confirmedHashes.concat(unconfirmedHashes).map(hash => new Promise((resolve, reject) => {
                iota.api.traverseBundle(typeof hash === 'string' ? hash : hash.hash, null, [], (err, bundle) => {
                  if (err) {
                    reject(err)
                  }
                  resolve(typeof hash === 'string' ? bundle : {bundle: bundle, validate: true})
                })
              }))
              resolve(Promise.all(getBundles).then(bundles => {
                bundles = bundles.filter(bundle => {
                  if (bundle.validate) {
                    return iota.utils.isBundle(bundle.bundle)
                  }
                  return true
                }).map(bundle => bundle.hasOwnProperty('validate') ? bundle.bundle : bundle)
                var blacklist = bundles.reduce((a, b) => a.concat(b), []).filter(tx => tx.value < 0).map(tx => tx.address)
                return inputs.filter(input => blacklist.indexOf(input.address) === -1)
              }).catch(err => reject(err)))
            })
          })
        } else {
          resolve(inputs)
        }
      })
    })
  }

  return UI
}(UI || {}, jQuery))
