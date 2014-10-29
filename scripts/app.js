/* global app:true */

var app = angular.module('angRemindersApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'fsCordova',
]);

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

// routing init deferred
var $routeProviderReference;

app.config(['$routeProvider', function($routeProvider) {
  $routeProviderReference = $routeProvider;
}]);

app.run(['$route', 'CordovaService', function($route, CordovaService) {

  // when cordova is ready
  // 'then' is a method of promise object (see fs-cordova.js)
  CordovaService.ready.then(function() {
    setupRoutes($route);
    FastClick.attach(document.body);
    navigator.splashscreen.hide();
  });

  function setupRoutes($route){
    $routeProviderReference
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
    .when('/outstanding', {
      templateUrl: 'views/outstandingNotifications.html',
      controller: 'ReminderCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

    $route.reload();
  }
}]);
