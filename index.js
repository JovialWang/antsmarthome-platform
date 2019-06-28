var request = require('request');
var outRequest = request;
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version);
  console.log("My Plugin version: 1");
  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("antsmarthome-platform", "AntSmartHomePlatform", AntSmartHomePlatform, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function AntSmartHomePlatform(log, config, api) {
  log("AntSmartHomePlatform Init");
  var platform = this;
  this.log = log;
  this.config = config;
  this.accessories = [];
  this.accessoryMap = {};

  var exists = fs.existsSync("/homebridge/accessory_map.json");
  if(exists){
    var data = fs.readFileSync('/homebridge/accessory_map.json', 'utf8');
    if(data){
      platform.log("load:" + data)
      platform.accessoryMap = JSON.parse(data);
      platform.log("accessoryMap:" + JSON.stringify(platform.accessoryMap))
    }
  }

  this.requestServer = http.createServer(function(request, response) {
    if (request.url === "/add") {
      outRequest("http://"+config.smarthome.host+":8080/api/init",
      function (error, response, body) {
        if (error) {
          platform.log(error.message);
        }
        platform.log(response);
        var devices = JSON.parse(body);
        devices.forEach( device => {
          platform.addAccessory(device);
        })
        fs.writeFileSync('/homebridge/accessory_map.json',JSON.stringify(platform.accessoryMap), {encoding: 'utf8'});
      });
      response.writeHead(204);
      response.end();
    }
    if(request.url == "/updateValue"){
      var post = '';
      request.on('data', function(chunk){    
          post += chunk;
      });
      request.on('end', function(){
        platform.log("updateValue1:"+post);
        var message = JSON.parse(post);
        platform.log("updateValue2:"+message);
        var uuid = UUIDGen.generate(message.macAddr);
        var status = message.status;
        var i;
        for (i = 0; i < platform.accessories.length; i++) { 
          if(platform.accessories[i].UUID == uuid){
            platform.accessories[i].getService(Service.Lightbulb).getCharacteristic(Characteristic.On).updateValue("true"==status?true:false);
            break;
          }
        }
        response.writeHead(200);
        response.end("ok");
      });
    }
    if (request.url == "/reachability") {
      this.updateAccessoriesReachability();
      response.writeHead(204);
      response.end();
    }

    if (request.url == "/remove") {
      this.removeAccessory();
      response.writeHead(204);
      response.end();
    }
  }.bind(this));

  this.requestServer.listen(18081, function() {
    platform.log("Server Listening...");
  });


  if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on('didFinishLaunching', function() {
        platform.log("DidFinishLaunching");
      }.bind(this));
  }  

}

// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
AntSmartHomePlatform.prototype.configureAccessory = function(accessory) {
  const me = this;
  this.log(accessory.displayName, "Configure Accessory");
  this.log(JSON.stringify(accessory));
  this.log(JSON.stringify(this.accessoryMap));
  this.log(JSON.stringify(this.accessoryMap[accessory.UUID]));
  var platform = this;

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking 
  // accessory.updateReachability()
  accessory.reachable = true;

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!");
    callback();
  });

  var device = this.accessoryMap[accessory.UUID];

  if (accessory.getService(Service.Lightbulb)) {
    accessory.getService(Service.Lightbulb)
    .getCharacteristic(Characteristic.On)
    .on('get', function(next) {
      request("http://"+me.config.smarthome.host+":8080/api/status?targetDevice="+device.macAddr,
      function (error, response, body) {
        if (error) {
          me.log(error.message);
          return next(error);
        }
        me.log(response);
        return next(null, body=="true"?true:false);
      });
    })
    .on('set', function(value, next) {
      request("http://"+me.config.smarthome.host+":8080/api/order?targetDevice="+device.macAddr+"&targetState="+value,
      function (error, response) {
        if (error) {
          me.log(error.message);
          return next(error);
        }
        me.log(response);
        return next();
      });
    });
  }

  this.accessories.push(accessory);
}

// Sample function to show how developer can add accessory dynamically from outside event
AntSmartHomePlatform.prototype.addAccessory = function(device) {
  this.log("Add Accessory");
  var platform = this;
  var uuid;
  const me = this;
  uuid = UUIDGen.generate(device.macAddr);

  if(device.name.indexOf("双控")>0){
    return;
  }

  var newAccessory = new Accessory(device.name, uuid);
  newAccessory.on('identify', function(paired, callback) {
    platform.log(newAccessory.displayName, "Identify!!!");
    callback();
  });
  // Plugin can save context on accessory to help restore accessory in configureAccessory()
  // newAccessory.context.something = "Something"
  
  // Make sure you provided a name for service, otherwise it may not visible in some HomeKit apps
  newAccessory.addService(Service.Lightbulb, device.name)
  .getCharacteristic(Characteristic.On)
  .on('get', function(next) {
    request("http://"+me.config.smarthome.host+":8080/api/status?targetDevice="+device.macAddr,
    function (error, response, body) {
      if (error) {
        me.log(error.message);
        return next(error);
      }
      me.log(response);
      return next(null, body=="true"?true:false);
    });
  })
  .on('set', function(value, next) {
    request("http://"+me.config.smarthome.host+":8080/api/order?targetDevice="+device.macAddr+"&targetState="+value,
    function (error, response) {
      if (error) {
        me.log(error.message);
        return next(error);
      }
      me.log(response);
      return next();
    });
  });
  this.log(JSON.stringify(newAccessory));
  this.accessories.push(newAccessory);
  this.api.registerPlatformAccessories("antsmarthome-platform", "AntSmartHomePlatform", [newAccessory]);
  this.accessoryMap[newAccessory.UUID] = device;
}

AntSmartHomePlatform.prototype.updateAccessoriesReachability = function() {
  this.log("Update Reachability");
  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    accessory.updateReachability(false);
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
AntSmartHomePlatform.prototype.removeAccessory = function() {
  this.log("Remove Accessory");
  this.api.unregisterPlatformAccessories("antsmarthome-platform", "AntSmartHomePlatform", this.accessories);

  this.accessories = [];
}