/**
 * The `main.pages` element has `width: 100vw` to prevent jumping
 * during a transition from a page with a scrollbar to a page
 * without a scrollbar. This function then adds `padding-right`
 * to each page taller than the window to keep its content centered
 * when it causes a scrollbar.
 */

document.addEventListener('DOMContentLoaded', scrollbarWidth);

function scrollbarWidth() {

  /**
   * Store the scrollbar width (sbw) returned by an IIFE
   */
  var sbw = function getScrollbarWidth() {
    var docEl = document.documentElement;
    var widthWithSB;
    var widthWithoutSB;

    // // let's see how long it takes to measure the scrollbar
    // var start = performance.now();

    // measure the document width, with and without scrollbars
    docEl.style.overflowY = 'scroll';
    widthWithSB =  docEl.clientWidth;
    widthWithoutSB = window.innerWidth;
    docEl.style.overflowY = '';

    // // log the time
    // console.log(
    //   'scrollbarWidth.js spent',
    //   Math.round((performance.now() - start)*10)/10,
    //   'ms measuring the scrollbar'
    // );

    return widthWithoutSB - widthWithSB;
  } ();

  // If the scrollbars have no width, then abort
  if (sbw === 0) {
    return false;
  }

  // add the padding to all pages on a later animation frame
  addToAllPages();

  // and again on window resize, with debouncing
  _.addOnResize('scrollbarWidth', addToAllPages, 250);

  /**
   * loops through all `.page` elements and adds
   * padding to those that need it
   */
  function addToAllPages() {
    var start = performance.now();
    var windowHeight = window.innerHeight;
    var pages = document.getElementsByClassName('page');
    var sbwPixels = sbw + 'px';

    // set `height:auto!important` and `display:block!important` on all pages
    document.body.classList.add('-measuring-page-heights');

    var i = pages.length;
    while (i--) {
      pages[i].style.paddingRight =
        (pages[i].offsetHeight > windowHeight)
          ? sbwPixels
          : '';
    }

    document.body.classList.remove('-measuring-page-heights');
    console.log(
      'scrollbarWidth.js spent',
      Math.round((performance.now() - start)*10)/10,
      'ms checking for scrollbars on',
      pages.length,
      'pages'
    );
  }

  window.addPaddingToPage = function addPaddingToPage(page) {
    var windowHeight = window.innerHeight;
    var sbwPixels = sbw + 'px';

    page.style.paddingRight =
      (page.offsetHeight > windowHeight)
        ? sbwPixels
        : '';
  };
};
