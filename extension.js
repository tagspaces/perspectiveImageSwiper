/* Copyright (c) 2015 The Tagspaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that
 * can be found in the LICENSE file. */

define(function(require, exports, module) {
  "use strict";

  var extensionTitle = "ImageSwiper"; // should be equal to the name in the bower.json
  var extensionID = "perspectiveImageSwiper"; // ID should be equal to the directory name where the ext. is located   
  var extensionIcon = "fa fa-image"; // icon class from font awesome

  console.log("Loading " + extensionID);

  var TSCORE = require("tscore");

  var extensionDirectory = TSCORE.Config.getExtensionPath() + "/" + extensionID;
  var UI;

  var $viewContainer = $("#" + extensionID + "Container");
  var homeScreen;
  var template;
  var UI;
  var extensionLoaded;

  var init = function() {
    console.log("Initializing perspective " + extensionID);

    $viewContainer = $("#" + extensionID + "Container").empty();

    extensionLoaded = new Promise(function(resolve, reject) {
      require([
        extensionDirectory + "/perspectiveUI.js",
        "text!" + extensionDirectory + "/galleryTMPL.html",
        "css!" + extensionDirectory + "/gallery.css",
        "css!" + extensionDirectory + "/libs/photoswipe/dist/photoswipe.css",
        "css!" + extensionDirectory + "/libs/photoswipe/dist/default-skin/default-skin.css"
        ], function(perspectiveUI, tmpl) {
          UI = perspectiveUI;
          template = tmpl;
          UI.initUI(extensionDirectory);
          resolve(true);
        }
      );
    });
  };

  var load = function() {
    console.log("Loading perspective " + extensionID);
    $viewContainer.children().remove();
    extensionLoaded.then(function() {
      UI.load($viewContainer, template, TSCORE.fileList);
      TSCORE.hideLoadingAnimation();
    });
  };

  var clearSelectedFiles = function() {};
    
  var removeFileUI = function(filePath) {};
    
  var updateFileUI = function(oldFilePath, newFilePath) {};
  
  var getNextFile = function(filePath) {};

  var getPrevFile = function(filePath) {};

  exports.updateTreeData = function updateIndexData(fsTreeData) {
    console.log("Updating tree data not implemented");
  };

  // Vars
  exports.Title = extensionTitle;
  exports.ID = extensionID;
  exports.Icon = extensionIcon;

  // Methods
  exports.init = init;
  exports.load = load;
  exports.clearSelectedFiles = clearSelectedFiles;
  exports.getNextFile = getNextFile;
  exports.getPrevFile = getPrevFile;
  exports.removeFileUI = removeFileUI;
  exports.updateFileUI = updateFileUI;
  
});