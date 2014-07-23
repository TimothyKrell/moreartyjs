/**
 * @name Util
 * @namespace
 * @classdesc Miscellaneous util functions.
 */
define([], function () {

  /* ---------------- */
  /* Private helpers. */
  /* ---------------- */

  // resolveArgs

  var isRequired, findTurningPoint, prepare;

  isRequired = function (spec) {
    return typeof spec === 'string' && spec.charAt(0) !== '?';
  };

  findTurningPoint = function (arr, pred) {
    var first = pred(arr[0]);
    for (var i = 1; i < arr.length; i++) {
      if (pred(arr[i]) !== first) return i;
    }
    return null;
  };

  prepare = function (arr, splitAt) {
    return arr.slice(splitAt).reverse().concat(arr.slice(0, splitAt));
  };

  // subclass

  var copyOwnProperties = function (source, target) {
    Object.getOwnPropertyNames(source).forEach(function (propKey) {
      var desc = Object.getOwnPropertyDescriptor(source, propKey);
      Object.defineProperty(target, propKey, desc);
    });
    return target;
  };

  return {

    /** Calculate hash code of a string (Java style).
     * @param {String} s a string
     * @return {Number} hash code
     * @memberOf Util */
    hashcode: function (s) {
      var hash = 0, i, chr, len;
      if (s.length === 0) {
        return hash;
      } else {
        for (i = 0, len = s.length; i < len; i++) {
          chr = s.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0; // convert to 32-bit integer
        }
        return hash;
      }
    },

    /** Identity function. Returns its first argument.
     * @param {*} x argument to return
     * @return {*} its first argument
     * @memberOf Util */
    identity: function (x) {
      return x;
    },

    /** 'Not' function returning logical not of its argument.
     * @param {*} x argument
     * @returns {*} !x
     * @memberOf Util */
    not: function (x) {
      return !x;
    },

    /** Create constant function (always returning x).
     * @param {*} x constant function return value
     * @return {Function} function always returning x
     * @memberOf Util */
    constantly: function (x) {
      return function () { return x; };
    },

    /** Execute function f, then function cont. If f returns a promise, cont is executed when the promise resolves.
     * @param {Function} f function to execute first
     * @param {Function} cont function to execute after f
     * @memberOf Util */
    afterComplete: function (f, cont) {
      var result = f();
      if (result && typeof result.always === 'function') {
        result.always(cont);
      } else {
        cont();
      }
    },

    /** Check if argument is undefined or null.
     * @param {*} x argument to check
     * @returns {Boolean}
     * @memberOf Util */
    undefinedOrNull: function (x) {
      return x === undefined || x === null;
    },

    /** Check if s1 starts with s2.
     * @param {String} s1
     * @param {String} s2
     * @return {Boolean}
     * @memberOf Util */
    startsWith: function (s1, s2) {
      return s1.indexOf(s2) === 0;
    },

    /** Self-descriptive.
     * @param {*} x
     * @return {String}
     * @memberOf Util */
    toString: function (x) {
      switch (x) {
        case undefined:
          return 'undefined';
        case null:
          return 'null';
        default:
          if (typeof x === 'string') {
            return '"' + x + '"';
          } else if (Array.isArray(x)) {
            return '[' + x.join(', ') + ']';
          } else {
            return x.toString();
          }
      }
    },

    /** Check if arguments are equal.
     * Checks strict equality first, if false, 'equals' method is tried, if any.
     * @param {*} x
     * @param {*} y
     * @returns {Boolean}
     * @memberOf Util */
    equals: function (x, y) {
      return x === y || (x && x.equals && x.equals(y));
    },

    /** Get values of object properties.
     * @param {Object} obj object
     * @return {Array} object's properties values
     * @memberOf Util */
    getPropertyValues: function (obj) {
      return Object.keys(obj).map(function (key) { return obj[key]; });
    },

    /** Find array element satisfying the predicate.
     * @param {Array} arr array
     * @param {Function} pred predicate accepting current value, index, original array
     * @return {*} found value or null
     * @memberOf Util */
    find: function (arr, pred) {
      for (var i = 0; i < arr.length; i++) {
        var value = arr[i];
        if (pred(value, i, arr)) {
          return value;
        }
      }
      return null;
    },

    /** Find array element and its index satisfying the predicate.
     * @param {Array} arr array
     * @param {Function} pred predicate accepting current value, index, original array
     * @return {Object} object having 'index' and 'value' properties or null if not found
     * @memberOf Util */
    findWithIndex: function (arr, pred) {
      for (var i = 0; i < arr.length; i++) {
        var value = arr[i];
        if (pred(value, i, arr)) {
          return { index: i, value: value };
        }
      }
      return null;
    },

    /** Remove element from array. Treats array as immutable and returns new instance.
     * @param {Array} arr array
     * @param {Number} index index
     * @returns {Array} new array instance
     * @memberOf Util */
    arrayRemove: function (arr, index) {
      var newArr = arr.slice(0);
      newArr.splice(index, 1);
      return newArr;
    },

    /** Add element to array. Treats array as immutable and returns new instance.
     * @param {Array} arr array
     * @param {Number} index index
     * @param {*} value value to insert
     * @returns {Array} new array instance
     * @memberOf Util */
    arrayInsert: function (arr, index, value) {
      var newArr = arr.slice(0);
      newArr.splice(index, 0, value);
      return newArr;
    },

    /** Update array element value. Treats array as immutable and returns new instance.
     * @param {Array} arr array
     * @param {Number} index index
     * @param {*} value updated value
     * @returns {Array} new array instance
     * @memberOf Util */
    arrayUpdate: function (arr, index, value) {
      var newArr = arr.slice(0);
      newArr[index] = value;
      return newArr;
    },

    /** Resolve arguments. Acceptable spec formats:
     * <ul>
     *   <li>'foo' - required argument 'foo';</li>
     *   <li>'?foo' - optional argument 'foo';</li>
     *   <li>function (arg) { return arg instanceof MyClass ? 'foo' : null; } - checked optional argument.</li>
     * </ul>
     * Specs can only switch optional flag once in the list. This invariant isn't checked by the method,
     * its violation will produce indeterminate results.
     * <p>Optional arguments are matched in order, left to right. Provide check function if you need to allow to skip
     * one optional argument and use sebsequent optional arguments instead.
     * <p>Returned arguments descriptor contains argument names mapped to resolved values.
     * @param {Array} args arguments 'array'
     * @param {*} var_args arguments specs as a var-args list or array, see method description
     * @returns {Object} arguments descriptor object
     * @memberOf Util */
    resolveArgs: function (args, var_args) {
      var result = {};
      if (arguments.length > 1) {
        var specs = Array.isArray(var_args) ? var_args : Array.prototype.slice.call(arguments, 1);
        var preparedSpecs, preparedArgs;
        var turningPoint;

        if (isRequired(specs[0]) || !(turningPoint = findTurningPoint(specs, isRequired))) {
          preparedSpecs = specs;
          preparedArgs = args;
        } else {
          var effectiveArgs = Array.isArray(args) ? args : Array.prototype.slice.call(args);
          preparedSpecs = prepare(specs, turningPoint);
          preparedArgs = prepare(effectiveArgs, effectiveArgs.length - (specs.length - turningPoint));
        }

        for (var specIndex = 0, argIndex = 0;
             specIndex < preparedSpecs.length && argIndex < preparedArgs.length; specIndex++) {
          var spec = preparedSpecs[specIndex], arg = preparedArgs[argIndex];
          if (isRequired(spec)) {
            result[spec] = arg;
            argIndex++;
          } else {
            var name = typeof spec === 'function' ? spec(arg) : (spec.charAt(0) !== '?' ? spec : spec.substring(1));
            if (name || arg === undefined) {
              result[name] = arg;
              argIndex++;
            }
          }
        }
      }

      return result;
    },

    /** Check if argument can be valid binding subpath.
     * @param {*} x
     * @returns {Boolean}
     * @memberOf Util */
    canRepresentSubpath: function (x) {
      var type = typeof x;
      return type === 'string' || type === 'number' || Array.isArray(x);
    },

    /** Shallow merge object properties from source object to dest.
     * @param {Object} source source object
     * @param {Object} dest destination object
     * @return {Object} destination object
     * @memberOf Util */
    shallowMerge: function (source, dest) {
      for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
          dest[prop] = source[prop];
        }
      }
      return dest;
    },

    /** Partially apply React component constructor.
     * @param {Function} comp component constructor
     * @param {Object} props properties to apply
     * @param {Boolean} override override existing properties flag, true by default
     * @returns {Function} partially-applied React component constructor
     * @memberOf Util */
    papply: function (comp, props, override) {
      var self = this;
      var f = function (props2, children) {
        var effectiveChildren = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : null;
        if (props2) {
          var effectiveProps = {};
          if (f._props) {
            self.shallowMerge(f._props, effectiveProps);
            self.shallowMerge(props2, effectiveProps);
          } else {
            effectiveProps = props2;
          }
          return comp(effectiveProps, effectiveChildren);
        } else {
          return comp(f._props, effectiveChildren);
        }
      };

      if (comp._props) {
        var newCompProps = {};
        if (override !== false) {
          self.shallowMerge(comp._props, newCompProps);
          self.shallowMerge(props, newCompProps);
        } else {
          self.shallowMerge(props, newCompProps);
          self.shallowMerge(comp._props, newCompProps);
        }
        f._props = newCompProps;
      } else {
        f._props = props;
      }

      return f;
    },

    /** Subclass SubC from SuperC and freeze its prototype.
     * @param {Function} SubC sub constructor
     * @param {Function} SuperC parent constructor
     * @param {Object} [additionalProperties] additional prototype properties to set
     * @memberOf Util */
    subclass: function (SubC, SuperC, additionalProperties) {
      var subProto = Object.create(SuperC.prototype);
      copyOwnProperties(SubC.prototype, subProto);
      SubC.prototype = subProto;
      SubC._super = SuperC.prototype;

      if (additionalProperties) {
        this.shallowMerge(additionalProperties, SubC.prototype);
      }

      Object.freeze(SubC.prototype);
    }

  };
});
