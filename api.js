let request = require('request-promise-native')
let memoize = require('memoizee')

let Api = function (log, name, ipAddress, username, password) {
  this.log = log
  this.name = name
  this.ipAddress = ipAddress
  this.username = username
  this.password = password

  // Memoize methods
  this.readings = memoize(
    this.readings.bind(this),
    {
      promise: true,
      maxAge: 0.5 * 60 * 1000 // 30 seconds
    })

}

Api.prototype.readings = async function () {
  this.log(`Fetching status readings for Roomba (${this.name})`)
  return this.fetch(`/roomba.json`)
}

Api.prototype.clean = async function () {
  this.log(`Telling Roomba (${this.name}) to clean`)
  return this.fetch('/roomba.cgi?button=CLEAN')
    .then(() => {
      setTimeout(() => {
        this.fetch('/roomba.cgi?button=CLEAN')
        }, 1000);
    });
}

Api.prototype.dock = async function (deviceId) {
  this.log(`Telling Roomba (${this.name}) to dock`)
  return this.fetch('/roomba.cgi?button=DOCK')
    .then(() => {
      setTimeout(() => {
        this.fetch('/roomba.cgi?button=DOCK')
        }, 1000);
    });
}

Api.prototype.fetch = async function (path) {
  let options = {
    json: true,
    uri: 'http://' + this.ipAddress + path
  }

  if (this.username && this.password) {
    options.headers = {
      Authorization: 'Basic ' + new Buffer(this.username + ':' + this.password).toString('base64')
    }
  }

  return request.get(options)
}

module.exports = {
  Api: Api
}
