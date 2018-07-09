/**
 * V.Pages.js
 */
;(function initPages(V) {  
  if (!V) {
    console.error('V not defined!');
    return false;
  }

  V.Pages = {
    load: loadPages,
    init: initPage
  };

  const newPageEvent = new CustomEvent('newpage', {
    bubbles: true,
    cancelable: true
  });

  /**
   * Register all pages and child pages in the DOM to the V.Pages object.
   */
  const pages = document.getElementsByClassName('page');
  const childPages = document.getElementsByClassName('child-page');

  // loop through pages
  for (let i = pages.length; i--;) {
    initPage(pages[i]);
  }

  /**
   * Loops through the data attributes of an element 
   * and adds them to the V.Pages object.
   * 
   * @param  {Element} pageElement - The page.
   * @return {object}  V.Pages[id]
   */
  function initPage(page) {
    let pageElement;

    if (typeof page === 'string') {
      pageElement = document.getElementById(page);
    } else if (page instanceof HTMLElement) {
      pageElement = page;
    }

    if (!pageElement) {
      debugger;
      console.error('Couldn’t find that page.');
      return false;
    }

    const id = pageElement.id;

    if (!id) {
      console.error('A page is missing an id.');
      return false;
    }

    // V.Pages[id] must exist
    if (!V.Pages[id]) {
      V.Pages[id] = {};
    }

    V.Pages[id].element = pageElement;

    const attributes = pageElement.attributes; 
    let propertyName;
    let attributeValue;

    for (let i = 0, iMax = attributes.length; i < iMax; i++) {
      if (attributes[i].name.indexOf('data-') === 0) {
        propertyName = dataToCamelCase(attributes[i].name);
        V.Pages[id][propertyName] = attributes[i].value;
      }
    }

    /**
     * Register the page's child pages.
     */
    const childPages = pageElement.getElementsByClassName('child-page');
    let childId;

    for (let j = 0, jMax = childPages.length; j < jMax; j++) {
      initPage(childPages[j]);
      childId = childPages[j].id;
      V.Pages[childId].parent = id;
      V.Pages[id].children = V.Pages[id].children || [];
      V.Pages[id].children.push(childId);
    }

    /**
     * Converts a string from 'data-hello-world' to 'helloWorld'
     */
    function dataToCamelCase(str) {
      // ['hello', 'world']
      const arr = str.slice(5).split('-');

      // loop i from (arr.length - 1) to 1
      let i = arr.length;
      
      // ['hello', 'World']
      while (--i) {
        arr[i] = arr[i][0].toUpperCase() + arr[i].slice(1);
      }

      // helloWorld
      return arr.join('');
    }

    return V.Pages[id];
  }

  /**
   * Loads HTML from a URL or array of URLs via XMLHttpRequest, 
   * appends each `.page` and `lightbox` in the response to DOM,
   * and registers the new page to `V.Pages`. 
   *
   * Options: The optional `options` object can contain callback functions 
   *   `onPageAdded` and `onAllPagesAdded`. 
   *   
   *   `onPageAdded` is called after each page is added to the DOM, 
   *   with the page element as context and parameters `i` and `iMax`. 
   *   
   *   `onAllPagesAdded` is called after the last page is added, with an 
   *   array of all the page elements as context.
   * 
   * @param  {string}  url      - URL(s) to load
   * @param  {object}  options  - object containing callbacks
   */
  function loadPages(url, options) {
    options = options || {};

    const newHTML = document.createElement('div');
    const xhr = new XMLHttpRequest();
    const onPageAdded = options.onPageAdded || function () {};
    const onAllPagesAdded = options.onAllPagesAdded || function () {};    

    // these could be closured, but sometimes the DOM is reset, so get them every time
    const pagesContainer = document.getElementsByClassName('page')[0].parentNode;
    const lightboxesContainer = document.getElementsByClassName('lightboxes')[0];

    xhr.open('GET', url, true);

    xhr.onreadystatechange = function() {
      if (this.readyState !== 4) {
        return false;
      }

      if (this.status !== 200) {
        if (typeof V.Pages.onLoadError === 'function') {
          V.Pages.onLoadError();
        }

        return false;
      }

      htmlString = this.responseText;

      if (options.filterHTML) {
        htmlString = options.filterHTML(htmlString);
      }

      newHTML.innerHTML = htmlString;

      const addedPages = [];
      const addedLightboxes = [];
      const pages = newHTML.getElementsByClassName('page');
      const lightboxes = newHTML.getElementsByClassName('lightbox');
      
      // add lightboxes to DOM
      for (let i = 0, iMax = lightboxes.length; i < iMax; i++) {
        // `lightboxes[0]` for each `i` because `appendChild` removes it
        const lightbox = lightboxesContainer.appendChild(lightboxes[0]);
        addedLightboxes.push(lightbox);
      }

      // add pages to DOM with callbacks
      for (let i = 0, iMax = pages.length; i < iMax; i++) {
        // `page[0]` for each `i` because `appendChild` removes it
        const page = pagesContainer.appendChild(pages[0]);
        addedPages.push(page);
        registerPage(page);
        onPageAdded(page, i, iMax);
        page.dispatchEvent(newPageEvent);
      }

      // callback for all content
      onAllPagesAdded(addedPages, addedLightboxes);
    };

    xhr.send();
  }
})(window.V);
