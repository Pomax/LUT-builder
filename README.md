# LUT builder

A LUT utility for making some OBS 64x64x64 cube luts, encoded as 512x512 PNG files.

There's nothing too fancy here, it's literally just a single JS file with some vanilla code to make it all happen. `index.js` should be fairly obvious in how it works.

Right now it allows for some saturation-for-brightness compensation, as well as some (normalized) compression to deal with the whole "pure black's actually put around 16,  you'll have to fix that yourself".

Fire it up here: https://pomax.github.io/LUT-builder/index.html

### screenshots

![image](https://user-images.githubusercontent.com/177243/47676985-37e4c500-db7b-11e8-8a9b-9e2907bbacbe.png)
