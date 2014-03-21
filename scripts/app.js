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
