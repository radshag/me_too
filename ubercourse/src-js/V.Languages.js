;(function initLanguages(V) {
  V.Languages = {
    init: initLanguageWidget,
    onSet: () => {}
  };

  // define empty functions if Localize.js failed
  !function(a){if(!a.Localize){a.Localize={};for(var e=["translate","untranslate","phrase","initialize","translatePage","setLanguage","getLanguage","detectLanguage","getAvailableLanguages","untranslatePage","bootstrap","prefetch","on","off"],t=0;t<e.length;t++)a.Localize[e[t]]=function(){}}}(window); 

  /**
   * Initializes the Localize.js widget, hides all languages except
   * for those passed in the `languages` array, and adds a listener 
   * for `Localize.setLanguage`.
   * 
   * @param  {array} languages - Langauges to show in the widget
   */
  function initLanguageWidget(languages) {
    Localize.on('setLanguage', function() {
      var currentLanguage = Localize.getLanguage() || 'en';

      if (currentLanguage !== 'en') {
        V.Audio.disable();
      } else {
        V.Audio.enable();
      }

      V.Languages.onSet(currentLanguage);
    });

    Localize.initialize({key: V.Project.config.localizeKey, rememberLanguage: true});
    var showLanguageRules = '';

    if (languages) {
      for (i=0; i < languages.length; i++) {
        showLanguageRules += `
          [onclick^="Localize.setLanguage('${languages[i]}')"] {display: block !important;}
        `;
      }

      const fragment = document.createElement('div');

      fragment.innerHTML = `
        <style>
          [onclick^="Localize.setLanguage"] {display: none !important;}
          ${showLanguageRules} 
        </style>
      `;
      
      document.head.appendChild(fragment.firstElementChild);
    }
  };
})(window.V);
