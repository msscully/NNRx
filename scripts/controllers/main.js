app.controller('MainCtrl', ['$scope', '$rootScope', '$window', '$location', function ($scope, $rootScope, $window, $location) {
    'use strict';
    $scope.slide = '';
    $rootScope.back = function() {
        $scope.slide = 'slide-right';
        $window.history.back();
    };

    $rootScope.go = function(path){
        $scope.slide = 'slide-left';
        $location.url(path);
    };
}]);
