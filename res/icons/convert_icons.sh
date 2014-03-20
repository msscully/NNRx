#
# (OS X)
#
# What is this?
#
# It's a shell script that is using sips to create all the icon files from one source icon.
#
# Stick the script in your 'www/res/icons' folder with your source icon 'my-hires-icon.png' then trigger it from Terminal.
#

ICON=${1}

mkdir android
sips $ICON -Z 36 -o android/icon-36-ldpi.png
sips $ICON -Z 48 -o android/icon-48-mdpi.png
sips $ICON -Z 72 -o android/icon-72-hdpi.png
sips $ICON -Z 96 -o android/icon-96-xhdpi.png

mkdir ios
sips $ICON -Z 29 -o ios/icon-29.png
sips $ICON -Z 40 -o ios/icon-40.png 
sips $ICON -Z 50 -o ios/icon-50.png 
sips $ICON -Z 57 -o ios/icon-57.png
sips $ICON -Z 58 -o ios/icon-29-2x.png
sips $ICON -Z 60 -o ios/icon-60.png
sips $ICON -Z 72 -o ios/icon-72.png
sips $ICON -Z 76 -o ios/icon-76.png  
sips $ICON -Z 80 -o ios/icon-40-2x.png
sips $ICON -Z 100 -o ios/icon-50-2x.png
sips $ICON -Z 114 -o ios/icon-57-2x.png     
sips $ICON -Z 120 -o ios/icon-60-2x.png
sips $ICON -Z 144 -o ios/icon-72-2x.png
sips $ICON -Z 152 -o ios/icon-76-2x.png
