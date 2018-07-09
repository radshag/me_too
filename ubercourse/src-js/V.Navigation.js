;(function initNavigation(V) {
  V.Navigation = {
    go,
    next,
    prev,
    lock,
    unlock,
    isLocked() {return isLocked;},
    showGate,
    hideGate,
    openGate,
    blink,
    stopBlink,
    closePeripherals,
    setOrder
  };

  V.Audio = {
    play: playAudio,
    stop: stopAudio,
    pause: pauseAudio,
    mute: muteAudio,
    unmute: unmuteAudio,
    disable: disableAudio,
    enable: enableAudio
  };

  // DOM elements
  const body = document.body;
  const gateText = document.querySelector('.gate__text');

  // page variables
  let currentPageElement;
  let currentPageId;
  let currentParentId;
  let currentParentElement;
  let currentTimelineId;
  let tl;
  let targetPageElement;
  let targetPageId;
  let targetParentElement;
  let targetParentId;
  let isTimelinesActive = V.Timelines && V.Timelines.isActive;

  // Navigation locking for lightboxes   
  let isLocked = false;

  function lock() {
    isLocked = true;
  }

  function unlock() {
    isLocked = false;
  }

  // audio variables
  let audioEnabled = enableAudio();
  let audioNowPlaying;
  let audioTimeout;
  let audioId;
  let audioFiles = {};
  let isMuted = !!V.SCORM.get('mute');

  // set navigation order as array of page IDs from DOM
  let pageNavigationOrder = Array.from(
    document.getElementsByClassName('page'),
    (page) => page.id
  );

  function setOrder(pageList) {
    pageNavigationOrder = pageList;
  }

  if (audioEnabled) {
    CustomEase.create('audioEaseOut', 'M0,0 C0,0.9 0.1,1 1,1');
    initMuteButton();
  } else {
    document.body.classList.add('-audio-disabled');
  }

  initNavigateOnKeydown();

  /**
   * Navigates to a page. By default, navigates to `targetPageId`
   * saved in this function's closure. If the single parameter 
   * `options` is a string, or is an object and has property `id`,
   * then navigates to the page with that ID.
   *
   * @param {(string|object)} options - Describes where or how to navigate.
   */
  function go(id, options) {
    options = options || {};

    // legacy support for one parameter
    if (typeof id === 'object') {
      options = id;
    }

    // look for the target page
    if (typeof id === 'string') {
      // `id` is the page ID
      targetPageId = id;
    } else if (id instanceof Element && id.classList.contains('page')) {
      // `id` is the page element
      targetPageId = id.id;
    } else if (options.id) {
      // legacy support for one parameter
      targetPageId = options.id;
    }

    // are we still missing a target page?
    if (!targetPageId) {
      console.warn(`V.Navigation.go() called with no target page.`);
    }

    const trDur = options.transitionDuration || 0.3;

    // get parent page if it exists
    let targetParentId = V.Pages[targetPageId] && V.Pages[targetPageId].parent;

    // if target page has children, go to its first child
    if (V.Pages[targetPageId] && V.Pages[targetPageId].children) {
      targetParentId = targetPageId;
      targetPageId = V.Pages[targetPageId].children[0];
    }
    
    if (!isNewPageValid()) {
      return false;
    }

    // check if there's an `onLeave` callback and cancel navigation if it returns false
    if (
      currentPageId 
      && V.Pages[currentPageId].onLeave 
      && V.Pages[currentPageId].onLeave(targetPageId) === false
    ) {
      return false;
    }

    // get target page elements
    targetPageElement  = V.Pages[targetPageId].element;
    targetParentId  = V.Pages[targetPageId].parent;
    targetParentElement  = targetParentId ? V.Pages[targetParentId].element : null;

    // get current page elements
    if (currentPageId) {
      currentPageElement = V.Pages[currentPageId].element;
      currentParentId = V.Pages[currentPageId].parent;
      currentParentElement = currentParentId ? V.Pages[currentParentId].element : null;
    }

    // before transition
    closePeripherals();

    // audio
    if (audioEnabled) {
      playAudio(V.Pages[targetPageId].audio);
    }

    // transition
    transition();

    // after transition
    callOnEnter();
    updateSCORM();
    updatePeripherals();

    currentPageId = targetPageId;
    currentPageElement = targetPageElement;
    currentParentId = targetParentId;
    currentParentElement = targetParentElement;

    if (V.Pages[currentPageId].hasInnerPages && !innerPageIds) {
      navigateToInnerPage(0);
    }

    return true;

    /**
     * Checks if new page is valid for navigation.
     *
     * @return {Boolean} - Valid or not.
     */
    function isNewPageValid(){ 
      if (
        !targetParentId 
        && currentPageId 
        && targetPageId === V.Pages[currentPageId].parent
      ) {
        console.log('"', targetPageId, '"is the parent of the current page, "', currentPageId, '"');
        return false;
      }

      // error if the page is missing from V.Pages.js
      if (!V.Pages[targetPageId]) {
        console.error('The page', targetPageId, 'is not registered in the `V.Pages` object.');
        return false;
      }

      // error if page doesn't exist
      if (!V.Pages[targetPageId].element) {
        console.error('Error: Can\'t navigate to', targetPageId, 'because that page doesn’t exist.');
        return false;
      }


      // error if navigating to currently open page
      if (targetPageId === currentPageId) {
        console.log('Can\'t navigate to', targetPageId, 'because that page is already open!');
        return false;
      }

      return true;
    }

    /**
     * Transitions to the next page.
     */
    function transition() {
      if (targetParentId) {
        openChildPage();
      } else {
        openNewPage();
      }
    }

    function openNewPage() {
      var transition = options.transition || 'fade';

      if (!currentPageElement) {
        // first page of session
        if (transition !== 'fade') {
          targetPageElement.style.display = 'block';
          targetPageElement.style.opacity = 1;
        } else {
          fadeIn(targetPageElement);
        }
      } else {
        scrollToTop();

        if (currentTimelineId) {
          endCurrentTimeline();
        }

        if (transition == 'fade') {
          fadeIn(targetPageElement);
          if (currentParentId) {
            fadeOut(currentParentElement);
            fadeOutChild(currentPageElement);
          } else {
            fadeOut(currentPageElement);
          }
        } else {
          targetPageElement.style.zIndex = 2;
          targetPageElement.style.display = 'block';
          currentPageElement.style.zIndex = 1;
          currentPageElement.style.display = 'none';
        }
      }
    }

    function openChildPage() {
      if (tl) console.log('label: ', tl.currentLabel());

      var transition = options.transition || 'fade';

      if (!currentPageElement) {
        // first page of session

        if (isTargetInTimeline()) {
          startNewTimeline();
          targetParentElement.style.display = 'block';
          targetParentElement.style.opacity = 1;
        } else {
          targetParentElement.style.display = 'block';
          targetParentElement.style.opacity = 1;
          targetPageElement.style.visibility = 'visible';
          targetPageElement.style.opacity = 1;
        }
      } else {
        scrollToTop();        

        if (transition == 'fade') {
          if (currentParentId === targetParentId) {
            // from sibling
            if (isTargetInTimeline()) {
              tweenWithinTimeline();
            } else {
              fadeInChild(targetPageElement);
              fadeOutChild(currentPageElement);
            }
          } else if (currentParentId) {
            // from cousin
            if (isTargetInTimeline()) {
              endCurrentTimeline();
              startNewTimeline();
            } else {
              fadeIn(targetParentElement);
              fadeInChild(targetPageElement);
              fadeOut(currentParentElement);
              fadeOutChild(currentPageElement);
            }
          } else {
            // from uncle
            if (isTargetInTimeline()) {
              startNewTimeline();         
            } else {
              fadeInChild(targetPageElement);       
            }

            fadeIn(targetParentElement);
            fadeOut(currentPageElement); 
          }
        } else {
          targetParentElement.style.zIndex = 2;
          targetParentElement.style.display = 'block';
          targetPageElement.style.zIndex = 2;
          targetPageElement.style.display = 'visible';
          currentPageElement.style.zIndex = 1;
          currentPageElement.style.display = 'none';
        }
      }

      // current parent should be stored from previous go() call
      currentParentId = targetParentId;
      currentParentElement = targetParentElement;
    }


    function isTargetInTimeline() {
      return isTimelinesActive && V.Timelines[targetParentId];
    }


    function endCurrentTimeline() {
      // kill its animations
      V.Timelines[currentTimelineId].kill();

      // hide its pages
      fadeOut(V.Timelines[currentTimelineId].pagesSelector);

      // unset the scoped variable
      currentTimelineId = undefined;
    }

    function startNewTimeline() {
      currentTimelineId = targetParentId;
      tl = V.Timelines[currentTimelineId];

      var $pages = TweenLite.selector(tl.pagesSelector);

      if (tl.needsRebuild) {
        tl.build();
        V.Timelines[currentTimelineId].needsRebuild = false;
      }

      setTimeout(tl.play.bind(tl, targetPageId), 0);
      // fadeIn($pages);
    }

    function tweenWithinTimeline() {
      // validate our labelNames array
      if (tl.labelNames) {
        var currentLabelIndex = tl.labelNames.indexOf(tl.currentLabel());
        var idLabelIndex = tl.labelNames.indexOf(targetPageId);
    
        if (currentLabelIndex - 1 == idLabelIndex && idLabelIndex > 0) {
          // play back 1
          tl.reverse(currentLabelIndex);
        } else if (currentLabelIndex + 1 == idLabelIndex) {
          // play forward 1
          tl.play(targetPageId);
        } else {
          // tween to final state
          tl.tweenTo(tl.labelNames[idLabelIndex + 1]);
        }
      } else {
        tl.play(targetPageId);
      }
    }

    function fadeIn(selector) {
      setTimeout(function fadeInDeferred() {
        TweenLite.set(
          selector,
          {zIndex: 2}
        );

        TweenLite.fromTo(
          selector,
          trDur,
          {
            opacity: 0
          },
          {
            opacity: 1,
            display: 'block',
            overwrite: 'all'
          }
        );
      }, 0);
    }

    function fadeInChild(selector) {
      setTimeout(function fadeInDeferred() {
        TweenLite.set(
          selector,
          {zIndex: 2}
        );

        TweenLite.fromTo(
          selector,
          0,
          {
            autoAlpha: 0
          },
          {
            autoAlpha: 1,
            overwrite: 'all'
          }
        );
      }, 0);
    }

    function fadeOut(selector) {
      setTimeout(function fadeOutDeferred() {
        TweenLite.set(
          selector,
          {zIndex: 1}
        );

        TweenLite.set(
          selector,
          {
            delay: trDur,
            opacity: 0,
            display: 'none',
            overwrite: 'all'
          }
        );
      }, 0);
    }

    function fadeOutChild(selector) {
      setTimeout(function fadeOutDeferred() {
        TweenLite.set(
          selector,
          {zIndex: 1}
        );

        TweenLite.set(
          selector,
          {
            delay: 0,
            autoAlpha: 0,
            overwrite: 'all'
          }
        );
      }, 0);
    }

    function scrollToTop() {
      TweenLite.to(
        [document.documentElement, document.body],
        0.3,
        {scrollTop: 0, autoCSS: false}
      );
    }

    function updatePeripherals() {
      if (V.Menu && V.Menu.getList()) {
        V.Menu.render();
      }

      updateGate();

      if (!V.SCORM.isConnected()) {
        updateAddressBar();
      }
    }

    function callOnEnter() {
      if (V.Pages[targetPageId].onEnter) {
        setTimeout(V.Pages[targetPageId].onEnter, 0);
      }
    }

    function updateSCORM() {
      V.SCORM.setLocation(targetPageId);
      V.SCORM.setViewed(targetPageId);
      V.SCORM.setViewed(targetParentId);
    }

    function updateGate() {
      if (V.Pages[targetPageId].hasGate) {
        gateText.innerHTML = V.Pages[targetPageId].gateText || 'Please complete this activity before proceeding to the next page.';

        if (!V.SCORM.getCompleted(targetPageId)) {
          body.classList.add('-next-disabled');
        } else {
          body.classList.remove('-next-disabled');
        }
      } else {
        body.classList.remove('-next-disabled');
      }

      if (targetParentId && V.Pages[targetParentId].gateText) {
        gateText.innerHTML = V.Pages[targetParentId].gateText;
      }
    }
    
    function updateAddressBar() {
      let newURL;

      // find the `p` parameter
      const currentURLmatches = (window.location.href+'').match(/([\?&])p=([^\?&]*)/);
      /**
       * currentURLmatches[0] => '?p=current_page'
       * currentURLmatches[1] => '?' or '&'
       * currentURLmatches[2] => 'current_page'
       */
      
      // find everything around the `p` parameter
      const restOfURL = (window.location.href+'').split(/[\?&]p=[^\?&]*/);
      /**
       * restOfURL[0] => 'http://localhost:3084/app.html', 
       * restOfURL[1] => '&sd=...&score=...&Var_firm_name=...', 
       */
      
      // return if not in app.html
      if (restOfURL[0].indexOf('/app.html') === -1) {
        return false;
      }

      if (currentURLmatches && restOfURL) {
        // build new URL and pushState it
        restOfURL[0] = restOfURL[0].split('/app.html')[1];
        newURL = `/app.html${restOfURL[0]}${currentURLmatches[1]}p=${targetPageId}${restOfURL[1]}`;
      } else {
        // no `p` yet, so append to current URL
        restOfURL[1] = restOfURL[0].split('/app.html')[1];
        newURL = `/app.html${restOfURL[1]}&p=${targetPageId}`.replace('app.html&', 'app.html?');
      }

      window.history.pushState({}, '', newURL);
    }
  }

  /**
   * Gets the next page ID from `V.Pages[oldId].nextPage`.
   * If that doesn't exist, gets the ID of next `.page` in DOM.
   * Then navigates with `goToPageById`.
   */
  function next() {
    // check if locked
    if (isLocked) {
      console.info('Navigation is locked.');
      return false;
    }

    // check if gate is closed
    if (isGateClosed()) {
      return false;
    }

    // find next page
    targetPageId = findNextPage(currentPageId);

    if (!targetPageId) {
      return false;
    }

    // abort if `onNext` returns false
    if (
      V.Pages[currentPageId].onNext 
      && V.Pages[currentPageId].onNext() === false
    ) {
      return false;
    }

    const parent = V.Pages[currentPageId].parent;
    // if leaving parent from its last child page, call `onNext` of parent
    if (
      parent
      && V.Pages[parent].children.indexOf(targetPageId) === -1
      && parent.onNext 
      && parent.onNext() === false
    ) {
      return false;
    }

    // navigate to the new page
    go();
  }

  function findNextPage(id) {
    // find next child page
    if (V.Pages[id].parent) {
      const parent = V.Pages[id].parent;
      const siblings = V.Pages[parent].children;
      const index = siblings.indexOf(id);

      if (index === -1) {
        console.error(`Child page #${id} was not registered to its parent, #${V.Pages[id].parent}.`);
      } else if (index + 1 < siblings.length) {
        // next page is next sibling
        return siblings[index + 1];
      } else {
        // last child, get next of parent
        id = parent;
      } 
    }

    if (V.Pages[id].nextPage) {
      return V.Pages[id].nextPage;
    } else {
      const index = pageNavigationOrder.indexOf(id);

      if (index === -1) {
        console.error(`The page #${id} was not found in \`pageNavigationOrder\`.`);
      } else if (index + 1 < pageNavigationOrder.length) {
        return pageNavigationOrder[index + 1];
      } else {
        // last page
        console.warn(`\`#${id}\` is the last page.`)
        return false;
      } 
    }

    return false;
  }

  /**
   * Gets the previous page ID from `V.Pages[oldId].prevPage`.
   * If that doesn't exist, gets the ID of previous `.page` in DOM.
   * Then navigates with `goToPageById`.
   */
  function prev() {
    // check if locked
    if (isLocked) {
      console.info('Navigation is locked.');
      return false;
    }

    // find previous page
    targetPageId = findPrevPage(currentPageId);

    if (!targetPageId) {
      return false;
    }

    // if target page has children, then target is its last child
    const children = V.Pages[targetPageId].children;
    if (children) {
      targetPageId = children[children.length - 1];
    }

    // navigate to the new page
    go();
  }


  function findPrevPage(id) {
    // find previous child page
    if (V.Pages[id].parent) {
      const parent = V.Pages[id].parent;
      const siblings = V.Pages[parent].children;
      const index = siblings.indexOf(id);

      if (index === -1) {
        console.error(`Child page #${id} was not registered to its parent, #${V.Pages[id].parent}.`);
      } else if (index > 0) {
        // previous page is previous sibling
        return siblings[index - 1];
      } else {
        // last child, get previous of parent
        id = parent;
      } 
    }

    if (V.Pages[id].prevPage) {
      return V.Pages[id].prevPage;
    } else {
      const index = pageNavigationOrder.indexOf(id);

      if (index === -1) {
        console.error(`The page #${id} was not found in \`pageNavigationOrder\`.`);
      } else if (index > 0) {
        return pageNavigationOrder[index - 1];
      } else {
        // first page
        console.warn(`\`#${id}\` is the first page.`)
        return false;
      } 
    }

    return false;
  }

  function showGate() {
    body.classList.add('-show-gate');
    document.addEventListener('keydown', gateKeydown);
  }

  function hideGate() {
    body.classList.remove('-show-gate');
    document.removeEventListener('keydown', gateKeydown);
  }

  /**
   * Checks if there is a closed gate. 
   * If `V.Pages[id].onGate` exists and returns `true`, the gate is opened.
   * 
   * @return {Boolean} - is the gate closed?
   */
  function isGateClosed() {
    if (
      !V.Pages[currentPageId].hasGate 
      && !(currentParentId && V.Pages[currentParentId].hasGate)
    ) {
      // there is no gate
      return false;
    }

    if (V.SCORM.getCompleted(currentPageId)) {
      // page is completed
      return false;
    }

    if (V.Menu && V.Menu.isUnlocked()) {
      // menu is unlocked
      return false;
    }

    if (V.Pages[currentPageId].onGate && V.Pages[currentPageId].onGate()) {
      // `onGate()` just opened the gate
      return false;
    } else {
      console.info('`V.Pages.'+currentPageId+'.onGate()` returned false.');
    }

    // we got this far, so the gate is locked
    console.info('Page has not been completed.');
    showGate();

    return true;
  }

  function setGateText(text) {
    gateText.innerHTML = text;
  }

  function openGate(id) {
    // if `id` parameter undefined, use `currentPageId`
    id = id || currentPageId;
    V.SCORM.setCompleted(id);
    body.classList.remove('-next-disabled');
  }

  function gateKeydown(event) {
    // enter, spacebar, or escape
    if (event.keyCode == 13 || event.keyCode == 32 || event.keyCode == 27) {
      event.preventDefault();
      hideGate();

      // don't let spacebar scroll the window
      event.stopPropagation();
    }
  }

  var blinkTL = new TimelineMax({paused: true, repeat: -1,});
  var nextArrow = document.querySelectorAll('.arrows__arrow--next');
  var blinkSpeed = 0.1;

  blinkTL.add(
    TweenLite.to(
      nextArrow,
      blinkSpeed,
      {
        opacity: 1,
        ease: Sine.easeInOut
      }
    )
  );

  blinkTL.add(
    TweenLite.to(
      nextArrow,
      blinkSpeed,
      {
        opacity: 0.1,
        ease: Sine.easeInOut
      }
    )
    , '+=' + blinkSpeed*4
  );

  blinkTL.add(
    TweenLite.set({},{})
    , '+=' + blinkSpeed*4
  )

  stopBlink();

  function blink() {
    blinkTL.play();
  }

  function stopBlink() {
    blinkTL.pause();
    TweenLite.set(nextArrow, {clearProps: 'all'});
  }

  /**
   * Closes menu and gate.
   */
  function closePeripherals() {
    if (V.Menu) {
      V.Menu.close();
    }

    hideGate();
    stopBlink();
  }

  function playAudio(audioId) {
    if (!audioEnabled) {
      return false;
    }

    // is this audio already playing?
    if (audioNowPlaying && audioId === audioNowPlaying) {
      resumeAudio();
      return true;
    }

    stopAudio();

    // don't play in hidden browser tab
    if (typeof document.hidden === 'boolean' && document.hidden) {
      return false;
    }

    // audio not a string with some length
    if (typeof audioId !== 'string' || audioId.length === 0) {
      return false;
    }

    if (!isMuted) {
      getAudio(audioId);
      audioNowPlaying = audioId;

      audioTimeout = setTimeout(function () {
        if(!audioNowPlaying) {
          console.log('canceled audio');
          return false;
        } else {
          var file = audioFiles[audioNowPlaying];
    
          if (!isMuted) {
            // reset volume and time in case audio was stopped
            TweenLite.set(file, {volume: 1, overwrite: 'all'});
            file.currentTime = 0;
            file.play();
          }
        }
      }, 600);
    } else {
      // remember audio in case we unmute
      audioNowPlaying = audioId;
    }
  }

  /**
   * Returns audio element saved in closured object. If the audio
   * is not saved, loads it as `new Audio()`.
   */
  function getAudio(audioId) {
    if (!audioEnabled) {
      return false;
    }

    var file;

    if (audioFiles[audioId]){
      // the file is saved
      file = audioFiles[audioId];
    } else {
      // load the file
      if (isMuted) {
        return false;
      }

      var filePath = 'audio/' + audioId;
    
      // '.mp3' extension is optional
      if (filePath.substr(-4) !== '.mp3') {
        filePath += '.mp3';
      }
    
      file = new Audio(filePath);
      audioFiles[audioId] = file;
    } 

    return file;
  }

  function pauseAudio(trDur) {
    if (!audioEnabled) {
      return false;
    }

    if (typeof trDur !== 'number') {
      trDur = 0.8;
    }

    var file = audioFiles[audioNowPlaying];

    if (file) {
      // tween volume from 1 to 0
      TweenLite.to(
        file, 
        trDur, 
        {
          volume: 0,
          onComplete: function () {
            file.pause();
          },
          ease: 'audioEaseOut',
          overwrite: 'all'
        }
      );
    }
  }

  function stopAudio(trDur) {
    if (!audioEnabled || !audioFiles) {
      return false;
    }

    if (typeof trDur !== 'number') {
      trDur = 0.8;
    }

    var file = audioFiles[audioNowPlaying];

    if (file && !file.paused && file.currentTime) {
      // tween volume from 1 to 0
      TweenLite.to(
        file, 
        trDur, 
        {
          volume: 0,
          onComplete: function () {
            file.pause();

            if (file.currentTime) {
              file.currentTime = 0;
            }
          },
          ease: 'audioEaseOut',
          overwrite: 'all'
        }
      );
    }

    audioNowPlaying = false;
  }

  function resumeAudio() {
    if (!audioEnabled) {
      return false;
    }

    if (audioNowPlaying) {     
      var file = getAudio(audioNowPlaying);

      if (file.ended) {
        // it finished playing
        return false;
      }

      if (!file.paused && file.currentTime) {
        // it's already playing
        console.warn('The file ' + audioNowPlaying + ' is already playing.');

        return false;
      }

      // back up 1 second
      var currentTime = file.currentTime;
      if (currentTime > 1.5) {
        file.currentTime = currentTime - 1.5;
      } else if (file.currentTime) {
        file.currentTime = 0;
      }

      // tween volume from 0 to 1
      if (!isMuted) {        
        file.play();
        TweenLite.to(
          file, 
          0.5, 
          {
            volume: 1,
            ease: Expo.easeIn,
            overwrite: 'all'
          }
        );
      }
    }
  }

  function muteAudio() {
    if (!audioEnabled) {
      return false;
    }

    isMuted = true; //
    V.SCORM.set('mute', true);

    if (audioNowPlaying) {
      pauseAudio();
    }
  }

  function unmuteAudio() {
    if (!audioEnabled) {
      return false;
    }

    isMuted = false;
    V.SCORM.set('mute', false);

    if (audioNowPlaying) {
      resumeAudio();
    }
  }

  function disableAudio() {
    document.body.classList.add('-audio-disabled');
    stopAudio();
    audioEnabled = false;
  }

  function enableAudio() {
    if (window.matchMedia('(min-width: 50em)').matches && V.Project.config.hasAudio) {
      document.body.classList.remove('-audio-disabled');
      audioEnabled = true;

      return true;
    }
    
    return false;
  }

  function initMuteButton() {
    // mute button    
    const muteButton = document.getElementById('mute-button');

    if (muteButton && audioEnabled){
      if (isMuted) {
        // set button class now
        muteButton.classList.add('-is-muted');
      }

      // add listener  
      muteButton.addEventListener('click', function () {
        if (isMuted) {
          muteButton.classList.remove('-is-muted');
          unmuteAudio();
        } else {
          muteButton.classList.add('-is-muted');
          muteAudio();
        }
      });
    }
  }

  function initNavigateOnKeydown() {
    // keydown listeners 
    const throttledNext = _.throttle(next, 300);
    const throttledPrev = _.throttle(prev, 300);

    document.addEventListener('keydown', navigateOnKeydown);

    function navigateOnKeydown(event) {
      if (_.isUserTyping(event)) {
        return false;
      }

      // right key for next
      if (event.keyCode == 39) {
        throttledNext();
      }

      // left key for prev
      if (event.keyCode == 37) {
        throttledPrev();
      }

      if (!V.SCORM.isConnected()) {
        // U key to unlock
        if (event.keyCode == 85) {
          if (V.Menu) {
            V.Menu.unlock();
          }
        }   

        // L to open V.SCORM.log()
        if (event.keyCode == 76) {
          window.open(V.SCORM.log());
        }
      }
    }
  }
})(window.V);
