#!/bin/bash

convert -resize 16x16 -antialias  default/icon.svg default/icon-16.png
convert -resize 24x24 -antialias default/icon.svg default/icon-24.png
convert -resize 32x32 -antialias default/icon.svg default/icon-32.png
convert -resize 48x48 -antialias default/icon.svg default/icon-48.png
convert -resize 64x64 -antialias default/icon.svg default/icon-64.png
convert -resize 96x96 -antialias default/icon.svg default/icon-96.png

