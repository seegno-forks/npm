'use strict'
var validate = require('aproba')

var runNext = global.setImmediate || process.nextTick

function tooManyIterations (who, max) {
  var er = new Error('While statement looped more than maximum iteration count of ' + max)
  er.code = 'ETOOMANYITERATIONS'
  Error.captureStackTrace(er, who)
  return er
}

exports.while = function (maxIterations, condition, each, done) {
  validate('NFFF', arguments)
  var iter = 0
  function oneIteration (er) {
    if (er) return done(er)
    condition(function (doMore) {
      if (!doMore) return done()
      if (++iter > maxIterations) {
        return done(tooManyIterations(exports.while, maxIterations))
      }
      var next = dezalgo(oneIteration)
      next.stop = function () {
        return done()
      }
      each(next)
    })
  }
  oneIteration()
}

var syncStop = function () {
  var er = new Error()
  er.code = 'BREAK'
  throw er
}

exports.whileSync = function (maxIterations, condition, each) {
  validate('NFF', arguments)
  var iter = 0
  while (condition()) {
    if (++iter > maxIterations) {
      throw tooManyIterations(exports.whileSync, maxIterations)
    }
    try {
      each(syncStop)
    } catch (ex) {
      if (ex.code === 'BREAK') return
      throw ex
    }
  }
}

exports.defer = function (cb) {
  validate('F', [cb])
  var args = Array.prototype.slice.call(arguments, 1)
  runNext(function () {
    cb.apply(null, args)
  })
}

// We have our own dezalgo because it's much simpler– it
// doesn't maintain properties across callback (w/ wrappy)
// it doesn't use asap. It's just the core functionality.
var dezalgo = exports.dezalgo = function (cb) {
  validate('F', arguments)
  var runWithArgs
  var zalgoSafeCallback = function () {
    runWithArgs = arguments
  }
  runNext(function () {
    zalgoSafeCallback = cb
    if (runWithArgs) cb.apply(null, runWithArgs)
  })
  return function () {
    zalgoSafeCallback.apply(null, arguments)
  }
}

exports.onlyOnce = function (cb) {
  validate('F', arguments)
  var haveRun = false
  return dezalgo(function guard () {
    if (haveRun) {
      var er = new Error('Callback called more than once')
      er.code = 'EMORETHANONCE'
      Error.captureStackTrace(er, guard)
      throw er
    } else {
      haveRun = true
      cb.apply(null, arguments)
    }
  })
}

// Similarly we provide our own once. It doesn't do
// wrappy stuff, but it does ensure zalgo is contained.
exports.once = function (cb) {
  validate('F', arguments)
  var haveRun = false
  return dezalgo(function () {
    if (!haveRun) {
      haveRun = true
      cb.apply(null, arguments)
    }
  })
}