#!/usr/bin/env bash

cp -R node_modules/semantic-ui-css/themes/default/assets/fonts ./public/
cp -R node_modules/semantic-ui-css/themes/default/assets/fonts ./client/
cp -R node_modules/react-dates/lib/css/_datepicker.css ./client/datepicker.less
cp -R node_modules/semantic-ui-css/semantic.css ./public/fonts
cp -R node_modules/semantic-ui-css/semantic.min.css ./client/fonts