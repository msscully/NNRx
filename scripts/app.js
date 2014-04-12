/* global app:true */

var app = angular.module('angRemindersApp', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
]);

var onDeviceReady = function() {
    angular.bootstrap( document, ['angRemindersApp']);
};

document.addEventListener('deviceready', onDeviceReady);

app.config([
    '$provide', function($provide) {
    return $provide.decorator('$rootScope', [
        '$delegate', function($delegate) {
        $delegate.safeApply = function(fn) {
            var phase = $delegate.$$phase;
            if (phase === "$apply" || phase === "$digest") {
                if (fn && typeof fn === 'function') {
                    fn();
                }
            } else {
                $delegate.$apply(fn);
            }
        };
        return $delegate;
    }
    ]);
}
]);


app.config(function ($routeProvider) {
    'use strict';
    $routeProvider
    .when('/', {
        templateUrl: 'views/reminders.html',
        controller: 'ReminderCtrl'
    })
    .when('/addReminder', {
        templateUrl: 'views/addReminder.html',
        controller: 'ReminderCtrl'
    })
    .when('/reminders/', {
        templateUrl: 'views/addReminder.html',
        controller: 'ReminderCtrl'
    })
    .when('/reminders/:reminderId', {
      templateUrl: 'views/addReminder.html',
      controller: 'ReminderCtrl'
    })
    .when('/reminders/:reminderId/edit', {
      templateUrl: 'views/addReminder.html',
      controller: 'ReminderCtrl'
    })
    .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'MainCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });
});

app.run(function() {
    FastClick.attach(document.body);
});
