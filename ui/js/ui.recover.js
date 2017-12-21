var UI = (function (UI, $, undefined) {
  var HASH_LENGTH = 81
  var CONFIRMATION_CHECK_TIMEOUT = 20 * 1000
  var TAG = '9'.repeat(27)
  var REVEAL_TAG = 'RZAFHLHZMNJQJGMTKVSRTHAPRJL'
  var CONSTANT = 'SELF9TAUGHT9AI9IS9BEST9YET9AT9STRATEGY9GAME9GOSELF9TAUGHT9AI9IS9BEST9YET9AT9STRAT'

  var NUM_OF_ADDRESSES_TO_SCAN = 200
  var MIN_BALANCE_THRESHOLD = 10000000

  var IF_RECLAIM_SERVICE_PUB_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBFn7N9UBEADAel8VNth0zbhVobJ21zhPiqMCQuZdc3zc8ojc5ZBGWTMm
rcMKvK1Jt+ganZCLdusRLtWTCkvlpwhtUI24cSB07auGhyJnpG7uA4CaEcSr
XdLhZkKiCRUTXKUtxNLNzPcF7E5bxt5pyK3zlMMZT/y2XenfV4q9/WktnCNn
PwV14/0AxxI14WIXU+0SGajQSnf8DmDkpJOYad7g5Cd1NWEGcnsY2vnbsdf2
qN23wkLaA6RFS3JjPCLdTspQyxkoX3fhAYYOqH2mt8PhEtnrlXc1adGaCH7m
egX+qRPqUM9TZQIu1l2Aqa4oOvuqEsbyhwG0Fdx3MtX1zyCPJGbl6FOWLUBq
sf85ROdxjWaFuPoq0iM3rU5Jcb7B5GpmhCWFcN3axBv5JsHvmBgEK3MSapGZ
C3yF4wp8iF1GF8nmCMWPUQruxsm+dCsAoCR3RAxbsM8krr1sU5gVvwim9euX
kd9gzK7mGXfdbQ1p1tdwSidHoJoZ7Zr6ihsoXMP2FH046hHuIz+Cxu3U8tKP
mgLyh/wIE1izTIKsMVavwu+sRbwYEiLrjC/xW7VRaj7uvjFgche5EnSB2Uwt
kQDyP94BvDILOb4YU0VmBJv26mKHn4PS9v9CDfZ3WsCssYE5GaPOyQG+4fMN
wNAs1mluv/UWRTR7J1RBUAHtPH8DqHeDUhKlIwARAQABtEZJT1RBIEZvdW5k
YXRpb24gUmVjb3ZlcnkgVG9vbCAobm8taHVtYW5zLWludm9sdmVkKSA8cmVj
b3ZlcnlAaW90YS5vcmc+iQJUBBMBCAA+FiEECmyt5VeVj8atvnAQ8bCzdIXm
/xMFAln7N9UCGw0FCQHhM4AFCwkIBwIGFQgJCgsCBBYCAwECHgECF4AACgkQ
8bCzdIXm/xMtqA//RQ+yqWJQ+Lw2G+EcXDp+u1ioB/2Eo3C6dhZDH7ZgtnuH
8aqKmurNtFGm2R20ZU+yRAwdCg0ZrRsrxdhD3EqqjjigpVqDDH8ld5UTkz3U
46Q0svqT1kBlOgcNgO6j4a64gGUNi81Uk/uhdyXcwYwzlF9j/6KefuOKGoYW
B5TfcG3VFEbFQoKmT9f6NmmxF5pPbwshHhXkmdSNOUSyrhpdYMSZLhvTvSh2
tjmnDt896RIjk7PAzJmvGesuq+jluLWv0YbS+yzNpnf8zA0kIR+TmRS2H6ww
+kmGAeQxCSUy7qw1/asRXoZznfxGZY09z49Uo3qD0YkGXY6Hg1qCOTtZku4H
EiDza8vOhBAOj0mrGiFTk1vuRzdvSkTQoM3HTMXbZzDsPrNOkkDXgHn77aZH
GLxbpGDmB4H2GRaCZaUR9uNu5+k4cqDj+wQ/F2q1+ApQ6yFY0Jo/trPOejy2
0ZfXTpQfKvdVcectDbU953fS2NCPMBXOVnpyFMf5NN5LoHqlJyQ0Jda2kQon
L65gbDhdCxRwTjNihAg1bAaxMfPnGuazQzbwha+d2T61G3Wax4utvXxDei76
epRopQYsVYv6ILtb0LsPHT7c/5wyTDwdZlyCMXC8zmnFN/1zjKZWyI5OoeUt
WHGl/N/YlZ/p38kb7ZXtuRca7VUPxRzqv3FrUBg
==2Lyf
-----END PGP PUBLIC KEY BLOCK-----`

  var _modal
  var _bundlesToTailsMap = new Map()
  var _proofTx = null
  var _revealTx = null
  var _proofTails = []
  var _revealTails = []
  var _proofTxConfirmed = false
  var _revealTxConfirmed = false
  var _proofAddress = ''
  var _pepper = ''
  var _step = 1
  var _pauseConfCheck = false

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
    var recoveryNextBtn = $('#recovery-next-btn')
    var reattachBtn = $('#recovery-reattach-btn')
    var promoteBtn = $('#recovery-promote-btn')
    var recoverySubmitSeedBtn = $('#recovery-submit-seed-btn')
    var recoverySubmitSeedReattachBtn = $('#recovery-submit-seed-reattach-btn')
    var recoverySubmitSeedPromoteBtn = $('#recovery-submit-seed-promote-btn')
    var recoveryCloseBtn = $('#recovery-step-3-close-btn')

    $(document).on('closed', '#recovery-modal', function (e) {
      UI.startStateInterval()
      UI.isRecoveryOpen = false
      UI.isLocked = false
      $('#recovery-old-seed').val('')
    })

    recoveryNextBtn.on('click', function () {
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_recovering')
        e.preventDefault()
        e.stopPropagation()
      })
      var oldSeed = String($('#recovery-old-seed').val())
      var newSeed = String($('#recovery-new-seed').val())

      if (oldSeed.length === 0) {
        UI.formError('recover', 'invalid_old_seed', {initial: 'publish_proof'})
        $('.remodal-close').off('click')
        recoveryNextBtn.loadingReset('recovery_next')
        $('#recovery-old-seed').val('')
        $('#recovery-old-seed').focus()
        return
      }

      if (!iota.valid.isTrytes(oldSeed)) {
        oldSeed = oldSeed.replace(/([^A-Z])/g, '9')
      }

      if (newSeed.length !== 81 || !iota.valid.isTrytes(newSeed)) {
        UI.formError('recover', 'invalid_new_seed', {initial: 'publish_proof'})
        $('.remodal-close').off('click')
        recoveryNextBtn.loadingReset('recovery_next')
        $('#recovery-new-seed').val('')
        $('#recovery-new-seed').focus()
        return
      }

      if (oldSeed === newSeed) {
        UI.formError('recover', 'old_new_identical', {initial: 'publish_proof'})
        $('.remodal-close').off('click')
        recoveryNextBtn.loadingReset('recovery_next')
        $('#recovery-new-seed').val('')
        $('#recovery-new-seed').focus()
        return
      }

      var newAddress
      {
        var key = IOTACrypto.signing.key(IOTACrypto.converter.trits(newSeed), 0, 2)
        var digests = IOTACrypto.signing.digests(key)
        var addressTrits = IOTACrypto.signing.address(digests)
        newAddress = IOTACrypto.converter.trytes(addressTrits)
        newAddress = IOTACrypto.utils.addChecksum(newAddress)
      }

      _proofAddress = newAddress
      var proof = generateProof(oldSeed, newSeed, newAddress)
      _pepper = proof[2]
      findTransactionObjects({addresses: [proof[1]]})
      .then((txs) => {
        if (txs.length) {
          checkInclusionStates(txs, CONFIRMATION_CHECK_TIMEOUT, true, (err, confirmed, tails) => {
            if (err) {
              UI.formError('recover', err.message, {initial: 'publish_proof'})
              $('.remodal-close').off('click')
              recoveryNextBtn.loadingReset('recovery_next')
              return
            }
            _proofTails = tails
            _proofTx = [txs.filter(tx => tx.lastIndex === 0).sort((a, b) => a.timestamp - b.timestamp)[0]]
            _step++
            $('#recovery-step-1').hide()
            $('#recovery-step-2').fadeIn()
            $('#recovery-transaction-hash-clipboard').html(UI.formatForClipboard(_proofTx[0].hash))
            if (confirmed) {
              _proofTxConfirmed = true
              document.getElementById('recovery-proof-confirmed-status').classList.remove('recovery-pending')
              $('#recovery-proof-transaction-pending').hide()
              $('#recovery-proof-transaction-confirmed').show()
              $('#recovery-reattach-prompt').hide()
              reattachBtn.hide()
              promoteBtn.hide()
              $('#recovery-submit-seed').fadeIn()
            } else {
              const currentTail = _bundlesToTailsMap.get(_proofTx[0].bundle)
              if (!currentTail || !isAboveMaxDepth(currentTail)) {
                getPromotableTail(tails, 0)
                  .then(consistentTail => {
                    if (_proofTxConfirmed || _pauseConfCheck) {
                      return
                    }
                    if (consistentTail) {
                      _bundlesToTailsMap.set(_proofTx[0].bundle, consistentTail)
                      promoteBtn.show()
                      reattachBtn.hide()
                    } else {
                      _bundlesToTailsMap.delete(_proofTx[0].bundle)
                      promoteBtn.hide()
                      reattachBtn.show()
                    }
                  })
              }
            }
          })
          $('.remodal-close').off('click')
          recoveryNextBtn.loadingReset('recovery_next')
          return
        }
        filterSpentAddresses([{address: newAddress}])
        .then(unspentAddresses => {
          if (unspentAddresses.length === 0) {
            UI.formError('recover', 'sent_to_key_reuse_error', {initial: 'recovery_next'})
            $('.remodal-close').off('click')
            recoveryNextBtn.loadingReset('recovery_next')
            $('#recovery-new-seed').val('')
            $('#recovery-new-seed').focus()
            return
          }
          attachBundle(generateProofBundle(newAddress, generateProof(oldSeed, newSeed, newAddress), TAG))
          .then(tx => {
            recoveryNextBtn.loadingReset('next')
            UI.formSuccess('recover', 'proof_published', {initial: 'recovery_next'})
            $('.remodal-close').off('click')
            $('#recovery-step-1').hide()
            $('#recovery-step-2').fadeIn()
            $('#recovery-transaction-hash-clipboard').html(UI.formatForClipboard(tx[0].hash))
            _bundlesToTailsMap.set(tx[0].bundle, tx[0])
            _step++
            _proofTx = tx
            checkInclusionStates(tx, CONFIRMATION_CHECK_TIMEOUT, false, (err, confirmed, tails) => {
              if (err) {
                UI.formError('recover', err.message, {initial: 'recovery_next'})
                return
              }
              _proofTails = tails
              if (confirmed) {
                _proofTxConfirmed = true
                UI.formSuccess('recover', 'recovery_proof_transaction_confirmed')
                document.getElementById('recovery-proof-confirmed-status').classList.remove('recovery-pending')
                $('#recovery-proof-transaction-pending').hide()
                $('#recovery-proof-transaction-confirmed').show()
                $('#recovery-reattach-prompt').hide()
                reattachBtn.hide()
                promoteBtn.hide()
                $('#recovery-submit-seed').fadeIn()
              } else {
                const currentTail = _bundlesToTailsMap.get(_proofTx[0].bundle)
                if (!currentTail || !isAboveMaxDepth(currentTail)) {
                  getPromotableTail(tails, 0)
                    .then(consistentTail => {
                      if (_proofTxConfirmed || _pauseConfCheck) {
                        return
                      }
                      if (consistentTail) {
                        _bundlesToTailsMap.set(_proofTx[0].bundle, consistentTail)
                        reattachBtn.hide()
                        promoteBtn.show()
                      } else {
                        _bundlesToTailsMap.delete(_proofTx[0].bundle)
                        promoteBtn.hide()
                        reattachBtn.show()
                      }
                    })
                }
              }
            })
          }).catch(() => {
            UI.formError('recover', 'recovery_attachment_error', {initial: 'recovery_next'})
            recoveryNextBtn.loadingReset('recovery_next')
            $('.remodal-close').off('click')
          })
        }).catch(err => {
          UI.formError('recover', err.message, {initial: 'recovery_next'})
          recoveryNextBtn.loadingReset('recovery_next')
          $('.remodal-close').off('click')
        })
      }).catch(err => {
        UI.formError('recover', err.message, {initial: 'recovery_next'})
        recoveryNextBtn.loadingReset('recovery_next')
        $('.remodal-close').off('recovery_next')
      })
    })

    reattachBtn.on('click', function () {
      _pauseConfCheck = true
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_reattaching')
        e.preventDefault()
        e.stopPropagation()
      })
      reattach(_proofTx[0].hash).then(res => {
        reattachBtn.loadingReset('reattach')
        UI.formSuccess('recover', 'reattach_completed', {initial: 'reattach'})
        _pauseConfCheck = false
        _bundlesToTailsMap.set(res[0].bundle, res[0])
        reattachBtn.hide()
        promoteBtn.show()
        $('.remodal-close').off('click')
      }).catch(err => {
        _pauseConfCheck = false
        reattachBtn.loadingReset('reattach')
        UI.formError('recover', err.message, {initial: 'reattach'})
        $('.remodal-close').off('click')
      })
    })

    promoteBtn.on('click', function () {
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_promoting')
        e.preventDefault()
        e.stopPropagation()
      })
      const tail = _bundlesToTailsMap.get(_proofTx[0].bundle) || _proofTx[0]
      promote(tail, _proofTails, _bundlesToTailsMap, 5, 1, (err, res) => {
        if (err) {
          if (err.message.indexOf('Inconsistent subtangle') > -1) {
            UI.formError('recover', 'promote_inconsistent_subtangle_error')
            promoteBtn.hide()
            reattachBtn.show()
          } else {
            UI.formError('recover', err.message, {initial: 'promote'})
          }
          $('.remodal-close').off('click')
        } else {
          UI.formSuccess('recover', 'promote_completed', {initial: 'promote'})
          $('.remodal-close').off('click')
        }
        promoteBtn.loadingReset('promote')
      })
    })

    recoverySubmitSeedPromoteBtn.on('click', function () {
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_promoting')
        e.preventDefault()
        e.stopPropagation()
      })
      const tail = _bundlesToTailsMap.get(_revealTx[0].bundle) || _revealTx[0]
      promote(tail, _revealTails, _bundlesToTailsMap, 5, 1, (err, res) => {
        if (err) {
          if (err.message.indexOf('Inconsistent subtangle') > -1) {
            UI.formError('recover', 'promote_inconsistent_subtangle_error')
            recoverySubmitSeedPromoteBtn.hide()
            reattachBtn.show()
          } else {
            UI.formError('recover', err.message, {initial: 'promote'})
          }
          $('.remodal-close').off('click')
        } else {
          UI.formSuccess('recover', 'promote_completed', {initial: 'promote'})
          $('.remodal-close').off('click')
        }
        recoverySubmitSeedPromoteBtn.loadingReset('promote')
      })
    })

    recoverySubmitSeedReattachBtn.on('click', function () {
      _pauseConfCheck = true
      $('.remodal-close').on('click', function (e) {
        UI.notify('error', 'cannot_close_whilst_reattaching')
        e.preventDefault()
        e.stopPropagation()
      })
      reattach(_revealTx[0].hash).then(res => {
        recoverySubmitSeedReattachBtn.loadingReset('reattach')
        _pauseConfCheck = false
        _bundlesToTailsMap.set(res[0].bundle, res[0])
        recoverySubmitSeedReattachBtn.hide()
        recoverySubmitSeedPromoteBtn.show()
        UI.formSuccess('recover', 'reattach_completed', {initial: 'reattach'})
        $('.remodal-close').off('click')
      }).catch(err => {
        _pauseConfCheck = false
        recoverySubmitSeedReattachBtn.loadingReset('reattach')
        UI.formError('recover', err.message, {initial: 'reattach'})
        $('.remodal-close').off('click')
      })
    })

    recoverySubmitSeedBtn.on('click', function () {
      if (!_proofTxConfirmed) {
        UI.formError('recover', 'recovery_unexpected_error', {initial: 'recovery_submit_seed'})
        $('.remodal-close').off('click')
        recoverySubmitSeedBtn.loadingReset('recovery_submit_seed')
        _modal.close()
        _resetState()
        return
      }
      var oldSeed = String($('#recovery-old-seed').val())

      if (!iota.valid.isTrytes(oldSeed)) {
        oldSeed = oldSeed.replace(/([^A-Z])/g, '9')
      }

      setTimeout(() => {
        getBalance(oldSeed)
        .then((balance) => {
          if (balance > MIN_BALANCE_THRESHOLD) {
            UI.formError('recover', 'recovery_old_seed_has_balance')
            $('.remodal-close').off('click')
            recoverySubmitSeedBtn.loadingReset('recovery_submit_seed')
            return
          }
          var data = oldSeed + ',' + iota.utils.noChecksum(_proofAddress) + ',' + _pepper
          return pgpEncrypt(data, IF_RECLAIM_SERVICE_PUB_KEY)
          .then(cipherText => attachBundle(generateRevealBundle(cipherText.data, _proofTx[0].address)))
          .then((txs) => {
            _bundlesToTailsMap.set(txs[0].bundle, txs[0])
            recoverySubmitSeedBtn.loadingReset('recovery_submit_seed')
            recoverySubmitSeedBtn.hide()
            recoverySubmitSeedPromoteBtn.show()
            recoverySubmitSeedReattachBtn.hide()
            $('#recovery-proof-confirmed-status').hide()
            $('#recovery-reveal-confirmed-status').fadeIn()
            $('#recovery-transaction-hash-clipboard').html(UI.formatForClipboard(txs[0].hash))
            _revealTx = txs
            checkInclusionStates(txs, CONFIRMATION_CHECK_TIMEOUT, false, (err, confirmed, tails) => {
              if (err) {
                UI.formError('recover', err.message, {initial: 'recovery_next'})
                return
              }
              _revealTails = tails
              if (confirmed) {
                UI.formSuccess('recover', 'recovery_completed', {initial: 'recovery_submit_seed'})
                $('.remodal-close').off('click')
                $('#recovery-step-2').hide()
                $('#recovery-step-3').fadeIn()
                $('#recovery-new-address-clipboard').html(UI.formatForClipboard(_proofAddress))
                document.getElementById('recovery-reveal-confirmed-status').classList.remove('recovery-pending')
                recoverySubmitSeedReattachBtn.hide()
                recoverySubmitSeedPromoteBtn.hide()
              } else {
                const currentTail = _bundlesToTailsMap.get(_revealTx[0].bundle)
                if (!currentTail || !isAboveMaxDepth(currentTail)) {
                  getPromotableTail(tails, 0)
                    .then(consistentTail => {
                      if (_revealTxConfirmed || _pauseConfCheck) {
                        return
                      }
                      if (consistentTail) {
                        _bundlesToTailsMap.set(_revealTx[0].bundle, consistentTail)
                        recoverySubmitSeedReattachBtn.hide()
                        recoverySubmitSeedPromoteBtn.show()
                      } else {
                        recoverySubmitSeedPromoteBtn.hide()
                        recoverySubmitSeedReattachBtn.show()
                        _bundlesToTailsMap.delete(_revealTx[0].bundle)
                      }
                    })
                }
              }
            })
          }).catch(() => {
            UI.formError('recover', 'recovery_submit_seed_error', {initial: 'recovery_submit_seed'})
            $('.remodal-close').off('click')
            recoverySubmitSeedBtn.loadingReset('recovery_submit_seed')
          })
        }).catch(() => {
          UI.formError('recover', 'recovery_submit_seed_error', {initial: 'recovery_submit_seed'})
          $('.remodal-close').off('click')
          recoverySubmitSeedBtn.loadingReset('recovery_submit_seed')
        })
      }, 1000)
    })

    recoveryCloseBtn.on('click', function () {
      _modal.close()
      _resetState()
    })

    function _resetState () {
      $('#recovery-step-3').hide()
      $('#recovery-step-2').hide()
      $('#recovery-step-1').show()
      $('#recovery-reattach-prompt').show()
      $('#recovery-proof-confirmed-status').show()
      $('#recovery-reveal-confirmed-status').hide()
      $('#recovery-submit-seed').hide()
      $('#recovery-reattach-btn').hide()
      $('#recovery-promote-bth').show()
      $('#recovery-proof-transaction-confirmed').hide()
      $('#recovery-proof-transaction-pending').show()
      $('#recovery-reveal-transaction-confirmed').hide()
      $('#recovery-reveal-transaction-pending').show()
      document.getElementById('recovery-proof-confirmed-status').classList.add('recovery-pending')
      document.getElementById('recovery-reveal-confirmed-status').classList.add('recovery-pending')
      $('#recovery-new-seed').val('')
      $('#recovery-old-seed').val('')
      $('#recovery-submit-seed-btn').show()
      $('#recovery-submit-seed-reattach-btn').hide()
      $('#recovery-submit-seed-promote-btn').hide()
      _bundlesToTailsMap = new Map()
      _proofTx = null
      _revealTx = null
      _proofTails = []
      _revealTails = []
      _proofTxConfirmed = false
      _revealTxConfirmed = false
      _proofAddress = ''
      _pepper = ''
      _step = 1
      _pauseConfCheck = false
    }
  }

  function pgpEncrypt (plainText, publicKey) {
    return openpgp.encrypt({
      data: plainText,
      publicKeys: openpgp.key.readArmored(publicKey).keys
    })
  }

  function generateRevealBundle (cipherText, address) {
    var payload = iota.utils.toTrytes(cipherText.split(/(\n)/g).slice(7, -3).join('').replace(/(\r|\n)/g, ''))
    var fragments = []
    var fragmentsCount = 1 + Math.floor(payload.length / (27 * HASH_LENGTH))
    var timestamp = Math.floor(Date.now() / 1000)
    var bundle = new IOTACrypto.bundle()
    for (var i = 0; i < fragmentsCount; i++) {
      const fragment = payload.slice(i * 27 * HASH_LENGTH, (i + 1) * 27 * HASH_LENGTH)
      fragments.push(fragment + '9'.repeat((27 * HASH_LENGTH) - fragment.length))
    }
    bundle.addEntry(fragmentsCount, address, 0, REVEAL_TAG, timestamp)
    for (var j = 0; j < fragmentsCount; j++) {
      bundle.bundle[j].tag = REVEAL_TAG
      bundle.bundle[j].obsoleteTag = REVEAL_TAG
    }
    bundle.finalize()
    bundle.addTrytes(fragments)
    return bundle
  }

  function getBalance (oldSeed) {
    var addresses = []
    for (var i = 0; i <= NUM_OF_ADDRESSES_TO_SCAN; i++) {
      addresses.push(iota.api._newAddress(oldSeed, i, 2, false))
    }
    return new Promise((resolve, reject) => {
      iota.api.getBalances(addresses, 100, (err, res) => err ? reject(err) : resolve(res.balances.reduce((sum, balance) => sum + parseInt(balance), 0)))
    })
  }

  function checkInclusionStates (txs, timeout, noDelay, cb) {
    if (!Array.isArray(txs)) {
      txs = [txs]
    }
    setTimeout(() => {
      findTransactionObjects({bundles: txs.map(tx => tx.bundle)}).then(allTxs => {
        var tails = allTxs.filter(tx => tx.currentIndex === 0)
        getLatestInclusion(tails.map(tx => tx.hash)).then(states => {
          var confirmed = states.some(state => state)
          cb(null, confirmed, tails)
          if (!confirmed) {
            checkInclusionStates(txs, timeout, false, cb)
          }
        }).catch(err => {
          cb(err)
          checkInclusionStates(txs, timeout, false, cb)
        })
      })
    }, noDelay ? 0 : timeout)
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

  function promote (tail, tails, bundlesToTailsMap, count, i, cb) {
    if (!tails || !tails.length) {
      tails = [tail]
    }
    iota.api.getLatestInclusion(tails.map(tx => tx.hash), (err, states) => {
      if (err) {
        return cb(err)
      }

      if (states.some(state => state)) {
        return cb(null, true)
      }

      iota.api.promoteTransaction(
        tail.hash,
        connection.depth,
        connection.minWeightMagnitude,
        [{ address: '9'.repeat(81), value: 0, message: '', tag: '' }],
        { interrupt: false, delay: 0 },
        (err, res) => {
          if (err) {
            if (err.message.indexOf('Inconsistent subtangle') > -1) {
               bundlesToTailsMap.delete(tail.bundle)
            }
            return cb(err)
          }
          if (i < count) {
            setTimeout(() => promote(tail, tails, bundlesToTailsMap, count, ++i, cb), 1000)
          } else {
            cb(null, res)
          }
        }
      )
    })
  }

  function generateProofBundle (address, pepperAndProof, tag) {
    var bundle = new IOTACrypto.bundle()
    bundle.addEntry(1, pepperAndProof[1], 0, tag, Math.floor(Date.now() / 1000))
    bundle.bundle[0].tag = pepperAndProof[0]
    bundle.bundle[0].obsoleteTag = tag
    bundle.finalize()
    bundle.addTrytes(['9'.repeat(81 * 27)])
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
    var pepper = IOTACrypto.converter.trytes(trits)
    var pepperStart = pepper.slice(0, 27)
    kerl = new IOTACrypto.kerl()
    kerl.initialize()
    kerl.absorb(trits, 0, HASH_LENGTH * 3)
    kerl.absorb(IOTACrypto.converter.trits(iota.utils.noChecksum(newAddress)), 0, HASH_LENGTH * 3)
    kerl.absorb(oldTrits, 0, HASH_LENGTH * 3)
    kerl.squeeze(trits, 0, HASH_LENGTH * 3)
    return [pepperStart, IOTACrypto.converter.trytes(trits), pepper]
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
