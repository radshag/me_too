;(function initReview(V) {
  V.Review = {
    isInternal,
    isLocal,
    isActive
  };  

  function isInternal () {
    return window.location.href.indexOf('://uk.onlinecompliance.org/SharedScormCourses2012/CustomScormCourses/Internal/') !== -1;
  }

  function isLocal() {
    return window.location.href.indexOf('://localhost:') !== -1;
  }

  function isActive () {
    return isInternal() || isLocal();
  }

  if (isActive()) {
    if (isInternal() && !V.SCORM.get('custom firm code')) {
      const defaultFirm = 'INTERNAL';

      const customFirm = (window.prompt(
        `Type a firm code, or press Enter to use "${defaultFirm}".`
      ) || defaultFirm).toUpperCase();

      V.SCORM.set('Var_firm_name', customFirm);
      V.SCORM.set('custom firm code', customFirm);
      console.log(`custom firm code: "${customFirm}"`);
    }

    document.addEventListener('DOMContentLoaded', function () {   
      const lastCommit = V.Project.config.lastCommit || 'Not available :/';
      const frag = document.createElement('div');

      const pageIds = [];
      const pages = document.querySelectorAll('.page, .child-page');
      
      for (let i = 0, iMax = pages.length; i < iMax; i++) {
        pageIds.push(pages[i].id);
      }

      menuHTML = pageIds.map(id => `
        <span 
          onclick="V.Navigation.go('${id}');V.Lightboxes.close();"
          style="line-height:24px;border:2px solid #fff; font-size: 0.8em; border-width: 3px 0px 2px; background:rgba(0,0,0,0.06); cursor:pointer; padding:2px 8px; margin: 3px; display: inline-block; vertical-align: bottom; border-bottom-color:rgba(0,0,0,0.4); ${
            V.Pages[id].parent ? 'opacity: 0.5;' : '' } " 
        >
          ${ V.Pages[id].title || ''} <span style="opacity:0.5;font-family:monospace;">(${id})</span>
        </span>
      `.trim()).join(' ');

      frag.innerHTML = `
        <div class="lightbox -has-close-button" id="lightbox-review-panel">
          <div class="lightbox__overlay"></div>
          <div class="lightbox__box" style="padding: 0 1em">
            <div class="lightbox__close-button" style="display:none;">Close</div>
            <div class="lightbox__content" style="max-height: 70vh;margin: 1em 0;">

              <h2 style="margin-top:1em;text-align:center;">Review Panel</h2>

              <h3>Latest commit</h3>
              <pre style="max-height:15em;font-size:0.8em;padding:0.5em;overflow-y:auto;background:rgba(0,0,0,0.05)">${lastCommit.replace(/</g,'&lt;').trim()}</pre>


              <h3>Localhost link</h3>
              <p>This link will open the course on localhost with your current location and data:
              <pre style="max-height:15em;font-size:0.8em;padding:0.5em;overflow-y:auto;background:rgba(0,0,0,0.05)"><a href="${V.SCORM.log()}" target="_blank" id="review-panel-localhost-link">${V.SCORM.log()}</a></pre>

              <h3>Go somewhere</h3>
              <form onsubmit="V.Navigation.go(this.querySelector('input').value);V.Lightboxes.close();return false;">
                <p><input style="width:100%;padding:0.5em;" placeholder="Type a page ID and press Enter"/></p>
              </form>
              <p>
                ${menuHTML}
              </p>

              ${ isInternal() ? `              
              <h3>Reset the course</h3>
              <p>Click this button to reset everything you've done since enrolling in the course: your custom firm code, suspend data, location, score, and completion status. This button also refreshes the window.</p>
              <p style="text-align:center;">
                <button style="padding:1em 1.5em;" onclick="V.Review.reset()">Reset</button>
              </p>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      document.querySelector('.lightboxes').appendChild(frag.firstElementChild);

      V.Review.openPanel = function openPanel() {
        const localhostLink = document.getElementById('review-panel-localhost-link');
        localhostLink.href = V.SCORM.log();
        localhostLink.textContent = V.SCORM.log();
        V.Lightboxes.open('lightbox-review-panel');
      };

      document.addEventListener('keydown', function reviewKeyDown(event) {
        if (isUserTyping(event)) {
          return false;
        }

        // `P` opens panel
        if (event.keyCode == 80) {
          V.Review.openPanel();
        }
      });

      V.Review.reset = function resetCourse() {
        if (isInternal()) {
          pipwerks.SCORM.set('cmi.suspend_data', ''); 
          V.SCORM.setScore(0); 
          V.SCORM.setLocation(''); 
          V.SCORM.setLessonStatus('incomplete'); 
          window.parent.location.reload();
        } else {
          console.log('Not internal.');

          return false;
        }
      }
    });
  }

  function isUserTyping(event) {
    return (
      event.type.indexOf('key') !== 1 
      && ['input','textarea'].indexOf(event.target.tagName.toLowerCase()) !== -1
    );
  }
})(window.V);
