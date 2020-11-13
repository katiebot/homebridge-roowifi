var Service, Characteristic
let Api = require('./api.js').Api

module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-roowifi', 'RooWifi', RooWifi, true)
}

let RooWifi = function (log, config, api) {
  this.log = log
  this.api = api
  this.name = config['name']
  this.ipAddress = config['ipAddress']
  this.backend = new Api(log, config['name'], config['ipAddress'], config['username'], config['password'])

  this.log(`Adding RooWifi (${this.name}, ${this.ipAddress})`)
}

RooWifi.prototype.getStateTemperature = function (callback) {
  this.readSensorWithCallback('temperature', callback)
}

RooWifi.prototype.getStateBatteryLevel = function (callback) {
  this.readSensorWithCallback('battery', callback)
}

RooWifi.prototype.getStateBatteryCharging = function (callback) {
  this.readSensorWithCallback('charging', callback)
}

RooWifi.prototype.readSensorWithCallback = function (sensor, callback) {
  this.readSensor(sensor)
    .then(val => callback(null, val))
    .catch(err => {
      this.log(err)
      callback(err)
    })
}

RooWifi.prototype.readSensor = async function (sensor) {
  let sensors = await this.backend.readings()
  let chargingState = sensors.response.r14.value
  let temperature = sensors.response.r17.value
  let charge = sensors.response.r18.value
  let capacity = sensors.response.r19.value
  
  // chargingState 0 = not charging
  // chargingState 1 = charging recovery
  // chargingState 2 = charging
  // chargingState 3 = trickle charging
  // chargingState 4 = waiting
  // chargingState 5 = charging error

  if (sensor === 'temperature') {
    return Promise.resolve(temperature)
  }

  if (sensor === 'battery') {
    return Promise.resolve((charge / capacity) * 100)
  }

  if (sensor === 'charging') {
    let charging = false
    if (chargingState == '1' || chargingState == '2' || chargingState == '3') {
      charging = true
    }
    return Promise.resolve(charging)
  }

  return Promise.reject(new Error(`Invalid sensor ${sensor} not found`))
}

RooWifi.prototype.getRoombaStateWithCallback = function (callback) {
  this.getRoombaState()
    .then(val => callback(null, val))
    .catch(err => {
      this.log(err)
      callback(err)
  })
}

RooWifi.prototype.getRoombaState = async function () {
  let sensors = await this.backend.readings()
  let chargingState = sensors.response.r14.value
  let current = sensors.response.r16.value
  let cleaning = false
  let docked = false

  if (current < -500) {
    cleaning = true // only the motors require much power
    docked = false // it does not clean while docked
  }
  else if ((current > -500) && (chargingState != '0') && (chargingState != '4')) {
    // include the idle power .. but check on charge-state to make sure
    cleaning = false // cant charge and clean at the same time
    docked = true // its gets power (so must be docked)
  }
  
  /*
  if (current < -2 && current > -200 && (chargingState == '0' || chargingState == '4')) {
    // Stopped
  }
  else if (current < -201 && (chargingState == '0' || chargingState == '4')) {
    // Cleaning
  }
  else if (current > -1 && chargingState == '1' || chargingState == '2' || chargingState == '3') {
    // Docked
  }
  */

  return Promise.resolve(cleaning)
}

RooWifi.prototype.setRoombaStateWithCallback = function (state, callback) {
  this.setRoombaState(state)
    .then(val => callback(null, val))
    .catch(err => {
      this.log(err)
      callback(err)
  })
}

RooWifi.prototype.setRoombaState = async function (state) {
  if (state == true) {
    await this.backend.clean();
  }
  else {
    await this.backend.dock();
  }

  return Promise.resolve()
}

RooWifi.prototype.getServices = function () {
  let info = new Service.AccessoryInformation()

  info
    .setCharacteristic(Characteristic.Manufacturer, 'RooWifi')

    let temp = new Service.TemperatureSensor(this.name + ' Temperature')

    temp
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getStateTemperature.bind(this))

    let battery = new Service.BatteryService(this.name + ' Battery')

    battery
      .getCharacteristic(Characteristic.BatteryLevel)
      .on('get', this.getStateBatteryLevel.bind(this))

    battery
      .getCharacteristic(Characteristic.ChargingState)
      .on('get', this.getStateBatteryCharging.bind(this))

  let status = new Service.Switch(this.name)

  status
    .getCharacteristic(Characteristic.On)
    .on('get', this.getRoombaStateWithCallback.bind(this))
    .on('set', this.setRoombaStateWithCallback.bind(this))

  let services = [info, status, temp, battery]

  return services
}
