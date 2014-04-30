app.controller('ReminderCtrl', ['$scope', '$rootScope', '$location', '$routeParams', 'reminderStorage', 'uuid4', '$window', 'CordovaService', 'localNotifications', function ($scope, $rootScope, $location, $routeParams, reminderStorage, uuid4, $window, CordovaService, localNotifications) {
    CordovaService.ready.then(function() {
        'use strict';
        
        var reminders = $scope.reminders = reminderStorage.all();

        if ($routeParams.reminderId) {
            $scope.reminder = angular.copy(reminders[$routeParams.reminderId]);
            $scope.editing = true;
        } else {
            $scope.reminder = {name: '', time: '', freq: '', id: '', message: '', notificationId: ''};
            $scope.editing = false;
        }

        $scope.submitForm = function() {
            var reminderDate = new Date();
            var reminderTimeSplit = $scope.reminder.time.split(':');
            reminderDate.setHours(reminderTimeSplit[0]);
            reminderDate.setMinutes(reminderTimeSplit[1]);
            $scope.reminder.date = reminderDate;
            if ($scope.reminder.notificationId) {
                $scope.cancelReminder($scope.reminder.notificationId).then(
                    $scope.addLocalNotification($scope.reminder).then(
                        function(notificationId) {
                            $scope.reminder.notificationId = notificationId;
                            reminders[$scope.reminder.id] = $scope.reminder;
                        }
                ));
            } else {
                $scope.reminder.id = uuid4.generate();
                $scope.addLocalNotification($scope.reminder).then(
                    function(notificationId) {
                        $scope.reminder.notificationId = notificationId;
                        reminders[$scope.reminder.id] = $scope.reminder;
                    }
                );
            }
            $scope.go('/');
        };

        $scope.addLocalNotification = function(reminder) {

            return localNotifications.add({
                title:      reminder.name,
                message:    reminder.message,
                json:       JSON.stringify({ id: reminder.id }),
                date:       reminder.date,
                autoCancel: true,
                repeat:     'daily',
            }).then(function(id) { return id; });
        };

        $scope.$watch('reminders', function (newValue, oldValue) {
            if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
                reminderStorage.put(reminders);
            }
        }, true);

        $scope.checkDelete = function() {
            var confirmTitle = "Delete " + "\"" + $scope.reminder.name + "\"?";
            navigator.notification.confirm(
                "Are you sure? This will delete all future reminders for this event and can't be undone.",
                $scope.deleteReminder,
                confirmTitle,
                ['Delete', 'Cancel']
            );
        };

        $scope.deleteReminder = function(buttonIndex) {
            if (buttonIndex === 1) {
                $scope.cancelReminder($scope.reminder.notificationId).then(
                    function() {

                        delete reminders[$scope.reminder.id];
                        reminderStorage.put(reminders);
                        $location.path('/').replace();
                        $rootScope.safeApply();
                   }
                );
            }
        };

        $scope.cancelReminder = function(notificationId) {
            return localNotifications.cancel(notificationId);
        };

        $scope.clearReminder = function(id, json) {
            //TODO: use localNotifications plugin clear function when v0.8.x
            // of notifications plugin is released.
            // $window.plugin.notification.local.clear(id);
            // For now, cancel then re-add with date as tomorrow
            var reminderId = JSON.parse(json).id;
            var reminder = reminders[reminderId];
            localNotifications.cancel(id).then( 
                function() { 
                    // add updated reminder
                    var reminderDate = new Date();
                    // new date should be today + 1 day with time set to reminder time
                    reminderDate.setDate(reminderDate.getDate() + 1);
                    var reminderTimeSplit = reminder.time.split(':');
                    reminderDate.setHours(reminderTimeSplit[0]);
                    reminderDate.setMinutes(reminderTimeSplit[1]);
                    reminder.date = reminderDate;
                    localNotifications.add(reminder).then(
                        function(notificationId) {
                            reminder.id = notificationId;
                            reminders[reminderId] = reminder;
                        }
                    );
                });
        };

        $scope.handleNotification = function(id, state, json) {
            var reminderId = JSON.parse(json).id;
            var reminder = $scope.reminder = reminders[reminderId];
            if (!reminder.message) {
                reminder.message = "This message intentionally left blank.";
            }
            navigator.notification.confirm(
                reminder.message,  // message
                function(buttonIndex) {
                    $rootScope.safeApply($scope.alertDismissed(buttonIndex));
                },         // callback
                reminder.name,            // title
                ["Took Meds", "Didn't Take Meds", "Snooze"] // buttonNames
            );
        };

        $scope.alertDismissed = function(buttonIndex) {
            if (buttonIndex === 3) {
                // Snooze pressed, add one-time notification for 5min from now.
                var reminder = angular.copy($scope.reminder);
                var now = new Date().getTime();
                var fiveMinInFuture = new Date(now + 300*1000);

                console.log(JSON.stringify(reminder));
                console.log("previous time: " + reminder.time);
                reminder.date = fiveMinInFuture;
                reminder.time = fiveMinInFuture.getHours() + ":" + fiveMinInFuture.getMinutes();
                reminder.repeat = null;
                console.log("in future: " + reminder.time);
                $scope.addLocalNotification(reminder).then(function(notificationId) {});
            }
            $location.path('/').replace();
            $rootScope.safeApply();
        };

        $scope.handleTriggeredNotification = function(notificationId, state, json) {
            if (state !== "background") {
                $scope.handleNotification(notificationId, state, json);
                $scope.clearReminder(notificationId, json);
            }
        };


        // Triggered when a local notification is clicked on
        $scope.$on("localOnClick",
                   function(event, data) { 
                       $rootScope.safeApply($scope.handleNotification(data.id, data.state, data.json));
                   });

        // Triggered when a local notification is triggered. Used to detect if
        // a notifcation occurs while the app is running, since iOS normally
        // supresses them.
        $scope.$on("localOnTrigger",
                   function(event, data) {
                       $scope.handleTriggeredNotification(data.id, data.state, data.json);
                   });

    });
}]);
