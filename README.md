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

### Add platforms:
```
cordova platform add ios
cordova platform add android
```

### Use the hooks from the repo
The hooks/after_prepare directory in the repo has two scripts, one will install
all plugins on all platforms, so this no longer has to be done manually. The
other script copies the spash screens into the correct ios and android platform
locations, so this also no longer has to be done manually.

From the cordova project directory:
```
rm -rf hooks
ln -s www/hooks hooks
```

### Install js dependencies
From the www directory install all dependencies present in bower.json:
``` bower install ```
