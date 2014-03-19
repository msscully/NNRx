app.controller('ReminderCtrl', function ($scope, $rootScope, $location, $routeParams, reminderStorage) {
    'use strict';
    var reminders = $scope.reminders = reminderStorage.all();

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
        if ($scope.reminder.id) {
            reminders[$scope.reminder.id-1] = $scope.reminder;
        } else {
            $scope.reminder.id = $scope.nextId();
            $scope.notificationId = $scope.addLocalNotification($scope.reminder);
            reminders.push($scope.reminder);
        }
    };

    $scope.addLocalNotification = function(reminder) {
        return window.plugin.notification.local.add({
            title:      reminder.name,
            message:    reminder.message,
            json:       JSON.stringify({ id: reminder.id }),
            //repeat:     'weekly',
            //date:       new Date(now + 10*1000),
        });
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

    $scope.checkDelete = function() {
        var confirmTitle = "Delete " + "\"" + $scope.reminder.name + "\"?";
        navigator.notification.confirm(
            "Are you sure? This can't be undone.",
            $scope.deleteReminder,
            confirmTitle,
            ['Delete', 'Cancel']
        );
    };

    $scope.deleteReminder = function(buttonIndex) {
        if (buttonIndex === 1) {
            $scope.reminder.name = $scope.reminder.notificationId;
            $scope.idIsScheduled = false;
            window.plugin.notification.local.isScheduled(
                $scope.reminder.notificationId, 
                function (isScheduled) {
                    $scope.idIsScheduled = isscheduled;
                });
            var position = $scope.idIsScheduled;

            if (idIsScheduled) {
                window.plugin.notification.local.cancel($scope.reminder.notificationId);
            }
            if (position >= 0) {
                reminders.splice(position,1);
            }
            $rootScope.back();
        }
    };
});
