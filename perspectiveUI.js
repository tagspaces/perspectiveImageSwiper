/* Copyright (c) 2015-2016 The TagSpaces Authors.
 * Use of this source code is governed by the MIT license which can be found in the LICENSE.txt file. */

/* global define, Handlebars, isWin, _  */
define(function(require, exports, module) {
  "use strict";

  var TSCORE = require("tscore");
  var extDir;
  var supportedFileTypesThumbs = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];
  var defaultThumnailPath;

  var galContainer;
  var galTemplate;
  var partialResult;
  var allResults;

  var extSettings, galleryBackgroundColor = "#000000";
  loadExtSettings();

  if (extSettings && extSettings.galleryBackgroundColor) {
    galleryBackgroundColor = extSettings.galleryBackgroundColor;
  }

  //save settings for perspectiveImageSwiperSettings
  function saveExtSettings() {
    var settings = {
      "galleryBackgroundColor": galleryBackgroundColor
    };
    localStorage.setItem('perspectiveImageSwiperSettings', JSON.stringify(settings));
  }

  //load settings for perspectiveImageSwiperSettings
  function loadExtSettings() {
    extSettings = JSON.parse(localStorage.getItem("perspectiveImageSwiperSettings"));
  }

  function initUI(dir) {
    extDir = dir;
    defaultThumnailPath = extDir + "/default.png";

    // Handling thumbnails
    $('#viewContainers').on('scroll', _.debounce(function() {
      $('.my-gallery').find("figure").each(function() {
        if (TSCORE.Utils.isVisibleOnScreen(this)) {
          var $img = $(this).find('img');
          if ($img.attr("src").indexOf(defaultThumnailPath) === 0) {
            var filePath = $(this).find("a").attr("href");
            if (isChrome) {
              var indexOfFile = filePath.indexOf("file://");
              if (indexOfFile === 0) {
                filePath = filePath.substring(7, filePath.length);
              }
            }
            TSCORE.Meta.loadThumbnailPromise(filePath).then(function(url) {
              $img.attr("src", url);
            });
          }
        }
      });
    }, 500));
  }

  function load(container, template, showAllResult) {
    galContainer = container;
    galTemplate = template;

    var data = [];
    var files; //= TSCORE.Search.searchData(TSCORE.fileList, TSCORE.Search.nextQuery);
    var shouldShowAllFilesContainer;

    container.children().remove();

    var compiledTemplate = Handlebars.compile(template);

    // Initial load more results implementation
    if (showAllResult && partialResult && partialResult.length > 0) {
      files = allResults;
      partialResult = [];
      shouldShowAllFilesContainer = false;
    } else {
      allResults = TSCORE.Search.searchData(TSCORE.fileList, TSCORE.Search.nextQuery);
      if (allResults.length >= TSCORE.Config.getMaxSearchResultCount()) {
        partialResult = allResults.slice(0, TSCORE.Config.getMaxSearchResultCount());
        shouldShowAllFilesContainer = true;
        files = partialResult;
      } else {
        files = allResults;
        shouldShowAllFilesContainer = false;
      }
    }

    files.forEach(function(fileInfo) {
      var ext = fileInfo.extension;

      if (supportedFileTypesThumbs.indexOf(ext) !== -1) {
        var filePath = fileInfo.path;
        var encodedPath;
        if (isChrome) {
          encodedPath = encodeURI("file://" + filePath);
        } else {
          encodedPath = encodeURI(filePath);
        }
        var doc = {
          name: fileInfo.name,
          path: encodedPath,
          thumbnail: encodeURI(defaultThumnailPath),
          title: fileInfo.title,
          tags: fileInfo.tags
        };

        var metaFilePath = TSCORE.Meta.findMetaFilebyPath(filePath, TSCORE.thumbFileExt);
        if (metaFilePath) {
          if (isChrome) {
            doc.thumbnail = encodeURI("file:///" + metaFilePath);
          } else {
            doc.thumbnail = encodeURI(metaFilePath);
          }
        }
        data.push(doc);
      }
    });

    //Update statusbar,
    if (data) {
      $("#statusBar").text(data.length + " " + $.i18n.t("ns.perspectives:filesFound"));
    }

    var html = compiledTemplate({data: data});
    container.append(html);
    initPhotoSwipeFromDOM('.my-gallery');

    $('#imageSwiperShowAllFilesButton').on("click", function() {
      load(galContainer, galTemplate, true);
    });

    shouldShowAllFilesContainer ? $("#imageSwiperShowAllFileContainer").show() : $("#imageSwiperShowAllFileContainer").hide();

    $('#viewContainers').trigger('scroll');

    // Init internationalization
    $.i18n.init({
      ns: {
        namespaces: ['ns.perspectives']
      },
      debug: true,
      fallbackLng: 'en_US'
    }, function() {
      $('[data-i18n]').i18n();
    });

    // Loading gallery background
    $(".my-gallery").css('background', galleryBackgroundColor);

    if (galleryBackgroundColor !== '#000000') {
      $(".my-gallery figcaption").css('color', '#000000');
    } else {
      $(".my-gallery figcaption").css('color', 'whitesmoke');
    }

    var $galleryBackground = $(".my-gallery");

    $("#whiteBackgroundColor").on('click', function(e) {
      e.stopPropagation();
      $galleryBackground.css('background', '#ffffff');
      $(".my-gallery figcaption").css('color', '#000000');
      galleryBackgroundColor = "#ffffff";
      saveExtSettings();
    });

    $("#blackBackgroundColor").on('click', function(e) {
      e.stopPropagation();
      $galleryBackground.css('background', '#000000');
      $(".my-gallery figcaption").css('color', 'whitesmoke');
      galleryBackgroundColor = "#000000";
      saveExtSettings();
    });

    $("#sepiaBackgroundColor").on('click', function(e) {
      e.stopPropagation();
      $galleryBackground.css('background', '#f4ecd8');
      $(".my-gallery figcaption").css('color', '#000000');
      galleryBackgroundColor = "#f4ecd8";
      saveExtSettings();
    });
  }

  function loadThumbnail(fileName) {
    var name = TSCORE.Utils.baseName(fileName);
    var res = null;
    TSCORE.metaFileList.forEach(function(element) {
      if (element.name.indexOf(name) >= 0) {
        res = element.path;
      }
    });
    return res;
  }

  function initPhotoSwipeFromDOM(gallerySelector) {

    $("#imageSwipperTagButton").on('click tap', function() {
      TSCORE.showAddTagsDialog();
    });

    $("#imageSwipperRenameButton").on('click tap', function() {
      TSCORE.UI.showFileRenameDialog();
    });

    // parse slide data (url, title, size ...) from DOM elements
    // (children of gallerySelector)
    var parseThumbnailElements = function(el) {
      var thumbElements = el.childNodes,
        numNodes = thumbElements.length,
        items = [],
        figureEl,
        linkEl,
        size,
        item;

      for (var i = 0; i < numNodes; i++) {
        figureEl = thumbElements[i]; // <figure> element

        // include only element nodes
        if (figureEl.nodeType !== 1) {
          continue;
        }

        linkEl = figureEl.children[0]; // <a> element

        size = [0, 0]; //linkEl.getAttribute('data-size').split('x');

        // create slide object
        item = {
          src: linkEl.getAttribute('href'),
          w: parseInt(size[0], 10),
          h: parseInt(size[1], 10)
        };

        if (figureEl.children.length > 1) {
          // <figcaption> content
          item.title = figureEl.children[1].innerHTML;
        }

        if (linkEl.children.length > 0) {
          // <img> thumbnail element, retrieving thumbnail url
          //item.src = linkEl.children[0].getAttribute('src');
        }

        item.el = figureEl; // save link to element for getThumbBoundsFn
        items.push(item);
      }

      return items;
    };

    // find nearest parent element
    var closest = function closest(el, fn) {
      return el && (fn(el) ? el : closest(el.parentNode, fn));
    };

    // triggers when user clicks on thumbnail
    var onThumbnailsClick = function(e) {
      e = e || window.event;
      e.preventDefault ? e.preventDefault() : e.returnValue = false;

      var eTarget = e.target || e.srcElement;

      // find root element of slide
      var clickedListItem = closest(eTarget, function(el) {
        return (el.tagName && el.tagName.toUpperCase() === 'FIGURE');
      });

      if (!clickedListItem) {
        return;
      }

      // find index of clicked item by looping through all child nodes
      // alternatively, you may define index via data- attribute
      var clickedGallery = clickedListItem.parentNode,
        childNodes = clickedListItem.parentNode.childNodes,
        numChildNodes = childNodes.length,
        nodeIndex = 0,
        index;

      for (var i = 0; i < numChildNodes; i++) {
        if (childNodes[i].nodeType !== 1) {
          continue;
        }

        if (childNodes[i] === clickedListItem) {
          index = nodeIndex;
          break;
        }
        nodeIndex++;
      }

      if (index >= 0) {
        // open PhotoSwipe if valid index found
        openPhotoSwipe(index, clickedGallery);
      }
      return false;
    };

    var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL) {
      var pswpElement = document.querySelectorAll('.pswp')[0],
        gallery, options;

      var items = parseThumbnailElements(galleryElement);

      options = {
        // define gallery index (for URL)
        galleryUID: galleryElement.getAttribute('data-pswp-uid'),

        getThumbBoundsFn: function(index) {
          // See Options -> getThumbBoundsFn section of documentation for more info
          var thumbnail = items[index].el.getElementsByTagName('img')[0], // find thumbnail
            pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
            rect = thumbnail.getBoundingClientRect();

          return {x: rect.left, y: rect.top + pageYScroll, w: rect.width};
        },
        shareEl: false
      };

      options.index = parseInt(index, 10);

      // exit if index not found
      if (isNaN(options.index)) {
        console.log("PhotoSwipe error: index not found");
        return;
      }

      if (disableAnimation) {
        options.showAnimationDuration = 0;
      }

      require([
        extDir + "/libs/photoswipe/dist/photoswipe.min.js",
        extDir + "/libs/photoswipe/dist/photoswipe-ui-default.min.js",
      ], function(PhotoSwipe, PhotoSwipeUI_Default) {
        gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
        gallery.init();
        gallery.listen('imageLoadComplete', function(index, item) {
          var img = new Image();
          img.src = item.src;
          item.w = img.width;
          item.h = img.height;
          gallery.updateSize(true);
          img = undefined;
        });

        gallery.listen('gettingData', function(index, item) {
          TSCORE.selectedFiles = [];
          TSCORE.selectedFiles.push(decodeURI(gallery.currItem.src));
        });

        gallery.listen('close', function() {
          TSCORE.selectedFiles = [];
        });
      });
    };

    // loop through all gallery elements and bind events
    var galleryElements = document.querySelectorAll(gallerySelector);

    for (var i = 0, l = galleryElements.length; i < l; i++) {
      galleryElements[i].setAttribute('data-pswp-uid', i + 1);
      galleryElements[i].onclick = onThumbnailsClick;
    }
  }

  function updateFileUI(oldFilePath, newFilePath) {
    console.log("Updating UI for oldfile " + oldFilePath + " newfile " + newFilePath);

    //// Updating the file selection
    //if (oldFilePath !== newFilePath) {
    //  TSCORE.selectedFiles.splice(TSCORE.selectedFiles.indexOf(oldFilePath), 1);
    //  TSCORE.selectedFiles.push(newFilePath);
    //}
    load(galContainer, galTemplate, true);
  }

  exports.initUI = initUI;
  exports.load = load;
  exports.updateFileUI = updateFileUI;
});