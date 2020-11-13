# homebridge-roowifi
Homebridge plugin for the RooWifi controller for Roomba

## Installation
`sudo npm install -g --unsafe-perm homebridge-roowifi`

## Configuration
Add to the accessories in your `config.json`
```
{
  "name": "Roomba",
  "accessory": "RooWifi",
  "ipAddress": "<ipAddress>",
  "username": "<username>",
  "password": "<password>",
  "pollingInterval": 300
}
```
