/**
 * Saves some useful functions under the `_` namespace.
 */

!function () {
  window._ = window._ || {};
  const _ = window._;

  _.isUserTyping = isUserTyping;

  /**
   * Returns true if the event target is an input or textarea.
   */
  function isUserTyping(event) {
    return (
      event.type.indexOf('key') !== 1 
      && ['input','textarea'].indexOf(event.target.tagName.toLowerCase()) !== -1
    );
  }
  
  _.throttle = throttle;

  /**
   * Throttles a function so it may only be called once per
   * interval. Disable leading or trailing call with `{leading: false}`
   * or `{trailing: false}`. From https://stackoverflow.com/a/27078401/
   *
   * @param  {function} func  - The function to throttle.
   * @param  {number} wait    - The wait before next function call.
   * @param  {object} options - Disable leading or trailing call
   * @return {function}       - The throttled function.
   */
  function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) {options = {};}
    var later = function () {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) {context = args = null;}
    };
    return function () {
      var now = Date.now();
      if (!previous && options.leading === false) {previous = now;}
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) {context = args = null;}
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  /**
   * Debounces a function so that if it is called in rapid succession,
   * it only executes after a certain wait after the last call.
   * Taken from https://davidwalsh.name/javascript-debounce-function
   *
   * @param  {function} func - The function to debounce.
   * @param  {number} wait - How long to wait before calling `func`.
   * @param  {boolean} immediate - Call `func` before the first wait.
   * @return {function} - The debounced function.
   */
  _.debounce = debounce;

  function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this, args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  };

  /**
   * Adds an event listener to window resize event, with a given function
   * with a given name. The debounced function is stored in the `_`
   * namespace, so the listener can be removed later with this statement:
   * `window.removeEventListener('resize', _[name]);`
   *
   * @param  {string}    name - Name to use for the listener.
   * @param  {function}  fn   - The EventListener function.
   * @param  {number}    wait - The debounce timeout in milliseconds.
   */
  _.addOnResize = function addOnResize(name, fn, wait) {
    // validate inputs
    if (typeof name !== 'string') {
      console.error('_.addResize parameter `name` must be a string.');
      return false;
    }

    if (typeof fn !== 'function') {
      console.error('_.addResize parameter `fn` must be a function.');
      return false;
    }


    // tag the name for privacy
    name += ' resize event listener';

    // debounce it if a wait is defined
    wait = wait || 0;
    _[name] = wait > 0 ? debounce(fn, wait) : fn;

    // for validation on removal
    _[name].isResizeEventListener = true;

    // add the listener
    window.addEventListener('resize', _[name]);

    return true;
  };

  /**
   * Removes a resize event listener created with `_.addOnResize`.
   * @param  {string} name - The listener to remove.
   */
  _.removeOnResize = function removeOnResize(name) {
    // get the private name
    name += ' resize event listener';

    // validation
    if (!_[name].isResizeEventListener) {
      console.error('_[' + name + '] is not a resize event listener.');
      return false;
    }

    // removal
    window.removeEventListener('resize', _[name]);

    return true;
  };

  /**
   * Tests if a givenelement has a given class.
   *
   * @param  {element}  el - The element.
   * @param  {string}   className - The class.
   * @return {Boolean}  - Does the element have the class?
   */
  _.hasClass = hasClass;

  function hasClass(el, className) {
    return new RegExp('(\\s|^)' + className + '(\\s|$)').test(el.className);
  }

  /**
   * Gets the next sibling of a given element that has a given class.
   *
   * @param  {element} el  - The element.
   * @param  {string}  className - The class.
   * @return {element} - The sibling with given class, or `null`.
   */
  _.nextByClass = function nextByClass(el, className) {
    while (el = el.nextElementSibling) {
      if (hasClass(el, className)) {
        return el;
      }
    }

    return null;
  };

  /**
   * Gets the previous sibling of a given element that has a given class.
   *
   * @param  {element} el  - The element.
   * @param  {string}  className - The class.
   * @return {element} - The sibling with given class, or `null`.
   */
  _.prevByClass = function prevByClass(el, className) {
    while (el = el.previousElementSibling) {
      if (hasClass(el, className)) {
        return el;
      }
    }

    return null;
  };

  /**
   * Sets `display:none` on all elements with a given class.
   * Skips an element passed as the option argument `excpetion`.
   *
   * @param  {string} className - The class to be hidden.
   * @param  {element} exception - An element that should not be hidden.
   */
  _.hideAllByClass = function hideAllByClass(className, exception) {
    var els = document.getElementsByClassName(className);

    if (exception) {
      for (var i = 0, len = els.length; i < len; i++) {
        if (!els[i].isSameNode(exception)) {
          els[i].style.display = 'none';
        }
      }
    } else {
      for (var i = 0, len = els.length; i < len; i++) {
        els[i].style.display = 'none';
      }
    }
  };

  _.matchesMedia = function matchesMedia(str) {
    return !!window.matchMedia(str).matches;
  };

  /**
   * Gets the height of `1rem` in pixels.
   * @return {number} - The height.
   */
  _.getRemToPx = function getRemToPx() {
    var rem;

    try {
      // get root element's computed style, https://stackoverflow.com/a/42061290/
      rem = parseFloat(getComputedStyle(document.documetElement).fontSize);
    } catch (e) {
      // create a div with `width:1rem` and get its `offsetWidth`
      div = document.createElement('div');
      div.style.cssText = 'position:absolute;height:1rem;width:1rem;visibility:hidden;';
      document.body.appendChild(div);
      rem = div.offsetWidth;
      document.body.removeChild(div);
    }

    // backup value of 16
    if (!rem) {
      rem = 16;
    }

    return rem;
  };

  /**
   * Loops through elements matching a selector and calls a function
   * for each element, with the element as `this` and its index passed
   * as its one argument.
   *
   * @param  {string}   selector - Selects the elements.
   * @param  {Function} fn       - The function.
   */
  _.forEach = function forEach(selector, fn) {
    var elements = document.querySelectorAll(selector);

    for (var i = 0, iMax = elements.length; i < iMax; i++) {
      fn.call(elements[i], i);
    }
  };
}();
