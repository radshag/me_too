// ====================================
//
//   SCORM.js
//
// ====================================

/**
 * Creates global namespace V (for "VinciWorks") to include
 * V.SCORM and V.Navigation; and optionally V.Pages, V.Menu, 
 * and V.Timelines
 */
window.V = {};

/**
 * V.SCORM object with useful properties and methods
 * wrapping the pipwerks SCORM API wrapper:
 * https://github.com/pipwerks/scorm-api-wrapper/
 */
;(function initSCORM(V) {
  V.SCORM = {
    // any variable in suspend data
    get: get,
    set: set,

    // clear all data created in session
    clearSuspendData: clearSuspendData,

    // page views
    setViewed: setViewed,
    getViewed: getViewed,

    // completed activities
    setCompleted: setCompleted,
    getCompleted: getCompleted,

    // cmi.core.lesson_location
    setLocation: setLocation,
    getLocation: getLocation,

    // cmi.core.score.raw
    setScore: setScore,
    getScore: getScore,
    addToScore: addToScore,

    // cmi.core.lesson_status
    passed: passed,
    failed: failed,
    getLessonStatus: getLessonStatus,
    setLessonStatus: setLessonStatus,

    // get Var_firm_name
    getFirm: getFirm,
    isFirm: isFirm,

    // console.log url representing saved session
    log: log,

    // is there an active SCORM connection?
    isConnected: isConnected,

    // SCORM session
    quit: pipwerks.SCORM.quit,
    save: pipwerks.SCORM.save
  };

  // shortcut for pipwerks API
  var pw = pipwerks.SCORM;

  // initialize connection, take 3 tries
  pw.version = "1.2";
  var initSuccess;
  var initAttempts = 3;

  while (initAttempts--) {
    try {
      initSuccess = pw.init();
    } catch (e) {}

    if (initSuccess) {
      initAttempts = 0;
    }
  }

  var connected = pw.connection.isActive;

  function isConnected() {
    return connected;
  }

  V.SCORM.connected = connected;

  // name variables
  if (connected) {
    V.SCORM.firstName = pw.get('cmi.core.student_name').split(",")[1];
    V.SCORM.lastName  = pw.get('cmi.core.student_name').split(",")[0];
    V.SCORM.userName  = pw.get('cmi.core.student_id');
  } else {
    V.SCORM.firstName = 'Demo';
    V.SCORM.lastName  = 'User';
    V.SCORM.userName  = 'demo_user';
  }

  var isDemo = (V.SCORM.userName === 'MASTERDEMO' || V.SCORM.userName === 'MASTERANONYMOUS');

  if (isDemo) {
    pw.set  = function () {return false;};
    pw.save = function () {return false;};
  }

  var suspendString = '';

  // object for accessing suspend data variables during runtime
  var suspendObject = {};

  // store key-value pairs generated by LMS separately
  var suspendPairs = {};

  // initialize `suspendObject` and `suspendPairs`
  initSuspendObject();

  var score = parseInt(connected ? pw.get('cmi.core.score.raw') || 0 : getURLParameter('score') || 0);

  function setScore(n) {
    score = n;
    pw.set('cmi.core.score.raw', score);
    pw.save();
  }

  function getScore() {
    return score;
  }

  function addToScore(n) {
    score += n;
    pw.set('cmi.core.score.raw', score);
    pw.save();
  }

  // if the score variable is falsy, initialize to 0
  if (!score && score !== 0) {
    setScore(0);
  }

  /**
   * Returns data from the variables object. The parameter `name` 
   * is the name of the requested property as a string, and it may 
   * be multiple levels deep, e.g. `name = 'level1.level2.level3'`.
   * 
   * @param  {string} name - The name of the property to return.
   * @return {*} value - The property's value.
   */
  function get(name) {
    if (typeof name === 'undefined') {
      return suspendObject;
    }
    
    if (suspendPairs[name]) {
      return suspendPairs[name];
    }

    var levelNames = name.split('.');
    var value = suspendObject;

    // loop down to deepest level
    for (var i = 0, length = levelNames.length; i < length; i++) {
      if (value.hasOwnProperty(levelNames[i])) {
        value = value[levelNames[i]];
      } else {
        // if at any time a property is not defined, return undefined
        return void 0;
      }
    }

    return value;
  }

  /**
   * Sets a value in the variables object and saves to suspend 
   * data. The value may be nested in a property any number of 
   * levels deep, by passing the first parameter for example as 
   * `name = 'level1.level2.level3'`. If intermediate levels do
   * not exist, then they are created.
   * 
   * @param {string} name - The name of the property to set.
   * @param {*} value - The value to set to the property.
   * @param {boolean} dontSave - If true, skip `saveSuspendData()`.
   */
  function set(name, value, dontSave) {

    if (suspendPairs[name]) {
      suspendPairs[name] = value;
    } else {
  
      var levelNames = name.split('.');
      var level = suspendObject;
  
      // loop down to deepest level and set property to value
      for (var i = 0, length = levelNames.length; i < length; i++) {
        if (i + 1 < length) {
          // dig deeper, create property if undefined
          level[levelNames[i]] = level[levelNames[i]] || {};
          level = level[levelNames[i]];
        } else {
          // set property to value
          level[levelNames[i]] = value;
        }
      }      
    }
  
    if (!dontSave) {
      saveSuspendData();
    }

    return true;
  }

  // add an id to `viewedPages`
  function setViewed(id) {      
    // get the array
    var viewedPages = get('viewedPages') || [];

    // if the id is not already in the array, push it   
    if (viewedPages.indexOf(id) === -1) {
      viewedPages.push(id);

      // set the array
      set('viewedPages', viewedPages);

      return true;
    }

    return false;
  }

  // return whether id exists in `viewedPages`
  function getViewed(id) {
    var viewedPages = get('viewedPages') || [];
    return viewedPages.indexOf(id) !== -1;
  }

  // add an id to `completedActivities`
  function setCompleted(id) {
    var completedActivities = get('completedActivities') || [];
    completedActivities.push(id);
    set('completedActivities', completedActivities);
  }

  // return whether id exists in `completedActivities`
  function getCompleted(id) {
    var completedActivities = get('completedActivities') || [];
    return completedActivities.indexOf(id) !== -1;
  }

  // get location from LMS or from URL parameter
  var lessonLocation = (connected)
    ? pw.get('cmi.core.lesson_location')
    : getURLParameter('p');

  if (isDemo) {
    lessonLocation = false;
  }

  function setLocation(name) {
    lessonLocation = name;
    pw.set('cmi.core.lesson_location', lessonLocation);
    pw.save();
  }

  function getLocation() {
    return lessonLocation;
  }

  function getPrevLocation() {
    var viewedPages = get('historyViewedPages');
    return viewedPages[viewedPages.length - 2];
  }

  // get cmi.core.lesson_status
  var lessonStatus = (connected)
    ? pw.get('cmi.core.lesson_status')
    : 'incomplete';

  function setLessonStatus(status) {
    lessonStatus = status;
    pw.set('cmi.core.lesson_status', lessonStatus);
    pw.save();
  }

  function getLessonStatus() {
    return lessonStatus;
  }

  // pass the course
  function passed() {
    setLessonStatus('passed');
  }

  // fail the course
  function failed() {
    setLessonStatus('failed');
  }

  function getFirm() {
   return get('Var_firm_name').toUpperCase();
  }

  function isFirm(firm) {
    return firm.toUpperCase() === get('Var_firm_name').toUpperCase();
  }

  // set cmi.core.exit before unload
  window.addEventListener('beforeunload', setExit);
  window.addEventListener('unload', setExit);

  function setExit() {
    var exit = (lessonStatus === 'incomplete')
      ? 'suspend'
      : 'logout';

    pw.set('cmi.core.exit', exit);
    pw.save();
  }

  // return a query string representing an offline session
  function log() {
    return window.location.origin
      + '/app.html?p='
      + lessonLocation
      + '&sd='
      + encodeURIComponent(suspendString)
      + '&score='
      + score;
  }

  document.addEventListener("DOMContentLoaded", 
    function saveClicksOnReady() {
      /**
       * setTimeout so that click event listeners from other 
       * scripts are added before `saveClicks()` is called
       */
      setTimeout(saveClicks, 0);
    }
  );

  /**
   * 
   */
  function initSuspendObject() {
    // get the string from LMS or URL parameter
    if (connected) {
      suspendString = pw.get('cmi.suspend_data');
    } else if (getURLParameter('sd')) {
      suspendString = getURLParameter('sd');
    }

    // if Varpassmark is missing, load from scormextern.js
    if (suspendString.indexOf('Varpassmark') === -1) {
      if (typeof getDefaultSuspendData === 'function') {
        suspendString += getDefaultSuspendData();
      } else {
        console.log('Missing scormextern.js.');
      }
    }

    console.log('Suspend Data: ' + suspendString);

    var match = suspendString.match(/json=([^;]+);/);
    var JSONString = match ? match[1] : '{}';

    // parse the JSON and store in suspendObject
    suspendObject = JSON.parse(decodeURIComponent(JSONString));

    // parse the rest of the string
    var pairs = suspendString.match(/([^=;]+)=([^=;]+);/g) || [];
    var pair;
    var i = pairs.length;

    // add key=value; pairs to suspendPairs
    while (i--) {
      // remove final ';' and split on '='
      pair = pairs[i].slice(0,-1).split('=');
      if (pair[0] !== 'json') {
        suspendPairs[pair[0]] = pair[1];
      }
    }

    return suspendObject;
  }

  function clearSuspendData() {
    suspendObject = {};
    saveSuspendData();
    // suspendString.replace(/json={[^;]+;/, '');
  }


  /**
   * Stringifies the variables object and saves it to
   * the LMS or offlineSuspendData.
   * 
   * @return {string} newString - the updated suspend data string.
   */
  function saveSuspendData() {
    // // timer for testing purposes
    // var start = performance.now();
    
    var JSONString = JSON.stringify(suspendObject);
    JSONString = JSONString.replace(/;/g,'%3B');
    JSONString = JSONString.replace(/=/g,'%3D');

    // convert object to string
    var newString = 'json=' + JSONString + ';';

    Object.keys(suspendPairs).forEach(function(key) {
      newString += key + '=' + suspendPairs[key] + ';'
    });

    //Update the LMS with the new suspend data string
    if (connected) {
      // use setTimeout to defer expensive function calls
      setTimeout(function () {
        pw.set('cmi.suspend_data', newString);
        pw.save();
      }, 20);
    }

    suspendString = newString;
    V.SCORM.offlineSuspendData = newString;
  
    // // log timer result
    // console.log(
    //   'saveSuspendData() took ', 
    //   Math.round(performance.now()*1e3 - start*1e3)/1e3, 
    //   'ms'
    // );

    console.log('saveSuspendData()');

    return newString;
  }    

  /**
   * Returns the value of a query parameter in the URL.
   * Based on https://stackoverflow.com/a/11582513/
   * 
   * @param  {string} name - the name of the query parameter
   * @return {string} - the decoded value of the parameter
   */
  function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
  }

  /**
   * Adds a click event listener `saveClick()` to every 
   * element that has the class 'save-click', and 
   * reenacts clicks that were saved in suspend data.
   */
  function saveClicks() {
    var pages = document.getElementsByClassName('page');
    var pageID;
    var elements;
    var i, iMax, j, jMax;

    V.SCORM.isReenactingClicks = true;

    // loop through pages
    for (i = 0, iMax = pages.length; i < iMax; i++) {
      pageID = pages[i].id;
      elements = pages[i].getElementsByClassName('save-click');

      if (elements.length) {
        if (!suspendObject.savedClicks) {
          suspendObject.savedClicks = {};
        }

        // loop through elements
        for (j = 0, jMax = elements.length; j < jMax; j++) {
          // reenact saved clicks
          if (
            suspendObject.savedClicks[pageID] 
            && suspendObject.savedClicks[pageID][j]
          ) {
            elements[j].click();
          }

          // add event listener for future clicks
          elements[j].addEventListener(
            'click', 
            saveClick.bind(null, pageID, j)
          );
        }
      }
    }

    V.SCORM.isReenactingClicks = false;

    /**
     * @param  {number} pageID - The page ID.
     * @param  {number} j - The element's index within the page.
     * @this {element} - The element itself.
     */
    function saveClick(pageID, j) {
      if (!suspendObject.savedClicks[pageID]) {
        suspendObject.savedClicks[pageID] = [];
      }

      suspendObject.savedClicks[pageID][j] = 1;
      saveSuspendData();
    }
  }
})(window.V);
