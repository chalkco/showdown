;/*! showdown 13-05-2016 */
(function(){
/**
 * Created by Tivie on 13-07-2015.
 */

function getDefaultOpts(simple) {
  'use strict';

  var defaultOptions = {
    omitExtraWLInCodeBlocks: {
      default: false,
      describe: 'Omit the default extra whiteline added to code blocks',
      type: 'boolean'
    },
    noHeaderId: {
      default: false,
      describe: 'Turn on/off generated header id',
      type: 'boolean'
    },
    prefixHeaderId: {
      default: false,
      describe: 'Specify a prefix to generated header ids',
      type: 'string'
    },
    headerLevelStart: {
      default: false,
      describe: 'The header blocks level start',
      type: 'integer'
    },
    parseImgDimensions: {
      default: false,
      describe: 'Turn on/off image dimension parsing',
      type: 'boolean'
    },
    simplifiedAutoLink: {
      default: false,
      describe: 'Turn on/off GFM autolink style',
      type: 'boolean'
    },
    literalMidWordUnderscores: {
      default: false,
      describe: 'Parse midword underscores as literal underscores',
      type: 'boolean'
    },
    strikethrough: {
      default: false,
      describe: 'Turn on/off strikethrough support',
      type: 'boolean'
    },
    tables: {
      default: false,
      describe: 'Turn on/off tables support',
      type: 'boolean'
    },
    tablesHeaderId: {
      default: false,
      describe: 'Add an id to table headers',
      type: 'boolean'
    },
    ghCodeBlocks: {
      default: true,
      describe: 'Turn on/off GFM fenced code blocks support',
      type: 'boolean'
    },
    tasklists: {
      default: false,
      describe: 'Turn on/off GFM tasklist support',
      type: 'boolean'
    },
    smoothLivePreview: {
      default: false,
      describe: 'Prevents weird effects in live previews due to incomplete input',
      type: 'boolean'
    }
  };
  if (simple === false) {
    return JSON.parse(JSON.stringify(defaultOptions));
  }
  var ret = {};
  for (var opt in defaultOptions) {
    if (defaultOptions.hasOwnProperty(opt)) {
      ret[opt] = defaultOptions[opt].default;
    }
  }
  return ret;
}

/**
 * Created by Tivie on 06-01-2015.
 */

// Private properties
var showdown = {},
    parsers = {},
    extensions = {},
    globalOptions = getDefaultOpts(true),
    flavor = {
      github: {
        omitExtraWLInCodeBlocks:   true,
        prefixHeaderId:            'user-content-',
        simplifiedAutoLink:        true,
        literalMidWordUnderscores: true,
        strikethrough:             true,
        tables:                    true,
        tablesHeaderId:            true,
        ghCodeBlocks:              true,
        tasklists:                 true
      },
      vanilla: getDefaultOpts(true)
    };

/**
 * helper namespace
 * @type {{}}
 */
showdown.helper = {};

/**
 * TODO LEGACY SUPPORT CODE
 * @type {{}}
 */
showdown.extensions = {};

/**
 * Set a global option
 * @static
 * @param {string} key
 * @param {*} value
 * @returns {showdown}
 */
showdown.setOption = function (key, value) {
  'use strict';
  globalOptions[key] = value;
  return this;
};

/**
 * Get a global option
 * @static
 * @param {string} key
 * @returns {*}
 */
showdown.getOption = function (key) {
  'use strict';
  return globalOptions[key];
};

/**
 * Get the global options
 * @static
 * @returns {{}}
 */
showdown.getOptions = function () {
  'use strict';
  return globalOptions;
};

/**
 * Reset global options to the default values
 * @static
 */
showdown.resetOptions = function () {
  'use strict';
  globalOptions = getDefaultOpts(true);
};

/**
 * Set the flavor showdown should use as default
 * @param {string} name
 */
showdown.setFlavor = function (name) {
  'use strict';
  if (flavor.hasOwnProperty(name)) {
    var preset = flavor[name];
    for (var option in preset) {
      if (preset.hasOwnProperty(option)) {
        globalOptions[option] = preset[option];
      }
    }
  }
};

/**
 * Get the default options
 * @static
 * @param {boolean} [simple=true]
 * @returns {{}}
 */
showdown.getDefaultOptions = function (simple) {
  'use strict';
  return getDefaultOpts(simple);
};

/**
 * Get or set a subParser
 *
 * subParser(name)       - Get a registered subParser
 * subParser(name, func) - Register a subParser
 * @static
 * @param {string} name
 * @param {function} [func]
 * @returns {*}
 */
showdown.subParser = function (name, func) {
  'use strict';
  if (showdown.helper.isString(name)) {
    if (typeof func !== 'undefined') {
      parsers[name] = func;
    } else {
      if (parsers.hasOwnProperty(name)) {
        return parsers[name];
      } else {
        throw Error('SubParser named ' + name + ' not registered!');
      }
    }
  }
};

/**
 * Gets or registers an extension
 * @static
 * @param {string} name
 * @param {object|function=} ext
 * @returns {*}
 */
showdown.extension = function (name, ext) {
  'use strict';

  if (!showdown.helper.isString(name)) {
    throw Error('Extension \'name\' must be a string');
  }

  name = showdown.helper.stdExtName(name);

  // Getter
  if (showdown.helper.isUndefined(ext)) {
    if (!extensions.hasOwnProperty(name)) {
      throw Error('Extension named ' + name + ' is not registered!');
    }
    return extensions[name];

    // Setter
  } else {
    // Expand extension if it's wrapped in a function
    if (typeof ext === 'function') {
      ext = ext();
    }

    // Ensure extension is an array
    if (!showdown.helper.isArray(ext)) {
      ext = [ext];
    }

    var validExtension = validate(ext, name);

    if (validExtension.valid) {
      extensions[name] = ext;
    } else {
      throw Error(validExtension.error);
    }
  }
};

/**
 * Gets all extensions registered
 * @returns {{}}
 */
showdown.getAllExtensions = function () {
  'use strict';
  return extensions;
};

/**
 * Remove an extension
 * @param {string} name
 */
showdown.removeExtension = function (name) {
  'use strict';
  delete extensions[name];
};

/**
 * Removes all extensions
 */
showdown.resetExtensions = function () {
  'use strict';
  extensions = {};
};

/**
 * Validate extension
 * @param {array} extension
 * @param {string} name
 * @returns {{valid: boolean, error: string}}
 */
function validate(extension, name) {
  'use strict';

  var errMsg = (name) ? 'Error in ' + name + ' extension->' : 'Error in unnamed extension',
    ret = {
      valid: true,
      error: ''
    };

  if (!showdown.helper.isArray(extension)) {
    extension = [extension];
  }

  for (var i = 0; i < extension.length; ++i) {
    var baseMsg = errMsg + ' sub-extension ' + i + ': ',
        ext = extension[i];
    if (typeof ext !== 'object') {
      ret.valid = false;
      ret.error = baseMsg + 'must be an object, but ' + typeof ext + ' given';
      return ret;
    }

    if (!showdown.helper.isString(ext.type)) {
      ret.valid = false;
      ret.error = baseMsg + 'property "type" must be a string, but ' + typeof ext.type + ' given';
      return ret;
    }

    var type = ext.type = ext.type.toLowerCase();

    // normalize extension type
    if (type === 'language') {
      type = ext.type = 'lang';
    }

    if (type === 'html') {
      type = ext.type = 'output';
    }

    if (type !== 'lang' && type !== 'output' && type !== 'listener') {
      ret.valid = false;
      ret.error = baseMsg + 'type ' + type + ' is not recognized. Valid values: "lang/language", "output/html" or "listener"';
      return ret;
    }

    if (type === 'listener') {
      if (showdown.helper.isUndefined(ext.listeners)) {
        ret.valid = false;
        ret.error = baseMsg + '. Extensions of type "listener" must have a property called "listeners"';
        return ret;
      }
    } else {
      if (showdown.helper.isUndefined(ext.filter) && showdown.helper.isUndefined(ext.regex)) {
        ret.valid = false;
        ret.error = baseMsg + type + ' extensions must define either a "regex" property or a "filter" method';
        return ret;
      }
    }

    if (ext.listeners) {
      if (typeof ext.listeners !== 'object') {
        ret.valid = false;
        ret.error = baseMsg + '"listeners" property must be an object but ' + typeof ext.listeners + ' given';
        return ret;
      }
      for (var ln in ext.listeners) {
        if (ext.listeners.hasOwnProperty(ln)) {
          if (typeof ext.listeners[ln] !== 'function') {
            ret.valid = false;
            ret.error = baseMsg + '"listeners" property must be an hash of [event name]: [callback]. listeners.' + ln +
              ' must be a function but ' + typeof ext.listeners[ln] + ' given';
            return ret;
          }
        }
      }
    }

    if (ext.filter) {
      if (typeof ext.filter !== 'function') {
        ret.valid = false;
        ret.error = baseMsg + '"filter" must be a function, but ' + typeof ext.filter + ' given';
        return ret;
      }
    } else if (ext.regex) {
      if (showdown.helper.isString(ext.regex)) {
        ext.regex = new RegExp(ext.regex, 'g');
      }
      if (!ext.regex instanceof RegExp) {
        ret.valid = false;
        ret.error = baseMsg + '"regex" property must either be a string or a RegExp object, but ' + typeof ext.regex + ' given';
        return ret;
      }
      if (showdown.helper.isUndefined(ext.replace)) {
        ret.valid = false;
        ret.error = baseMsg + '"regex" extensions must implement a replace string or function';
        return ret;
      }
    }
  }
  return ret;
}

/**
 * Validate extension
 * @param {object} ext
 * @returns {boolean}
 */
showdown.validateExtension = function (ext) {
  'use strict';

  var validateExtension = validate(ext, null);
  if (!validateExtension.valid) {
    console.warn(validateExtension.error);
    return false;
  }
  return true;
};

/**
 * showdownjs helper functions
 */

if (!showdown.hasOwnProperty('helper')) {
  showdown.helper = {};
}

/**
 * Check if var is string
 * @static
 * @param {string} a
 * @returns {boolean}
 */
showdown.helper.isString = function isString(a) {
  'use strict';
  return (typeof a === 'string' || a instanceof String);
};

/**
 * Check if var is a function
 * @static
 * @param {string} a
 * @returns {boolean}
 */
showdown.helper.isFunction = function isFunction(a) {
  'use strict';
  var getType = {};
  return a && getType.toString.call(a) === '[object Function]';
};

/**
 * ForEach helper function
 * @static
 * @param {*} obj
 * @param {function} callback
 */
showdown.helper.forEach = function forEach(obj, callback) {
  'use strict';
  if (typeof obj.forEach === 'function') {
    obj.forEach(callback);
  } else {
    for (var i = 0; i < obj.length; i++) {
      callback(obj[i], i, obj);
    }
  }
};

/**
 * isArray helper function
 * @static
 * @param {*} a
 * @returns {boolean}
 */
showdown.helper.isArray = function isArray(a) {
  'use strict';
  return a.constructor === Array;
};

/**
 * Check if value is undefined
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
 */
showdown.helper.isUndefined = function isUndefined(value) {
  'use strict';
  return typeof value === 'undefined';
};

/**
 * Standardidize extension name
 * @static
 * @param {string} s extension name
 * @returns {string}
 */
showdown.helper.stdExtName = function (s) {
  'use strict';
  return s.replace(/[_-]||\s/g, '').toLowerCase();
};

function escapeCharactersCallback(wholeMatch, m1) {
  'use strict';
  var charCodeToEscape = m1.charCodeAt(0);
  return '~E' + charCodeToEscape + 'E';
}

/**
 * Callback used to escape characters when passing through String.replace
 * @static
 * @param {string} wholeMatch
 * @param {string} m1
 * @returns {string}
 */
showdown.helper.escapeCharactersCallback = escapeCharactersCallback;

/**
 * Escape characters in a string
 * @static
 * @param {string} text
 * @param {string} charsToEscape
 * @param {boolean} afterBackslash
 * @returns {XML|string|void|*}
 */
showdown.helper.escapeCharacters = function escapeCharacters(text, charsToEscape, afterBackslash) {
  'use strict';
  // First we have to escape the escape characters so that
  // we can build a character class out of them
  var regexString = '([' + charsToEscape.replace(/([\[\]\\])/g, '\\$1') + '])';

  if (afterBackslash) {
    regexString = '\\\\' + regexString;
  }

  var regex = new RegExp(regexString, 'g');
  text = text.replace(regex, escapeCharactersCallback);

  return text;
};

var rgxFindMatchPos = function (str, left, right, flags) {
  'use strict';
  var f = flags || '',
    g = f.indexOf('g') > -1,
    x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, '')),
    l = new RegExp(left, f.replace(/g/g, '')),
    pos = [],
    t, s, m, start, end;

  do {
    t = 0;
    while ((m = x.exec(str))) {
      if (l.test(m[0])) {
        if (!(t++)) {
          s = x.lastIndex;
          start = s - m[0].length;
        }
      } else if (t) {
        if (!--t) {
          end = m.index + m[0].length;
          var obj = {
            left: {start: start, end: s},
            match: {start: s, end: m.index},
            right: {start: m.index, end: end},
            wholeMatch: {start: start, end: end}
          };
          pos.push(obj);
          if (!g) {
            return pos;
          }
        }
      }
    }
  } while (t && (x.lastIndex = s));

  return pos;
};

/**
 * matchRecursiveRegExp
 *
 * (c) 2007 Steven Levithan <stevenlevithan.com>
 * MIT License
 *
 * Accepts a string to search, a left and right format delimiter
 * as regex patterns, and optional regex flags. Returns an array
 * of matches, allowing nested instances of left/right delimiters.
 * Use the "g" flag to return all matches, otherwise only the
 * first is returned. Be careful to ensure that the left and
 * right format delimiters produce mutually exclusive matches.
 * Backreferences are not supported within the right delimiter
 * due to how it is internally combined with the left delimiter.
 * When matching strings whose format delimiters are unbalanced
 * to the left or right, the output is intentionally as a
 * conventional regex library with recursion support would
 * produce, e.g. "<<x>" and "<x>>" both produce ["x"] when using
 * "<" and ">" as the delimiters (both strings contain a single,
 * balanced instance of "<x>").
 *
 * examples:
 * matchRecursiveRegExp("test", "\\(", "\\)")
 * returns: []
 * matchRecursiveRegExp("<t<<e>><s>>t<>", "<", ">", "g")
 * returns: ["t<<e>><s>", ""]
 * matchRecursiveRegExp("<div id=\"x\">test</div>", "<div\\b[^>]*>", "</div>", "gi")
 * returns: ["test"]
 */
showdown.helper.matchRecursiveRegExp = function (str, left, right, flags) {
  'use strict';

  var matchPos = rgxFindMatchPos (str, left, right, flags),
    results = [];

  for (var i = 0; i < matchPos.length; ++i) {
    results.push([
      str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
      str.slice(matchPos[i].match.start, matchPos[i].match.end),
      str.slice(matchPos[i].left.start, matchPos[i].left.end),
      str.slice(matchPos[i].right.start, matchPos[i].right.end)
    ]);
  }
  return results;
};

/**
 *
 * @param {string} str
 * @param {string|function} replacement
 * @param {string} left
 * @param {string} right
 * @param {string} flags
 * @returns {string}
 */
showdown.helper.replaceRecursiveRegExp = function (str, replacement, left, right, flags) {
  'use strict';

  if (!showdown.helper.isFunction(replacement)) {
    var repStr = replacement;
    replacement = function () {
      return repStr;
    };
  }

  var matchPos = rgxFindMatchPos(str, left, right, flags),
      finalStr = str,
      lng = matchPos.length;

  if (lng > 0) {
    var bits = [];
    if (matchPos[0].wholeMatch.start !== 0) {
      bits.push(str.slice(0, matchPos[0].wholeMatch.start));
    }
    for (var i = 0; i < lng; ++i) {
      bits.push(
        replacement(
          str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
          str.slice(matchPos[i].match.start, matchPos[i].match.end),
          str.slice(matchPos[i].left.start, matchPos[i].left.end),
          str.slice(matchPos[i].right.start, matchPos[i].right.end)
        )
      );
      if (i < lng - 1) {
        bits.push(str.slice(matchPos[i].wholeMatch.end, matchPos[i + 1].wholeMatch.start));
      }
    }
    if (matchPos[lng - 1].wholeMatch.end < str.length) {
      bits.push(str.slice(matchPos[lng - 1].wholeMatch.end));
    }
    finalStr = bits.join('');
  }
  return finalStr;
};

/**
 * POLYFILLS
 */
if (showdown.helper.isUndefined(console)) {
  console = {
    warn: function (msg) {
      'use strict';
      alert(msg);
    },
    log: function (msg) {
      'use strict';
      alert(msg);
    },
    error: function (msg) {
      'use strict';
      throw msg;
    }
  };
}

/**
 * Created by Estevao on 31-05-2015.
 */

/**
 * Showdown Converter class
 * @class
 * @param {object} [converterOptions]
 * @returns {Converter}
 */
showdown.Converter = function (converterOptions) {
  'use strict';

  var
      /**
       * Options used by this converter
       * @private
       * @type {{}}
       */
      options = {},

      /**
       * Language extensions used by this converter
       * @private
       * @type {Array}
       */
      langExtensions = [],

      /**
       * Output modifiers extensions used by this converter
       * @private
       * @type {Array}
       */
      outputModifiers = [],

      /**
       * Event listeners
       * @private
       * @type {{}}
       */
      listeners = {};

  _constructor();

  /**
   * Converter constructor
   * @private
   */
  function _constructor() {
    converterOptions = converterOptions || {};

    for (var gOpt in globalOptions) {
      if (globalOptions.hasOwnProperty(gOpt)) {
        options[gOpt] = globalOptions[gOpt];
      }
    }

    // Merge options
    if (typeof converterOptions === 'object') {
      for (var opt in converterOptions) {
        if (converterOptions.hasOwnProperty(opt)) {
          options[opt] = converterOptions[opt];
        }
      }
    } else {
      throw Error('Converter expects the passed parameter to be an object, but ' + typeof converterOptions +
      ' was passed instead.');
    }

    if (options.extensions) {
      showdown.helper.forEach(options.extensions, _parseExtension);
    }
  }

  /**
   * Parse extension
   * @param {*} ext
   * @param {string} [name='']
   * @private
   */
  function _parseExtension(ext, name) {

    name = name || null;
    // If it's a string, the extension was previously loaded
    if (showdown.helper.isString(ext)) {
      ext = showdown.helper.stdExtName(ext);
      name = ext;

      // LEGACY_SUPPORT CODE
      if (showdown.extensions[ext]) {
        console.warn('DEPRECATION WARNING: ' + ext + ' is an old extension that uses a deprecated loading method.' +
          'Please inform the developer that the extension should be updated!');
        legacyExtensionLoading(showdown.extensions[ext], ext);
        return;
      // END LEGACY SUPPORT CODE

      } else if (!showdown.helper.isUndefined(extensions[ext])) {
        ext = extensions[ext];

      } else {
        throw Error('Extension "' + ext + '" could not be loaded. It was either not found or is not a valid extension.');
      }
    }

    if (typeof ext === 'function') {
      ext = ext();
    }

    if (!showdown.helper.isArray(ext)) {
      ext = [ext];
    }

    var validExt = validate(ext, name);
    if (!validExt.valid) {
      throw Error(validExt.error);
    }

    for (var i = 0; i < ext.length; ++i) {
      switch (ext[i].type) {

        case 'lang':
          langExtensions.push(ext[i]);
          break;

        case 'output':
          outputModifiers.push(ext[i]);
          break;
      }
      if (ext[i].hasOwnProperty(listeners)) {
        for (var ln in ext[i].listeners) {
          if (ext[i].listeners.hasOwnProperty(ln)) {
            listen(ln, ext[i].listeners[ln]);
          }
        }
      }
    }

  }

  /**
   * LEGACY_SUPPORT
   * @param {*} ext
   * @param {string} name
   */
  function legacyExtensionLoading(ext, name) {
    if (typeof ext === 'function') {
      ext = ext(new showdown.Converter());
    }
    if (!showdown.helper.isArray(ext)) {
      ext = [ext];
    }
    var valid = validate(ext, name);

    if (!valid.valid) {
      throw Error(valid.error);
    }

    for (var i = 0; i < ext.length; ++i) {
      switch (ext[i].type) {
        case 'lang':
          langExtensions.push(ext[i]);
          break;
        case 'output':
          outputModifiers.push(ext[i]);
          break;
        default:// should never reach here
          throw Error('Extension loader error: Type unrecognized!!!');
      }
    }
  }

  /**
   * Listen to an event
   * @param {string} name
   * @param {function} callback
   */
  function listen(name, callback) {
    if (!showdown.helper.isString(name)) {
      throw Error('Invalid argument in converter.listen() method: name must be a string, but ' + typeof name + ' given');
    }

    if (typeof callback !== 'function') {
      throw Error('Invalid argument in converter.listen() method: callback must be a function, but ' + typeof callback + ' given');
    }

    if (!listeners.hasOwnProperty(name)) {
      listeners[name] = [];
    }
    listeners[name].push(callback);
  }

  /**
   * Dispatch an event
   * @private
   * @param {string} evtName Event name
   * @param {string} text Text
   * @param {{}} options Converter Options
   * @param {{}} globals
   * @returns {string}
   */
  this._dispatch = function dispatch (evtName, text, options, globals) {
    if (listeners.hasOwnProperty(evtName)) {
      for (var ei = 0; ei < listeners[evtName].length; ++ei) {
        var nText = listeners[evtName][ei](evtName, text, this, options, globals);
        if (nText && typeof nText !== 'undefined') {
          text = nText;
        }
      }
    }
    return text;
  };

  /**
   * Listen to an event
   * @param {string} name
   * @param {function} callback
   * @returns {showdown.Converter}
   */
  this.listen = function (name, callback) {
    listen(name, callback);
    return this;
  };

  /**
   * Converts a markdown string into HTML
   * @param {string} text
   * @returns {*}
   */
  this.makeHtml = function (text) {
    //check if text is not falsy
    if (!text) {
      return text;
    }

    var globals = {
      gHtmlBlocks:     [],
      gHtmlMdBlocks:   [],
      gHtmlSpans:      [],
      gUrls:           {},
      gTitles:         {},
      gDimensions:     {},
      gListLevel:      0,
      hashLinkCounts:  {},
      langExtensions:  langExtensions,
      outputModifiers: outputModifiers,
      converter:       this,
      ghCodeBlocks:    []
    };

    // attacklab: Replace ~ with ~T
    // This lets us use tilde as an escape char to avoid md5 hashes
    // The choice of character is arbitrary; anything that isn't
    // magic in Markdown will work.
    text = text.replace(/~/g, '~T');

    // attacklab: Replace $ with ~D
    // RegExp interprets $ as a special character
    // when it's in a replacement string
    text = text.replace(/\$/g, '~D');

    // Standardize line endings
    text = text.replace(/\r\n/g, '\n'); // DOS to Unix
    text = text.replace(/\r/g, '\n'); // Mac to Unix

    // Make sure text begins and ends with a couple of newlines:
    text = '\n\n' + text + '\n\n';

    // detab
    text = showdown.subParser('detab')(text, options, globals);

    // stripBlankLines
    text = showdown.subParser('stripBlankLines')(text, options, globals);

    //run languageExtensions
    showdown.helper.forEach(langExtensions, function (ext) {
      text = showdown.subParser('runExtension')(ext, text, options, globals);
    });

    // run the sub parsers
    text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
    text = showdown.subParser('stripLinkDefinitions')(text, options, globals);
    text = showdown.subParser('unescapeSpecialChars')(text, options, globals);

    // attacklab: Restore dollar signs
    text = text.replace(/~D/g, '$$');

    // attacklab: Restore tildes
    text = text.replace(/~T/g, '~');

    // Run output modifiers
    showdown.helper.forEach(outputModifiers, function (ext) {
      text = showdown.subParser('runExtension')(ext, text, options, globals);
    });

    return text;
  };

  /**
   * Set an option of this Converter instance
   * @param {string} key
   * @param {*} value
   */
  this.setOption = function (key, value) {
    options[key] = value;
  };

  /**
   * Get the option of this Converter instance
   * @param {string} key
   * @returns {*}
   */
  this.getOption = function (key) {
    return options[key];
  };

  /**
   * Get the options of this Converter instance
   * @returns {{}}
   */
  this.getOptions = function () {
    return options;
  };

  /**
   * Add extension to THIS converter
   * @param {{}} extension
   * @param {string} [name=null]
   */
  this.addExtension = function (extension, name) {
    name = name || null;
    _parseExtension(extension, name);
  };

  /**
   * Use a global registered extension with THIS converter
   * @param {string} extensionName Name of the previously registered extension
   */
  this.useExtension = function (extensionName) {
    _parseExtension(extensionName);
  };

  /**
   * Set the flavor THIS converter should use
   * @param {string} name
   */
  this.setFlavor = function (name) {
    if (flavor.hasOwnProperty(name)) {
      var preset = flavor[name];
      for (var option in preset) {
        if (preset.hasOwnProperty(option)) {
          options[option] = preset[option];
        }
      }
    }
  };

  /**
   * Remove an extension from THIS converter.
   * Note: This is a costly operation. It's better to initialize a new converter
   * and specify the extensions you wish to use
   * @param {Array} extension
   */
  this.removeExtension = function (extension) {
    if (!showdown.helper.isArray(extension)) {
      extension = [extension];
    }
    for (var a = 0; a < extension.length; ++a) {
      var ext = extension[a];
      for (var i = 0; i < langExtensions.length; ++i) {
        if (langExtensions[i] === ext) {
          langExtensions[i].splice(i, 1);
        }
      }
      for (var ii = 0; ii < outputModifiers.length; ++i) {
        if (outputModifiers[ii] === ext) {
          outputModifiers[ii].splice(i, 1);
        }
      }
    }
  };

  /**
   * Get all extension of THIS converter
   * @returns {{language: Array, output: Array}}
   */
  this.getAllExtensions = function () {
    return {
      language: langExtensions,
      output: outputModifiers
    };
  };
};

/**
 * Turn Markdown link shortcuts into XHTML <a> tags.
 */
showdown.subParser('anchors', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('anchors.before', text, options, globals);

  var writeAnchorTag = function (wholeMatch, m1, m2, m3, m4, m5, m6, m7) {
    if (showdown.helper.isUndefined(m7)) {
      m7 = '';
    }
    wholeMatch = m1;
    var linkText = m2,
        linkId = m3.toLowerCase(),
        url = m4,
        title = m7;

    if (!url) {
      if (!linkId) {
        // lower-case and turn embedded newlines into spaces
        linkId = linkText.toLowerCase().replace(/ ?\n/g, ' ');
      }
      url = '#' + linkId;

      if (!showdown.helper.isUndefined(globals.gUrls[linkId])) {
        url = globals.gUrls[linkId];
        if (!showdown.helper.isUndefined(globals.gTitles[linkId])) {
          title = globals.gTitles[linkId];
        }
      } else {
        if (wholeMatch.search(/\(\s*\)$/m) > -1) {
          // Special case for explicit empty url
          url = '';
        } else {
          return wholeMatch;
        }
      }
    }

    url = showdown.helper.escapeCharacters(url, '*_', false);
    var result = '<a href="' + url + '"';

    if (title !== '' && title !== null) {
      title = title.replace(/"/g, '&quot;');
      title = showdown.helper.escapeCharacters(title, '*_', false);
      result += ' title="' + title + '"';
    }

    result += '>' + linkText + '</a>';

    return result;
  };

  // First, handle reference-style links: [link text] [id]
  /*
   text = text.replace(/
   (							// wrap whole match in $1
   \[
   (
   (?:
   \[[^\]]*\]		// allow brackets nested one level
   |
   [^\[]			// or anything else
   )*
   )
   \]

   [ ]?					// one optional space
   (?:\n[ ]*)?				// one optional newline followed by spaces

   \[
   (.*?)					// id = $3
   \]
   )()()()()					// pad remaining backreferences
   /g,_DoAnchors_callback);
   */
  text = text.replace(/(\[((?:\[[^\]]*]|[^\[\]])*)][ ]?(?:\n[ ]*)?\[(.*?)])()()()()/g, writeAnchorTag);

  //
  // Next, inline-style links: [link text](url "optional title")
  //

  /*
   text = text.replace(/
   (						// wrap whole match in $1
   \[
   (
   (?:
   \[[^\]]*\]	// allow brackets nested one level
   |
   [^\[\]]			// or anything else
   )
   )
   \]
   \(						// literal paren
   [ \t]*
   ()						// no id, so leave $3 empty
   <?(.*?)>?				// href = $4
   [ \t]*
   (						// $5
   (['"])				// quote char = $6
   (.*?)				// Title = $7
   \6					// matching quote
   [ \t]*				// ignore any spaces/tabs between closing quote and )
   )?						// title is optional
   \)
   )
   /g,writeAnchorTag);
   */
  text = text.replace(/(\[((?:\[[^\]]*]|[^\[\]])*)]\([ \t]*()<?(.*?(?:\(.*?\).*?)?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,
                      writeAnchorTag);

  //
  // Last, handle reference-style shortcuts: [link text]
  // These must come last in case you've also got [link test][1]
  // or [link test](/foo)
  //

  /*
   text = text.replace(/
   (                // wrap whole match in $1
   \[
   ([^\[\]]+)       // link text = $2; can't contain '[' or ']'
   \]
   )()()()()()      // pad rest of backreferences
   /g, writeAnchorTag);
   */
  text = text.replace(/(\[([^\[\]]+)])()()()()()/g, writeAnchorTag);

  text = globals.converter._dispatch('anchors.after', text, options, globals);
  return text;
});

showdown.subParser('autoLinks', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('autoLinks.before', text, options, globals);

  var simpleURLRegex  = /\b(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+)(?=\s|$)(?!["<>])/gi,
      delimUrlRegex   = /<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)>/gi,
      simpleMailRegex = /(?:^|[ \n\t])([A-Za-z0-9!#$%&'*+-/=?^_`\{|}~\.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?:$|[ \n\t])/gi,
      delimMailRegex  = /<(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi;

  text = text.replace(delimUrlRegex, '<a href=\"$1\">$1</a>');
  text = text.replace(delimMailRegex, replaceMail);
  //simpleURLRegex  = /\b(((https?|ftp|dict):\/\/|www\.)[-.+~:?#@!$&'()*,;=[\]\w]+)\b/gi,
  // Email addresses: <address@domain.foo>

  if (options.simplifiedAutoLink) {
    text = text.replace(simpleURLRegex, '<a href=\"$1\">$1</a>');
    text = text.replace(simpleMailRegex, replaceMail);
  }

  function replaceMail(wholeMatch, m1) {
    var unescapedStr = showdown.subParser('unescapeSpecialChars')(m1);
    return showdown.subParser('encodeEmailAddress')(unescapedStr);
  }

  text = globals.converter._dispatch('autoLinks.after', text, options, globals);

  return text;
});

/**
 * Convert all tabs to spaces
 */
showdown.subParser('detab', function (text) {
  'use strict';

  // expand first n-1 tabs
  text = text.replace(/\t(?=\t)/g, '    '); // g_tab_width

  // replace the nth with two sentinels
  text = text.replace(/\t/g, '~A~B');

  // use the sentinel to anchor our regex so it doesn't explode
  text = text.replace(/~B(.+?)~A/g, function (wholeMatch, m1) {
    var leadingText = m1,
        numSpaces = 4 - leadingText.length % 4;  // g_tab_width

    // there *must* be a better way to do this:
    for (var i = 0; i < numSpaces; i++) {
      leadingText += ' ';
    }

    return leadingText;
  });

  // clean up sentinels
  text = text.replace(/~A/g, '    ');  // g_tab_width
  text = text.replace(/~B/g, '');

  return text;

});

/**
 * Smart processing for ampersands and angle brackets that need to be encoded.
 */
showdown.subParser('encodeAmpsAndAngles', function (text) {
  'use strict';
  // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
  // http://bumppo.net/projects/amputator/
  text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;');

  // Encode naked <'s
  text = text.replace(/<(?![a-z\/?\$!])/gi, '&lt;');

  return text;
});

/**
 * Returns the string, with after processing the following backslash escape sequences.
 *
 * attacklab: The polite way to do this is with the new escapeCharacters() function:
 *
 *    text = escapeCharacters(text,"\\",true);
 *    text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
 *
 * ...but we're sidestepping its use of the (slow) RegExp constructor
 * as an optimization for Firefox.  This function gets called a LOT.
 */
showdown.subParser('encodeBackslashEscapes', function (text) {
  'use strict';
  text = text.replace(/\\(\\)/g, showdown.helper.escapeCharactersCallback);
  text = text.replace(/\\([`*_{}\[\]()>#+-.!])/g, showdown.helper.escapeCharactersCallback);
  return text;
});

/**
 * Within tags -- meaning between < and > -- encode [\ ` * _] so they
 * don't conflict with their use in Markdown for code, italics and strong.
 */
showdown.subParser('escapeSpecialCharsWithinTagAttributes', function (text) {
  'use strict';

  // Build a regex to find HTML tags and comments.  See Friedl's
  // "Mastering Regular Expressions", 2nd Ed., pp. 200-201.
  var regex = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;

  text = text.replace(regex, function (wholeMatch) {
    var tag = wholeMatch.replace(/(.)<\/?code>(?=.)/g, '$1`');
    tag = showdown.helper.escapeCharacters(tag, '\\`*_', false);
    return tag;
  });

  return text;
});

showdown.subParser('hashElement', function (text, options, globals) {
  'use strict';

  return function (wholeMatch, m1) {
    var blockText = m1;

    // Undo double lines
    blockText = blockText.replace(/\n\n/g, '\n');
    blockText = blockText.replace(/^\n/, '');

    // strip trailing blank lines
    blockText = blockText.replace(/\n+$/g, '');

    // Replace the element text with a marker ("~KxK" where x is its key)
    blockText = '\n\n~K' + (globals.gHtmlBlocks.push(blockText) - 1) + 'K\n\n';

    return blockText;
  };
});

showdown.subParser('hashHTMLBlocks', function (text, options, globals) {
  'use strict';

  var blockTags = [
      'pre',
      'div',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'table',
      'dl',
      'ol',
      'ul',
      'script',
      'noscript',
      'form',
      'fieldset',
      'iframe',
      'math',
      'style',
      'section',
      'header',
      'footer',
      'nav',
      'article',
      'aside',
      'address',
      'audio',
      'canvas',
      'figure',
      'hgroup',
      'output',
      'video',
      'p'
    ],
    repFunc = function (wholeMatch, match, left, right) {
      var txt = wholeMatch;
      // check if this html element is marked as markdown
      // if so, it's contents should be parsed as markdown
      if (left.search(/\bmarkdown\b/) !== -1) {
        txt = left + globals.converter.makeHtml(match) + right;
      }
      return '\n\n~K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
    };

  for (var i = 0; i < blockTags.length; ++i) {
    text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '^(?: |\\t){0,3}<' + blockTags[i] + '\\b[^>]*>', '</' + blockTags[i] + '>', 'gim');
  }

  // HR SPECIAL CASE
  text = text.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,
    showdown.subParser('hashElement')(text, options, globals));

  // Special case for standalone HTML comments:
  text = text.replace(/(<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g,
    showdown.subParser('hashElement')(text, options, globals));

  // PHP and ASP-style processor instructions (<?...?> and <%...%>)
  text = text.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,
    showdown.subParser('hashElement')(text, options, globals));

  return text;
});

showdown.subParser('italicsAndBold', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('italicsAndBold.before', text, options, globals);

  if (options.literalMidWordUnderscores) {
    //underscores
    // Since we are consuming a \s character, we need to add it
    text = text.replace(/(^|\s|>|\b)__(?=\S)([^]+?)__(?=\b|<|\s|$)/gm, '$1<strong>$2</strong>');
    text = text.replace(/(^|\s|>|\b)_(?=\S)([^]+?)_(?=\b|<|\s|$)/gm, '$1<em>$2</em>');
    //asterisks
    text = text.replace(/(\*\*)(?=\S)([^\r]*?\S[*]*)\1/g, '<strong>$2</strong>');
    text = text.replace(/(\*)(?=\S)([^\r]*?\S)\1/g, '<em>$2</em>');

  } else {
    // <strong> must go first:
    text = text.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, '<strong>$2</strong>');
    text = text.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, '<em>$2</em>');
  }

  text = globals.converter._dispatch('italicsAndBold.after', text, options, globals);
  return text;
});

/**
 * Run extension
 */
showdown.subParser('runExtension', function (ext, text, options, globals) {
  'use strict';

  if (ext.filter) {
    text = ext.filter(text, globals.converter, options);

  } else if (ext.regex) {
    // TODO remove this when old extension loading mechanism is deprecated
    var re = ext.regex;
    if (!re instanceof RegExp) {
      re = new RegExp(re, 'g');
    }
    text = text.replace(re, ext.replace);
  }

  return text;
});

/**
 * Strip any lines consisting only of spaces and tabs.
 * This makes subsequent regexs easier to write, because we can
 * match consecutive blank lines with /\n+/ instead of something
 * contorted like /[ \t]*\n+/
 */
showdown.subParser('stripBlankLines', function (text) {
  'use strict';
  return text.replace(/^[ \t]+$/mg, '');
});

/**
 * Strips link definitions from text, stores the URLs and titles in
 * hash references.
 * Link defs are in the form: ^[id]: url "optional title"
 *
 * ^[ ]{0,3}\[(.+)\]: // id = $1  attacklab: g_tab_width - 1
 * [ \t]*
 * \n?                  // maybe *one* newline
 * [ \t]*
 * <?(\S+?)>?          // url = $2
 * [ \t]*
 * \n?                // maybe one newline
 * [ \t]*
 * (?:
 * (\n*)              // any lines skipped = $3 attacklab: lookbehind removed
 * ["(]
 * (.+?)              // title = $4
 * [")]
 * [ \t]*
 * )?                 // title is optional
 * (?:\n+|$)
 * /gm,
 * function(){...});
 *
 */
showdown.subParser('stripLinkDefinitions', function (text, options, globals) {
  'use strict';

  var regex = /^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?(\S+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=~0))/gm;

  // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
  text += '~0';

  text = text.replace(regex, function (wholeMatch, linkId, url, width, height, blankLines, title) {
    linkId = linkId.toLowerCase();
    globals.gUrls[linkId] = showdown.subParser('encodeAmpsAndAngles')(url);  // Link IDs are case-insensitive

    if (blankLines) {
      // Oops, found blank lines, so it's not a title.
      // Put back the parenthetical statement we stole.
      return blankLines + title;

    } else {
      if (title) {
        globals.gTitles[linkId] = title.replace(/"|'/g, '&quot;');
      }
      if (options.parseImgDimensions && width && height) {
        globals.gDimensions[linkId] = {
          width:  width,
          height: height
        };
      }
    }
    // Completely remove the definition from the text
    return '';
  });

  // attacklab: strip sentinel
  text = text.replace(/~0/, '');

  return text;
});

/**
 * Swap back in all the special characters we've hidden.
 */
showdown.subParser('unescapeSpecialChars', function (text) {
  'use strict';

  text = text.replace(/~E(\d+)E/g, function (wholeMatch, m1) {
    var charCodeToReplace = parseInt(m1);
    return String.fromCharCode(charCodeToReplace);
  });
  return text;
});

var root = this;

// CommonJS/nodeJS Loader
if (typeof module !== 'undefined' && module.exports) {
  module.exports = showdown;

// AMD Loader
} else if (typeof define === 'function' && define.amd) {
  define(function () {
    'use strict';
    return showdown;
  });

// Regular Browser loader
} else {
  root.showdown = showdown;
}
}).call(this);

//# sourceMappingURL=showdown.js.map
