app.controller('MainCtrl', ['$scope', '$rootScope', '$window', '$location', function ($scope, $rootScope, $window, $location, reminderStorage) {
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

    $rootScope.handleNotification = function(id, state, json) {
        //state is background or foreground
        var reminderId = JSON.parse(json).id;
        //var reminder = reminderStorage.get(reminderId);
        var reminder = {};
        reminder.message = "The hell?";
        reminder.title = "WTH?";
        navigator.notification.alert(
            reminder.message,  // message
            $rootScope.alertDismissed,         // callback
            reminder.title,            // title
            'Dismiss'                  // buttonName
        );
    };

    $rootScope.alertDismissed = function() {
        $rootScope.go('/');
    };

    window.plugin.notification.local.onclick = $rootScope.handleNotification;

 }]);
