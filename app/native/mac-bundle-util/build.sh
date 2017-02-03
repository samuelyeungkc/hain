#!/bin/bash

node-gyp rebuild --target=1.4.13 --dist-url=https://atom.io/download/electron && mv ./build/Release/mac-bundle-util.node ./mac-bundle-util.node
