// ====================================
//   Lightboxes
// ====================================

;(function initLightboxes(V) {
  const defaults = {
    close: function () {
      closeOpenLightbox();
    },

    cancel: function () {
      closeOpenLightbox();
    },

    next: function () {
      closeOpenLightbox();
      V.Navigation.next();
    }
  };

  V.Lightboxes = {
    open: openLightbox,
    close: defaults.close,
    next: defaults.next,
    cancel: defaults.cancel
  };

  let closeOpenLightbox = noOpenLightboxes;  

  function openLightbox(id, options) {
    const lightbox = document.getElementById(id);
    options = options || {};
    closeOpenLightbox =  closeThisLightbox;

    // set all callbacks
    ['close', 'next', 'cancel'].forEach(function (fn) {
      V.Lightboxes[fn]  = (typeof options[fn]  === 'function') 
        ? function () {
            options[fn]();  
            defaults[fn]();
          }  
        : defaults[fn];
    })

    // validate its existence
    if (!lightbox) {
      console.error('No lightbox exists with id "' + id + '".');
      return false;
    }
    
    var audio = lightbox.getAttribute('data-audio');
 
    var lightboxBox = findChild('.lightbox__box');
    var lightboxOverlay = findChild('.lightbox__overlay');

    // add onclick to close button
    findChild('.lightbox__close-button').onclick = V.Lightboxes.close;

    // is this a view-once lightbox?
    if (lightbox.getAttribute('data-is-shown-once')) {
      if (V.SCORM.getViewed(id)) {
        // already viewd, abort
        return false;
      } else {
        // save view to SCORM
        V.SCORM.setViewed(id);
      }
    }

    // lock navigation
    V.Navigation.lock();

    // Hide peripherals
    V.Navigation.closePeripherals();

    // Stop audio
    V.Audio.stop();

    // if there is audio, play it
    if (audio) {
      V.Audio.play(audio);
    }


    // CSS states
    document.body.classList.add('-is-overlaid');

    // Open the lightbox
    TweenLite.fromTo(
      lightboxOverlay,
      0.4,
      {
        autoAlpha: 0
      },
      {
        autoAlpha: 1,
        ease: Power0.easeNone
      }
    );

    // Open the lightbox
    TweenLite.fromTo(
      lightbox,
      0.2,
      {
        autoAlpha: 0
      },
      {
        autoAlpha: 1,
        display: 'flex',
        overwrite: 'all',
        ease: Power0.easeNone
      }
    );

    TweenLite.fromTo(
      lightboxBox,
      0.6,
      {
        autoAlpha: 1,
        y: '20%'
      },
      {
        autoAlpha: 1,
        y: '0%',
        display: 'block',
        overwrite: 'all',
        ease: Power2.easeOut
      }
    );

    // clickable overlay
    if (_.hasClass(lightbox, '-has-close-button')) {
      addCloseOnClick('.lightbox__overlay');
    }

    // keydown event listener
    document.addEventListener('keydown', lightboxKeydown);

    // keydown event
    function lightboxKeydown(event) {
      // enter
      if (event.keyCode == 13) {
        clickHighestPriorityButton();
      } 

      // spacebar
      if (event.keyCode == 32) {
        // if typing in an input, cancel 
        if (_.isUserTyping(event)) {
          return false;
        }
        
        clickHighestPriorityButton();

        // prevent default so spacebar won't scroll the window
        event.stopPropagation();
        event.preventDefault();
      }

      // escape key, but only if there's a close button
      if (
        event.keyCode == 27
        && _.hasClass(lightbox, '-has-close-button')
      ) {
        closeThisLightbox();
      }
    }

    function clickHighestPriorityButton() {
      if (findChild('.lightbox__button--next')) {
        findChild('.lightbox__button--next').click();
      } else if (findChild('.lightbox__button--close')) {
        findChild('.lightbox__button--close').click();
      } else if (findChild('.lightbox__button')) {
        findChild('.lightbox__button').click();
      }
    }

    // close lightbox
    function closeThisLightbox() {
      V.Navigation.unlock();

      if (audio) {
        V.Audio.stop(2);
      }

      // remove styles
      document.body.classList.remove('-is-overlaid');

      // close the lightbox
      TweenLite.to(
        lightbox,
        0.2,
        {
          autoAlpha: 0,
          display: 'none',
          overwrite: 'all',
        }
      );

      // remove listener
      document.removeEventListener('keydown', lightboxKeydown);

      // clear close function
      closeOpenLightbox = noOpenLightboxes;
    }

    function findChild(selector) {
      return lightbox.querySelector(selector);
    }

    function addCloseOnClick(selector) {
      var el = lightbox.querySelector(selector);

      if (el) {
        el.addEventListener('click', closeThisLightbox);
      }
    }

    function removeCloseOnClick(selector) {
      var el = lightbox.querySelector(selector);

      if (el) {
        el.removeEventListener('click', closeThisLightbox);
      }
    }
  }

  function noOpenLightboxes() {
    console.warn('No open lightboxes.');
  }
})(window.V);
