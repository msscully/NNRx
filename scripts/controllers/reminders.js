app.controller('ReminderCtrl', function ($scope, $location, $routeParams, reminderStorage) {
    'use strict';
    var reminders = $scope.reminders = reminderStorage.get();

    if ($routeParams.reminderId) {
        $scope.reminder = reminders[$routeParams.reminderId - 1];
    } else {
        $scope.reminder = {name: '', time: '', freq: '', snooze: '', id:''};
    }

    $scope.showScroller = function () {
      $scope.scroller.call('setDate', new Date(), true, 5);
      $scope.scroller.call('show');
    };

    $scope.submitForm = function() {
        $scope.reminder.id = $scope.nextId();
        reminders.push($scope.reminder);
    };

    var addLocalNotification = function(reminder) {
        window.plugin.notification.local.add({
            id:         1, // is converted to a string
            title:      'Reminder',
            message:    'Dont forget to buy some flowers.',
            //repeat:     'weekly',
            date:       new Date(now + 10*1000),
            foreground: 'self.foreground',
            background: 'self.background'
        });
    };

    var foreground = function (id) {
        alert('I WAS RUNNING ID='+id);
    };

    var background = function (id) {
        alert('I WAS IN THE BACKGROUND ID='+id);
    };

    $scope.$watch('reminders', function (newValue, oldValue) {
        if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
            reminderStorage.put(reminders);
        }
    }, true);

    $scope.nextId = function () {
        var nextId = 0;
        if (reminders.length === 0) {
            nextId = 1;
        } else {
            nextId = reminders[reminders.length-1].id + 1;
        }
        return nextId;
    };

});
