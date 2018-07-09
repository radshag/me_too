// ====================================
//
//   Menu
//
// ====================================

;(function initMenu(V, document) {
  V.Menu = {
    build: buildMenu,
    close: closeMenu,
    getList: getMenuItemList,
    isUnlocked: isMenuUnlocked,
    render: renderMenu,
    unlock: unlockMenu
  };

  // store some DOM elements we will need often
  const body = document.body;
  const menuList = document.querySelector('.main-menu__list');
  const menuProgress = document.querySelector('.main-menu__progress-fill');

  document.querySelector('.main-menu__heading').textContent = V.Project.config.title;

  // closured variables for build and render
  let menuItemList;
  let totalPages;
  let numberings;

  /**
   * Render the menu on DOM ready and add listeners
   * for opening and closing the menu.
   */
  document.addEventListener('DOMContentLoaded', function menuOnDOMReady() {
    document.querySelector('.main-menu__button').onclick = function () {
      body.classList.toggle('-open-menu');
    };

    document.querySelector('.main-menu__close-button').onclick = closeMenu;
    document.querySelector('.main-menu__close-overlay').onclick = closeMenu;

    renderMenu();
  });

  function closeMenu() {
    body.classList.remove('-open-menu');
  }

  var isUnlocked = false;

  function isMenuUnlocked() {
    return isUnlocked;
  }

  function unlockMenu() {
    isUnlocked = true;
    renderMenu();
    return true;
  }

  function getMenuItemList() {
    return menuItemList;
  }

  function buildMenu(newMenuItemList, options) {
    options = options || {};
    menuItemList = newMenuItemList;
    totalPages = newMenuItemList.length;

    // make sure `numberings` has length 3
    numberings = [null, null, null];          
    const newNumberings = options.numberings || [];

    for (let i = 0, iMax = newNumberings.length; i < iMax; i++) {
      numberings[i] = newNumberings[i];
    }

    renderMenu();

    if (options.setNavigation) {
      const pageList = [];
      
      // build list of IDs from menu
      for (let i = 0, iMax = menuItemList.length; i < iMax; i++) {
        const id = (typeof menuItemList[i] === 'string')
          ? menuItemList[i]
          : menuItemList[i].id;

        if (id) {
          if (V.Pages[id].parent) {
            // if a child page, add parent to list, but only once
            if (pageList.length === 0) {
              pageList.push(V.Pages[id].parent);
            } else if (pageList[pageList.length - 1] !== V.Pages[id].parent) {
              pageList.push(V.Pages[id].parent);      
            }
          } else {
            // add page to list
            pageList.push(id);
          }
        }
      }

      V.Navigation.setOrder(pageList);
    }
  }

  /**
   * Function that renders the menu HTML using data from V.Menu
   * and V.Pages and inserts it into the DOM.
   */
  function renderMenu() {
    if (!menuItemList) {
      console.warn('No menu available to render.');

      return false;
    }
    
    let levelCount = [0, 0, 0];
    let unlocked = true;
    let output = '';
    let viewedPages = 0;
    const totalPages = menuItemList.length;
    
    for (let i = 0; i < totalPages; i++) {
      const item = (typeof menuItemList[i] === 'string') 
        ? {id: menuItemList[i]}
        : menuItemList[i];

      if (!item.hidden) {        
        let id = item.id;
        
        // find next page that is not hidden
        if (!id) {
          let j = i;

          while (!id && j < totalPages - 1) {
            j++;

            if (!menuItemList[j].hidden) {
              id = (typeof menuItemList[j] === 'string')
                ? menuItemList[j]
                : menuItemList[j].id;
            }
          }
        }

        viewedPages += V.SCORM.getViewed(id);
        const pageChildren = V.Pages[id].children || false;
        const level = item.level || 0;

        const title = item.title 
          || (id && V.Pages[id].title) 
          || console.warn(`Page #${id} is missing a title.`);

        /**
         * When we get to a page that has been viewed, if `unlocked` 
         * is still true and the menu isn't unlocked, set `unlocked`
         * to false.
         */
        if (unlocked && !V.SCORM.getViewed(id) && !isMenuUnlocked()) {
          unlocked = false;
        } 

        const isCurrentPage = (
          item.id && V.SCORM.getLocation() === item.id
          || (
            pageChildren
            && pageChildren.indexOf(V.SCORM.getLocation()) !== -1
          )
        );

        const isAboveCurrentPage = (!item.id && V.SCORM.getLocation() === id);

        let className = 'main-menu__item';
        className += !unlocked          ? ' main-menu__item--locked'         : '';
        className += level > 0          ? ` main-menu__item--level-${level}` : '';
        className += isCurrentPage      ? ` main-menu__item--current`        : '';
        className += isAboveCurrentPage ? ` main-menu__item--above-current`  : '';

        const onclick = (unlocked && !isCurrentPage && !isAboveCurrentPage)
          ? `onclick="V.Navigation.go('${id}');"`
          : '';

        // update `levelCount`
        if (level == 2) {
          levelCount[0] = 0;
          levelCount[1] = 0;
          levelCount[2]++;
        } else if (level == 1) {
          levelCount[0] = 0;
          levelCount[1]++;
        } else {
          levelCount[0]++;
        }

        let numbering = numberings[2 - level] || '';

        if (numbering) {
          numbering = numbering.replace('{2}', levelCount[2] || 1)
            .replace('{1}', levelCount[1] || 1)
            .replace('{0}', levelCount[0] || 1);
        }

        // append to output
        output += `<div class="${className}" ${onclick} tabindex="0"><span class="main-menu__numbering-${level}">${numbering}</span> <span "main-menu__text-level-${level}">${title}</span></div>`;

      }
    }

    menuList.innerHTML = output;


    // scroll to current page centered in menu
    var currentPage = document.querySelector('.main-menu__item--current');

    if (currentPage) {
      menuList.scrollTop = currentPage.offsetTop - currentPage.offsetHeight - menuList.offsetHeight/2;
    }

    // update progress bar
    menuProgress.style.width = `${viewedPages / totalPages * 100}%`;

    // .main-menu__page listeners
    var menuLinks = document.querySelectorAll('.main-menu__page, .main-menu__part-title, .main-menu__module-title');
    var keydownMenuLink;

    for (let i = 0, length = menuLinks.length; i < length; i++) {
      // create a closure for pageId
      (function menuLinkListeners() {
        var pageId = menuLinks[i].getAttribute('data-page-id');
        if (!pageId) {
          return false;
        }

        // click event
        menuLinks[i].addEventListener('click', followMenuLink.bind(null, pageId));

        // keydown event
        menuLinks[i].addEventListener('keydown', function keydownMenuLink(e) {
          console.log(e, pageId);
          if (e.keyCode == 13) {
            followMenuLink(pageId);
          }
        });
      })();
    }
  }

})(window.V, document);
