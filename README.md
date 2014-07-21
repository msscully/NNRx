## Setup
### Create cordova project
```cordova create NNRx com.abmigroup.nnrx NNRx```

### Clone this repo as 'www':
```
cd NNRx
git clone git@github.com:msscully/NNRx.git www
```

### Install js dependencies
``` bower install ```

### Add platforms:
```
cordova platform add ios
cordova platform add android
```

### Add required plugins
For each of the required plugins do:
```cordova plugin add <PLUGIN>```
*com.plugin.datepicker
*de.appplant.cordova.plugin.hidden-statusbar-overlay
*de.appplant.cordova.plugin.local-notification
*org.apache.cordova.device
*org.apache.cordova.dialogs
*org.apache.cordova.splashscreen
