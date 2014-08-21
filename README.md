## Setup
### Create cordova project
```cordova create NNRx com.abmigroup.nnrx NNRx```

### Clone this repo as 'www':
```
cd NNRx
git clone git@github.com:msscully/NNRx.git www
```

### Use the config.xml from the repo
From the cordova project directory:
```
rm config.xml
ln -s www/config.xml config.xml
```

### Install js dependencies
From the www directory install all dependencies present in bower.json:
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

### Copy the ios splash screens
```cp www/res/screens/ios/* platforms/ios/NeuroNEXT\ Rx/Resources/splash/```
