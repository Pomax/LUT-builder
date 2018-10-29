# LUT builder

A LUT utility for making some [OBS](https://obsproject.com/) 64x64x64 color correction lookup tables (encoded as 512x512 PNG files).

There's nothing too fancy here, it's just a bunch of vanilla JS modules to make it all happen. Starting at `index.js` you should be able to read along just fine.

## What can it do?

Right now the builder allows for some saturation-for-brightness compensation (using `hsv.s += hsv.v/f`, where f is the value from the slider), as well as some (normalized) compression, to combat the whole "this video stream encodes pure black's as 16 rather than 0". Or general black/white-point raising/lowering. 

## Live site?

That's what github pages are fo, so fire it up here: https://pomax.github.io/LUT-builder/index.html

## I found a bug!

You know where to find the [issue tracker](/issues) =)

## screenshots

![image](https://user-images.githubusercontent.com/177243/47676985-37e4c500-db7b-11e8-8a9b-9e2907bbacbe.png)
