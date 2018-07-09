;(function (w) {
  w.Ranges = {
    init: initRanges, 
    instances: {},
    disable: disableRange
  };
  
  initRanges();

  function disableRange(id) {
    if (w.Ranges.instances[id]) {
      w.Ranges.instances[id].disable();
    } else {
      console.error(`Ranges.instances.${id} does not exist.`)
    }
  }

  function initRanges(parent) {
    parent = parent || document;
    var ranges = parent.querySelectorAll('.range');

    for (var i = 0, iMax = ranges.length; i < iMax; i++) {
      initRange.call(ranges[i]); 
    }

    function initRange() {
      var range = this;
      var thumb = range.querySelector('.range__thumb');
      var input = range.querySelector('.range__input');
      var min   = parseFloat(input.getAttribute('min'));
      var max   = parseFloat(input.getAttribute('max'));
      var step  = parseFloat(input.getAttribute('step'));
      var value = parseFloat(input.getAttribute('value'));
      var thumbWidth = thumb.getBoundingClientRect().width;
      var trackWidth = thumb.parentElement.getBoundingClientRect().width - thumbWidth * 2;
      var stepWidth = trackWidth * step / (max - min);
      var stepElements = range.querySelectorAll('.range__step');
      var labelElements = range.querySelectorAll('.range__label');
      var displayValue = range.querySelector('.range__thumb-value');

       
      w.addEventListener('resize', _.throttle(function () {
        snapToIndex(valueToIndex(value));
      }, 100));

      function getStepWidth() {
        return stepElements[1].getBoundingClientRect().width;   
      }

      var rangeDraggable = new Draggable(thumb, {
        type:"x", 
        bounds: thumb.parentNode,
        edgeResistance: 1,
        cursor: 'inherit',
        onDragEnd: function () {
          snapToIndex(Math.round(this.x / getStepWidth()));
        },
      });
      
      if (range.id) {
        w.Ranges.instances[range.id] = rangeDraggable;      
      }

      for (var j = 0, jMax = stepElements.length; j < jMax; j++) {
        // TODO: convert to event delegation
        stepElements[j].addEventListener('click',     snapToIndex.bind(null, j));
        stepElements[j].addEventListener('mousedown', snapToIndex.bind(null, j));
        stepElements[j].addEventListener('mouseup',   snapToIndex.bind(null, j));
      }
      
      for (j = 0, jMax = labelElements.length; j < jMax; j++) {
        // TODO: convert to event delegation
        labelElements[j].addEventListener('click', 
          snapToIndex.bind(null, valueToIndex(parseFloat(this.getAttribute('data-label-value'))))
        );
      }
      
      snapToIndex(valueToIndex(value));
      
      function snapToIndex(i) {
        if (!rangeDraggable.enabled()) {
          return false;
        }

        if (i < 0) {
          i = 0;
        } else if (i > valueToIndex(max)) {
          i = valueToIndex(max);
        }
        
        TweenLite.to(thumb, 0.2, {x: i * getStepWidth()});
        value = indexToValue(i);      
        input.value = value;
      }
      
      function valueToIndex(v) {
        var i = (v - min) / step;
        
        // remove small fractions caused by float precision
        return parseFloat(i.toString().split('0000')[0]);
      }
      
      function indexToValue(i) {
        if (i < 0) {
          i = 0;
        } else if (i > valueToIndex(max)) {
          i = valueToIndex(max);
        }
        
        var v = step * i + min;
        
        // remove small fractions caused by float precision
        return parseFloat(v.toString().split('0000')[0]);
      }
      
    }
  }
})(window);
