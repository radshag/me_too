/**
 * Tests every `.annotation` to see if its `.annotation__note`
 * will collide with right edge of window. Adds class
 * `-near-right-edge` to the ones that do and removes it
 * from the ones that don't.
 *
 */

;(function initAnnotations() {
  init();
  window.Annotations = {init: init};

  /**
   * For each `.annotation` in the document (or in the element 
   * `root` if given), calls `addAnnotationClass` and adds a 
   * `mouseenter` listener to call it again.
   * 
   * @param  {Element} root - Ancestor of the annotations
   */
  function init(root) {
    root = root || document;

    var spans = root.getElementsByClassName('annotation');

    for (var i = 0, len = spans.length; i < len; i++) {
      // add classes now
      addAnnotationClass.call(spans[i]);

      // add classes on mouseenter
      spans[i].onmouseenter = addAnnotationClass;
    }
  }

  /**
   * Detects if an annotation is close to the right edge or
   * has a line break, and applies the appropriate class.
   */
  function addAnnotationClass() {
    var span = this;
    var wiw = window.innerWidth;
    var rect = span.getBoundingClientRect();
    var body = span.getElementsByClassName('annotation__body')[0];
    var asterisk = span.getElementsByClassName('annotation__asterisk')[0];

    if (asterisk.offsetHeight * 1.5 < body.offsetHeight) {
      span.classList.add('-has-line-break');
    } else {
      span.classList.remove('-has-line-break');
    }

    if (wiw - rect.right < rect.width) {
      span.classList.add('-near-right-edge');
    } else {
      span.classList.remove('-near-right-edge');
    }
  }
})();
