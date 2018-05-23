(function () {

  var BROWSER = {
    OPERA: 'OPERA',
    FIREFOX: 'FIREFOX',
    SAFARI: 'SAFARI',
    CHROME: 'CHROME',
    IE: 'IE',
    EDGE: 'EDGE',
    UNKNOWN: 'UNKNOWN'
  };

  var noDrmSource = {
    'hls': 'https://bitmovin-a.akamaihd.net/content/art-of-motion_drm/m3u8s/11331.m3u8',
  };

  var defaultSource = {
    'hls': 'https://bitmovin-a.akamaihd.net/content/art-of-motion_drm/m3u8s/11331.m3u8',
    'dash': 'https://bitmovin-a.akamaihd.net/content/art-of-motion_drm/mpds/11331.mpd',
    'drm': {
      'widevine': {
        'LA_URL': 'https://widevine-proxy.appspot.com/proxy'
      },
      'playready': {
        'LA_URL': 'https://playready.directtaps.net/pr/svc/rightsmanager.asmx?PlayRight=1&#038;ContentKey=EAtsIJQPd5pFiRUrV9Layw=='
      }
    }
  };

  var keySystems = {
    'widevine': ['com.widevine.alpha'],
    'playready': ['com.microsoft.playready', 'com.youtube.playready'],
    'primetime': ['com.adobe.primetime', 'com.adobe.access'],
    'fairplay': ['com.apple.fps.1_0', 'com.apple.fps.2_0']
  };

// force https, otherwisw DRM would not work
  if (window.location.protocol !== 'https:' && window._rails_env === 'production') {
    window.location.protocol = 'https:';
  } else {
    console.warn('DRM will only work via https://. Will redirect in production. Current environment is: ' + window._rails_env);
  }

  var config = {
    key: '29ba4a30-8b5e-4336-a7dd-c94ff3b25f30',
    style: {
      width: '100%',
      aspectratio: '16:9'
    },
    cast: {
      enable: true
    }
  };

  var player = bitmovin.player('player');
  getSupportedDRMSystem(true);

  document.getElementById('detected-browser').innerHTML = getBrowserImage(getBrowser());


  /**
   * Destroys any previous player instance and creates a new one with the given information
   *
   * @param drm 'widevine' | 'playready' | '' | null
   * @param manifestUrl the url to the manifest of the stream
   * @param licenceUrl  the URL to the licence server of the DRM System
   */
  function setupPlayer(drm, manifestUrl, licenceUrl, manifestType) {
    if (player && player.isSetup()) {
      player.destroy();
      player = null;
    }
    player = bitmovin.player('player');

    // clone config to avoid leftovers from previous calls
    var conf = JSON.parse(JSON.stringify(config));
    if (manifestUrl == null || manifestUrl === '') {
      if (drm == null || drm == '') {
        conf.source = JSON.parse(JSON.stringify(noDrmSource));
      } else {
        conf.source = JSON.parse(JSON.stringify(defaultSource));
      }
    } else {
      conf.source = {};
      conf.source[manifestType] = manifestUrl;
    }

    if (drm != null && drm !== '' && defaultSource.drm[drm]) {
      // If no licenceURL is provided use the one from the defaultSource for the given drm type
      licenceUrl = (licenceUrl !== '') ? licenceUrl : defaultSource.drm[drm]['LA_URL'];
      conf.source['drm'] = {};
      conf.source.drm[drm] = {'LA_URL': licenceUrl};
    }

    if (!conf.source) {
      conf.source = JSON.parse(JSON.stringify(noDrmSource));
    }

    player.setup(conf).catch(function (error) {
      console.log(error);
    });
  }

  /**
   * gathers information from the inputs and reloads the player
   */
  document.querySelector('#load-btn').addEventListener('click', loadPlayerFromControls);
  document.querySelector('#licence-in').addEventListener('keyup', loadPlayerOnEnter);
  document.querySelector('#manifest-in').addEventListener('keyup', loadPlayerOnEnter);

  function loadPlayerOnEnter(keyEvent) {
    if (keyEvent.keyCode === 13) {
      loadPlayerFromControls();
    }
  }

  function loadPlayerFromControls() {
    var manifestInput = document.querySelector('#manifest-in').value;
    var licenceInput = document.querySelector('#licence-in').value;
    var drmSystem = document.querySelector('#available-drm-systems').options;
    drmSystem = drmSystem[drmSystem.selectedIndex].value;
    var manifestType = document.querySelector('#available-manifest-type').options;
    manifestType = manifestType[manifestType.selectedIndex].value;

    if (manifestInput && manifestInput !== '' && !checkIsUrlValid(manifestInput, 'Manifest URL')) {
      return;
    }
    if (licenceInput && licenceInput !== '' && !checkIsUrlValid(licenceInput, 'License URL')) {
      return;
    }

    setupPlayer(drmSystem, manifestInput, licenceInput, manifestType);
  }

  /**
   * retrieves an array containing all DRM systems supported by the current player instance inside the current browser
   *
   * @param {boolean} [initial=false]
   */
  function getSupportedDRMSystem(initial) {
    initial = initial || false;

    var retVal = [];
    player.getSupportedDRM().then(function (drmSystem) {
      drmSystem.forEach(function (element) {
        var match = keySystems.widevine.find(function (obj) {
          return obj === element;
        }) ? 'widevine' : undefined;
        if (!match) {
          match = keySystems.playready.find(function (obj) {
            return obj === element;
          }) ? 'playready' : undefined;
        }
        if (!match) {
          match = keySystems.fairplay.find(function (obj) {
            return obj === element;
          }) ? 'fairplay' : undefined;
        }
        if (match) {
          retVal.push(match);
        }
      });

      // udpate the available DRM systems on the page before continuing
      if (initial) {
        var selectBox = document.querySelector('#available-drm-systems');
        retVal.forEach(function (element) {
          var newChild = document.createElement('OPTION');
          newChild.value = element;
          newChild.textContent = element;
          selectBox.appendChild(newChild);
        });
        if (retVal.length > 0) {
          selectBox.value = retVal[0];
        }
      }

      // setupPlayer(retVal.length > 0 ? retVal[0] : null);
    });
  }

  function getBrowser() {
    // Opera 8.0+
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';

    // Safari 3.0+ "[object HTMLElementConstructor]"
    var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) {
      return p.toString() === "[object SafariRemoteNotification]";
    })(!window['safari'] || safari.pushNotification);

    var isIosSafari = /Safari/i.test(navigator.userAgent) && /iP(hone|od|ad)/i.test(navigator.userAgent);

    // Internet Explorer 6-11
    var isIE = /*@cc_on!@*/false || !!document.documentMode;

    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;

    // Chrome 1+
    var isChrome = !!window.chrome && !!window.chrome.webstore;

    var isChromeMobileAndroid = /Chrome/i.test(navigator.userAgent) && /android/i.test(navigator.userAgent);

    return isOpera ? BROWSER.OPERA :
      isFirefox ? BROWSER.FIREFOX :
        isSafari ? BROWSER.SAFARI :
          isChrome || isChromeMobileAndroid ? BROWSER.CHROME :
            isIE ? BROWSER.IE :
              isEdge ? BROWSER.EDGE :
                isIosSafari ? BROWSER.SAFARI :
                  BROWSER.UNKNOWN;
  }

  function getBrowserImage(selectedBrowser) {
    switch (selectedBrowser) {
      case BROWSER.CHROME:
        return '<i class="fa fa-chrome browser-icon" aria-hidden="true"></i>';
      case BROWSER.EDGE:
        return '<i class="fa fa-edge browser-icon" aria-hidden="true"></i>';
      case BROWSER.FIREFOX:
        return '<i class="fa fa-firefox browser-icon" aria-hidden="true"></i>';
      case BROWSER.IE:
        return '<i class="fa fa-internet-explorer browser-icon" aria-hidden="true"></i>';
      case BROWSER.OPERA:
        return '<i class="fa fa-opera browser-icon" aria-hidden="true"></i>';
      case BROWSER.SAFARI:
        return '<i class="fa fa-safari browser-icon" aria-hidden="true"></i>';
      case BROWSER.UNKNOWN:
      default:
        return '<i class="fa fa-question browser-icon" aria-hidden="true"></i>';
    }
  }

  function checkIsUrlValid(url, urlPurpose) {
    if (url === null || url == undefined || url === '') {
      console.error(urlPurpose + ' is not defined.');
      return false;
    }
    if (typeof url !== 'string') {
      console.error(urlPurpose + ' is not a string');
      return false;
    }
    // check if url is abolute
    if (!/^https?:\/\/|^\/\//i.test(url)) {
      console.error(urlPurpose + ' has to be absolute');
      return false;
    }

    return true;
  }

  function supportedMediaSources() {
    var hasMediaSource, hasWebKitMediaSource;
    var mediaTypes = [
      'video/mp4; codecs="avc1.42c00d"',
      'video/mp4; codecs="ec-3"',
      'video/webm; codecs="vorbis,vp8"',
      'video/mp2t; codecs="avc1.42E01E,mp4a.40.2"'
    ];

    var supportedMediaTypes = {};
    if ('MediaSource' in window) {
      if (window.MediaSource) {
        hasMediaSource = true;
      }
    }

    if ('WebKitMediaSource' in window) {
      if (window.WebKitMediaSource) {
        hasWebKitMediaSource = true;
      }
    }

    for (var type in mediaTypes) {
      if (hasMediaSource) {
        supportedMediaTypes[mediaTypes[type]] = MediaSource.isTypeSupported(mediaTypes[type]);
      } else if (hasWebKitMediaSource) {
        supportedMediaTypes[mediaTypes[type]] = WebKitMediaSource.isTypeSupported(mediaTypes[type]);
      }
    }
    return supportedMediaTypes;
  }

  function insertMseSupportList() {
    var supported = false;
    var list = supportedMediaSources();
    var statusEl = document.getElementById('mse-supported');
    var listEl = document.getElementById('mse-list');

    Object.keys(list).forEach(function (key) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      span.innerText = key;
      li.classList.add(list[key] ? 'supported' : 'unsupported');
      supported = !supported ? list[key] : supported;
      li.appendChild(span);
      listEl.appendChild(li);
    });

    if (supported) {
      statusEl.classList.add('yes');
      statusEl.innerText = 'supported';
    } else {
      listEl.classList.add('no');
      statusEl.innerText = 'not supported';
    }
  }

  function insertEmeSupportList() {
    var list = {
      widevine: false,
      playready: false,
      primetime: false,
      fairplay: false
    };

    var supported = false;
    var listEl = document.getElementById('eme-list');
    var statusEl = document.getElementById('eme-supported');

    player.getSupportedDRM().then(function (drmSystems) {
      drmSystems.forEach(function (drm) {
        Object.keys(keySystems).forEach(function (key) {
          if (keySystems[key].indexOf(drm) !== -1) {
            list[key] = true;
            supported = true;
          }
        });
      });

      Object.keys(list).forEach(function (key) {
        var li = document.createElement('li');
        var span = document.createElement('span');
        span.innerText = key;

        li.classList.add(list[key] ? 'supported' : 'unsupported');
        li.appendChild(span);
        listEl.appendChild(li);
      });

      if (supported) {
        statusEl.classList.add('yes');
        statusEl.innerText = 'supported';
      } else {
        listEl.classList.add('no');
        statusEl.innerText = 'not supported';
      }
    });
  }

  insertMseSupportList();
  insertEmeSupportList();
  loadPlayerFromControls();
})();