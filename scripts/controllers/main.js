app.controller('MainCtrl', ['$scope', '$rootScope', '$window', '$location', 'reminderStorage', 'CordovaService', function ($scope, $rootScope, $window, $location, reminderStorage, CordovaService) {
  'use strict';
  CordovaService.ready.then(function() {
    $scope.slide = '';

    $rootScope.back = function() {
      $scope.slide = 'slide-right';
      $window.history.back();
    };

    $rootScope.go = function(path){
      $scope.slide = 'slide-left';
      $location.url(path);
    };
  });
}]);
