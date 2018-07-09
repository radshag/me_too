// ====================================
//
//   Timelines
//
// ====================================

;(function initTimelines(V) {
  // GSAP settings
  TweenLite.defaultOverwrite = 'auto';

  // Global object
  V.Timelines = {
    addTimeline: addTimeline,
    isActive: !!window.matchMedia('(min-width: 30em)').matches
  };

  // Reset Timelines, for initialization and window resize
  function resetTimelines() {
    // clear `currentTimeline`
    if (V.Navigation) {
      V.Navigation.currentTimeline = null;
    }

    // get all `V.Timelines` keys
    var keys = Object.keys(V.Timelines);

    for (var i = 0, iMax = keys.length; i < iMax; i++) {
      // check that this key represents a timeline
      if (V.Timelines[keys[i]].elementsSelector) {
        // clear inline styles from timelines
        TweenLite.set(V.Timelines[keys[i]].elementsSelector, {clearProps: 'all'});
        V.Timelines[keys[i]].needsRebuild = true;
      }
    }
  }

  resetTimelines();

  // Add `activateTimelines()` to window resize event
  var resetTimelinesDebounced = _.debounce(resetTimelines, 500);
  window.addEventListener('resize', resetTimelinesDebounced);

  /**
   * Takes a function that builds a timeline, and adds it to
   * the `V.Timeline` object as `V.Timeline[id]`. Also stores a
   * query selector as `V.Timeline[id].pagesSelector`, targeting
   * all pages that are part of the timeline, for example
   * `'#page_1, #page_2'`, and `V.Timeline[id].elementsSelector`,
   * targeting all elements that have tweens applied to them.
   *
   * @param  {string}   id - The timeline's ID.
   * @param  {string}   pagesSelector - A query selector string.
   * @param  {string}   elementsSelector - A query selector string.
   * @param  {Function} builder - Adds tweens to the timeline.
   *
   */
  function addTimeline(id, pagesSelector, elementsSelector, builder) {

    // init timeline
    var tl = new TimelineMax({paused: true});

    // add to global object
    V.Timelines[id] = tl;
    V.Timelines[id].elementsSelector = elementsSelector;
    V.Timelines[id].pagesSelector = pagesSelector;
    V.Timelines[id].needsRebuild = true;

    // tweens will be added to timeline on navigation (startNewTimeline)
    V.Timelines[id].build = function buildTimeline() {
      tl.clear();
      builder.apply(tl);
      V.Timelines[id].labelNames = getLabelNamesArray();
    };

    // get page IDs
    var pageIds = pagesSelector.replace(/, /g, '').split('#');

    // add timelineId property to each V.Pages[pageId]
    for (var i = 0, iMax = pageIds.length; i < iMax; i++) {
      if (pageIds[i]) {
        V.Pages[pageIds[i]].timelineId = id;
      }
    }

    function getLabelNamesArray() {
      // get array of label names
      var labelObjects = tl.getLabelsArray();
      var keys = Object.keys(labelObjects);
      var labelNames = [];

      for (var i = 0, iMax = keys.length; i < iMax; i++) {
        if (labelObjects[keys[i]].name) {
          labelNames.push(labelObjects[keys[i]].name);
        }
      }

      return labelNames;
    }
  }
})(window.V);
