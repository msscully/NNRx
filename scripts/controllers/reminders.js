app.controller('ReminderCtrl', ['$scope', '$rootScope', '$q', '$location', '$routeParams', 'reminderStorage', 'uuid4', '$window', 'CordovaService', 'localNotifications', 'dialogs', function ($scope, $rootScope, $q, $location, $routeParams, reminderStorage, uuid4, $window, CordovaService, localNotifications, dialogs) {
    CordovaService.ready.then(function() {
        'use strict';
        
        var reminders = $scope.reminders = reminderStorage.all();

        if ($routeParams.reminderId) {
            $scope.reminder = angular.copy(reminders[$routeParams.reminderId]);
            $scope.editing = true;
        } else {
            $scope.reminder = {name: '', time: '', secondTime: '', freq: 'daily', id: '', message: '', notificationIds: []};
            $scope.editing = false;
        }

        $scope.submitForm = function() {
            var reminderDate = new Date();
            // if every-other-day are we supposed to start tomorrow?
            if ($scope.reminder.tomorrow) {
                reminderDate.setDate(reminderDate.getDate() + 1);
            }
            var reminderTimeSplit = $scope.reminder.time.split(':');
            reminderDate.setHours(reminderTimeSplit[0]);
            reminderDate.setMinutes(reminderTimeSplit[1]);
            $scope.reminder.date = reminderDate;
            if($scope.reminder.secondTime) {
                var secondReminderDate = new Date();
                reminderTimeSplit = $scope.reminder.secondTime.split(':');
                secondReminderDate.setHours(reminderTimeSplit[0]);
                secondReminderDate.setMinutes(reminderTimeSplit[1]);
                $scope.reminder.secondDate = secondReminderDate;
            }

            if ($scope.reminder.notificationIds.length > 0) {
                $scope.cancelReminder($scope.reminder).then(
                    $scope.addLocalNotification($scope.reminder).then(
                        function(newNotificationIds) {
                            $scope.reminder.notificationIds = newNotificationIds;
                            reminders[$scope.reminder.id] = $scope.reminder;
                        }
                ));
            } else {
                $scope.reminder.id = uuid4.generate();
                $scope.addLocalNotification($scope.reminder).then(
                    function(notificationIds) {
                        $scope.reminder.notificationIds = notificationIds;
                        reminders[$scope.reminder.id] = $scope.reminder;
                    }
                );
            }
            $scope.go('/');
        };

        $scope.addLocalNotification = function(reminder) {
            console.log('Adding reminder ' + reminder.name);
            // May have to add 2 reminders for twice-daily
            var deferred = $q.defer();
            var newNotificationIds = [];
            var expectedLength = 1;
            var repeatInterval = null;

            if(reminder.freq == 'daily' || reminder.freq =='twiceDaily') {
                repeatInterval = 'daily';
            }
            else {
                repeatInterval = null;
            }

            var addId = function(id) {
                newNotificationIds.push(id);

                if(newNotificationIds.length == expectedLength){
                    deferred.resolve(newNotificationIds);
                }
            };

            if (reminder.freq == 'twiceDaily') {
                expectedLength += 1;

                var r = {
                    id:         uuid4.generate(),
                    title:      reminder.name,
                    message:    reminder.message,
                    json:       JSON.stringify({ id: reminder.id, second: true}),
                    date:       reminder.secondDate,
                    autoCancel: true,
                    repeat:     repeatInterval,
                };
                localNotifications.add(r).then(function(id) {  addId(id); });
            }

            var r2 = {
                id:         uuid4.generate(),
                title:      reminder.name,
                message:    reminder.message,
                json:       JSON.stringify({ id: reminder.id, second: false }),
                date:       reminder.date,
                autoCancel: true,
                repeat:     repeatInterval,
            };
            localNotifications.add(r2).then(function(id) {  addId(id); });

            return deferred.promise;
        };

        $scope.$watch('reminders', function (newValue, oldValue) {
            if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
                reminderStorage.put(reminders);
            }
        }, true);

        $scope.checkDelete = function() {
            var confirmTitle = "Delete " + "\"" + $scope.reminder.name + "\"?";
            dialogs.confirm(
                "Are you sure? This will delete all future reminders for this event and can't be undone.",
                confirmTitle,
                ['Delete', 'Cancel']
            ).then($scope.deleteReminder);
        };

        $scope.deleteReminder = function(buttonIndex) {
            if (buttonIndex === 1) {
                $scope.cancelReminder($scope.reminder).then(
                    function() {

                        delete reminders[$scope.reminder.id];
                        reminderStorage.put(reminders);
                        $location.path('/').replace();
                        $rootScope.safeApply();
                   }
                );
            }
        };

        $scope.cancelNotification = function(notificationId) {
            return localNotifications.cancel(notificationId);
        };

        $scope.cancelReminder = function(reminder) {
            // Will cancel all notifications associated with a reminder
            var deferred = $q.defer();
            var notificationsToCancel = reminder.notificationIds.length;
            var decCount = function() {
                notificationsToCancel -= 1;

                if(notificationsToCancel <= 0){
                    deferred.resolve();
                }
            };

            var i = reminder.notificationIds.length;
            for (i; i--;) {
                console.log('canceling ' + reminder.notificationIds[i]);
                $scope.cancelNotification(reminder.notificationIds[i]).then( decCount());
            }

            return deferred.promise;
        };

        $scope.clearNotification = function(notificationId, json) {
            //TODO: use localNotifications plugin clear function when v0.8.x
            // of notifications plugin is released.
            // $window.plugin.notification.local.clear(id);
            // For now, cancel then re-add with date as tomorrow
            var reminderId = JSON.parse(json).id;
            var reminder = reminders[reminderId];
            $scope.cancelNotification(notificationId).then(
                function() { 
                    // add updated reminder
                    var newNotification = {
                        id:         uuid4.generate(),
                        title:      reminder.name,
                        message:    reminder.message,
                        autoCancel: true,
                    };
                    var reminderDate = new Date();
                    if (reminder.freq === 'daily' || reminder.freq === 'twiceDaily') {
                        // new date should be today + 1 day with time set to reminder time
                        reminderDate.setDate(reminderDate.getDate() + 1);
                        newNotification.repeatInterval = 'daily';
                    } else if (reminder.freq === 'semiDaily') {
                        // new date is two days from now
                        reminderDate.setDate(reminderDate.getDate() + 2);
                        newNotification.repeatInterval = null;
                    }
                    var secondNotification = JSON.parse(json).second;
                    var reminderTimeSplit;

                    if (secondNotification) {
                        reminderTimeSplit = reminder.secondTime.split(':');
                        reminderDate.setHours(reminderTimeSplit[0]);
                        reminderDate.setMinutes(reminderTimeSplit[1]);
                        reminder.secondDate = reminderDate;
                        newNotification.json=JSON.stringify({ id: notificationId, second: true});
                        newNotification.date = reminder.secondDate;
                    } else {
                        reminderTimeSplit = reminder.time.split(':');
                        reminderDate.setHours(reminderTimeSplit[0]);
                        reminderDate.setMinutes(reminderTimeSplit[1]);
                        reminder.date = reminderDate;
                        newNotification.json=JSON.stringify({ id: notificationId, second: false});
                        newNotification.date = reminder.date;
                    }
                    localNotifications.add(newNotification).then(
                        function(newNotificationId) {
                            var index = reminder.notificationIds.indexOf(notificationId);
                            if (~index){
                                reminder.notificationIds[index] = newNotificationId;
                            } else {
                                reminder.notificationIds.push(newNotificationId);
                            }
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
            dialogs.confirm(
                reminder.message,  // message
                reminder.name,            // title
                ["Took Meds", "Didn't Take Meds", "Snooze"] // buttonNames
            ).then($scope.alertDismissed);
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
                $scope.clearNotification(notificationId, json);
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
