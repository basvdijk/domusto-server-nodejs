let fs = require('fs');
let util = require('../util');
let core = require('../core.js');

let io;

let Domusto = {};

Domusto.io = null;

Domusto.outputDevices = [];
Domusto.inputDevices = [];

Domusto.devices = [];

Domusto.hardwareInstances = {};

Domusto.init = function (io) {

    Domusto.loadConfiguration();

    Domusto.io = io;

    Domusto.initSocketIo();

    Domusto.initDevices();

    Domusto.initHardware();
    
}

Domusto.initSocketIo = function (io) {

    Domusto.io.on('connection', function (socket) {

        util.debug('Connection received from:', socket.handshake.headers.referer);

        // // send data to client
        // setInterval(function () {
        //     console.log('emit');
        //     Domusto.io.emit('deviceUpdate', { 'id': 'input-2', 'number': Math.random() });
        // }, 10000);

    });

}

Domusto.initHardware = function() {

    util.debug('Initialising hardware');

    let hardware = Domusto.configuration.hardware;
    let hardwareInstance = null;

    // Loading hardware plugins
    for (let i = 0; i < hardware.length; i++) {

        let component = hardware[i];

        switch (component.type) {
            case "RFXCOM":
                hardwareInstance = require('../plugins/domusto-rfxcom');
                break;

            default:
                break;
        }

        if (hardwareInstance) {
            hardwareInstance.init(component, Domusto.configuration);
            Domusto.hardwareInstances[component.type] = hardwareInstance;

            // Subscribe to the new input data function
            hardwareInstance.onNewInputData = Domusto.onNewInputData;
        }

    }

}

Domusto.initDevices = function () {

    for (let i = 0; i < Domusto.configuration.devices.length; i++) {

        let device = Domusto.configuration.devices[i];

        switch (device.role) {
            case 'input': {
                let input = Domusto.initInput(Object.assign({}, device));
                Domusto.devices.push(input);
                break
            }
            case 'output': {
                let output = Domusto.initOutput(Object.assign({}, device));
                Domusto.devices.push(output);
                break
            }
        }
    }

}

Domusto.initInput = function (input) {

    switch (input.type) {
        case 'temperature': {
            input.data = {
                deviceTypeString: null,
                temperature: null,
                humidity: null,
                humidityStatus: null,
                barometer: null,
                batteryLevel: null,
                rssi: null,
            }
            input.lastUpdated = new Date()
            break;
        }
    }

    return input;
}

Domusto.initOutput = function (output) {
    output.state = 'off';
    output.lastUpdated = new Date();
    output.actions = {
        on: core.data.serverAddress + 'output/command/' + output.protocol.id + '/on',
        off: core.data.serverAddress + 'output/command/' + output.protocol.id + '/off'
    }

    return output;
}

Domusto.outputCommand = function (hardwareId, command, onSuccess) {

    let device = Domusto.deviceByHardwareId(hardwareId);
    let hardware = Domusto.hardwareByHardwareId(hardwareId);

    hardware.outputCommand(device, command, function (response) {
        device.state = response.state;
        onSuccess(device);
        Domusto.io.emit('outputDeviceUpdate', device);
    });

}

// Fired when a plugin broadcasts new data
Domusto.onNewInputData = function (input) {

    let device = Domusto.deviceByHardwareId(input.hardwareId);

    // Update the device with the new input data
    Object.assign(device.data, input.data);

    device.lastUpdated = new Date();

    Domusto.io.emit('inputDeviceUpdate', device);
}

// Load the app / input / output configuration file
Domusto.loadConfiguration = function () {
    let configuration = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    Domusto.configuration = configuration;

    if (!Domusto.configuration.debug) {
        util.debug = function () { };
    } else {
        util.log('Debug messages enabled')
    }
}

Domusto.switchOn = function (deviceId, callback) {
    let device = Domusto.configuration.devices[deviceId];
    Domusto.hardwareByDeviceId(deviceId).switch(deviceId, 'switchOn', function (err, res, sequenceNumber) {
        util.debug('#' + sequenceNumber + ' Switching ' + device.name + ' with device id ' + deviceId + ' ON');
        device.status = 'ON';
        callback(err, res, sequenceNumber);
    });
}

Domusto.switchOff = function (deviceId, callback) {
    let device = Domusto.configuration.devices[deviceId];
    Domusto.hardwareByDeviceId(deviceId).switch(deviceId, 'switchOff', function (err, res, sequenceNumber) {
        util.debug('#' + sequenceNumber + ' Switching ' + device.name + ' with device id ' + deviceId + ' OFF');
        device.status = 'OFF';
        callback(err, res, sequenceNumber);
    });
}

// Get the hardware instance by device id
Domusto.hardwareByHardwareId = function (hardwareId) {

    let device = Domusto.deviceByHardwareId(hardwareId);

    let hardwareInstanceId = device.protocol.hardwareId;

    let hardwareType = Domusto.configuration.hardware[hardwareInstanceId].type;
    return Domusto.hardwareInstances[hardwareType];
}

Domusto.deviceByHardwareId = function (hardwareId) {

    let device = null;

    device = Domusto.devices.find(function (device) {
        return device.protocol.id === hardwareId;
    });

    return device;
};

Domusto.getDevicesByRole = function(role) {

    let inputDevices = Domusto.devices.slice().filter(function (device) {
        return device.role === role;
    });


    return inputDevices;

}

module.exports = Domusto;