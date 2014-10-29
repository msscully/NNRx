angular.module('fsCordova', [])
.service('CordovaService', ['$document', '$q', '$window', function($document, $q, $window) {

  var deferedDeviceReady = $q.defer();
  var resolved = false;

  this.ready = deferedDeviceReady.promise;

  document.addEventListener('deviceready', function() {
    resolved = true;
    deferedDeviceReady.resolve($window.cordova);
  });

  // Check to make sure we didn't miss the
  // event (just in case)
  setTimeout(function() {
    if (!resolved) {
      if ($window.cordova) deferedDeviceReady.resolve($window.cordova);
    }
  }, 3000);

  var deferResume = $q.defer();
  this.resumed = deferResume.promise;

  this.ready.then( function() {
    document.addEventListener('resume', function() {
      deferResume.resolve();
    });
  });

}]);
