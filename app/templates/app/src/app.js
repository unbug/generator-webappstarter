(function () {
/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                    hasProp(waiting, depName) ||
                    hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());
define("almond", function(){});

define('lib/zepto',['require','exports','module'],function(require, exports, module) {

    /* Zepto v1.1.4-82-g6814639 - zepto event ajax form ie detect fx touch gesture selector - zeptojs.com/license */
    // build
    // MODULES="zepto event ajax form ie detect fx touch gesture selector " npm run-script dist
    var Zepto = (function() {
        var undefined, key, $, classList, emptyArray = [], concat = emptyArray.concat, filter = emptyArray.filter, slice = emptyArray.slice,
            document = window.document,
            elementDisplay = {}, classCache = {},
            cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
            fragmentRE = /^\s*<(\w+|!)[^>]*>/,
            singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
            tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
            rootNodeRE = /^(?:body|html)$/i,
            capitalRE = /([A-Z])/g,

        // special attributes that should be get/set via method calls
            methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

            adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
            table = document.createElement('table'),
            tableRow = document.createElement('tr'),
            containers = {
                'tr': document.createElement('tbody'),
                'tbody': table, 'thead': table, 'tfoot': table,
                'td': tableRow, 'th': tableRow,
                '*': document.createElement('div')
            },
            readyRE = /complete|loaded|interactive/,
            simpleSelectorRE = /^[\w-]*$/,
            class2type = {},
            toString = class2type.toString,
            zepto = {},
            camelize, uniq,
            tempParent = document.createElement('div'),
            propMap = {
                'tabindex': 'tabIndex',
                'readonly': 'readOnly',
                'for': 'htmlFor',
                'class': 'className',
                'maxlength': 'maxLength',
                'cellspacing': 'cellSpacing',
                'cellpadding': 'cellPadding',
                'rowspan': 'rowSpan',
                'colspan': 'colSpan',
                'usemap': 'useMap',
                'frameborder': 'frameBorder',
                'contenteditable': 'contentEditable'
            },
            isArray = Array.isArray ||
                function(object){ return object instanceof Array }

        zepto.matches = function(element, selector) {
            if (!selector || !element || element.nodeType !== 1) return false
            var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                element.oMatchesSelector || element.matchesSelector
            if (matchesSelector) return matchesSelector.call(element, selector)
            // fall back to performing a selector:
            var match, parent = element.parentNode, temp = !parent
            if (temp) (parent = tempParent).appendChild(element)
            match = ~zepto.qsa(parent, selector).indexOf(element)
            temp && tempParent.removeChild(element)
            return match
        }

        function type(obj) {
            return obj == null ? String(obj) :
            class2type[toString.call(obj)] || "object"
        }

        function isFunction(value) { return type(value) == "function" }
        function isWindow(obj)     { return obj != null && obj == obj.window }
        function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
        function isObject(obj)     { return type(obj) == "object" }
        function isPlainObject(obj) {
            return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
        }
        function likeArray(obj) { return typeof obj.length == 'number' }

        function compact(array) { return filter.call(array, function(item){ return item != null }) }
        function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
        camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
        function dasherize(str) {
            return str.replace(/::/g, '/')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                .replace(/_/g, '-')
                .toLowerCase()
        }
        uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

        function classRE(name) {
            return name in classCache ?
                classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
        }

        function maybeAddPx(name, value) {
            return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
        }

        function defaultDisplay(nodeName) {
            var element, display
            if (!elementDisplay[nodeName]) {
                element = document.createElement(nodeName)
                document.body.appendChild(element)
                display = getComputedStyle(element, '').getPropertyValue("display")
                element.parentNode.removeChild(element)
                display == "none" && (display = "block")
                elementDisplay[nodeName] = display
            }
            return elementDisplay[nodeName]
        }

        function children(element) {
            return 'children' in element ?
                slice.call(element.children) :
                $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
        }

        function Z(dom, selector) {
            var i, len = dom ? dom.length : 0
            for (i = 0; i < len; i++) this[i] = dom[i]
            this.length = len
            this.selector = selector || ''
        }

        // `$.zepto.fragment` takes a html string and an optional tag name
        // to generate DOM nodes nodes from the given html string.
        // The generated DOM nodes are returned as an array.
        // This function can be overriden in plugins for example to make
        // it compatible with browsers that don't support the DOM fully.
        zepto.fragment = function(html, name, properties) {
            var dom, nodes, container

            // A special case optimization for a single tag
            if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

            if (!dom) {
                if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
                if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
                if (!(name in containers)) name = '*'

                container = containers[name]
                container.innerHTML = '' + html
                dom = $.each(slice.call(container.childNodes), function(){
                    container.removeChild(this)
                })
            }

            if (isPlainObject(properties)) {
                nodes = $(dom)
                $.each(properties, function(key, value) {
                    if (methodAttributes.indexOf(key) > -1) nodes[key](value)
                    else nodes.attr(key, value)
                })
            }

            return dom
        }

        // `$.zepto.Z` swaps out the prototype of the given `dom` array
        // of nodes with `$.fn` and thus supplying all the Zepto functions
        // to the array. This method can be overriden in plugins.
        zepto.Z = function(dom, selector) {
            return new Z(dom, selector)
        }

        // `$.zepto.isZ` should return `true` if the given object is a Zepto
        // collection. This method can be overriden in plugins.
        zepto.isZ = function(object) {
            return object instanceof zepto.Z
        }

        // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
        // takes a CSS selector and an optional context (and handles various
        // special cases).
        // This method can be overriden in plugins.
        zepto.init = function(selector, context) {
            var dom
            // If nothing given, return an empty Zepto collection
            if (!selector) return zepto.Z()
            // Optimize for string selectors
            else if (typeof selector == 'string') {
                selector = selector.trim()
                // If it's a html fragment, create nodes from it
                // Note: In both Chrome 21 and Firefox 15, DOM error 12
                // is thrown if the fragment doesn't begin with <
                if (selector[0] == '<' && fragmentRE.test(selector))
                    dom = zepto.fragment(selector, RegExp.$1, context), selector = null
                // If there's a context, create a collection on that context first, and select
                // nodes from there
                else if (context !== undefined) return $(context).find(selector)
                // If it's a CSS selector, use it to select nodes.
                else dom = zepto.qsa(document, selector)
            }
            // If a function is given, call it when the DOM is ready
            else if (isFunction(selector)) return $(document).ready(selector)
            // If a Zepto collection is given, just return it
            else if (zepto.isZ(selector)) return selector
            else {
                // normalize array if an array of nodes is given
                if (isArray(selector)) dom = compact(selector)
                // Wrap DOM nodes.
                else if (isObject(selector))
                    dom = [selector], selector = null
                // If it's a html fragment, create nodes from it
                else if (fragmentRE.test(selector))
                    dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
                // If there's a context, create a collection on that context first, and select
                // nodes from there
                else if (context !== undefined) return $(context).find(selector)
                // And last but no least, if it's a CSS selector, use it to select nodes.
                else dom = zepto.qsa(document, selector)
            }
            // create a new Zepto collection from the nodes found
            return zepto.Z(dom, selector)
        }

        // `$` will be the base `Zepto` object. When calling this
        // function just call `$.zepto.init, which makes the implementation
        // details of selecting nodes and creating Zepto collections
        // patchable in plugins.
        $ = function(selector, context){
            return zepto.init(selector, context)
        }

        function extend(target, source, deep) {
            for (key in source)
                if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                    if (isPlainObject(source[key]) && !isPlainObject(target[key]))
                        target[key] = {}
                    if (isArray(source[key]) && !isArray(target[key]))
                        target[key] = []
                    extend(target[key], source[key], deep)
                }
                else if (source[key] !== undefined) target[key] = source[key]
        }

        // Copy all but undefined properties from one or more
        // objects to the `target` object.
        $.extend = function(target){
            var deep, args = slice.call(arguments, 1)
            if (typeof target == 'boolean') {
                deep = target
                target = args.shift()
            }
            args.forEach(function(arg){ extend(target, arg, deep) })
            return target
        }

        // `$.zepto.qsa` is Zepto's CSS selector implementation which
        // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
        // This method can be overriden in plugins.
        zepto.qsa = function(element, selector){
            var found,
                maybeID = selector[0] == '#',
                maybeClass = !maybeID && selector[0] == '.',
                nameOnly = maybeID || maybeClass ? selector.slice(1) : selector, // Ensure that a 1 char tag name still gets checked
                isSimple = simpleSelectorRE.test(nameOnly)
            return (element.getElementById && isSimple && maybeID) ? // Safari DocumentFragment doesn't have getElementById
                ( (found = element.getElementById(nameOnly)) ? [found] : [] ) :
                (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
                    slice.call(
                        isSimple && !maybeID && element.getElementsByClassName ? // DocumentFragment doesn't have getElementsByClassName/TagName
                            maybeClass ? element.getElementsByClassName(nameOnly) : // If it's simple, it could be a class
                                element.getElementsByTagName(selector) : // Or a tag
                            element.querySelectorAll(selector) // Or it's not simple, and we need to query all
                    )
        }

        function filtered(nodes, selector) {
            return selector == null ? $(nodes) : $(nodes).filter(selector)
        }

        $.contains = document.documentElement.contains ?
            function(parent, node) {
                return parent !== node && parent.contains(node)
            } :
            function(parent, node) {
                while (node && (node = node.parentNode))
                    if (node === parent) return true
                return false
            }

        function funcArg(context, arg, idx, payload) {
            return isFunction(arg) ? arg.call(context, idx, payload) : arg
        }

        function setAttribute(node, name, value) {
            value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
        }

        // access className property while respecting SVGAnimatedString
        function className(node, value){
            var klass = node.className || '',
                svg   = klass && klass.baseVal !== undefined

            if (value === undefined) return svg ? klass.baseVal : klass
            svg ? (klass.baseVal = value) : (node.className = value)
        }

        // "true"  => true
        // "false" => false
        // "null"  => null
        // "42"    => 42
        // "42.5"  => 42.5
        // "08"    => "08"
        // JSON    => parse if valid
        // String  => self
        function deserializeValue(value) {
            try {
                return value ?
                value == "true" ||
                ( value == "false" ? false :
                    value == "null" ? null :
                        +value + "" == value ? +value :
                            /^[\[\{]/.test(value) ? $.parseJSON(value) :
                                value )
                    : value
            } catch(e) {
                return value
            }
        }

        $.type = type
        $.isFunction = isFunction
        $.isWindow = isWindow
        $.isArray = isArray
        $.isPlainObject = isPlainObject

        $.isEmptyObject = function(obj) {
            var name
            for (name in obj) return false
            return true
        }

        $.inArray = function(elem, array, i){
            return emptyArray.indexOf.call(array, elem, i)
        }

        $.camelCase = camelize
        $.trim = function(str) {
            return str == null ? "" : String.prototype.trim.call(str)
        }

        // plugin compatibility
        $.uuid = 0
        $.support = { }
        $.expr = { }
        $.noop = function() {}

        $.map = function(elements, callback){
            var value, values = [], i, key
            if (likeArray(elements))
                for (i = 0; i < elements.length; i++) {
                    value = callback(elements[i], i)
                    if (value != null) values.push(value)
                }
            else
                for (key in elements) {
                    value = callback(elements[key], key)
                    if (value != null) values.push(value)
                }
            return flatten(values)
        }

        $.each = function(elements, callback){
            var i, key
            if (likeArray(elements)) {
                for (i = 0; i < elements.length; i++)
                    if (callback.call(elements[i], i, elements[i]) === false) return elements
            } else {
                for (key in elements)
                    if (callback.call(elements[key], key, elements[key]) === false) return elements
            }

            return elements
        }

        $.grep = function(elements, callback){
            return filter.call(elements, callback)
        }

        if (window.JSON) $.parseJSON = JSON.parse

        // Populate the class2type map
        $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
            class2type[ "[object " + name + "]" ] = name.toLowerCase()
        })

        // Define methods that will be available on all
        // Zepto collections
        $.fn = {
            constructor: zepto.Z,
            length: 0,

            // Because a collection acts like an array
            // copy over these useful array functions.
            forEach: emptyArray.forEach,
            reduce: emptyArray.reduce,
            push: emptyArray.push,
            sort: emptyArray.sort,
            splice: emptyArray.splice,
            indexOf: emptyArray.indexOf,
            concat: function(){
                var i, value, args = []
                for (i = 0; i < arguments.length; i++) {
                    value = arguments[i]
                    args[i] = zepto.isZ(value) ? value.toArray() : value
                }
                return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
            },

            // `map` and `slice` in the jQuery API work differently
            // from their array counterparts
            map: function(fn){
                return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
            },
            slice: function(){
                return $(slice.apply(this, arguments))
            },

            ready: function(callback){
                // need to check if document.body exists for IE as that browser reports
                // document ready when it hasn't yet created the body element
                if (readyRE.test(document.readyState) && document.body) callback($)
                else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
                return this
            },
            get: function(idx){
                return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
            },
            toArray: function(){ return this.get() },
            size: function(){
                return this.length
            },
            remove: function(){
                return this.each(function(){
                    if (this.parentNode != null)
                        this.parentNode.removeChild(this)
                })
            },
            each: function(callback){
                emptyArray.every.call(this, function(el, idx){
                    return callback.call(el, idx, el) !== false
                })
                return this
            },
            filter: function(selector){
                if (isFunction(selector)) return this.not(this.not(selector))
                return $(filter.call(this, function(element){
                    return zepto.matches(element, selector)
                }))
            },
            add: function(selector,context){
                return $(uniq(this.concat($(selector,context))))
            },
            is: function(selector){
                return this.length > 0 && zepto.matches(this[0], selector)
            },
            not: function(selector){
                var nodes=[]
                if (isFunction(selector) && selector.call !== undefined)
                    this.each(function(idx){
                        if (!selector.call(this,idx)) nodes.push(this)
                    })
                else {
                    var excludes = typeof selector == 'string' ? this.filter(selector) :
                        (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
                    this.forEach(function(el){
                        if (excludes.indexOf(el) < 0) nodes.push(el)
                    })
                }
                return $(nodes)
            },
            has: function(selector){
                return this.filter(function(){
                    return isObject(selector) ?
                        $.contains(this, selector) :
                        $(this).find(selector).size()
                })
            },
            eq: function(idx){
                return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
            },
            first: function(){
                var el = this[0]
                return el && !isObject(el) ? el : $(el)
            },
            last: function(){
                var el = this[this.length - 1]
                return el && !isObject(el) ? el : $(el)
            },
            find: function(selector){
                var result, $this = this
                if (!selector) result = $()
                else if (typeof selector == 'object')
                    result = $(selector).filter(function(){
                        var node = this
                        return emptyArray.some.call($this, function(parent){
                            return $.contains(parent, node)
                        })
                    })
                else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
                else result = this.map(function(){ return zepto.qsa(this, selector) })
                return result
            },
            closest: function(selector, context){
                var node = this[0], collection = false
                if (typeof selector == 'object') collection = $(selector)
                while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
                    node = node !== context && !isDocument(node) && node.parentNode
                return $(node)
            },
            parents: function(selector){
                var ancestors = [], nodes = this
                while (nodes.length > 0)
                    nodes = $.map(nodes, function(node){
                        if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
                            ancestors.push(node)
                            return node
                        }
                    })
                return filtered(ancestors, selector)
            },
            parent: function(selector){
                return filtered(uniq(this.pluck('parentNode')), selector)
            },
            children: function(selector){
                return filtered(this.map(function(){ return children(this) }), selector)
            },
            contents: function() {
                return this.map(function() { return this.contentDocument || slice.call(this.childNodes) })
            },
            siblings: function(selector){
                return filtered(this.map(function(i, el){
                    return filter.call(children(el.parentNode), function(child){ return child!==el })
                }), selector)
            },
            empty: function(){
                return this.each(function(){ this.innerHTML = '' })
            },
            // `pluck` is borrowed from Prototype.js
            pluck: function(property){
                return $.map(this, function(el){ return el[property] })
            },
            show: function(){
                return this.each(function(){
                    this.style.display == "none" && (this.style.display = '')
                    if (getComputedStyle(this, '').getPropertyValue("display") == "none")
                        this.style.display = defaultDisplay(this.nodeName)
                })
            },
            replaceWith: function(newContent){
                return this.before(newContent).remove()
            },
            wrap: function(structure){
                var func = isFunction(structure)
                if (this[0] && !func)
                    var dom   = $(structure).get(0),
                        clone = dom.parentNode || this.length > 1

                return this.each(function(index){
                    $(this).wrapAll(
                        func ? structure.call(this, index) :
                            clone ? dom.cloneNode(true) : dom
                    )
                })
            },
            wrapAll: function(structure){
                if (this[0]) {
                    $(this[0]).before(structure = $(structure))
                    var children
                    // drill down to the inmost element
                    while ((children = structure.children()).length) structure = children.first()
                    $(structure).append(this)
                }
                return this
            },
            wrapInner: function(structure){
                var func = isFunction(structure)
                return this.each(function(index){
                    var self = $(this), contents = self.contents(),
                        dom  = func ? structure.call(this, index) : structure
                    contents.length ? contents.wrapAll(dom) : self.append(dom)
                })
            },
            unwrap: function(){
                this.parent().each(function(){
                    $(this).replaceWith($(this).children())
                })
                return this
            },
            clone: function(){
                return this.map(function(){ return this.cloneNode(true) })
            },
            hide: function(){
                return this.css("display", "none")
            },
            toggle: function(setting){
                return this.each(function(){
                    var el = $(this)
                        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
                })
            },
            prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
            next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
            html: function(html){
                return 0 in arguments ?
                    this.each(function(idx){
                        var originHtml = this.innerHTML
                        $(this).empty().append( funcArg(this, html, idx, originHtml) )
                    }) :
                    (0 in this ? this[0].innerHTML : null)
            },
            text: function(text){
                return 0 in arguments ?
                    this.each(function(idx){
                        var newText = funcArg(this, text, idx, this.textContent)
                        this.textContent = newText == null ? '' : ''+newText
                    }) :
                    (0 in this ? this[0].textContent : null)
            },
            attr: function(name, value){
                var result
                return (typeof name == 'string' && !(1 in arguments)) ?
                    (!this.length || this[0].nodeType !== 1 ? undefined :
                        (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
                    ) :
                    this.each(function(idx){
                        if (this.nodeType !== 1) return
                        if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
                        else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
                    })
            },
            removeAttr: function(name){
                return this.each(function(){ this.nodeType === 1 && name.split(' ').forEach(function(attribute){
                    setAttribute(this, attribute)
                }, this)})
            },
            prop: function(name, value){
                name = propMap[name] || name
                return (1 in arguments) ?
                    this.each(function(idx){
                        this[name] = funcArg(this, value, idx, this[name])
                    }) :
                    (this[0] && this[0][name])
            },
            data: function(name, value){
                var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()

                var data = (1 in arguments) ?
                    this.attr(attrName, value) :
                    this.attr(attrName)

                return data !== null ? deserializeValue(data) : undefined
            },
            val: function(value){
                return 0 in arguments ?
                    this.each(function(idx){
                        this.value = funcArg(this, value, idx, this.value)
                    }) :
                    (this[0] && (this[0].multiple ?
                        $(this[0]).find('option').filter(function(){ return this.selected }).pluck('value') :
                        this[0].value)
                    )
            },
            offset: function(coordinates){
                if (coordinates) return this.each(function(index){
                    var $this = $(this),
                        coords = funcArg(this, coordinates, index, $this.offset()),
                        parentOffset = $this.offsetParent().offset(),
                        props = {
                            top:  coords.top  - parentOffset.top,
                            left: coords.left - parentOffset.left
                        }

                    if ($this.css('position') == 'static') props['position'] = 'relative'
                    $this.css(props)
                })
                if (!this.length) return null
                if (!$.contains(document.documentElement, this[0]))
                    return {top: 0, left: 0}
                var obj = this[0].getBoundingClientRect()
                return {
                    left: obj.left + window.pageXOffset,
                    top: obj.top + window.pageYOffset,
                    width: Math.round(obj.width),
                    height: Math.round(obj.height)
                }
            },
            css: function(property, value){
                if (arguments.length < 2) {
                    var computedStyle, element = this[0]
                    if(!element) return
                    computedStyle = getComputedStyle(element, '')
                    if (typeof property == 'string')
                        return element.style[camelize(property)] || computedStyle.getPropertyValue(property)
                    else if (isArray(property)) {
                        var props = {}
                        $.each(property, function(_, prop){
                            props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
                        })
                        return props
                    }
                }

                var css = ''
                if (type(property) == 'string') {
                    if (!value && value !== 0)
                        this.each(function(){ this.style.removeProperty(dasherize(property)) })
                    else
                        css = dasherize(property) + ":" + maybeAddPx(property, value)
                } else {
                    for (key in property)
                        if (!property[key] && property[key] !== 0)
                            this.each(function(){ this.style.removeProperty(dasherize(key)) })
                        else
                            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
                }

                return this.each(function(){ this.style.cssText += ';' + css })
            },
            index: function(element){
                return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
            },
            hasClass: function(name){
                if (!name) return false
                return emptyArray.some.call(this, function(el){
                    return this.test(className(el))
                }, classRE(name))
            },
            addClass: function(name){
                if (!name) return this
                return this.each(function(idx){
                    if (!('className' in this)) return
                    classList = []
                    var cls = className(this), newName = funcArg(this, name, idx, cls)
                    newName.split(/\s+/g).forEach(function(klass){
                        if (!$(this).hasClass(klass)) classList.push(klass)
                    }, this)
                    classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
                })
            },
            removeClass: function(name){
                return this.each(function(idx){
                    if (!('className' in this)) return
                    if (name === undefined) return className(this, '')
                    classList = className(this)
                    funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
                        classList = classList.replace(classRE(klass), " ")
                    })
                    className(this, classList.trim())
                })
            },
            toggleClass: function(name, when){
                if (!name) return this
                return this.each(function(idx){
                    var $this = $(this), names = funcArg(this, name, idx, className(this))
                    names.split(/\s+/g).forEach(function(klass){
                        (when === undefined ? !$this.hasClass(klass) : when) ?
                            $this.addClass(klass) : $this.removeClass(klass)
                    })
                })
            },
            scrollTop: function(value){
                if (!this.length) return
                var hasScrollTop = 'scrollTop' in this[0]
                if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
                return this.each(hasScrollTop ?
                    function(){ this.scrollTop = value } :
                    function(){ this.scrollTo(this.scrollX, value) })
            },
            scrollLeft: function(value){
                if (!this.length) return
                var hasScrollLeft = 'scrollLeft' in this[0]
                if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
                return this.each(hasScrollLeft ?
                    function(){ this.scrollLeft = value } :
                    function(){ this.scrollTo(value, this.scrollY) })
            },
            position: function() {
                if (!this.length) return

                var elem = this[0],
                // Get *real* offsetParent
                    offsetParent = this.offsetParent(),
                // Get correct offsets
                    offset       = this.offset(),
                    parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

                // Subtract element margins
                // note: when an element has margin: auto the offsetLeft and marginLeft
                // are the same in Safari causing offset.left to incorrectly be 0
                offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
                offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

                // Add offsetParent borders
                parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
                parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

                // Subtract the two offsets
                return {
                    top:  offset.top  - parentOffset.top,
                    left: offset.left - parentOffset.left
                }
            },
            offsetParent: function() {
                return this.map(function(){
                    var parent = this.offsetParent || document.body
                    while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
                        parent = parent.offsetParent
                    return parent
                })
            }
        }

        // for now
        $.fn.detach = $.fn.remove

            // Generate the `width` and `height` functions
        ;['width', 'height'].forEach(function(dimension){
            var dimensionProperty =
                dimension.replace(/./, function(m){ return m[0].toUpperCase() })

            $.fn[dimension] = function(value){
                var offset, el = this[0]
                if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
                    isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
                    (offset = this.offset()) && offset[dimension]
                else return this.each(function(idx){
                    el = $(this)
                    el.css(dimension, funcArg(this, value, idx, el[dimension]()))
                })
            }
        })

        function traverseNode(node, fun) {
            fun(node)
            for (var i = 0, len = node.childNodes.length; i < len; i++)
                traverseNode(node.childNodes[i], fun)
        }

        // Generate the `after`, `prepend`, `before`, `append`,
        // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
        adjacencyOperators.forEach(function(operator, operatorIndex) {
            var inside = operatorIndex % 2 //=> prepend, append

            $.fn[operator] = function(){
                // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
                var argType, nodes = $.map(arguments, function(arg) {
                        argType = type(arg)
                        return argType == "object" || argType == "array" || arg == null ?
                            arg : zepto.fragment(arg)
                    }),
                    parent, copyByClone = this.length > 1
                if (nodes.length < 1) return this

                return this.each(function(_, target){
                    parent = inside ? target : target.parentNode

                    // convert all methods to a "before" operation
                    target = operatorIndex == 0 ? target.nextSibling :
                        operatorIndex == 1 ? target.firstChild :
                            operatorIndex == 2 ? target :
                                null

                    var parentInDocument = $.contains(document.documentElement, parent)

                    nodes.forEach(function(node){
                        if (copyByClone) node = node.cloneNode(true)
                        else if (!parent) return $(node).remove()

                        parent.insertBefore(node, target)
                        if (parentInDocument) traverseNode(node, function(el){
                            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                                (!el.type || el.type === 'text/javascript') && !el.src)
                                window['eval'].call(window, el.innerHTML)
                        })
                    })
                })
            }

            // after    => insertAfter
            // prepend  => prependTo
            // before   => insertBefore
            // append   => appendTo
            $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
                $(html)[operator](this)
                return this
            }
        })

        zepto.Z.prototype = Z.prototype = $.fn

        // Export internal API functions in the `$.zepto` namespace
        zepto.uniq = uniq
        zepto.deserializeValue = deserializeValue
        $.zepto = zepto

        return $
    })()

    window.Zepto = Zepto
    window.$ === undefined && (window.$ = Zepto)

    ;(function($){
        var _zid = 1, undefined,
            slice = Array.prototype.slice,
            isFunction = $.isFunction,
            isString = function(obj){ return typeof obj == 'string' },
            handlers = {},
            specialEvents={},
            focusinSupported = 'onfocusin' in window,
            focus = { focus: 'focusin', blur: 'focusout' },
            hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

        specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

        function zid(element) {
            return element._zid || (element._zid = _zid++)
        }
        function findHandlers(element, event, fn, selector) {
            event = parse(event)
            if (event.ns) var matcher = matcherFor(event.ns)
            return (handlers[zid(element)] || []).filter(function(handler) {
                return handler
                    && (!event.e  || handler.e == event.e)
                    && (!event.ns || matcher.test(handler.ns))
                    && (!fn       || zid(handler.fn) === zid(fn))
                    && (!selector || handler.sel == selector)
            })
        }
        function parse(event) {
            var parts = ('' + event).split('.')
            return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
        }
        function matcherFor(ns) {
            return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
        }

        function eventCapture(handler, captureSetting) {
            return handler.del &&
                (!focusinSupported && (handler.e in focus)) ||
                !!captureSetting
        }

        function realEvent(type) {
            return hover[type] || (focusinSupported && focus[type]) || type
        }

        function add(element, events, fn, data, selector, delegator, capture){
            var id = zid(element), set = (handlers[id] || (handlers[id] = []))
            events.split(/\s/).forEach(function(event){
                if (event == 'ready') return $(document).ready(fn)
                var handler   = parse(event)
                handler.fn    = fn
                handler.sel   = selector
                // emulate mouseenter, mouseleave
                if (handler.e in hover) fn = function(e){
                    var related = e.relatedTarget
                    if (!related || (related !== this && !$.contains(this, related)))
                        return handler.fn.apply(this, arguments)
                }
                handler.del   = delegator
                var callback  = delegator || fn
                handler.proxy = function(e){
                    e = compatible(e)
                    if (e.isImmediatePropagationStopped()) return
                    e.data = data
                    var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
                    if (result === false) e.preventDefault(), e.stopPropagation()
                    return result
                }
                handler.i = set.length
                set.push(handler)
                if ('addEventListener' in element)
                    element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
            })
        }
        function remove(element, events, fn, selector, capture){
            var id = zid(element)
                ;(events || '').split(/\s/).forEach(function(event){
                findHandlers(element, event, fn, selector).forEach(function(handler){
                    delete handlers[id][handler.i]
                    if ('removeEventListener' in element)
                        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
                })
            })
        }

        $.event = { add: add, remove: remove }

        $.proxy = function(fn, context) {
            var args = (2 in arguments) && slice.call(arguments, 2)
            if (isFunction(fn)) {
                var proxyFn = function(){ return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments) }
                proxyFn._zid = zid(fn)
                return proxyFn
            } else if (isString(context)) {
                if (args) {
                    args.unshift(fn[context], fn)
                    return $.proxy.apply(null, args)
                } else {
                    return $.proxy(fn[context], fn)
                }
            } else {
                throw new TypeError("expected function")
            }
        }

        $.fn.bind = function(event, data, callback){
            return this.on(event, data, callback)
        }
        $.fn.unbind = function(event, callback){
            return this.off(event, callback)
        }
        $.fn.one = function(event, selector, data, callback){
            return this.on(event, selector, data, callback, 1)
        }

        var returnTrue = function(){return true},
            returnFalse = function(){return false},
            ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
            eventMethods = {
                preventDefault: 'isDefaultPrevented',
                stopImmediatePropagation: 'isImmediatePropagationStopped',
                stopPropagation: 'isPropagationStopped'
            }

        function compatible(event, source) {
            if (source || !event.isDefaultPrevented) {
                source || (source = event)

                $.each(eventMethods, function(name, predicate) {
                    var sourceMethod = source[name]
                    event[name] = function(){
                        this[predicate] = returnTrue
                        return sourceMethod && sourceMethod.apply(source, arguments)
                    }
                    event[predicate] = returnFalse
                })

                if (source.defaultPrevented !== undefined ? source.defaultPrevented :
                        'returnValue' in source ? source.returnValue === false :
                        source.getPreventDefault && source.getPreventDefault())
                    event.isDefaultPrevented = returnTrue
            }
            return event
        }

        function createProxy(event) {
            var key, proxy = { originalEvent: event }
            for (key in event)
                if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

            return compatible(proxy, event)
        }

        $.fn.delegate = function(selector, event, callback){
            return this.on(event, selector, callback)
        }
        $.fn.undelegate = function(selector, event, callback){
            return this.off(event, selector, callback)
        }

        $.fn.live = function(event, callback){
            $(document.body).delegate(this.selector, event, callback)
            return this
        }
        $.fn.die = function(event, callback){
            $(document.body).undelegate(this.selector, event, callback)
            return this
        }

        $.fn.on = function(event, selector, data, callback, one){
            var autoRemove, delegator, $this = this
            if (event && !isString(event)) {
                $.each(event, function(type, fn){
                    $this.on(type, selector, data, fn, one)
                })
                return $this
            }

            if (!isString(selector) && !isFunction(callback) && callback !== false)
                callback = data, data = selector, selector = undefined
            if (callback === undefined || data === false)
                callback = data, data = undefined

            if (callback === false) callback = returnFalse

            return $this.each(function(_, element){
                if (one) autoRemove = function(e){
                    remove(element, e.type, callback)
                    return callback.apply(this, arguments)
                }

                if (selector) delegator = function(e){
                    var evt, match = $(e.target).closest(selector, element).get(0)
                    if (match && match !== element) {
                        evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
                        return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
                    }
                }

                add(element, event, callback, data, selector, delegator || autoRemove)
            })
        }
        $.fn.off = function(event, selector, callback){
            var $this = this
            if (event && !isString(event)) {
                $.each(event, function(type, fn){
                    $this.off(type, selector, fn)
                })
                return $this
            }

            if (!isString(selector) && !isFunction(callback) && callback !== false)
                callback = selector, selector = undefined

            if (callback === false) callback = returnFalse

            return $this.each(function(){
                remove(this, event, callback, selector)
            })
        }

        $.fn.trigger = function(event, args){
            event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
            event._args = args
            return this.each(function(){
                // handle focus(), blur() by calling them directly
                if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
                // items in the collection might not be DOM elements
                else if ('dispatchEvent' in this) this.dispatchEvent(event)
                else $(this).triggerHandler(event, args)
            })
        }

        // triggers event handlers on current element just as if an event occurred,
        // doesn't trigger an actual event, doesn't bubble
        $.fn.triggerHandler = function(event, args){
            var e, result
            this.each(function(i, element){
                e = createProxy(isString(event) ? $.Event(event) : event)
                e._args = args
                e.target = element
                $.each(findHandlers(element, event.type || event), function(i, handler){
                    result = handler.proxy(e)
                    if (e.isImmediatePropagationStopped()) return false
                })
            })
            return result
        }

            // shortcut methods for `.bind(event, fn)` for each event type
        ;('focusin focusout focus blur load resize scroll unload click dblclick '+
        'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
        'change select keydown keypress keyup error').split(' ').forEach(function(event) {
                $.fn[event] = function(callback) {
                    return (0 in arguments) ?
                        this.bind(event, callback) :
                        this.trigger(event)
                }
            })

        $.Event = function(type, props) {
            if (!isString(type)) props = type, type = props.type
            var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
            if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
            event.initEvent(type, bubbles, true)
            return compatible(event)
        }

    })(Zepto)

    ;(function($){
        var jsonpID = 0,
            document = window.document,
            key,
            name,
            rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            scriptTypeRE = /^(?:text|application)\/javascript/i,
            xmlTypeRE = /^(?:text|application)\/xml/i,
            jsonType = 'application/json',
            htmlType = 'text/html',
            blankRE = /^\s*$/,
            originAnchor = document.createElement('a')

        originAnchor.href = window.location.href

        // trigger a custom event and return false if it was cancelled
        function triggerAndReturn(context, eventName, data) {
            var event = $.Event(eventName)
            $(context).trigger(event, data)
            return !event.isDefaultPrevented()
        }

        // trigger an Ajax "global" event
        function triggerGlobal(settings, context, eventName, data) {
            if (settings.global) return triggerAndReturn(context || document, eventName, data)
        }

        // Number of active Ajax requests
        $.active = 0

        function ajaxStart(settings) {
            if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
        }
        function ajaxStop(settings) {
            if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
        }

        // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
        function ajaxBeforeSend(xhr, settings) {
            var context = settings.context
            if (settings.beforeSend.call(context, xhr, settings) === false ||
                triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
                return false

            triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
        }
        function ajaxSuccess(data, xhr, settings, deferred) {
            var context = settings.context, status = 'success'
            settings.success.call(context, data, status, xhr)
            if (deferred) deferred.resolveWith(context, [data, status, xhr])
            triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
            ajaxComplete(status, xhr, settings)
        }
        // type: "timeout", "error", "abort", "parsererror"
        function ajaxError(error, type, xhr, settings, deferred) {
            var context = settings.context
            settings.error.call(context, xhr, type, error)
            if (deferred) deferred.rejectWith(context, [xhr, type, error])
            triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type])
            ajaxComplete(type, xhr, settings)
        }
        // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
        function ajaxComplete(status, xhr, settings) {
            var context = settings.context
            settings.complete.call(context, xhr, status)
            triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
            ajaxStop(settings)
        }

        // Empty function, used as default callback
        function empty() {}

        $.ajaxJSONP = function(options, deferred){
            if (!('type' in options)) return $.ajax(options)

            var _callbackName = options.jsonpCallback,
                callbackName = ($.isFunction(_callbackName) ?
                        _callbackName() : _callbackName) || ('jsonp' + (++jsonpID)),
                script = document.createElement('script'),
                originalCallback = window[callbackName],
                responseData,
                abort = function(errorType) {
                    $(script).triggerHandler('error', errorType || 'abort')
                },
                xhr = { abort: abort }, abortTimeout

            if (deferred) deferred.promise(xhr)

            $(script).on('load error', function(e, errorType){
                clearTimeout(abortTimeout)
                $(script).off().remove()

                if (e.type == 'error' || !responseData) {
                    ajaxError(null, errorType || 'error', xhr, options, deferred)
                } else {
                    ajaxSuccess(responseData[0], xhr, options, deferred)
                }

                window[callbackName] = originalCallback
                if (responseData && $.isFunction(originalCallback))
                    originalCallback(responseData[0])

                originalCallback = responseData = undefined
            })

            if (ajaxBeforeSend(xhr, options) === false) {
                abort('abort')
                return xhr
            }

            window[callbackName] = function(){
                responseData = arguments
            }

            script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
            document.head.appendChild(script)

            if (options.timeout > 0) abortTimeout = setTimeout(function(){
                abort('timeout')
            }, options.timeout)

            return xhr
        }

        $.ajaxSettings = {
            // Default type of request
            type: 'GET',
            // Callback that is executed before request
            beforeSend: empty,
            // Callback that is executed if the request succeeds
            success: empty,
            // Callback that is executed the the server drops error
            error: empty,
            // Callback that is executed on request complete (both: error and success)
            complete: empty,
            // The context for the callbacks
            context: null,
            // Whether to trigger "global" Ajax events
            global: true,
            // Transport
            xhr: function () {
                return new window.XMLHttpRequest()
            },
            // MIME types mapping
            // IIS returns Javascript as "application/x-javascript"
            accepts: {
                script: 'text/javascript, application/javascript, application/x-javascript',
                json:   jsonType,
                xml:    'application/xml, text/xml',
                html:   htmlType,
                text:   'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
            // Default timeout
            timeout: 0,
            // Whether data should be serialized to string
            processData: true,
            // Whether the browser should be allowed to cache GET responses
            cache: true
        }

        function mimeToDataType(mime) {
            if (mime) mime = mime.split(';', 2)[0]
            return mime && ( mime == htmlType ? 'html' :
                    mime == jsonType ? 'json' :
                        scriptTypeRE.test(mime) ? 'script' :
                        xmlTypeRE.test(mime) && 'xml' ) || 'text'
        }

        function appendQuery(url, query) {
            if (query == '') return url
            return (url + '&' + query).replace(/[&?]{1,2}/, '?')
        }

        // serialize payload and append it to the URL for GET requests
        function serializeData(options) {
            if (options.processData && options.data && $.type(options.data) != "string")
                options.data = $.param(options.data, options.traditional)
            if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
                options.url = appendQuery(options.url, options.data), options.data = undefined
        }

        $.ajax = function(options){
            var settings = $.extend({}, options || {}),
                deferred = $.Deferred && $.Deferred(),
                urlAnchor, hashIndex
            for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

            ajaxStart(settings)

            if (!settings.crossDomain) {
                urlAnchor = document.createElement('a')
                urlAnchor.href = settings.url
                // cleans up URL for .href (IE only), see https://github.com/madrobby/zepto/pull/1049
                urlAnchor.href = urlAnchor.href
                settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host)
            }

            if (!settings.url) settings.url = window.location.toString()
            if ((hashIndex = settings.url.indexOf('#')) > -1) settings.url = settings.url.slice(0, hashIndex)
            serializeData(settings)

            var dataType = settings.dataType, hasPlaceholder = /\?.+=\?/.test(settings.url)
            if (hasPlaceholder) dataType = 'jsonp'

            if (settings.cache === false || (
                (!options || options.cache !== true) &&
                ('script' == dataType || 'jsonp' == dataType)
                ))
                settings.url = appendQuery(settings.url, '_=' + Date.now())

            if ('jsonp' == dataType) {
                if (!hasPlaceholder)
                    settings.url = appendQuery(settings.url,
                        settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?')
                return $.ajaxJSONP(settings, deferred)
            }

            var mime = settings.accepts[dataType],
                headers = { },
                setHeader = function(name, value) { headers[name.toLowerCase()] = [name, value] },
                protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
                xhr = settings.xhr(),
                nativeSetHeader = xhr.setRequestHeader,
                abortTimeout

            if (deferred) deferred.promise(xhr)

            if (!settings.crossDomain) setHeader('X-Requested-With', 'XMLHttpRequest')
            setHeader('Accept', mime || '*/*')
            if (mime = settings.mimeType || mime) {
                if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
                xhr.overrideMimeType && xhr.overrideMimeType(mime)
            }
            if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
                setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded')

            if (settings.headers) for (name in settings.headers) setHeader(name, settings.headers[name])
            xhr.setRequestHeader = setHeader

            xhr.onreadystatechange = function(){
                if (xhr.readyState == 4) {
                    xhr.onreadystatechange = empty
                    clearTimeout(abortTimeout)
                    var result, error = false
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
                        dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'))
                        result = xhr.responseText

                        try {
                            // http://perfectionkills.com/global-eval-what-are-the-options/
                            if (dataType == 'script')    (1,eval)(result)
                            else if (dataType == 'xml')  result = xhr.responseXML
                            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
                        } catch (e) { error = e }

                        if (error) ajaxError(error, 'parsererror', xhr, settings, deferred)
                        else ajaxSuccess(result, xhr, settings, deferred)
                    } else {
                        ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred)
                    }
                }
            }

            if (ajaxBeforeSend(xhr, settings) === false) {
                xhr.abort()
                ajaxError(null, 'abort', xhr, settings, deferred)
                return xhr
            }

            if (settings.xhrFields) for (name in settings.xhrFields) xhr[name] = settings.xhrFields[name]

            var async = 'async' in settings ? settings.async : true
            xhr.open(settings.type, settings.url, async, settings.username, settings.password)

            for (name in headers) nativeSetHeader.apply(xhr, headers[name])

            if (settings.timeout > 0) abortTimeout = setTimeout(function(){
                xhr.onreadystatechange = empty
                xhr.abort()
                ajaxError(null, 'timeout', xhr, settings, deferred)
            }, settings.timeout)

            // avoid sending empty string (#319)
            xhr.send(settings.data ? settings.data : null)
            return xhr
        }

        // handle optional data/success arguments
        function parseArguments(url, data, success, dataType) {
            if ($.isFunction(data)) dataType = success, success = data, data = undefined
            if (!$.isFunction(success)) dataType = success, success = undefined
            return {
                url: url
                , data: data
                , success: success
                , dataType: dataType
            }
        }

        $.get = function(/* url, data, success, dataType */){
            return $.ajax(parseArguments.apply(null, arguments))
        }

        $.post = function(/* url, data, success, dataType */){
            var options = parseArguments.apply(null, arguments)
            options.type = 'POST'
            return $.ajax(options)
        }

        $.getJSON = function(/* url, data, success */){
            var options = parseArguments.apply(null, arguments)
            options.dataType = 'json'
            return $.ajax(options)
        }

        $.fn.load = function(url, data, success){
            if (!this.length) return this
            var self = this, parts = url.split(/\s/), selector,
                options = parseArguments(url, data, success),
                callback = options.success
            if (parts.length > 1) options.url = parts[0], selector = parts[1]
            options.success = function(response){
                self.html(selector ?
                    $('<div>').html(response.replace(rscript, "")).find(selector)
                    : response)
                callback && callback.apply(self, arguments)
            }
            $.ajax(options)
            return this
        }

        var escape = encodeURIComponent

        function serialize(params, obj, traditional, scope){
            var type, array = $.isArray(obj), hash = $.isPlainObject(obj)
            $.each(obj, function(key, value) {
                type = $.type(value)
                if (scope) key = traditional ? scope :
                scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']'
                // handle data in serializeArray() format
                if (!scope && array) params.add(value.name, value.value)
                // recurse into nested objects
                else if (type == "array" || (!traditional && type == "object"))
                    serialize(params, value, traditional, key)
                else params.add(key, value)
            })
        }

        $.param = function(obj, traditional){
            var params = []
            params.add = function(key, value) {
                if ($.isFunction(value)) value = value()
                if (value == null) value = ""
                this.push(escape(key) + '=' + escape(value))
            }
            serialize(params, obj, traditional)
            return params.join('&').replace(/%20/g, '+')
        }
    })(Zepto)

    ;(function($){
        $.fn.serializeArray = function() {
            var name, type, result = [],
                add = function(value) {
                    if (value.forEach) return value.forEach(add)
                    result.push({ name: name, value: value })
                }
            if (this[0]) $.each(this[0].elements, function(_, field){
                type = field.type, name = field.name
                if (name && field.nodeName.toLowerCase() != 'fieldset' &&
                    !field.disabled && type != 'submit' && type != 'reset' && type != 'button' && type != 'file' &&
                    ((type != 'radio' && type != 'checkbox') || field.checked))
                    add($(field).val())
            })
            return result
        }

        $.fn.serialize = function(){
            var result = []
            this.serializeArray().forEach(function(elm){
                result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
            })
            return result.join('&')
        }

        $.fn.submit = function(callback) {
            if (0 in arguments) this.bind('submit', callback)
            else if (this.length) {
                var event = $.Event('submit')
                this.eq(0).trigger(event)
                if (!event.isDefaultPrevented()) this.get(0).submit()
            }
            return this
        }

    })(Zepto)

    ;(function(){
        // getComputedStyle shouldn't freak out when called
        // without a valid element as argument
        try {
            getComputedStyle(undefined)
        } catch(e) {
            var nativeGetComputedStyle = getComputedStyle;
            window.getComputedStyle = function(element){
                try {
                    return nativeGetComputedStyle(element)
                } catch(e) {
                    return null
                }
            }
        }
    })()

    ;(function($){
        function detect(ua, platform){
            var os = this.os = {}, browser = this.browser = {},
                webkit = ua.match(/Web[kK]it[\/]{0,1}([\d.]+)/),
                android = ua.match(/(Android);?[\s\/]+([\d.]+)?/),
                osx = !!ua.match(/\(Macintosh\; Intel /),
                ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
                ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/),
                iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
                webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
                win = /Win\d{2}|Windows/.test(platform),
                wp = ua.match(/Windows Phone ([\d.]+)/),
                touchpad = webos && ua.match(/TouchPad/),
                kindle = ua.match(/Kindle\/([\d.]+)/),
                silk = ua.match(/Silk\/([\d._]+)/),
                blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
                bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
                rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
                playbook = ua.match(/PlayBook/),
                chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
                firefox = ua.match(/Firefox\/([\d.]+)/),
                firefoxos = ua.match(/\((?:Mobile|Tablet); rv:([\d.]+)\).*Firefox\/[\d.]+/),
                ie = ua.match(/MSIE\s([\d.]+)/) || ua.match(/Trident\/[\d](?=[^\?]+).*rv:([0-9.].)/),
                webview = !chrome && ua.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/),
                safari = webview || ua.match(/Version\/([\d.]+)([^S](Safari)|[^M]*(Mobile)[^S]*(Safari))/)

            // Todo: clean this up with a better OS/browser seperation:
            // - discern (more) between multiple browsers on android
            // - decide if kindle fire in silk mode is android or not
            // - Firefox on Android doesn't specify the Android version
            // - possibly devide in os, device and browser hashes

            if (browser.webkit = !!webkit) browser.version = webkit[1]

            if (android) os.android = true, os.version = android[2]
            if (iphone && !ipod) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
            if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
            if (ipod) os.ios = os.ipod = true, os.version = ipod[3] ? ipod[3].replace(/_/g, '.') : null
            if (wp) os.wp = true, os.version = wp[1]
            if (webos) os.webos = true, os.version = webos[2]
            if (touchpad) os.touchpad = true
            if (blackberry) os.blackberry = true, os.version = blackberry[2]
            if (bb10) os.bb10 = true, os.version = bb10[2]
            if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
            if (playbook) browser.playbook = true
            if (kindle) os.kindle = true, os.version = kindle[1]
            if (silk) browser.silk = true, browser.version = silk[1]
            if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
            if (chrome) browser.chrome = true, browser.version = chrome[1]
            if (firefox) browser.firefox = true, browser.version = firefox[1]
            if (firefoxos) os.firefoxos = true, os.version = firefoxos[1]
            if (ie) browser.ie = true, browser.version = ie[1]
            if (safari && (osx || os.ios || win)) {
                browser.safari = true
                if (!os.ios) browser.version = safari[1]
            }
            if (webview) browser.webview = true

            os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) ||
            (firefox && ua.match(/Tablet/)) || (ie && !ua.match(/Phone/) && ua.match(/Touch/)))
            os.phone  = !!(!os.tablet && !os.ipod && (android || iphone || webos || blackberry || bb10 ||
            (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) ||
            (firefox && ua.match(/Mobile/)) || (ie && ua.match(/Touch/))))
        }

        detect.call($, navigator.userAgent, navigator.platform)
        // make available to unit tests
        $.__detect = detect

    })(Zepto)

    ;(function($, undefined){
        var prefix = '', eventPrefix,
            vendors = { Webkit: 'webkit', Moz: '', O: 'o' },
            testEl = document.createElement('div'),
            supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
            transform,
            transitionProperty, transitionDuration, transitionTiming, transitionDelay,
            animationName, animationDuration, animationTiming, animationDelay,
            cssReset = {}

        function dasherize(str) { return str.replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase() }
        function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : name.toLowerCase() }

        $.each(vendors, function(vendor, event){
            if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
                prefix = '-' + vendor.toLowerCase() + '-'
                eventPrefix = event
                return false
            }
        })

        transform = prefix + 'transform'
        cssReset[transitionProperty = prefix + 'transition-property'] =
            cssReset[transitionDuration = prefix + 'transition-duration'] =
                cssReset[transitionDelay    = prefix + 'transition-delay'] =
                    cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
                        cssReset[animationName      = prefix + 'animation-name'] =
                            cssReset[animationDuration  = prefix + 'animation-duration'] =
                                cssReset[animationDelay     = prefix + 'animation-delay'] =
                                    cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

        $.fx = {
            off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
            speeds: { _default: 400, fast: 200, slow: 600 },
            cssPrefix: prefix,
            transitionEnd: normalizeEvent('TransitionEnd'),
            animationEnd: normalizeEvent('AnimationEnd')
        }

        $.fn.animate = function(properties, duration, ease, callback, delay){
            if ($.isFunction(duration))
                callback = duration, ease = undefined, duration = undefined
            if ($.isFunction(ease))
                callback = ease, ease = undefined
            if ($.isPlainObject(duration))
                ease = duration.easing, callback = duration.complete, delay = duration.delay, duration = duration.duration
            if (duration) duration = (typeof duration == 'number' ? duration :
                ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
            if (delay) delay = parseFloat(delay) / 1000
            return this.anim(properties, duration, ease, callback, delay)
        }

        $.fn.anim = function(properties, duration, ease, callback, delay){
            var key, cssValues = {}, cssProperties, transforms = '',
                that = this, wrappedCallback, endEvent = $.fx.transitionEnd,
                fired = false

            if (duration === undefined) duration = $.fx.speeds._default / 1000
            if (delay === undefined) delay = 0
            if ($.fx.off) duration = 0

            if (typeof properties == 'string') {
                // keyframe animation
                cssValues[animationName] = properties
                cssValues[animationDuration] = duration + 's'
                cssValues[animationDelay] = delay + 's'
                cssValues[animationTiming] = (ease || 'linear')
                endEvent = $.fx.animationEnd
            } else {
                cssProperties = []
                // CSS transitions
                for (key in properties)
                    if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
                    else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

                if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
                if (duration > 0 && typeof properties === 'object') {
                    cssValues[transitionProperty] = cssProperties.join(', ')
                    cssValues[transitionDuration] = duration + 's'
                    cssValues[transitionDelay] = delay + 's'
                    cssValues[transitionTiming] = (ease || 'linear')
                }
            }

            wrappedCallback = function(event){
                if (typeof event !== 'undefined') {
                    if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
                    $(event.target).unbind(endEvent, wrappedCallback)
                } else
                    $(this).unbind(endEvent, wrappedCallback) // triggered by setTimeout

                fired = true
                $(this).css(cssReset)
                callback && callback.call(this)
            }
            if (duration > 0){
                this.bind(endEvent, wrappedCallback)
                // transitionEnd is not always firing on older Android phones
                // so make sure it gets fired
                setTimeout(function(){
                    if (fired) return
                    wrappedCallback.call(that)
                }, ((duration + delay) * 1000) + 25)
            }

            // trigger page reflow so new elements can animate
            this.size() && this.get(0).clientLeft

            this.css(cssValues)

            if (duration <= 0) setTimeout(function() {
                that.each(function(){ wrappedCallback.call(this) })
            }, 0)

            return this
        }

        testEl = null
    })(Zepto)

    ;(function($){
        var touch = {},
            touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
            longTapDelay = 750,
            gesture

        function swipeDirection(x1, x2, y1, y2) {
            return Math.abs(x1 - x2) >=
            Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
        }

        function longTap() {
            longTapTimeout = null
            if (touch.last) {
                touch.el.trigger('longTap')
                touch = {}
            }
        }

        function cancelLongTap() {
            if (longTapTimeout) clearTimeout(longTapTimeout)
            longTapTimeout = null
        }

        function cancelAll() {
            if (touchTimeout) clearTimeout(touchTimeout)
            if (tapTimeout) clearTimeout(tapTimeout)
            if (swipeTimeout) clearTimeout(swipeTimeout)
            if (longTapTimeout) clearTimeout(longTapTimeout)
            touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
            touch = {}
        }

        function isPrimaryTouch(event){
            return (event.pointerType == 'touch' ||
                event.pointerType == event.MSPOINTER_TYPE_TOUCH)
                && event.isPrimary
        }

        function isPointerEventType(e, type){
            return (e.type == 'pointer'+type ||
            e.type.toLowerCase() == 'mspointer'+type)
        }

        $(document).ready(function(){
            var now, delta, deltaX = 0, deltaY = 0, firstTouch, _isPointerType

            if ('MSGesture' in window) {
                gesture = new MSGesture()
                gesture.target = document.body
            }

            $(document)
                .bind('MSGestureEnd', function(e){
                    var swipeDirectionFromVelocity =
                        e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null;
                    if (swipeDirectionFromVelocity) {
                        touch.el.trigger('swipe')
                        touch.el.trigger('swipe'+ swipeDirectionFromVelocity)
                    }
                })
                .on('touchstart MSPointerDown pointerdown', function(e){
                    if((_isPointerType = isPointerEventType(e, 'down')) &&
                        !isPrimaryTouch(e)) return
                    firstTouch = _isPointerType ? e : e.touches[0]
                    if (e.touches && e.touches.length === 1 && touch.x2) {
                        // Clear out touch movement data if we have it sticking around
                        // This can occur if touchcancel doesn't fire due to preventDefault, etc.
                        touch.x2 = undefined
                        touch.y2 = undefined
                    }
                    now = Date.now()
                    delta = now - (touch.last || now)
                    touch.el = $('tagName' in firstTouch.target ?
                        firstTouch.target : firstTouch.target.parentNode)
                    touchTimeout && clearTimeout(touchTimeout)
                    touch.x1 = firstTouch.pageX
                    touch.y1 = firstTouch.pageY
                    if (delta > 0 && delta <= 250) touch.isDoubleTap = true
                    touch.last = now
                    longTapTimeout = setTimeout(longTap, longTapDelay)
                    // adds the current touch contact for IE gesture recognition
                    if (gesture && _isPointerType) gesture.addPointer(e.pointerId);
                })
                .on('touchmove MSPointerMove pointermove', function(e){
                    if((_isPointerType = isPointerEventType(e, 'move')) &&
                        !isPrimaryTouch(e)) return
                    firstTouch = _isPointerType ? e : e.touches[0]
                    cancelLongTap()
                    touch.x2 = firstTouch.pageX
                    touch.y2 = firstTouch.pageY

                    deltaX += Math.abs(touch.x1 - touch.x2)
                    deltaY += Math.abs(touch.y1 - touch.y2)
                })
                .on('touchend MSPointerUp pointerup', function(e){
                    if((_isPointerType = isPointerEventType(e, 'up')) &&
                        !isPrimaryTouch(e)) return
                    cancelLongTap()

                    // swipe
                    if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                        (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

                        swipeTimeout = setTimeout(function() {
                            touch.el.trigger('swipe')
                            touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
                            touch = {}
                        }, 0)

                    // normal tap
                    else if ('last' in touch)
                    // don't fire tap when delta position changed by more than 30 pixels,
                    // for instance when moving to a point and back to origin
                        if (deltaX < 30 && deltaY < 30) {
                            // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
                            // ('tap' fires before 'scroll')
                            tapTimeout = setTimeout(function() {

                                // trigger universal 'tap' with the option to cancelTouch()
                                // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
                                var event = $.Event('tap')
                                event.cancelTouch = cancelAll
                                touch.el.trigger(event)

                                // trigger double tap immediately
                                if (touch.isDoubleTap) {
                                    if (touch.el) touch.el.trigger('doubleTap')
                                    touch = {}
                                }

                                // trigger single tap after 250ms of inactivity
                                else {
                                    touchTimeout = setTimeout(function(){
                                        touchTimeout = null
                                        if (touch.el) touch.el.trigger('singleTap')
                                        touch = {}
                                    }, 250)
                                }
                            }, 0)
                        } else {
                            touch = {}
                        }
                    deltaX = deltaY = 0

                })
                // when the browser window loses focus,
                // for example when a modal dialog is shown,
                // cancel all ongoing events
                .on('touchcancel MSPointerCancel pointercancel', cancelAll)

            // scrolling the window indicates intention of the user
            // to scroll, not tap or swipe, so cancel all ongoing events
            $(window).on('scroll', cancelAll)
        })

        ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
            'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(eventName){
                $.fn[eventName] = function(callback){ return this.on(eventName, callback) }
            })
    })(Zepto)

    ;(function($){
        if ($.os.ios) {
            var gesture = {}, gestureTimeout

            function parentIfText(node){
                return 'tagName' in node ? node : node.parentNode
            }

            $(document).bind('gesturestart', function(e){
                var now = Date.now(), delta = now - (gesture.last || now)
                gesture.target = parentIfText(e.target)
                gestureTimeout && clearTimeout(gestureTimeout)
                gesture.e1 = e.scale
                gesture.last = now
            }).bind('gesturechange', function(e){
                gesture.e2 = e.scale
            }).bind('gestureend', function(e){
                if (gesture.e2 > 0) {
                    Math.abs(gesture.e1 - gesture.e2) != 0 && $(gesture.target).trigger('pinch') &&
                    $(gesture.target).trigger('pinch' + (gesture.e1 - gesture.e2 > 0 ? 'In' : 'Out'))
                    gesture.e1 = gesture.e2 = gesture.last = 0
                } else if ('last' in gesture) {
                    gesture = {}
                }
            })

            ;['pinch', 'pinchIn', 'pinchOut'].forEach(function(m){
                $.fn[m] = function(callback){ return this.bind(m, callback) }
            })
        }
    })(Zepto)

    ;(function($){
        var zepto = $.zepto, oldQsa = zepto.qsa, oldMatches = zepto.matches

        function visible(elem){
            elem = $(elem)
            return !!(elem.width() || elem.height()) && elem.css("display") !== "none"
        }

        // Implements a subset from:
        // http://api.jquery.com/category/selectors/jquery-selector-extensions/
        //
        // Each filter function receives the current index, all nodes in the
        // considered set, and a value if there were parentheses. The value
        // of `this` is the node currently being considered. The function returns the
        // resulting node(s), null, or undefined.
        //
        // Complex selectors are not supported:
        //   li:has(label:contains("foo")) + li:has(label:contains("bar"))
        //   ul.inner:first > li
        var filters = $.expr[':'] = {
            visible:  function(){ if (visible(this)) return this },
            hidden:   function(){ if (!visible(this)) return this },
            selected: function(){ if (this.selected) return this },
            checked:  function(){ if (this.checked) return this },
            parent:   function(){ return this.parentNode },
            first:    function(idx){ if (idx === 0) return this },
            last:     function(idx, nodes){ if (idx === nodes.length - 1) return this },
            eq:       function(idx, _, value){ if (idx === value) return this },
            contains: function(idx, _, text){ if ($(this).text().indexOf(text) > -1) return this },
            has:      function(idx, _, sel){ if (zepto.qsa(this, sel).length) return this }
        }

        var filterRe = new RegExp('(.*):(\\w+)(?:\\(([^)]+)\\))?$\\s*'),
            childRe  = /^\s*>/,
            classTag = 'Zepto' + (+new Date())

        function process(sel, fn) {
            // quote the hash in `a[href^=#]` expression
            sel = sel.replace(/=#\]/g, '="#"]')
            var filter, arg, match = filterRe.exec(sel)
            if (match && match[2] in filters) {
                filter = filters[match[2]], arg = match[3]
                sel = match[1]
                if (arg) {
                    var num = Number(arg)
                    if (isNaN(num)) arg = arg.replace(/^["']|["']$/g, '')
                    else arg = num
                }
            }
            return fn(sel, filter, arg)
        }

        zepto.qsa = function(node, selector) {
            return process(selector, function(sel, filter, arg){
                try {
                    var taggedParent
                    if (!sel && filter) sel = '*'
                    else if (childRe.test(sel))
                    // support "> *" child queries by tagging the parent node with a
                    // unique class and prepending that classname onto the selector
                        taggedParent = $(node).addClass(classTag), sel = '.'+classTag+' '+sel

                    var nodes = oldQsa(node, sel)
                } catch(e) {
                    console.error('error performing selector: %o', selector)
                    throw e
                } finally {
                    if (taggedParent) taggedParent.removeClass(classTag)
                }
                return !filter ? nodes :
                    zepto.uniq($.map(nodes, function(n, i){ return filter.call(n, i, nodes, arg) }))
            })
        }

        zepto.matches = function(node, selector){
            return process(selector, function(sel, filter, arg){
                return (!sel || oldMatches(node, sel)) &&
                    (!filter || filter.call(node, null, arg) === node)
            })
        }
    })(Zepto)

    /**
   * jQuery Unveil
   * A very lightweight jQuery plugin to lazy load images
   * http://luis-almeida.github.com/unveil
   *
   * Licensed under the MIT license.
   * Copyright 2013 Luís Almeida
   * https://github.com/luis-almeida
   */

  ;(function($) {

    $.fn.unveil = function(threshold, callback) {

      var $w = $(window),
          th = threshold || 0,
          retina = window.devicePixelRatio > 1,
          attrib = retina? "data-src-retina" : "data-src",
          images = this,
          loaded;

      this.one("unveil", function() {
        var source = this.getAttribute(attrib);
        source = source || this.getAttribute("data-src");
        if (source) {
          this.setAttribute("src", source);
          if (typeof callback === "function") callback.call(this);
        }
      });

      function unveil() {
        var inview = images.filter(function() {
          var $e = $(this);
          if ($e.is(":hidden")) return;

          var wt = $w.scrollTop(),
              wb = wt + $w.height(),
              et = $e.offset().top,
              eb = et + $e.height();

          return eb >= wt - th && et <= wb + th;
        });

        loaded = inview.trigger("unveil");
        images = images.not(loaded);
      }

      $w.on("scroll.unveil resize.unveil lookup.unveil", unveil);

      unveil();

      return this;

    };

  })(window.Zepto);
});
define('util/RequestAnimationFrame',['require','exports','module'],function(require, exports, module) {
    //http://notes.jetienne.com/2011/05/18/cancelRequestAnimFrame-for-paul-irish-requestAnimFrame.html
    window.cancelRequestAnimFrame = ( function() {
        return window.cancelAnimationFrame          ||
            window.webkitCancelRequestAnimationFrame    ||
            clearTimeout
    } )();    
    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            function(/* function */ callback, /* DOMElement */ element){
                return window.setTimeout(callback, 1000 / 60);
            };
    })();
});

define('util/Easing',['require','exports','module'],function(require, exports, module) {
    /**
     * http://www.robertpenner.com/easing/
     * http://www.gizma.com/easing/
     * 
     * t: current time
     * b: begInnIng value 
     * c: change In value 
     * d: duration
     **/
   
    // simple linear tweening - no easing, no acceleration
    Math.linearTween = function (t, b, c, d) {
        return c*t/d + b;
    };
            
    // quadratic easing in - accelerating from zero velocity
    Math.easeInQuad = function (t, b, c, d) {
        t /= d;
        return c*t*t + b;
    };
            
    // quadratic easing out - decelerating to zero velocity
    Math.easeOutQuad = function (t, b, c, d) {
        t /= d;
        return -c * t*(t-2) + b;
    };
    
    // quadratic easing in/out - acceleration until halfway, then deceleration
    Math.easeInOutQuad = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t + b;
        t--;
        return -c/2 * (t*(t-2) - 1) + b;
    };
    
    // cubic easing in - accelerating from zero velocity
    Math.easeInCubic = function (t, b, c, d) {
        t /= d;
        return c*t*t*t + b;
    };
    
    // cubic easing out - decelerating to zero velocity
    Math.easeOutCubic = function (t, b, c, d) {
        t /= d;
        t--;
        return c*(t*t*t + 1) + b;
    };
    
    // cubic easing in/out - acceleration until halfway, then deceleration
    Math.easeInOutCubic = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t*t + b;
        t -= 2;
        return c/2*(t*t*t + 2) + b;
    };
    // quartic easing in - accelerating from zero velocity
    Math.easeInQuart = function (t, b, c, d) {
        t /= d;
        return c*t*t*t*t + b;
    };
    
    // quartic easing out - decelerating to zero velocity
    Math.easeOutQuart = function (t, b, c, d) {
        t /= d;
        t--;
        return -c * (t*t*t*t - 1) + b;
    };
    
    // quartic easing in/out - acceleration until halfway, then deceleration
    Math.easeInOutQuart = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t*t*t + b;
        t -= 2;
        return -c/2 * (t*t*t*t - 2) + b;
    };
    // quintic easing in - accelerating from zero velocity
    Math.easeInQuint = function (t, b, c, d) {
        t /= d;
        return c*t*t*t*t*t + b;
    };
    
    // quintic easing out - decelerating to zero velocity
    Math.easeOutQuint = function (t, b, c, d) {
        t /= d;
        t--;
        return c*(t*t*t*t*t + 1) + b;
    };
    
    // quintic easing in/out - acceleration until halfway, then deceleration
    Math.easeInOutQuint = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t*t*t*t + b;
        t -= 2;
        return c/2*(t*t*t*t*t + 2) + b;
    };
    // sinusoidal easing in - accelerating from zero velocity
    Math.easeInSine = function (t, b, c, d) {
        return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    };
    
    // sinusoidal easing out - decelerating to zero velocity
    Math.easeOutSine = function (t, b, c, d) {
        return c * Math.sin(t/d * (Math.PI/2)) + b;
    };
    
    // sinusoidal easing in/out - accelerating until halfway, then decelerating
    Math.easeInOutSine = function (t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    };
    
    // exponential easing in - accelerating from zero velocity
    Math.easeInExpo = function (t, b, c, d) {
        return c * Math.pow( 2, 10 * (t/d - 1) ) + b;
    };
    
    // exponential easing out - decelerating to zero velocity
    Math.easeOutExpo = function (t, b, c, d) {
        return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
    };
    
    // exponential easing in/out - accelerating until halfway, then decelerating
    Math.easeInOutExpo = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
        t--;
        return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
    };
    // circular easing in - accelerating from zero velocity
    Math.easeInCirc = function (t, b, c, d) {
        t /= d;
        return -c * (Math.sqrt(1 - t*t) - 1) + b;
    };
    
    // circular easing out - decelerating to zero velocity
    Math.easeOutCirc = function (t, b, c, d) {
        t /= d;
        t--;
        return c * Math.sqrt(1 - t*t) + b;
    };
    
    // circular easing in/out - acceleration until halfway, then deceleration
    Math.easeInOutCirc = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
        t -= 2;
        return c/2 * (Math.sqrt(1 - t*t) + 1) + b;
    };
});

define('core/LocalStorage',['require','exports','module'],function(require, exports, module) {
    
    function localStorage(){
        var lcst = window.localStorage;
           
        /**
         * 读取
         * 
         * @method getLocalValue
         * @param {String} id item id
         * @return {String} value
         */
        function getLocalValue(id){
            if(lcst){
                return lcst[id];
            }else{
                return null;
            }
        }
        /**
         * 保存/更新
         * 
         * @method setLocalValue
         * @param {String}|{Object} id item id
         * @param {String} val value
         */
       function setLocalValue(id,val){
            if(lcst){
                if(typeof id==='object'){
                    for(var key in id){
                        id[key] && lcst.setItem(key,id[key]);
                    }
                }else{
                    lcst.setItem(id,val);
                }
            }
            return this;
        }
        /**
         * 删除
         * @param {Array}||{String} id
         */
        function removeLocalValue(id){
            if(lcst){
                if(typeof id==='object'){
                    for(var key in id){
                        lcst.removeItem(id[key]);
                    }
                }else{
                    lcst.removeItem(id);
                }
            }
            return this;
        }
        this.set = setLocalValue;
        this.get = getLocalValue;
        this.del = removeLocalValue;
    }
    
    return new localStorage;
});

define('core/Navigator',['require','exports','module'],function(require, exports, module) {
    var Navigator =(function(){
        var frame,
            androidReg = /Android/gi,
            isAndroid = androidReg.test(navigator.platform) || androidReg.test(navigator.userAgent);
        /**
         * iframe 元素
         * 
         * @property {Element} frame 
         */
        frame = null;
        /**
         * 创建iframe,帮助解决iOS的UIWebView没有JS API
         * 
         * @method getFrame
         * @return {Element} iframe
         */
        function getFrame(src){
            var _frame = document.createElement("iframe");
            _frame.setAttribute("style", "display:none;width:0;height:0;position: absolute;top:0;left:0;border:0;");
            _frame.setAttribute("height","0px");
            _frame.setAttribute("width","0px");
            _frame.setAttribute("frameborder","0");
            if(src){
                _frame.setAttribute("src",src);
            }else{
                document.documentElement.appendChild(_frame);
            }
            return _frame;
        }
        /**
         * 删除iframe 
         * 
         * @method removeFrame
         * @param {Element} frame 执行的方法
         */
        function removeFrame(frame){
            frame && frame.parentNode.removeChild(frame);
        }
        /**
         * 执行与客户端交互方法的命令
         * 
         * @method excute
         * @param {String} ns 与客户端交互的协议server/类Class
         * @param {String} fn 执行的方法
         * @param {Object} option 参数
         * @param {boolean} single 是否是使用独立的iframe,默认false
         * @param {boolean} noframe 是否不通过iframe,默认false
         */
        function excute(ns,fn,option,single,noframe){
            var data,command;
            data = option?JSON.stringify(option):'';//将JSON转换成字符串
            if(ns && (typeof ns=='object') && ns[fn]){//android
                ns[fn](data);   
            }else{//iOS
                command = ns;
                if(typeof fn=='string' && fn.length>0){
                    command += fn+'/'+data;
                }
                protocol(command,single,noframe);
            }
        }
        /**
         * 执行与客户端交互的协议
         * 
         * @method protocol
         * @param {String} command 执行的协议及命令
         * @param {boolean} single 是否是使用独立的iframe,默认false
         * @param {boolean} noframe 是否不通过iframe,默认false
         */                
       function protocol(command,single,noframe){
            var _frame,timer;
            //不通过iframe
            if(noframe){window.location.href = command;return;}
            //通过iframe
            if(single){
                if(isAndroid){
                    _frame = getFrame();
                    _frame.setAttribute("src", command);
                }else{
                    _frame = getFrame(command);
                    document.documentElement.appendChild(_frame);
                }
               timer = setTimeout(function(){
                    _frame && removeFrame(_frame);
               },30000);
               _frame.onload = _frame.onreadystatechange = function(){
                   timer && clearTimeout(timer);
                   _frame && removeFrame(_frame);
               }
            }else{
                frame = frame || getFrame();
                frame.setAttribute("src", command);
            }
        }           
        return {
            protocol: protocol,
            excute: excute
        } 
    })();//end Object Navigator
    
    return Navigator;
});

define('core/Subject',['require','exports','module'],function(require, exports, module) {
    function Subject(subject){
        this._subject = subject;
        this.observers = [];
    }
    Subject.prototype = {
        /**
         * @param {Function}|{Boject} observer
         */
        register: function(observer){
            if(!observer){
                throw new Error('An observer can not be undefined!');
            }else if(typeof observer === 'object' && typeof observer.update !== 'function'){
                throw {
                    name: 'Error',
                    method: 'Subject.register',
                    message: 'An observer object can not register without an update method!'
                }
            }
            this.unregister(observer);//防止重复注册
            this.observers.push(observer);
            return this;
        },
        /**
         * @param {Function}|{Boject} observer
         */        
        unregister: function(observer){
            this.observers = this.observers.filter(function(obsv){
                if(obsv !== observer){
                    return obsv;
                }
            });
            return this;
       },
       notify: function(){
           var args = [].slice.call(arguments);
           this.observers.forEach(function(obsv){
                if(typeof obsv === 'function'){
                    obsv.apply(obsv, args);
                }else{
                    obsv.update.apply(obsv, args);
                }
           });
           return this;
        }
    }
    return Subject;
});

define('core/MicroTmpl',['require','exports','module'],function(require, exports, module) {
    /**
     * 模板解析
     * 1. 可接收 DOM Element,不支持 DOM Element 模板里嵌套模板
     * 2. 如果 DOM Element 中的元素的属性可加前缀micro-(或ntes-)，如img的src改为micro-src；及内样式style改为micro-style。以避免模板没有使用前生效。最终模板将会替换掉micro-(或ntes-)前缀。
     *
     * e.g.
     * <section>
     *     <script type="text/html">
     *     <h1><%=TITLE%></h1>
     *     <% for(var i=0;i<list.length;i++){ %>
     *         <article><%=list[i]%></article>
     *     <%}%>
     *     </script>
     * </section>
     *
     * 如果 mustache 参数为true,默认为false,可使用{{}},不支持JS表达式
     * e.g
     * <section>
     *     <script type="text/html">
     *     <h1>{{TITLE}}</h1>
     *     </script>
     * </section>
     */
    var microTmpl = function(mustache) {
        var intro = mustache?'{{':'<%',
            outro = mustache?'}}':'%>',
            tmplAttrs = ['micro-template','ntes-template'],
            childTmplAttrs = ['micro-template-child','ntes-template-child'];
        //http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object?answertab=votes#tab-top
        function isElement(o){
            return (
                    typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
                o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
                );
        }
        function hasChildTmplAttr(el){
            var i = 0;
            for(;i<childTmplAttrs.length;i++){
                if(el.hasAttribute(childTmplAttrs[i])){
                    return true;
                }
            }
            return false;
        }
        function removeChildTmplAttrs(el){
            var i = 0;
            for(;i<childTmplAttrs.length;i++){
                el.removeAttribute(childTmplAttrs[i]);
            }
        }
        function getTmpl(str){
            //如果是DOM节点则取outerHTML或者innerHTML
            if(isElement(str)){
                if(hasChildTmplAttr(str) || str.tagName.toLowerCase()=='script'){
                    var text = str.innerHTML;
                    str.innerHTML = '';
                    removeChildTmplAttrs(str);
                    str = text;
                }else{
                    str = str.outerHTML;
                }
            }
            //将模板中所有 micro-(或者micro-template,ntes-,ntes-template)替换为空
            return str && str.toString().replace(/(micro|ntes)-(template)?/g,'');
        }
        //http://ejohn.org/blog/javascript-micro-templating/
        var cache = {};
        function tmpl(str, data) {
            str = getTmpl(str);
            var reg1 = new RegExp('((^|'+outro+")[^\t]*)'",'g');
            var reg2 = new RegExp('\t'+(mustache?'':'=')+'(.*?)'+outro,'g');
            var fn = !/\W/.test(str) ? //W大写，可以匹配任何一个字母或者数字或者下划线以外的字符
                    cache[str] = cache[str] :
                    new Function("obj",
                        "var p=[],print=function(){p.push.apply(p,arguments);};"
                        + "with(obj){p.push('"
                        + str
                            .replace(/[\r\t\n]/g, " ") //将"\r\t\n"先替换成" "
                            //.split("<%").join("\t") //将模板开始符号"<%"全部替换成"\t"
                            .split(intro).join("\t")//--> split("<%").join("\t")
                            //.replace(/((^|%>)[^\t]*)'/g, "$1\r") //将将模板结束符号%>全部替换成\r
                            .replace(reg1, "$1\r")//--> replace(/((^|%>)[^\t]*)'/g, "$1\r")
                            //.replace(/\t=(.*?)%>/g, "',$1,'") //将=与%>之间的变量替换成",变量,"
                            .replace(reg2, "',$1,'")//--> replace(/\t=(.*?)%>/g, "',$1,'")
                            .split("\t").join("');") //将之前替换的"\t"再替换成");"
                            //.split("%>").join("p.push('")
                            .split(outro).join("p.push('")//-->split("%>").join("p.push('")
                            .split("\r").join("\\'")
                        + "');}return p.join('');");
            return data ? fn(data) : fn;
        }
        return tmpl;
    };
    return microTmpl;
});

define('core/Class',['require','exports','module','./Subject'],function(require, exports, module) {
    var Subject = require('./Subject');
    var Class = {};

    function apply(obj,config,promise){
        if(config){
            var attr;
            for(attr in config){
                obj[attr] = promise?promise(config[attr]):config[attr];
            }
        }
    }
    function applyIf(obj,config,promise){
        if(config){
            var attr;
            for(attr in config){
                if(!obj[attr]){
                    obj[attr] = promise?promise(config[attr]):config[attr];
                }
            }
        }
    }
    Class.apply = apply;

    function extend() {
        var F = function(){};
        return function(superClass,subClass){
            F.prototype = superClass.prototype;
            subClass.prototype = new F();//空函数避免创建超类的新实例(超类可能较庞大或有大量计算)
            subClass.prototype.constructor = subClass;
            subClass.superclass = superClass.prototype;//superclass减少子类与超类之间的偶合
            //http://stackoverflow.com/questions/12691020/why-javascripts-extend-function-has-to-set-objects-prototypes-constructor-pro
            if (superClass.prototype.constructor == Object.prototype.constructor){
                superClass.prototype.constructor = superClass;
            }
            return subClass;
        }
    }
    Class.extend = extend();

    /**
     *
     * Model
     * 
     * 
     * Nested Model:
     * e.g.
     *    var testModel = new Model({
     *           store: new Model({
     *               request: function(){
     *                   console.log('store.request',this);
     *               }
     *           }),
     *           request: function(){
     *               console.log('request',this);
     *           }
     *       });
     *
     *    testModel.updated(function(){
     *           console.log(testModel.get());
     *           testModel.request();
     *       });
     *    testModel.set('1');
     *
     *    testModel.store.updated(function(){
     *           console.log(testModel.store.get());
     *           testModel.store.request();
     *       });
     *    testModel.store.set('2');
     */
    function Model(option){
        Model.superclass.constructor.call(this);
        this.updated = this.register;
        this.refresh = this.notify;
        this.data;
        if(option){
            var attr;
            for(attr in option){
                this[attr] = option[attr];
            }
        }
    }
    Class.extend(Subject,Model);
    Model.prototype.set = function(data){
        this.data = data;
        this.refresh();
    }
    Model.prototype.get = function(){
        return this.data;
    }
    Class.Model = Model;

    return Class;
});

define('core/NativeBridge',['require','exports','module','./Navigator'],function(require, exports, module) {
    var Navigator = require('./Navigator');

    /**
     * 与新闻客户端交互
     */
    function NativeBridge(protocolHandler){
        var emptyFn = function(){},
            appUA = (/Deja/ig).test(navigator.userAgent),
            androidReg = /Android/gi,
            debug = false,
            isAndroid = androidReg.test(navigator.platform) || androidReg.test(navigator.userAgent),
            Callbacks,Protocols;
            
        Callbacks = {
            afterEncrypt: emptyFn,
            afterShare: emptyFn,
            afterUserinfo: emptyFn,
            afterLogin: emptyFn,
            afterDevice: emptyFn,
            afterUploadImage: emptyFn,
            afterComment: emptyFn,
            afterOtherappinfo: emptyFn,
            afterActionbutton: emptyFn
        }
        Protocols = {
            share: 'share://',
            updateprofile: 'updateprofile://',
            encrypt: 'encrypt://',
            pushview: 'pushview://{TYPE}',
            userinfo: 'userinfo://',
            login: 'login://',
            device: 'device://',
            uploadImageByCamera: 'uploadimage://camera/{W}_{H}',
            uploadImageByAlbum: 'uploadimage://album/{W}_{H}',
            openComment: 'newsapp://comment/{BOARD_ID}/{DOC_ID}/{TITLE}',
            comment: 'comment://',
            otherappinfo: isAndroid?'otherappinfo://':'otherappinfo://intent/',
            copy: 'copy://',
            toolbar: 'docmode://toolbar/{COMMAND}',
            modifytitle: 'docmode://modifytitle/{TITLE}',
            actionbutton: 'docmode://actionbutton/{NAME}'
        }
        function enableDebug(){
            debug = true;
        }

        function isApp(){
            return appUA || debug;
        }
        function protocol(action,callback){
            protocolHandler(action,true);
            //开启调试
            if(debug && callback){
                var _data = action.match(/[\w]:\/\/(.*)/);
                callback(_data && _data[1]);
            }
        }
        
        function afterCallback(rs,callback){
            callback = callback || emptyFn;
            callback(rs);
            callback = emptyFn;
        }
        window.__newsapp_share_done = function(rs){
            afterCallback(rs,Callbacks.afterShare);
        }
        window.__newsapp_encrypt_done = function(rs){
            afterCallback(rs,Callbacks.afterEncrypt);
        }
        window.__newsapp_userinfo_done = function(rs){
            afterCallback(rs,Callbacks.afterUserinfo);
        }
        window.__newsapp_login_done = function(rs){
            afterCallback(rs,Callbacks.afterLogin);
        }
        window.__newsapp_device_done = function(rs){
            afterCallback(rs,Callbacks.afterDevice);       
        }
        window.__newsapp_upload_image_done = function(rs){
            afterCallback(rs,Callbacks.afterUploadImage);       
        }
        window.__newsapp_comment_done = function(rs){
            afterCallback(rs,Callbacks.afterComment);       
        }
        window.__newsapp_otherappinfo_done = function(rs){
            afterCallback(rs,Callbacks.afterOtherappinfo);
        }
        window.__newsapp_browser_actionbutton = function(rs){
            afterCallback(rs,Callbacks.afterActionbutton);
        }
        //更新用户资料
        function updateProfile(){
            protocol(Protocols.updateprofile);
        }
        /**
         * 登录
         * @param {Function} callback 成功回调
         */         
        function login(callback){
            Callbacks.afterLogin = callback;
            protocol(Protocols.login,callback);
        }    
        /**
         * 获取用户信息
         * @param {Function} callback 成功回调
         */ 
        function userInfo(callback){
            Callbacks.afterUserinfo = callback;
            protocol(Protocols.userinfo,callback);
        }    
        /**
         * 获取设备信息
         * @param {Function} callback 成功回调
         */        
        function device(callback){
            Callbacks.afterDevice = callback;
            protocol(Protocols.device,callback);
        }        
        /**
         * 分享
         * @param {Function} callback 成功回调
         */
        function share(callback){
            Callbacks.afterShare = callback;
            protocol(Protocols.share,callback);
        }        
        /**
         * 打开客户端视图
         * @param {String} type feedback,font,personalcenter,skin,font
         */
        function pushView(type){
            protocol(Protocols.pushview.replace('{TYPE}',type));
        }        
        /**
         * 加密
         * @param {String} data 待加密数据
         * @param {Function} callback 成功回调
         */
        function encrypt(data,callback){
            Callbacks.afterEncrypt = callback;
            if(window.extra && window.extra.__newsapp_encrypt){
                afterCallback( window.extra.__newsapp_encrypt(data),Callbacks.afterEncrypt );
            }else{
                protocol(Protocols.encrypt+encodeURI(data),callback);   
            } 
        }        
        /**
         * 上传图片 调用摄像头
         * @param {Integer} width 图片宽
         * @param {Integer} height 图片高
         * @param {Function} callback 成功回调
         */
        function uploadImageByCamera(width,height,callback){
            Callbacks.afterUploadImage = callback;
            protocol( Protocols.uploadImageByCamera.replace('{W}',width).replace('{H}',height),callback );
        }
        /**
         * 上传图片 调用图库
         * @param {Integer} width 图片宽
         * @param {Integer} height 图片高
         * @param {Function} callback 成功回调
         */
        function uploadImageByAlbum(width,height,callback){
            Callbacks.afterUploadImage = callback;
            protocol( Protocols.uploadImageByAlbum.replace('{W}',width).replace('{H}',height),callback );
        }
        /**
         * 打开文章跟贴
         * @param {String} boardid 版块ID
         * @param {String} docid 文章ID
         * @param {String} title 文章标题
         */
        function openComment(boardid,docid,title){
            protocol( Protocols.openComment.replace('{BOARD_ID}',boardid).replace('{DOC_ID}',docid).replace('{TITLE}',title||'') );
        }
        /**
         * 直接发表跟贴
         * @param {Function} callback 成功回调
         */
        function comment(callback){
            Callbacks.afterComment = callback;
            protocol( Protocols.comment,callback );
        }
        /**
         * 其他应用信息
         * @param {String} id
         * @param {Function} callback 成功回调
         */
        function otherappinfo(id,callback){
            Callbacks.afterOtherappinfo = callback;
            protocol( Protocols.otherappinfo+id,callback );
        }
        /**
         * 复制文本到剪贴板
         * @param {String} text
         */
        function copy(text){
            protocol( Protocols.copy+text );
        }
        /**
         * 显示隐藏正文工具栏
         * @param {String} command  show|hide
         */
        function toolbar(command){
            protocol( Protocols.toolbar.replace('{COMMAND}',command) );
        }
        /**
         * 更新标题
         * @param {String} title
         */
        function modifytitle(title){
            document.title = title || document.title;
            protocol( Protocols.modifytitle.replace('{TITLE}',encodeURI(title)) );
        }
        /**
         * 更新右上角功能菜单按钮
         * @param {String} name
         */
        function actionbutton(name,callback){
            Callbacks.afterActionbutton = callback;
            protocol( Protocols.actionbutton.replace('{NAME}',encodeURI(name)),callback );
        }
        return {
            isApp: isApp,
            login: login,
            userInfo: userInfo,
            device: device,
            share: share,
            encrypt: encrypt,
            updateProfile: updateProfile,
            uploadImageByCamera: uploadImageByCamera,
            uploadImageByAlbum: uploadImageByAlbum,
            pushView: pushView,
            openComment: openComment,
            comment: comment,
            otherappinfo: otherappinfo,
            copy: copy,
            toolbar: toolbar,
            modifytitle: modifytitle,
            actionbutton: actionbutton,
            enableDebug: enableDebug
        }
    }//end newsApp
    return new NativeBridge(Navigator.protocol);
});

define('core/Pubsub',['require','exports','module'],function(require, exports, module) {
    function Pubsub(Subject){
        var topics = {};
        function subscribe(topic,observer){
            var subject;
            for(var key in topics){
                if(key === topic){
                   subject = topics[key];
                   break;
                }
            }
            if(!subject){
                subject = new Subject();
                addTopic(topic,subject);
            }
            subject.register(observer);
            return this;
        }
        function unsubscribe(topic){
            removeTopic(topic);
            return this;
        }
        function publish(topic){
            var args = [].slice.call(arguments);
            topics[topic] && topics[topic].notify.apply(topics[topic],args.slice(1));
            return this;
        }
        function addTopic(topic,subject){
            topics[topic] = subject;
        }
        function removeTopic(topic){
            delete topics[topic];
        }
        function getTopics(){
            var _topics = [];
            for(var key in topics){
                (typeof key === 'string') && _topics.push(key);
            }
            return _topics;
        }
        this.getTopics = getTopics;
        this.subscribe = subscribe;
        this.unsubscribe = unsubscribe;
        this.publish = publish;
    }    
    return Pubsub;
});

define('core/HashHandler',['require','exports','module'],function(require, exports, module) {
    var HashHandler = (function(){
        var lc = window.location;
        function getByURL(url){
            var hash;            
            url && url.replace(new RegExp('#(.*)', 'g'),function($1,$2){
                hash = $2;
            });
            return hash;
        }
        function get(){
            return getByURL(lc.hash);
        }
        function set(hash){
            lc.hash = hash;
        }
        return {
            get: get,
            set: set,
            getByURL: getByURL
        }
    })();
    return HashHandler;
});

define('core/Router',['require','exports','module','./Pubsub','./Subject','./HashHandler'],function(require, exports, module) {
    var Pubsub = require('./Pubsub');
    var Subject = require('./Subject');
    var HashHandler = require('./HashHandler');

    /**
     *
     * Router 初始化流程：
     * init(withAction) --> onReady 是否注册有 Callback  --> (是)执行所有 Callback (在关键Callback里，手动执行 run 来强制刷新是推荐的）
     *                                                  --> (否)执行 run
     *
     *
     *
     * Hash 变化事件执行流程：
     * Hash变化（或者显示调用 run,forward,back方法） --> 执行 onChanged 注册的所有事件 --> 执行 subscribe 注册的与 Hash 关联的所有事件
     *
     *
     * 本 Router 暂不支持正则表达式
     */
    function Router(Pubsub,HashHandler){
        var _Router = this,
            android = /Android/gi.test( navigator.userAgent ),
            iOS = /(iPad|iPhone|iPod)/gi.test( navigator.userAgent ) && !android,
            UN_SUB_NAME = '__UN_SUBSCRIBED_ACTION',
            INIT_HASH_STR = formatHash(HashHandler.get()),
            currentAction = INIT_HASH_STR,
            _isFroward = true,
            actionsHistory = [INIT_HASH_STR],
            isReady = false,
            initCallback,
            readyCallbacks = [],
            changedCallbacks = [];

        //iOS使用pushstate,解决iOS7没有历史的问题
        if(iOS){
            window.addEventListener('popstate', locationHashChanged, false);
        }else{
            window.addEventListener('hashchange', locationHashChanged, false);
        }
        
        //开启锚点，解决页面自动滚动的问题
        var _st = document.createElement('style'),
            _div = document.createElement('div');
        _st.innerText = '.Router-anchor{position: fixed; top: 0; left: 0;}';
        _div.className = 'Router-anchor';
        document.body.appendChild(_st);
        document.body.appendChild(_div);
        
        function formatHash(hash){
            if(hash){
                //hash后不能带search值
                hash = hash.replace(/\?.*/g,'');
            }
            return hash;
        }
        function locationHashChanged(e){
            e && e.preventDefault();
            var args = arguments[0] || {},
                hash;
            hash = {
                curHash: formatHash(HashHandler.get()),
                newHash: formatHash(HashHandler.getByURL(args.newURL)),
                oldHash: formatHash(HashHandler.getByURL(args.oldURL))
            }
            currentAction = hash.curHash;
            setLastAction(hash.curHash);
            initCallback && initCallback(hash.curHash,hash);
            if(isReady){
                doChanged(hash.curHash,hash);
                dispatch(hash);
            }
            hash.curHash && addAnchor(hash.curHash);
            return false;
        }
        function dispatch(hash){
            var topics = Pubsub.getTopics(),
                published = false;
            if(hash.curHash!==undefined){
                for(var i=0;i<topics.length;i++){
                    var key = topics[i];
                    if(key!==UN_SUB_NAME){
                        hash.curHash.replace(new RegExp(key+'(.*)','g'),function($1,$2){
                            if($1){
                                published = true;
                                Pubsub.publish(key,$2,key,hash);
                            }
                        });
                    }
                }
            }
            if(!published){
                Pubsub.publish(UN_SUB_NAME,hash.curHash,hash.curHash,hash);
            }
        }
        /**
         * 手动初始化
         * 如在onReady里注册了很多的callback，可以通过此方法手动初始化它们
         * 如果带上 withAction 可实现：
         *      在所有主题被订阅之前，在页面首次加载之初，初始化一个与源hash不同且暂未被订阅的主题,最终仍然跳转到源hash
         *
         * 此方法并不是必要的
         * @param {String} withAction 初始化的action
         */
        function init(withAction){
            if( (withAction === null) || (withAction === undefined) || (withAction === '' ) ){
                ready();
            }else{
                //注意原初始化的action不应该包含在将初始化的hash里
                var reg = new RegExp('^'+withAction+'(.*)','i');
                if(INIT_HASH_STR && !reg.test(INIT_HASH_STR)){
                    initCallback = function(curHash){
                        if(curHash===INIT_HASH_STR){
                            initCallback = null;
                            setTimeout(function(){
                                ready();
                            });
                        }else if(curHash===withAction){
                            forward(INIT_HASH_STR);
                        }
                    };
                    forward(withAction);
                }else{
                    ready();
                }
            }
            return Pubsub;
        }

        /**
         * 强制刷新
         * 在无需引起 hash 变化情况下，强制执行与当前 hash 联调的所有主题一次
         * 流程：
         * 执行 onChanged 注册的所有事件 --> 执行 subscribe 注册的与 Hash 关联的所有事件
         */
        function run(){
            locationHashChanged();
            return Pubsub;
        }
        /**
         * 订阅所有没有被注册的主题
         * @param {Object} observer
         */
        function onUnsubscribed(observer){
            Pubsub.subscribe(UN_SUB_NAME,observer);
            return Pubsub;
        }
        /**
         * 当hash发生变化时触发,会先于所有订阅的主题触发
         */
        function onChanged(callback){
            if(typeof callback === 'function'){
                changedCallbacks.push(callback);
            }
            return Pubsub;
        }

        /**
         * 手动执行init方法会执行通过此方法注册的所有callback方法
         * @param callback
         */
        function onReady(callback){
            if(typeof callback === 'function'){
                readyCallbacks.push(callback);
            }
            return Pubsub;
        }

        function ready(){
            isReady = true;
            //如果 onReady 方法中有回调则执行回调
            //注意，onReady 的回调里需要有且仅有一个要显示调用 run 来强制执行所有主题的调回
            if(readyCallbacks.length){
                while(readyCallbacks.length){
                    readyCallbacks.shift().call(_Router,Pubsub)
                }
            }
            //否则自动强制执行所有主题
            else{
                run();
            }
        }
        function doChanged(){
            var i = 0,l = changedCallbacks.length;
            for(;i<l;i++){
                changedCallbacks[i].apply(undefined,arguments);
            }
        }

        /**
         * 跳转到一个指定的主题
         * @param {String}|{Number} action
         */
        function forward(action){
            _isFroward = true;
            if(action===null){
                window.history.forward();
            }else if(typeof action==='number'){
                if(action == -1){
                    _isFroward = false;
                }
                window.history.go(action);
            }else if(typeof action==='string'){
                if(iOS){
                    window.history.pushState(null,null,'#'+action);
                    run();
                }else{
                    HashHandler.set(action);
                }
            }
            return Pubsub;
        }
        
        /**
         * 返回上一主题
         * action仅在解决当不确实是否有浏览历史，并且又需要跳转到一个指定的hash值时
         * 优先级是： 浏览器历史 > actionsHistory > action
         * @param {String}|{Number} action 
         */
        function back(action){
            var ac = getLastAction() || action || -1;
            //如果浏览器有历史则走历史
            if(window.history.length>1){
                ac = -1;
            }
            forward(ac);
            return Pubsub;
        }
        function setLastAction(action){
            var ac = actionsHistory.pop();
            if(ac!==undefined && ac!==action){
                actionsHistory.push(ac);
            }
            actionsHistory.push(action);
        }
        function getLastAction(){
            //pop两次是因为最后一次是当前的
            actionsHistory.pop();
            return actionsHistory.pop();
        }
        function setFirstAction(action){
            var ac = actionsHistory.shift();
            if(ac!==undefined && ac!==action){
                actionsHistory.unshift(ac);
            }
            actionsHistory.unshift(action);
        }
        function getFirstAction(){
            return actionsHistory.shift();
        }
        function isFroward(){
            return _isFroward;
        }

        /**
         * 解决历史滚动位置记录的问题，保证视图切换总在最顶部
         * @param id
         */
        function addAnchor(id){
            return;//暂时停用此功能

            var _d = document.createElement('div'),__d;
            _d.id = id;
            _div.appendChild(_d);
            __d = document.getElementById(id);
            if(__d &&  __d!==_d){
                _div.removeChild(_d);
            }
        }

        /**
         * 校验是否存在与当前的 action 匹配的 action
         * @param action {Array}|{String}
         * @returns {boolean}
         */
        function currentMatch(action){
            var ac = [],i = 0,l;
            if(typeof action === 'string'){
                ac.push(action)
            }else if(toString.call(action) == '[object Array]'){
                ac = ac.concat(action)
            }
            l = ac.length;
            for(;i<l;i++){
                if( (new RegExp('^'+ac[i]+'(.*)','i')).test(currentAction) ){
                    return true;
                };
            }
            return false;
        }
        Pubsub.initHash = INIT_HASH_STR;
        Pubsub.init = init;
        Pubsub.run = run;
        Pubsub.forward = forward;
        Pubsub.back = back;
        Pubsub.isFroward = isFroward;
        Pubsub.currentMatch = currentMatch;
        Pubsub.onReady = onReady;
        Pubsub.onChanged = onChanged;
        Pubsub.onUnsubscribed = onUnsubscribed;

        return Pubsub;
    }    
    return Router(new Pubsub(Subject),HashHandler);
});

define('core/Event',['require','exports','module','./Class','./Pubsub','./Subject'],function(require, exports, module) {
    var Class = require('./Class');
    var Pubsub = require('./Pubsub');
    var Subject = require('./Subject');


    function Event(Subject){
        Event.superclass.constructor.call(this,Subject);
        this.on = this.subscribe;
        this.off = this.unsubscribe;
        this.trigger = this.publish;
    }
    Class.extend(Pubsub,Event);
    return new Event(Subject);
});

define('util/LocalHost',['require','exports','module'],function(require, exports, module) {
    if (!window.location.origin){
        window.location.origin = window.location.protocol 
                                + "//" + window.location.hostname 
                                + (window.location.port ? ':' + window.location.port: '');
    }
    return window.location.origin;
});

define('util/LocalParam',['require','exports','module'],function(require, exports, module) {
    /**
     * window.location.search
     * window.location.hash
     */
    function localParam(search,hash){
        search = search || window.location.search;
        hash = hash || window.location.hash;
        var fn = function(str,reg){
       	if(str){
	       	var data = {};
	       	str.replace(reg,function( $0, $1, $2, $3 ){
	            data[ $1 ] = $3;
	        });
	        return data;
       	}
       }
       return {search: fn(search,new RegExp( "([^?=&]+)(=([^&]*))?", "g" ))||{},hash: fn(hash,new RegExp( "([^#=&]+)(=([^&]*))?", "g" ))||{}};    	
    }
    return localParam;
});

define('util/MetaHandler',['require','exports','module'],function(require, exports, module) {
    var MetaHandler = function(){
        //MONOSTATE
        if(MetaHandler.prototype.instance){
            return MetaHandler.prototype.instance;
        }
       var me = this;
       var meta = {},_els;
       /**
        * 初始化
        * _els
        * meta = {name:{content:String,seriation:Array,store:{property:String},...},...}
        * @method init
        */
       function init(){
           _els = document.getElementsByTagName('meta');
           for(var i=0;i<_els.length;i++){
               var name = _els[i].name;
               if(name){
                   meta[name] = {};
                   meta[name].el = _els[i];
                   meta[name].content = _els[i].content;
                   meta[name].seriation = meta[name].content.split(',');
                   meta[name].store = getContentStore(name);
               }
           }    
           return me;
       }
       function getContentStore(name){
           var content = meta[name].seriation,store = {};
           for(var i=0;i<content.length;i++){
               if(content[i].length<1){
                   content[i] = null;
                   delete content[i];
                   content.length--;
               }else{
                   var ct = content[i].split('='),
                       pp = ct[0];
                   if(pp){
                       store[pp] = ct[1];
                   }
               }
           }               
           return store;
       }
       this.hasMeta = function(name){
           return meta[name]?1:0;
       }
       this.createMeta = function(name){
           if(!this.hasMeta(name)){
               var el = document.createElement('meta');
               el.name = name;
               document.head.appendChild(el);
               meta[name] = {};
               meta[name].el = el;
               meta[name].content = '';
               meta[name].seriation = [];
               meta[name].store = {};
           }
           return me;
       }
       this.setContent = function(name,value){
           meta[name].content = value;
           meta[name].el.content = value;
           return me;
       }
       this.getContent = function(name){
           return meta[name] && meta[name].content;
       }
       function updateContent(name){
           meta[name].content = meta[name].seriation.join(',');
           me.setContent(name,meta[name].content);
           return me;
       }
       this.removeContentProperty = function(name,property){
           var _property = property;
           if(meta[name]){
               if(meta[name].store[_property]!=null){
                   for(var i = 0;i<meta[name].seriation.length;i++){
                       if(meta[name].seriation[i].indexOf(property+'=')!=-1){
                           meta[name].seriation[i] = null;
                           delete meta[name].seriation[i];
                           break;
                       }
                   }
               }     
               updateContent(name); 
           }
           return me;       
       }
       this.getContentProperty = function(name,property){
           return meta[name] && meta[name].store[property];
       }
       this.setContentProperty = function(name,property,value){
           var _property = property,
               pv = property+'='+value;
           if(meta[name]){
               if(meta[name].store[_property]!=null){
                   meta[name].store[_property] = value;
                   for(var i = 0;i<meta[name].seriation.length;i++){
                       if(meta[name].seriation[i].indexOf(property+'=')!=-1){
                           meta[name].seriation[i] = pv;
                           break;
                       }
                   }
               }else{
                   meta[name].store[_property] = value;
                   meta[name].seriation.push(pv);
               }
               updateContent(name);
           }
           return me;
       }
       this.fixViewportWidth = function(width){
           width = width || me.getContentProperty('viewport','width');
           if(width != 'device-width'){
                var iw = window.innerWidth || width,
                    ow = window.outerHeight || iw,
                    sw = window.screen.width || iw,
                    saw = window.screen.availWidth || iw,
                    ih = window.innerHeight || width,
                    oh = window.outerHeight || ih,
                    ish = window.screen.height || ih,
                    sah = window.screen.availHeight || ih,
                    w = Math.min(iw,ow,sw,saw,ih,oh,ish,sah),
                    ratio = w/width,
                    dpr = window.devicePixelRatio,
                    ratio = Math.min(ratio,dpr);
                var isAndroid=navigator.userAgent.match(/android/ig),
                    isIos=navigator.userAgent.match(/iphone|ipod|ipad/ig);
                if(isAndroid){
                    me.removeContentProperty('viewport','user-scalable');
                    if(ratio<1){
                        me.setContentProperty('viewport','initial-scale',ratio);
                        //me.setContentProperty('viewport','minimum-scale',ratio);
                        me.setContentProperty('viewport','maximum-scale',ratio);
                    }
                }else if(isIos && !isAndroid){
                    me.setContentProperty('viewport','user-scalable','no');
                }
           }
       }
       init();
        //MONOSTATE
        MetaHandler.prototype.instance = this;
    };
    
    return new MetaHandler;
});

define('util/RequestHandler',['require','exports','module'],function(require, exports, module) {
    var RequestHandler = (function(){
        /**
         * AJAX管理器
         * 
         * @param Object option
         * option:{
         *  type : String 请求类型POST/GET
         *  dataType : String 数据解析类型
         *  action :String 请求action
         *  data : Object 请求参数
         *  complete :Function 完毕回调方法
         * }
         * @method AJAXHandler
         */
        function AJAXHandler(option){
            if(!option){return;}
            $.ajax({
              headers   : { "cache-control": "no-cache" },
              type      : option.type,
              url       : option.action,
              dataType  : option.dataType,
              data      : option.data||null,//空值设置null避免向后端发送undefined无用参数
              success   : function(data, status, xhr){
                  if(option.complete && typeof option.complete==='function'){
                      option.complete({
                          data: data,
                          success: true
                      });
                  }
              },
              error : function(xhr, errorType, error){
                  if(option.complete && typeof option.complete==='function'){
                      option.complete({
                          success: false
                      });
                  }
              }
            });             
        }//end AJAXHandler       
        function JSONP(option){
            if(!option){return;}
            $.ajax({
               type         : 'GET',
               url          : option.action,
               dataType     : 'jsonp',       
               jsonp        : false,
               jsonpCallback: false,
               contentType  : "application/json"
            });
        }
        
        function getJSON(option){
            if(!option){return;}
            option.type = 'GET';
            option.dataType = 'json';
            AJAXHandler(option);       
        }//end getJSON
        
        function postJSON(option){
            if(!option){return;}
            option.type = 'POST';
            option.dataType = 'json';
            AJAXHandler(option);
        }//end postJSON        
        return {
            getJSON: getJSON,
            postJSON: postJSON,
            JSONP: JSONP
        }
    })();
    return RequestHandler;
});

define('util/versionCompare',['require','exports','module'],function(require, exports, module) {
    /**
     * Simply compares two string version values.
     * https://gist.github.com/alexey-bass/1115557
     *
     * Example:
     * versionCompare('1.1', '1.2') => -1
     * versionCompare('1.1', '1.1') =>  0
     * versionCompare('1.2', '1.1') =>  1
     * versionCompare('2.23.3', '2.22.3') => 1
     *
     * Returns:
     * -1 = left is LOWER than right
     *  0 = they are equal
     *  1 = left is GREATER = right is LOWER
     *  And FALSE if one of input versions are not valid
     *
     * @function
     * @param {String} left  Version #1
     * @param {String} right Version #2
     * @return {Integer|Boolean}
     * @author Alexey Bass (albass)
     * @since 2011-07-14
     */
    var versionCompare = function(left, right) {
        if (typeof left + typeof right != 'stringstring')
            return false;

        var a = left.split('.')
            ,   b = right.split('.')
            ,   i = 0, len = Math.max(a.length, b.length);

        for (; i < len; i++) {
            if ((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i]))) {
                return 1;
            } else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i]))) {
                return -1;
            }
        }

        return 0;
    }

    return versionCompare;
});

define('util/RandomList',['require','exports','module'],function(require, exports, module) {
    /**
     * 随机数组
     */
    function randomList(list,len,verify,ratio){
        var rs = [],_list = list.slice(0);
        len = len || _list.length;
        ratio = ratio?ratio:0;
        function rd(_array){
            _array = _array.sort(function(){return (0.5 - Math.random());});
        }
        while(ratio){
            rd(_list);
            ratio--;
        }
        if(_list.length<=len){
            rs = _list;
        }else{
            while(rs.length<len){
                var index = Math.floor(Math.random()*_list.length),
                    item = _list[index];
                if( ( verify && verify.call(this,item,_list) ) || !verify ){
                    rs.push(item);
                    _list.splice(index,1);
                }
            }
        }
        return rs;
    }   
    return randomList;
});

define('util/Number',['require','exports','module'],function(require, exports, module) {
    function formatMoney(num){
        return (num).toFixed(2).replace(/./g, function(c, i, a) {
            return i && c !== "." && !((a.length - i) % 3) ? ',' + c : c;
        });
    }
    return {
        formatMoney: formatMoney
    }
});

define('util/DateHandler',['require','exports','module'],function(require, exports, module) {
    var DateHandler = (function(){
        function getStrDate(str){
            var date;
            if(typeof str==='string'){
                var arr = str.split(/[- :]/);
                date = new Date(arr[0], arr[1]-1, arr[2], arr[3]||00, arr[4]||00, arr[5]||00);
            }
            return date;
        }
        function dbl00(num){
            return num<10?'0'+num:num;
        }
        function getMeta(date){
            if(!date){return null;}
            var YYYY = date.getFullYear(),
                MM = date.getMonth(),
                DD = date.getDate(),
                hh = date.getHours(),
                mm = date.getMinutes(),
                ss = date.getSeconds();
            return {
                year: YYYY,
                month: dbl00(MM+1),
                day: dbl00(DD),
                hour: dbl00(hh),
                minute: dbl00(mm),
                second: dbl00(ss)
            }            
        }
        function formatStr(str){
            var date = getStrDate(str);
            return getMeta(date);
        }
        function fromNowTo(date){
            if(!date){return null;}
            var _date;
            if(typeof date==='string'){
                _date = getStrDate(date);
            }else if(typeof date==='number'){
                _date = new Date(date);
            }else if(date.getTime){
                _date = date;
            }
            if(!_date){return null;}
            var old = _date.getTime(),
                cur = new Date().getTime(),
                diff = Math.abs(cur-old),
                day = Math.floor( diff/(24*60*60*1000) ),
                hour = Math.floor( (diff-(day*24*60*60*1000))/(60*60*1000) ),
                minute = Math.floor( (diff-(hour*60*60*1000)-(day*24*60*60*1000))/(60*1000) ),        
                second = Math.floor( (diff-(hour*60*60*1000)-(day*24*60*60*1000)-(minute*60*1000))/1000 );
            return {
                day: dbl00(day),
                hour: dbl00(hour),
                minute: dbl00(minute),
                second: dbl00(second)
            }          
        }
        function timeLogFromNowTo(date){
            var _date = fromNowTo(date);
            if(!_date){return null}
            var day = parseInt(_date.day),
                hou = parseInt(_date.hour),
                min = parseInt(_date.minute);
            if(day>0){
                return day+'天前';
            }else if(hou>0){
                return hou+'小时前';
            }else if(min>=3){
                return min+'分钟前';
            }else{
                return '刚刚';
            }
        }
        function getDaysInMonth(y,m) {
            return /8|3|5|10/.test(--m)?30:m==1?(!(y%4)&&y%100)||!(y%400)?29:28:31;
        }
        return {
            getStrDate: getStrDate,
            getMeta: getMeta,
            formatStr: formatStr,
            fromNowTo: fromNowTo,
            timeLogFromNowTo: timeLogFromNowTo,
            getDaysInMonth: getDaysInMonth
        }
    }());
    
    return DateHandler;
});

define('lib/Core',['require','exports','module','util/RequestAnimationFrame','util/Easing','core/LocalStorage','core/Navigator','core/Subject','core/MicroTmpl','core/Class','core/NativeBridge','core/Router','core/HashHandler','core/Event','util/LocalHost','util/LocalParam','util/MetaHandler','util/RequestHandler','util/versionCompare','util/RandomList','util/Number','util/DateHandler'],function(require, exports, module) {
    require('util/RequestAnimationFrame');
    require('util/Easing');
    //require('util/AppCache');

    var localStorage = require('core/LocalStorage');
    var Navigator = require('core/Navigator');
    var Subject = require('core/Subject');
    var MicroTmpl = require('core/MicroTmpl');
    var Class = require('core/Class');
    var NativeBridge = require('core/NativeBridge');
    var Router = require('core/Router');
    var HashHandler = require('core/HashHandler');
    var Event = require('core/Event');

    var LocalHost = require('util/LocalHost');
    var localParam = require('util/LocalParam');
    var MetaHandler = require('util/MetaHandler');
    var RequestHandler = require('util/RequestHandler');
    var versionCompare = require('util/versionCompare');

    var randomList = require('util/RandomList');
    var Num = require('util/Number');
    var DateHandler = require('util/DateHandler');

    function Core(){
        var _Core = {
            localStorage: localStorage,
            localHost: LocalHost,
            localParam: localParam,
            Navigator: Navigator,
            MetaHandler: MetaHandler,
            Subject: Subject,
            microTmpl: MicroTmpl(),
            Class: Class,
            extend: Class.extend,
            HashHandler: HashHandler,
            RequestHandler: RequestHandler,
            NativeBridge: NativeBridge,
            versionCompare: versionCompare,
            Event: Event,
            Router: Router,

            Num: Num,
            randomList: randomList,
            DateHandler: DateHandler
        }

        return _Core;
    };
    window.Core = new Core();

    //开启客户端调试,无需客户端环境模拟客户端接口
    if(localParam().search['debug'] == 1){
        window.Core.NativeBridge.enableDebug();
    }
    return window.Core;
});

define('app/resources/Actions',['require','exports','module'],function(require, exports, module) {
    var thisPage = window.location.href
        //注意，保留search 是为了避免微信自动追加的应用检测状态值
        //.replace(window.location.search,'')
        .replace(window.location.hash,'');
    var thisPath = thisPage.substring(0,thisPage.lastIndexOf('/')+1);

    ///*official
    var Actions = {
        leaveNum:  Core.localHost +'/apply/get_leave_num.php',
        apply: Core.localHost + '/apply/apply.php',

        main: thisPath+'index.html',
        analytics: thisPath+'analytics.html',

        desktopUrl: 'http://deja.me/rsvp/launch-party',
        desktopMediaUrl: 'http://deja.me/rsvp/launch-party-media-partners'
    }
    //*/

    ///_DEBUG_*Todo: debug actions
    var Actions = {
        leaveNum:  'data/leavenum.json',
        apply: 'data/apply.json',

        main: thisPath+'index.html',
        analytics: thisPath+'analytics.html',

        desktopUrl: 'http://deja.me/rsvp/launch-party',
        desktopMediaUrl: 'http://deja.me/rsvp/launch-party-media&partners'
    }
    //*/
   return Actions;
});
define('util/ThirdVendor',['require','exports','module'],function(require, exports, module) {
    /**
     * 第三方平台
     */
    var ua = window.navigator.userAgent;
    var vendor = null;
    function isUA(name){
        var reg = new RegExp(name,'gi');
        return reg.test(ua);
    }
    if( isUA('NewsApp') ){
        vendor = {
            code: 'NTES',
            name: '网易新闻'
        }
    }
    else if( isUA('weibo') ){
        vendor = {
            code: 'WB',
            name: '微博'
        }
    }
    else if( isUA('MicroMessenger') ){
        vendor = {
            code: 'WX',
            name: '微信'
        }
    }
    else if( isUA('QQ') ){
        vendor = {
            code: 'QQ',
            name: 'QQ'
        }
    }
    else if( isUA('YiXin') ){
        vendor = {
            code: 'YX',
            name: '易信'
        }
    }
    
    return vendor;
});

define('app/model/Model',['require','exports','module','app/resources/Actions'],function(require, exports, module) {
    var Actions = require('app/resources/Actions');

    function Model(){
        var MODEL = this,
            Mdl = Core.Class.Model,
            lcStorage = Core.localStorage,
            getJSON = Core.RequestHandler.getJSON,
            postJSON = Core.RequestHandler.postJSON,
            userId,udid,NativeBridgeUserMeta,NativeBridgeDeviceMeta,
            applyType,applyUser;

        this.getCookie = function(sKey) {
            return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
        }
        this.setCookie = function(name,value,days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var expires = "; expires="+date.toGMTString();
            }
            else var expires = "";
            document.cookie = name+"="+value+expires+"; path=/";
        }
        //校验登录 cookies
        this.verifyLoginCookie = function(){
            var S_INFO = this.getCookie('S_INFO'),
                S_INFO = S_INFO && S_INFO.split('|'),
                P_INFO = this.getCookie('P_INFO'),
                P_INFO = P_INFO && P_INFO.split('|');
            return (S_INFO && P_INFO && (P_INFO[2]!='2'));
        }
        this.saveLoginCookieTimeout = function(){
            var key = this.getUserId()+'__loginCookieTimer';
            lcStorage.set(key,new Date().getTime());
        }
        //校验 cookies 有效期，商城默认是1个小时过期，这里用 20 分钟
        this.verifyLoginCookieTimeout = function(minutes){
            var key = this.getUserId()+'__loginCookieTimer',
                last = lcStorage.get(key) || 0;
            minutes = minutes || 20;
            return ( (new Date().getTime())-last ) < minutes*60*1000;
        }
        this.setUdId = function(id){
            udid = id;
        }
        this.getUdId = function(){
            return udid;
        }
        this.setUserId = function(id){
            userId = id;
        }
        this.getUserId = function(){
            return userId;
        }
        this.getNativeBridgeUserMeta = function(){
            return NativeBridgeUserMeta;
        }
        this.setNativeBridgeUserMeta = function(data){
            NativeBridgeUserMeta = data;
            NativeBridgeUserMeta && this.setUserId(NativeBridgeUserMeta.name);
        }
        this.getNativeBridgeDeviceVersion = function(){
            return (NativeBridgeDeviceMeta && NativeBridgeDeviceMeta.v)|| '1.0.0';
        }
        this.getNativeBridgeDeviceMeta = function(){
            return NativeBridgeDeviceMeta;
        }
        this.setNativeBridgeDeviceMeta = function(data){
            NativeBridgeDeviceMeta = data;
            NativeBridgeDeviceMeta && this.setUdId(NativeBridgeDeviceMeta.u);
        }
        //校验所需要客户端版号不低于 version
        this.requiredNativeBridgeVersion = function(version){
            return Core.versionCompare(this.getNativeBridgeDeviceVersion(),version) != -1;
        }
        this.isLogined = function(){
            return !!userId;
        }
        this.setApplyType = function(type){
            applyType = type;
        }
        this.setApplyUser = function(data){
            applyUser = data;
        }
        this.getApplyUser = function(){
            return applyUser;
        }
        this.isPartnerApply = function(){
            return applyType == 1;
        }
        //剩余人数
        this.leaveNum = new Mdl({
            request: function(callback){
                var _this = this;
                getJSON({
                    action: Actions.leaveNum,
                    complete: function(data){
                        if(data.success){
                            _this.set(data.data);
                        }
                        callback && callback(data.success);
                    }
                });
            }
        });
        this.apply = new Mdl({
            post: function(data,callback){
                var _this = this;
                postJSON({
                    action: Actions.apply,
                    data: data,
                    complete: function(data){
                        if(data.success){
                            _this.set(data.data);
                        }
                        callback && callback(data.success);
                    }
                });
            }
        });

        //数据缓存更新
        var modelUpdate;
        this.initModelUpdateTimeout = function(){
            modelUpdate = {
                timeout: 1000*60*5,
                profile: 0,
                prizeAll: 0,
                liveTrade: 0,
                myPrize: 0,
                prizeKey: 0,
                myCashPrize: 0
            }
        }
        this.initModelUpdateTimeout();
        /**
         *
         * @param name
         * @param timeout 时间倍数，默认是1
         * @returns {boolean}
         */
        this.isModelUpdateTimeout = function(name,timeout){
            timeout = modelUpdate.timeout*(timeout||1);
            return !modelUpdate[name] || ( (new Date().getTime())-modelUpdate[name]>timeout );
        }
        this.updateModelTimeout = function(name,fresh){
            if(name===undefined){return;}
            if(modelUpdate[name]===undefined){
                this.resetModelTimeout(name);
            }else if(!fresh){
                modelUpdate[name] = new Date().getTime();
            }
        }
        this.resetModelTimeout = function(name){
            if(name===undefined){return;}
            modelUpdate[name] = 0;
        }
        //end 数据缓存更新
    }

    return new Model;
});

define('widget/Msgbox',['require','exports','module'],function(require, exports, module) {
    function Msgbox(option){
        //MONOSTATE
        if(Msgbox.prototype.instance){
            return Msgbox.prototype.instance;
        }
        option = option || {};
        var GlobalTouch = option.GlobalTouch;
        var _this = this,
            bEl,
            readyToHide = true,
            isLoading,
            VIEW = option.view,
            emptyFn = function(){};
        bEl = {
            box : $('.msgbox'),
            bd : $('.msgbox .msgbox-bd'),
            dialog : $('.box-ct.dialog'),
            loading : $('.box-ct.loading'),
            slot : $('.box-ct.slot')

        }
        bEl.dialog.hide();
        bEl.loading.hide();
        bEl.slot.hide();
        
        //dialog
        bEl.dialog.nbt = bEl.dialog.find('.no');
        bEl.dialog.ybt = bEl.dialog.find('.yes');
        bEl.dialog.title = bEl.dialog.find('.title');
        bEl.dialog.msg = bEl.dialog.find('.msg');
        bEl.dialog.nbt.on('click',function(){
            _this.hideDialog(bEl.dialog.noCallback);
        });
        bEl.dialog.ybt.on('click',function(){
            _this.hideDialog(bEl.dialog.yesCallback);
        });
        /**
         * option = {
         *     title,
         *     msg,
         *     yesText,
         *     noText,
         *     yesCallback,
         *     noCallback
         * }
         */
        this.showDialog = function(option){
            option = option || {};
            readyToHide = false;
            bEl.dialog.yesCallback = option.yesCallback;
            bEl.dialog.noCallback = option.noCallback;
            bEl.dialog.ybt[option.yesText?'show':'hide']().html(option.yesText);
            bEl.dialog.nbt[option.noText?'show':'hide']().html(option.noText);
            bEl.dialog.title[option.title?'show':'hide']().html(option.title||'');
            bEl.dialog.msg[option.msg?'show':'hide']().html(option.msg||'');
            setTimeout(function(){
                bEl.dialog.show();
                _this.show();
            },400);
        }
        this.hideDialog = function(callback){
            readyToHide = true;
            bEl.dialog.hide();
            _this.hide();
            callbackHandler(callback);
        }
        /**
         * option = {
         *     title,
         *     msg,
         *     yesText,
         *     yesCallback
         * }
         */
        this.showFailed = function(option){
            option = option || {};
            var _option = {
                title: option.title || 'Sorry~',
                msg: option.msg || 'Unable to connect to the Internet',
                yesText: option.yesText || 'OK',
                yesCallback: option.yesCallback
            }
            _this.showDialog(_option);
        }
        /**
         * option = {
         *     msg,
         *     hideCallback
         * }
         */
        this.showError = function(option){
            option = option || {};
            var _option = {
                msg: option.msg || ''
            }
            _this.showDialog(_option);
            setTimeout(function(){
                _this.hideDialog(option.hideCallback);
            },2500);
        }
        /**
         * option = {
         *     yesCallback
         * }
         */
        this.showDownload = function(option){
            option = option || {};
            var _option = {
                msg: '请安装或启动客户端最新版!',
                noText: '取消',
                yesText: '前往',
                yesCallback: option.yesCallback
            }
            _this.showDialog(_option);
        }
        //slot
        bEl.slot.nbt = bEl.slot.find('.no');
        bEl.slot.ybt = bEl.slot.find('.yes');
        bEl.slot.msg = bEl.slot.find('.msg');
        bEl.slot.nbt.on('click',function(){
            _this.hideSlot(bEl.slot.noCallback);
        });
        bEl.slot.ybt.on('click',function(){
            _this.hideSlot(bEl.slot.yesCallback);
        }); 
        /**
         * option = {
         *     msg,
         *     yesText,
         *     noText,
         *     yesCallback,
         *     noCallback
         * }
         */
        this.showSlot = function(option){
            option = option || {};
            readyToHide = false;
            
            bEl.slot.noCallback = option.noCallback;     
            bEl.slot.yesCallback = option.yesCallback;        
               
            bEl.slot.msg.html(option.msg||'');        
            
            bEl.slot.nbt.html( option.noText || '' );
            bEl.slot.ybt.html( option.yesText || '' );
            
            bEl.slot.show();
            this.show();
        }           
        this.hideSlot = function(callback){
            readyToHide = true;
            bEl.slot.hide();
            _this.hide();
            callbackHandler(callback);
        }
        this.show = function(el){
            el = el || bEl.box;
            setTimeout(function(){
                bEl.box.css({height:document.body.scrollHeight+'px'});
            },500);
            if(el == bEl.box){
                el.addClass('show');
            }else{
                el.css({'display': '-webkit-box'});
            }
        }
        this.hide = function(el){
            el = el || bEl.box;
            isLoading = false;
            if(readyToHide){
                if(el == bEl.box){
                    el.removeClass('show');
                }else{
                    el.css({'display': 'none'});
                }
            }
        }
        this.showLoading = function(msg){
            bEl.loading.msg = bEl.loading.msg || bEl.loading.find('.msg');
            bEl.loading.msg.html(msg||'Loading...');
            if(!isLoading){
                isLoading = true;
                bEl.loading.show();
                this.show();
                //globalPreventTouchmove = true;
            }
        }
        this.hideLoading = function(){
            if(isLoading){
                isLoading = false;
                bEl.loading.hide();
                _this.hide();
                //globalPreventTouchmove = false;
            }
        }
        this.showDonateComplete = function(){
            readyToHide = false;
            
            bEl.donateComplete.show();
            this.show();               
            setTimeout(_this.hideDonateComplete,2500); 
        }         
        this.hideDonateComplete = function(){
            readyToHide = true;
            bEl.donateComplete.hide();
            _this.hide();
        }
        function callbackHandler(callback,data){
            if(callback){
                callback(data);
                callback = null;
            }
        }
        //MONOSTATE
        Msgbox.prototype.instance = this;
    }//end Msgbox     
    return Msgbox;
});

define('app/view/View',['require','exports','module','../resources/Actions','widget/Msgbox','app/model/Model'],function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var Msgbox = require('widget/Msgbox');
    //var WechatShare = require('util/WechatShare');
    //var YiXinShare = require('util/YiXinShare');

    var BaseModel = require('app/model/Model');

    function View(config){
        this.models = {
            Base: BaseModel
        }

        var VIEW = this,
            els,
            params = Core.localParam(),
            isApp = Core.NativeBridge.isApp();
        //click事件
        this.tapEvent = $.os.ios || $.os.android?'tap':'click';

        function init(){
            Core.MetaHandler.fixViewportWidth(720);
            if($.os.ios && parseInt($.os.version)<7){
                Core.MetaHandler.setContentProperty('viewport','initial-scale',0.5);
            }
            initEls();
            bindEvent();
            els.body.css({'visibility': 'visible'});
            VIEW.hide();
        };//end init

        function initEls(){
            var body = $('body');
            els = {
                body: body,
                views: body.children('.view')
            }
            VIEW.GlobalTouch = {
                preventMove: false,
                touched: false
            }
            window.GlobalTouch = VIEW.GlobalTouch;
            VIEW.msgbox = new Msgbox({
                GlobalTouch : VIEW.GlobalTouch
            });
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){
            document.addEventListener('touchmove', function (e) { 
                VIEW.GlobalTouch.preventMove && e.preventDefault();  
            },false);
            document.addEventListener('touchstart', function (e) { 
                VIEW.GlobalTouch.touched = true;
            },false);
            document.addEventListener('touchend', function (e) { 
                VIEW.GlobalTouch.touched = false;
            },false);
            if(VIEW.tapEvent=='tap'){
                els.body.on('click','a',function(e){
                    e.preventDefault();
                    return false;
                });
                els.body.on('tap','a',function(){
                    Core.Event.trigger('redirect',this.href);
                });
            }
            els.body.on(VIEW.tapEvent,'.fake-link',function(){
                Core.Event.trigger('redirect',this.getAttribute('data-link'));
            });
            els.body.on(VIEW.tapEvent,'* [data-analytics]',function(){
                Core.Event.trigger('analyticsCurView',this.getAttribute('data-analytics'));
            });
        }
        this.show = function(viewCls){
            this.hide();

            els.views.each(function(){
                var view = $(this);
                view.hasClass(viewCls) && view.addClass('show');
            });
            $('.footer-section').removeClass('hide');
            return this;
        }
        this.hide = function(){
            els.views.removeClass('show');
            return this;
        }

        /**
         *  weiboMsg String  微博文案
            weiboImg    String  微博配图
            weixinTitle String  微信标题
            weixinMsg   String  微信文案
            weixinImg   String  微信配图
            url 分享连接
         */
        this.renderShare = function(option){
            return;
            option = option || {};
            var url = option.url || Actions.main,
                title = '@客户端 有态度俱乐部',
                msg = '好礼等你抢~',
                weixinTitle = option.weixinTitle || title.replace('@','').replace(' ',''),
                weixinMsg = option.weixinMsg || msg;
            option.weiboMsg = option.weiboMsg?( option.weiboMsg+' '+url ): (title+msg+' '+url);
            els.shareText.html( option.weiboMsg);
            els.sharePhoto.html( option.weiboImg || '' );

            els.shareWXTitle.html(weixinTitle);
            els.shareWXText.html( weixinMsg );
            els.shareWXThumb.html( option.weixinImg || '' );
            els.shareWXUrl.html( url );

            updateWechatShareMeta(weixinTitle,weixinMsg,url,option.weixinImg);
            updateYiXinShareMeta(weixinMsg,option.weixinImg);
            return this;
        }
        this.renderShareCommon = function(d,url){
            if(d){
                var option = {
                    weiboMsg: d.weiboMsg,
                    weiboImg: d.weiboImg,
                    weixinTitle: d.weixinTitle,
                    weixinMsg: d.weixinMsg,
                    weixinImg: d.weixinImg,
                    url: url
                }
                VIEW.renderShare(option);
            }
        }

        function updateWechatShareMeta(title,content,link,img){
            WechatShare({
                "appid": "",
                "img_url": img || Actions.NativeBridgeLogo,
                "img_width": "200",
                "img_height": "200",
                "link": link || window.location,
                "url": link || window.location,
                "desc": content || document.title,
                "content": content || document.title,
                "title": title || document.title
            });
        }
        function updateYiXinShareMeta(content,img){
            YiXinShare({content:content||document.title,img:img||Actions.NativeBridgeLogo});
        }

        this.lazyLoadImg = function (el){
            el && el.find("img").unveil( 200,function() {
                this.onload = function() {
                    this.style.opacity = 1;
                };
            } );
        }


        init();
    }//end View
    return new View;
});

define('app/Controller/Controller',['require','exports','module','../resources/Actions','util/ThirdVendor','app/model/Model','app/view/View'],function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var ThirdVendor = require('util/ThirdVendor');
    var BaseModel = require('app/model/Model');
    var BaseView = require('app/view/View');

    function Controller(){
        this.models = {
            Base: BaseModel
        };
        this.views = {
            Base: BaseView
        };
        //所有视图初始化前，需要获得客户端的用户登录信息
        //Core.Router.onReady(onUserinfo);

        Core.Router.onChanged(onViewChanged);

        var CTRL = this,
            isApp = Core.NativeBridge.isApp(),
            params = Core.localParam(),
            _userid = params.search['userid'],
            _partner = params.search['partner'];
        ///*Todo: debug user
        _userid && CTRL.models.Base.setUserId(_userid);
        //*/
        ///*Todo: debug user
        _partner && CTRL.models.Base.setApplyType(_partner);
        //*/

        //更新数据缓存时间
        Core.Event.on('resetModelUpdateTimeout',CTRL.models.Base.resetModelTimeout);
        //分享
        Core.Event.on('share',appShare);
        //去下载
        Core.Event.on('appDownload',redirectToDownload);
        //去更新
        Core.Event.on('appUpdate',appUpdate);
        //跳转出商城
        Core.Event.on('redirect',redirectToPage);
        //去登录
        Core.Event.on('login',onLogin);
        //去反馈
        Core.Event.on('feedback',onFeedback);
        //首页 赚更多金币
        Core.Event.on('appUserCenter',appUserCenter);
        //更新客户端用户资料
        Core.Event.on('appUpdateProfile',appUpdateProfile);
        //打开跟贴
        Core.Event.on('appOpenComment',appOpenComment);
        //复制文本
        Core.Event.on('appCopyText',appCopyText);
        //更新标题
        Core.Event.on('appModifyTitle',appModifyTitle);
        //修改右上角功能菜单
        Core.Event.on('appActionbutton',appActionButton);
        //修改右上角功能菜单成默认
        Core.Event.on('appActionDefaultButton',appActionDefaultButton);
        //修改右上角功能菜单成分享
        Core.Event.on('appActionShareButton',appActionShareButton);
        //tab 切换
        Core.Event.on('switchTab',switchTab);
        //触发暂时性动画
        Core.Event.on('trigerAnimate',trigerAnimate);
        //text 收展
        Core.Event.on('toggleTextSectionExpand',toggleTextSectionExpand);
        //统计
        Core.Event.on('analytics',analytics);

        //滚动到顶部
        Core.Event.on('scrollTop',scrollTop);
        //back
        Core.Event.on('back',function(action){
            Core.Router.back(action||-1);
        });
        function analytics(params,title){
            setTimeout(function(){
                var url = Actions.analytics+'?devevent=1'+(params?('&'+params):'');
                //android和iOS
                if($.os.ios && !$.os.android){
                    url += '&ios';
                }else if($.os.android){
                    url += '&android';
                }
                Core.Navigator.protocol(url,true);
            },0);
        }
        function scrollTop(){
            var top = Math.min( Math.min(window.pageYOffset,document.documentElement.scrollTop||document.body.scrollTop),window.scrollY ),
                start = top,
                to = 0,
                timer = 0,
                change = to - start,
                currentTime = 0,
                increment = 20,
                duration = 500;
            (function animloop(){
                // increment the time
                currentTime += increment;
                if(start<2 || CTRL.views.Base.GlobalTouch.touched || currentTime>duration){
                    if(start<2){
                        window.scrollTo(0,1);
                    }
                    cancelRequestAnimFrame(timer);
                    return;
                }
                window.scrollTo(0,Math.easeInOutQuad(currentTime, start, change, duration));
                timer = requestAnimFrame(animloop);
            })();
        }

        function onViewChanged(){
            appModifyTitle( 'DEJA – Xclusive Fashion Party' );
            CTRL.views.Base.msgbox.hideLoading();
        }

        function onUserinfo(){
            if(isApp){
                Core.NativeBridge.userInfo(function(rs){
                    if(rs){
                        CTRL.models.Base.setNativeBridgeUserMeta(rs);

                        //onLogin();
                        //return;
                        if(CTRL.models.Base.verifyLoginCookie() && CTRL.models.Base.verifyLoginCookieTimeout()){
                            Core.Router.run();
                        }else{
                            onLogin();
                        }
                    }else{
                        Core.Router.run();
                    }
                });
                Core.NativeBridge.device(function(rs){
                    if(rs){
                        CTRL.models.Base.setNativeBridgeDeviceMeta(rs);
                    }
                });
            }else{
                Core.Router.run();
            }            
        }

        function onLogin(arg){
            if(isApp){
                Core.NativeBridge.login(function(rs){
                    if(rs){
                        CTRL.models.Base.saveLoginCookieTimeout();
                        CTRL.models.Base.initModelUpdateTimeout();
                        CTRL.models.Base.setNativeBridgeUserMeta(rs);
                        Core.Router.run();
                    }
                    /* 注释掉避免开启DEBUG模式时，出现死循环的问题
                    else{
                        Core.Router.run();
                    }
                    */
                });
            }else{
                CTRL.views.Base.msgbox.showDownload({
                    yesCallback: function(){
                        redirectToDownload(Actions.main+(arg||''));
                    }
                });
            }
        }
        function onFeedback(){
            Core.Navigator.protocol('mailto:mozat@mozat.com?subject=Suggestion',true);
        }
        function switchTab(el,tabs,tabContents){
            if(!tabs || !tabContents){return;}
            var isClicked = !!el;
            el = el || tabs[0];
            for(var i=0;i<tabs.length;i++){
                if(tabs[i] == el){
                    tabs[i].classList.add('on');
                    trigerAnimate( tabContents.eq(i) );
                    tabContents[i] && tabContents[i].classList.add('show');
                    isClicked && Core.Event.trigger( 'analyticsCurView','tab='+i);
                }else{
                    tabs[i].classList.remove('on');
                    tabContents[i] && tabContents[i].classList.remove('show');
                }
            }
            Core.Event.trigger( 'analyticsCurView');
        }
        function trigerAnimate(el,classname,timeout){
            if(!el){return;}
            classname = classname || 'animated';
            timeout = timeout || 1200;
            el.animTimer && clearTimeout(el.animTimer);
            el.addClass(classname);
            el.animTimer = setTimeout(function(){
                el.removeClass(classname);
            },timeout);                  
        }        
        function toggleTextSectionExpand(el){
            el && el.classList.toggle('expand');
        }

        function appUpdate(msg){
            redirectToApp(function(){
                CTRL.views.Base.msgbox.showDialog({
                    msg: msg||'Please up to date your App',
                    noText: 'Close',
                    yesText: 'Update',
                    yesCallback: function(){
                        downloadNativeBridgeInApp();
                    }
                });
            });
        }
        function appUserCenter(){
            redirectToApp(function(){
                Core.NativeBridge.pushView('personalcenter');
            });        
        }
        function appShare(callback){
            redirectToApp(function(){
                Core.NativeBridge.share(callback);
            });   
        }
        
        function appOpenComment(boardid,docid,title){
            redirectToApp(function(){
                Core.NativeBridge.openComment(boardid,docid,title);
            });
        }
        function appUpdateProfile(){
            if(isApp){
                Core.NativeBridge.updateProfile();
            }           
        }
        function appCopyText(text){
            if(isApp){
                Core.NativeBridge.copy(text);
            }
        }
        function appModifyTitle(title){
            title = title || document.title;
            document.title = title;
            if(isApp){
                Core.NativeBridge.modifytitle(title);
            }
        }
        function appActionButton(name,callback){
            if(isApp){
                Core.NativeBridge.actionbutton(name,callback);
            }
        }
        function appActionShareButton(callback){
            appActionButton('分享',function(){
                appShare(callback);
            });
        }
        function appActionDefaultButton(){
            appActionButton('',function(){});
        }
        function downloadNativeBridgeInApp(){
            var url = Actions.NativeBridgeAndroid;
            if($.os.ios && !$.os.android){
                url  = Actions.NativeBridgeIos;
            }
            window.location = url;
        }
        //打开客户端原生视图
        function redirectToApp(callback,link){
            if(isApp){
                callback && callback();
            }else{
                CTRL.views.Base.msgbox.showDownload({
                    yesCallback: function(){
                        redirectToDownload(link || window.location.href);
                    }
                });
            }
        }
        function redirectToDownload(link,autoopen){
            link = link?('#url=NativeBridge://web/'+link):'';
            redirectToPage(Actions.NativeBridgeDwonload+(autoopen?'?autoopen=1':'')+link);
        }   
        function redirectToPage(link){
            if(link){
                !(/__NativeBridge_target/g.test(link)) && appActionDefaultButton();
                window.location = link;
            }
        }
        
    }//end Controller    
    return new Controller;
});
define('app/resources/TemplateHome',['require','exports','module'],function(require, exports, module) {
    var TemplateHome = function(){
        if(TemplateHome.prototype.instance){
            return TemplateHome.prototype.instance;
        }
        var el = $('.view-home');
        function getTpl(selector){
            return  Core.microTmpl( el.find(selector).text() );
        }
        TemplateHome.prototype.instance = this;
    }
    return TemplateHome;
});
define('app/resources/TemplateForm',['require','exports','module'],function(require, exports, module) {
    var TemplateForm = function(){
        if(TemplateForm.prototype.instance){
            return TemplateForm.prototype.instance;
        }
        var el = $('.view-form');
        function getTpl(selector){
            return  Core.microTmpl( el.find(selector).text() );
        }
        this.content = {
            topBanner: getTpl('.top-banner script'),
            subTopics: getTpl('.sub-topics script')
        }
        this.historyTopics = getTpl('.history-topics script');
        TemplateForm.prototype.instance = this;
    }

    return TemplateForm;
});
define('app/resources/TemplateResult',['require','exports','module'],function(require, exports, module) {
    var TemplateResult = function(){
        if(TemplateResult.prototype.instance){
            return TemplateResult.prototype.instance;
        }
        var el = $('.view-result');
        function getTpl(selector){
            return  Core.microTmpl( el.find(selector).text() );
        }
        TemplateResult.prototype.instance = this;
    }
    return TemplateResult;
});
define('app/resources/Templates',['require','exports','module','./TemplateHome','./TemplateForm','./TemplateResult'],function(require, exports, module) {
    var Templates = {};
    
    Templates.Home = require('./TemplateHome');
    Templates.Form = require('./TemplateForm');
    Templates.Result = require('./TemplateResult');

    return Templates;
});
define('util/Slider',['require','exports','module'],function(require, exports, module) {
    function Slider(option){
        option = option || {};
        var me = this,
            emptyFn = function(){},
            el = option.el.find( '.'+(option.listCls || 'list') ),
            pEl = option.el.find( '.'+(option.processCls || 'process') ),
            isMoving = false,
            moveTimeout = option.moveTimeout || 100,
            moveDuration = option.moveDuration || 640,
            moveRate = option.moveRate || 1.3,
            index = 0,
            totalWidth = el.width(),
            itemLength = el.children().length,
            itemWidth = totalWidth/itemLength,
            orientation = true,
            lastMove = 0,
            autoTimer = 0;
        var enablePrecess = option.enablePrecess,
            enableAutorun = option.enableAutorun,
            enableDrag = option.enableDrag;
        var onMove = option.onMove || emptyFn,
            onFirst = option.onFirst || emptyFn,
            onLast = option.onLast || emptyFn,
            onTouchstart = option.onTouchstart || emptyFn,
            onTouchend = option.onTouchend || emptyFn,
            onTouchmove = option.onTouchmove || emptyFn;
        var bezier = 'cubic-bezier(0.075, 0.82, 0.165, 1)';//'cubic-bezier(0.1, 0.57, 0.1, 1)';
        var drag = {
            moved: false,
            timer: 0,
            dirX: 0,
            distX: 0,
            dirY: 0,
            distY: 0,
            moveDistX: 0,
            maxMove: itemWidth/2,
            startTime: 0,
            endTime: 0,
            resetMaxMove: function(){
                drag.maxMove = itemWidth/2;
            },
            reset: function(){
                drag.moved = false;
                drag.isSwipe = false;
                drag.dirX = 0;
                drag.distX = 0;
                drag.dirY = 0;
                drag.distY = 0;
                drag.timer = 0;
                drag.timer && cancelRequestAnimFrame(drag.timer);
            },
            move: function(){
                if(!drag.moved){return;}
                var mX = -index*itemWidth,
                    dx = Math.round( Math.abs(drag.distX)/moveRate );
                drag.moveDistX = dx;
                if(dx>itemWidth*9/10){
                    drag.endDrag();
                    return;
                }else if(drag.distX>0){
                    mX += dx;
                }else{
                    mX -= dx;
                }

                el.css({'-webkit-transform':'translate3d('+mX+'px,0,0)','-webkit-transition': '-webkit-transform 0ms '+bezier});
                lastMove = -mX;
            },
            endDrag: function(){
                drag.moved = false;
                var mX = -index*itemWidth,
                    dx = drag.moveDistX;
                if(drag.isSwipe){
                    drag.distX>0?me.pre():me.next();
                }else{
                    if(drag.distX>0){
                        mX += dx;
                    }else{
                        mX -= dx;
                    }
                    if(mX >= 0 || mX <= -(totalWidth-itemWidth) || dx<drag.maxMove){
                        move();
                    }else{
                        drag.distX>0?me.pre():me.next();
                    }
                }

                drag.reset();
                me.startAutoRun();
            }
        };
        function touchStart(e){
            if(itemLength<2 || isMoving){return;}
            drag.startTime = new Date().getTime();
            onTouchstart();
            autoTimer && clearInterval(autoTimer);
            totalWidth = totalWidth || el.width();
            itemWidth = itemWidth || (totalWidth/itemLength);
            drag.resetMaxMove();
            var touch = e.touches[0];
            drag.moved = true;
            drag.dirX = touch.pageX;
            drag.distX = 0;
            drag.dirY = touch.pageY;
            drag.distY = 0;
            (function animloop(){
                if(!drag.moved){
                    drag.reset();
                    return;
                }
                drag.move();
                drag.timer = requestAnimFrame(animloop);
            })();
        }
        function touchMove(e){
            var touch = e.touches[0];
            drag.distX = touch.pageX - drag.dirX;
            drag.distY = touch.pageY - drag.dirY;
            onTouchmove(Math.abs(drag.distX),Math.abs(drag.distY));
        }

        function touchEnd(e){
            drag.endTime = new Date().getTime();
            if(drag.moved){
                drag.isSwipe = drag.endTime-drag.startTime<=200 && Math.abs(drag.distX)>30;
                drag.endDrag();
            }
            onTouchend(Math.abs(drag.distX),Math.abs(drag.distY));
        }
        if(enableDrag){
            el.touchstart = el.touchstart || touchStart;
            el.touchmove = el.touchmove || touchMove;
            el.touchend = el.touchend || touchEnd;
            el.off('touchstart',el.touchstart);
            el.off('touchmove',el.touchmove);
            el.off('touchend',el.touchend);
            el.on('touchstart',el.touchstart);
            el.on('touchmove',el.touchmove);
            el.on('touchend',el.touchend);
        }
        this.next = function(){
            if(isMoving){return;}
            index++;
            move();
        }
        this.pre = function(){
            if(isMoving){return;}
            index--;
            move();
        }
        function move(){
            if(isMoving){return;}
            isMoving = true;
            setTimeout(function(){
                isMoving = false;
            },moveTimeout);
            itemLength = el.children().length;
            if(index>itemLength-1){
                index = itemLength-1;
                onLast(index);
            }else if(index<0){
                index = 0;
                onFirst(index);
            }
            var _m = index*itemWidth,
                _absm = Math.abs(lastMove-_m),
                _t = (moveDuration/itemWidth)*_absm,
                animate = 'ease';

            if(drag.isSwipe){
                var velocity = drag.moveDistX*moveRate/(drag.endTime-drag.startTime);
                _t = velocity*_absm;
                animate = bezier;
            }

            lastMove = _m;
            //修正android差1px的问题
            //_m = (_m>0&&$.os.android)?(_m+1):_m;
            el.css({'-webkit-transform':'translate3d(-'+_m+'px,0,0)','-webkit-transition': '-webkit-transform '+_t+'ms '+animate});
            runProcess();
            onMove(index);
        }
        this.reset = function(){
            index = 0;
            orientation = true;
            totalWidth = totalWidth || el.width();
            itemLength = el.children().length;
            itemWidth = itemWidth || (totalWidth/itemLength);
            me.stopAutoRun();
            el.css({'-webkit-transform':'translate3d(0,0,0)'});
            lastMove = 0;
            drag.reset();
            pEl.hide();
            renderProcess();
            me.startAutoRun();
        }
        this.stopAutoRun = function(){
            autoTimer && clearInterval(autoTimer);
        }
        function moveOrientation(){
            totalWidth = totalWidth || el.width();
            itemLength = el.children().length;
            itemWidth = itemWidth || (totalWidth/itemLength);
            if(index == itemLength-1){
                orientation = false;
            }else if(index == 0){
                orientation = true;
            }
            if(!orientation){
                me.pre();
            }else{
                me.next();
            }
        }
        this.startAutoRun = function(){
            if(enableAutorun && itemLength>1){
                autoTimer = setInterval(function(){
                    if(drag.moved){return;}//如果拖动就停止
                    moveOrientation();
                },3000);
            }
        }
        function renderProcess(){
            if(enablePrecess && itemLength>1){
                var tmp = [];
                for(var i=0;i<itemLength;i++){
                    tmp.push('<div></div>');
                }
                pEl.html(tmp.join(''));
                pEl.show();
                runProcess();
            }
        }
        function runProcess(){
            if(!enablePrecess){return;}
            var processChild = pEl.find('div');
            processChild.removeClass('on');
            $(processChild[index]).addClass('on');
        }
        this.reset();
    }
    return Slider;
});

define('app/view/HomeView',['require','exports','module','app/resources/Templates','util/Slider','app/view/View','app/model/Model'],function(require, exports, module) {
    var Templates = require('app/resources/Templates');
    var Slider = require('util/Slider');
    var BaseView = require('app/view/View');
    var BaseModel = require('app/model/Model');


    function HomeView(owner){
        this.models = {
            Base: BaseModel
        }
        this.viewCls = 'view-home';
        this._owner = owner;

        var VIEW = this,
            isApp = Core.NativeBridge.isApp(),
            Tpl,els,viewParam,
            tap = VIEW._owner.tapEvent;

        //注册model观察者
        VIEW.models.Base.leaveNum.updated(render);

        function initEls(){
            if(els){return;}
            var main = $('.view-home');
            els = {
                //body: $('body'),
                main: main,

                intro: main.find('.main .intro'),
                count: main.find('.main .count'),
                bulletin: main.find('.bulletin-section'),
                event: main.find('.main .event-section')
            }
            bindEvent();
        }//end initEls       
        function initResources(){
            Tpl = new Templates.Home;
            viewParam = '';
            initEls();
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){

        }//end bindEvent        

        this.show = function(){
            initResources();

            console.log(1234567);
            if(!els.main.hasClass('show')){
                VIEW._owner.show(VIEW.viewCls);

                Core.Event.trigger('trigerAnimate',els.main);
                els.bulletinSlider && els.bulletinSlider.reset();
            }
        }
        this.hide = function(){
            if(!els){ return;}
            els.bulletinSlider && els.bulletinSlider.stopAutoRun();
        }
        function render(data){
            initResources();
            data = data || VIEW.models.Base.leaveNum.get();
            els.count.css({opacity:1});
            els.intro.find('p').addClass('hide');
            if(data){
                els.count.find('span').html(data.leave_num || 0);
            }
            if(VIEW.models.Base.isPartnerApply()){
                els.intro.find('.partner').removeClass('hide');
                els.count.css({opacity:0});
                els.event.addClass('partner');
            }else{
                els.intro.find('.normal').removeClass('hide');
                els.event.removeClass('partner');
            }
            if(els.bulletinSlider){
                els.bulletinSlider.stopAutoRun();
                els.bulletinSlider.reset();
            }else{
                els.bulletinSlider = new Slider({
                    el: els.bulletin,
                    enableDrag: true,
                    enablePrecess: true,
                    enableAutorun: true,
                    onTouchend: function(){
                        VIEW._owner.GlobalTouch.preventMove = false;
                    },
                    onTouchmove: function(x,y){
                        VIEW._owner.GlobalTouch.preventMove = x>5&&y<30;
                    },
                    onMove: function(index){
                        //Core.Event.trigger('analyticsCurView','bulletin='+index);
                    }
                });
            }
        }//end render


    }//end View
    return new HomeView(BaseView);
});

define('app/view/ExpiredView',['require','exports','module','util/Slider','app/view/View','app/model/Model'],function(require, exports, module) {
    var Slider = require('util/Slider');
    var BaseView = require('app/view/View');
    var BaseModel = require('app/model/Model');


    function ExpiredView(owner){
        this.models = {
            Base: BaseModel
        }
        this.viewCls = 'view-expired';
        this._owner = owner;

        var VIEW = this,
            isApp = Core.NativeBridge.isApp(),
            Tpl,els,
            tap = VIEW._owner.tapEvent;

        //注册model观察者

        function initEls(){
            if(els){return;}
            var main = $('.view-expired');
            els = {
                //body: $('body'),
                main: main,

                bulletin: main.find('.bulletin-section')
            }
            bindEvent();
        }//end initEls       
        function initResources(){
            initEls();
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){

        }//end bindEvent        

        this.show = function(){
            initResources();

            if(!els.main.hasClass('show')){
                VIEW._owner.show(VIEW.viewCls);

                Core.Event.trigger('trigerAnimate',els.main);
                els.bulletinSlider && els.bulletinSlider.reset();
                render();
            }
        }
        this.hide = function(){
            if(!els){ return;}
            els.bulletinSlider && els.bulletinSlider.stopAutoRun();
        }
        function render(data){
            initResources();

            if(els.bulletinSlider){
                els.bulletinSlider.stopAutoRun();
                els.bulletinSlider.reset();
            }else{
                els.bulletinSlider = new Slider({
                    el: els.bulletin,
                    enableDrag: true,
                    enablePrecess: true,
                    enableAutorun: true,
                    onTouchend: function(){
                        VIEW._owner.GlobalTouch.preventMove = false;
                    },
                    onTouchmove: function(x,y){
                        VIEW._owner.GlobalTouch.preventMove = x>5&&y<30;
                    },
                    onMove: function(index){
                        //Core.Event.trigger('analyticsCurView','bulletin='+index);
                    }
                });
            }
        }//end render


    }//end View
    return new ExpiredView(BaseView);
});

define('app/Controller/HomeController',['require','exports','module','../resources/Actions','app/model/Model','app/view/View','app/view/HomeView','app/view/ExpiredView'],function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var BaseModel = require('app/model/Model');
    var BaseView = require('app/view/View');
    var HomeView = require('app/view/HomeView');
    var ExpiredView = require('app/view/ExpiredView');

    function HomeController(){
        this.models = {
            Base: BaseModel
        }
        this.views = {
            Base: BaseView,
            Home: HomeView,
            Expired: ExpiredView
        };

        var CTRL = this,
            viewNames,
            curViewId = '';

        viewNames = {
            'home': 'Home'
        }
        Core.Router.onChanged(onViewChanged)
            .onUnsubscribed(onViewUnnamed)
            .subscribe('/home/',onViewHome)
            .subscribe('/expired/',onViewExpired);

        //统计视图
        Core.Event.on('analyticsCurView',analyticsCurView);
        //forwardHome
        Core.Event.on('forwardHome',forwardHome);
        Core.Event.on('forwardExpired',forwardExpired);

        function onViewChanged(){
            if(!Core.Router.currentMatch('/home/')){
                CTRL.views.Home.hide();
            }
            if(!Core.Router.currentMatch('/expired/')){
                CTRL.views.Expired.hide();
            }
        }

        function onViewUnnamed(hash){
            onViewHome();
            Core.Event.trigger( 'analytics');
        }
        function onViewHome(){
            if(!$.os.ios && !$.os.android){
                forwardDesktopVersion();
                return;
            }
            curViewId = 'home';
            CTRL.views.Home.show();

            CTRL.models.Base.leaveNum.request();

            //追加统计
            analyticsCurView();
        }
        function onViewExpired(){
            if(!$.os.ios && !$.os.android){
                forwardDesktopVersion();
                return;
            }
            curViewId = 'expired';
            CTRL.views.Expired.show();

            CTRL.models.Base.leaveNum.request();

            //追加统计
            analyticsCurView();
        }
        function forwardHome(arg){
            Core.Router.forward('/home/'+(arg||''));
        }
        function forwardExpired(arg){
            Core.Router.forward('/expired/'+(arg||''));
        }
        function forwardDesktopVersion(){
            var url = CTRL.models.Base.isPartnerApply()?Actions.desktopMediaUrl:Actions.desktopUrl;
            Core.Event.trigger('redirect',url);
        }
        function analyticsCurView(params,title){
            if( !Core.Router.currentMatch(['/home/','/expired/']) ){
                return;
            }
            params = params?('&'+params):'';
            title = title||viewNames[curViewId]||document.title;
            
            Core.Event.trigger( 'analytics','viewid='+curViewId+params,title );
        }
    }
    return new HomeController;
});
define('app/view/FormView',['require','exports','module','app/resources/Templates','app/view/View','app/model/Model'],function(require, exports, module) {
    var Templates = require('app/resources/Templates');
    var BaseView = require('app/view/View');
    var BaseModel = require('app/model/Model');

    function FormView(owner){
        this.models = {
            Base: BaseModel
        }
        this.viewCls = 'view-form';
        this._owner = owner;

        var VIEW = this,
            isApp = Core.NativeBridge.isApp(),
            Tpl,els,
            formInputs,formAttrs,guests = 1,
            tap = VIEW._owner.tapEvent;

        //注册model观察者

        function initEls(){
            if(els){return;}
            var main = $('.view-form');
            els = {
                body: $('body'),
                main: main,

                form: main.find('.userinfo .form'),
                guest: main.find('.userinfo .form .guest .input'),
                guestOptions: main.find('.userinfo .form .guest .input>div'),
                submit: main.find('.userinfo .btns')
            }
            bindEvent();
        }//end initEls       
        function initResources(){
            Tpl = new Templates.Form;
            initEls();
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){
            els.guest.on(tap,'.radio',function(){
                renderGuest($(this));
            });
            els.submit.on(tap,beforeCommit);

        }//end bindEvent

        this.show = function(){
            initResources();

            //els.body.addClass(VIEW.viewCls);
            VIEW._owner.show(VIEW.viewCls);

            Core.Event.trigger('trigerAnimate',els.main);
            render();
        }
        this.hide = function(){
            if(!els){ return;}
        }
        function render(data){
            initResources();

            els.form.find('.org')[VIEW.models.Base.isPartnerApply()?'show':'hide']();
            renderGuest();
        }

        function renderGuest(el){
            el = el || $(els.guestOptions[0]);
            els.guestOptions.removeClass('on');
            el.addClass('on');
            guests = el.attr('data-value');
        }
        function focusInput(el){
            //给click事件用，自动将焦点到第一个输入框并弹出键盘
            //input动态生成，暂无效
            if($.os.android){
                var _body = $('body'),
                    _fn = function() { el.focus(); _body.unbind(_body);}
                _body.click(_fn);
            }else{
                el.focus();
            }
        }
        function  updateValues(){
            var el = els.form,
                organization = el.find('input.organization'),
                name = el.find('input.name'),
                mail = el.find('input.mail'),
                phone = el.find('input.phone');
            //隐藏光标
            el.find('input').blur();

            formInputs = {
                organization: organization,
                name: name,
                mail: mail,
                phone: phone
            }
            formAttrs = {
                organization: $.trim( organization.val() ) || '',
                name: $.trim( name.val() ) || '',
                email: $.trim( mail.val() ) || '',
                phone: $.trim( phone.val() ) || '',
                type: VIEW.models.Base.isPartnerApply()?1:0,
                person_num: guests
            }
            organization.val(formAttrs.organization);
            name.val(formAttrs.name);
            mail.val(formAttrs.email);
            phone.val(formAttrs.phone);
        }
        function beforeCommit(){
            updateValues();
            var input,
                option = {
                    title: 'Please provide your information.',
                    yesText: 'OK',
                    yesCallback: function(){
                        input && focusInput(input);
                    }
                },
                dialog = VIEW._owner.msgbox.showDialog;
            if(VIEW.models.Base.isPartnerApply() && formAttrs.organization.length<1){
                input  = formInputs.organization;
                option.msg = 'Provide your organization name';
                dialog(option);
                return;
            }
            else if(formAttrs.name.length<1){
                input  = formInputs.name;
                option.msg = 'Provide your name';
                dialog(option);
                return;
            }
            else if( !/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/i.test(formAttrs.email) ){
                input  = formInputs.mail;
                option.msg = 'Invalid email';
                dialog(option);
                return;
            }
            else if(formAttrs.phone.length>0 && !/^\d+$/ig.test(formAttrs.phone)){
                input = formInputs.phone;
                option.msg = 'Invalid phone number';
                dialog(option);
                return;
            }else{
                VIEW.models.Base.setApplyUser(formAttrs);
                var msg = [],tpl = Core.microTmpl('<p><%=LABLE%>: <%=VALUE%></p>');
                VIEW.models.Base.isPartnerApply() && msg.push( tpl({
                    LABLE: 'Organization',
                    VALUE: formAttrs.organization
                }) );

                msg.push( tpl({
                    LABLE: 'Name',
                    VALUE: formAttrs.name
                }), tpl({
                    LABLE: 'Email',
                    VALUE: formAttrs.email
                }) );
                formAttrs.phone.length>0 && msg.push( tpl({
                    LABLE: 'Phone',
                    VALUE: formAttrs.phone
                }) );
                msg.push( tpl({
                    LABLE: 'Bring Guests',
                    VALUE: guests>1?('+'+(guests-1)):'Just me'
                }) );


                option.title = 'Confirm your information';
                option.noText = 'Cancel';
                option.yesText = 'Confirm';
                option.msg = msg.join('');
                option.yesCallback = function(){
                    Core.Event.trigger('beforeApply');
                };
                dialog(option);
            }
        }
    }//end View
    return new FormView(BaseView);
});

define('app/Controller/FormController',['require','exports','module','../resources/Actions','util/ThirdVendor','app/model/Model','app/view/View','app/view/FormView'],function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var ThirdVendor = require('util/ThirdVendor');

    var BaseModel = require('app/model/Model');
    var BaseView = require('app/view/View');
    var FormView = require('app/view/FormView');


    function FormController(){
        this.models = {
            Base: BaseModel
        }
        this.views = {
            Base: BaseView,
            Form: FormView
        };
        var CTRL = this,
            viewNames,
            curViewId = '';

        viewNames = {
            'form': 'register'
        }
        Core.Router.onChanged(onViewChanged)
                .subscribe('/form/',onViewForm);

        //统计视图
        Core.Event.on('analyticsCurView',analyticsCurView);

        Core.Event.on('beforeApply',beforeApply);

        function onViewChanged(){
            if(!Core.Router.currentMatch('/form/')){
                CTRL.views.Form.hide();
            }
        }
        function onViewForm(){
            curViewId = 'form';
            CTRL.views.Form.show();

            //追加统计
            analyticsCurView();
        }

        function beforeApply(data){
            data = data || CTRL.models.Base.getApplyUser();
            if(data){
                CTRL.views.Base.msgbox.showLoading('Submitting...');
                CTRL.models.Base.apply.post(data,afterPostApply);
            }
        }
        function afterPostApply(success){
            CTRL.views.Base.msgbox.hideLoading();
            if(success){
                var data = CTRL.models.Base.apply.get();
                if(data && data.ret==2){
                    CTRL.views.Base.msgbox.showDialog({
                        msg: 'Email is invalid or already taken.',
                        yesText: 'Ok'
                    });
                }else{
                    Core.Event.trigger('forwardResult');
                }
            }else{
                CTRL.views.Base.msgbox.showFailed();
            }
        }
        function analyticsCurView(params,title){
            if( !Core.Router.currentMatch(['/form/']) ){
                return;
            }
            params = params?('&'+params):'';
            title = title||viewNames[curViewId]||document.title;

            Core.Event.trigger( 'analytics','viewid='+curViewId+params,title );
        }
        
    }//end Controller    
    return new FormController;
});
define('app/view/ResultView',['require','exports','module','app/resources/Templates','util/Slider','app/view/View','app/model/Model'],function(require, exports, module) {
    var Templates = require('app/resources/Templates');
    var Slider = require('util/Slider');
    var BaseView = require('app/view/View');
    var BaseModel = require('app/model/Model');


    function ResultView(owner){
        this.models = {
            Base: BaseModel
        }
        this.viewCls = 'view-result';
        this._owner = owner;

        var VIEW = this,
            isApp = Core.NativeBridge.isApp(),
            Tpl,els,
            tap = VIEW._owner.tapEvent;

        //注册model观察者

        function initEls(){
            if(els){return;}
            var main = $('.view-result');
            els = {
                //body: $('body'),
                main: main,

                success: main.find('.success'),
                failed: main.find('.failed'),

                bulletin: main.find('.bulletin-section'),
                event: main.find('.event-section')
            }
            bindEvent();
        }//end initEls       
        function initResources(){
            Tpl = new Templates.Result;
            initEls();
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){

        }//end bindEvent        

        this.show = function(){
            initResources();

            if(!els.main.hasClass('show')){
                VIEW._owner.show(VIEW.viewCls);

                Core.Event.trigger('trigerAnimate',els.main);
                els.bulletinSlider && els.bulletinSlider.reset();
                render();
            }
        }
        this.hide = function(){
            if(!els){ return;}
            els.bulletinSlider && els.bulletinSlider.stopAutoRun();
            els.success.addClass('hide');
            els.failed.addClass('hide');
        }
        function render(data){
            initResources();

            if(VIEW.models.Base.isPartnerApply()){
                els.event.addClass('partner');
            }else{
                els.event.removeClass('partner');
            }

            var data = VIEW.models.Base.apply.get(),
                user = VIEW.models.Base.getApplyUser();
            if(data && data.ret == 0){
                els.success.removeClass('hide');
                var msg  = '';
                if(user){
                    if(user.organization){
                        msg += '<div><span>'+user.organization+'</span></div>'
                    }
                    msg += user.name + (user.person_num>1?(' + '+(user.person_num-1)+' Guests'):'');
                }
                els.success.find('.userinfo').html(msg);
            }else{
                els.failed.removeClass('hide');
                els.failed.find('.content .msg').html( (data && data.ret==2)?'Email is invalid or already taken.':'this event has reached max capacity.');
                if(els.bulletinSlider){
                    els.bulletinSlider.stopAutoRun();
                    els.bulletinSlider.reset();
                }else{
                    els.bulletinSlider = new Slider({
                        el: els.bulletin,
                        enableDrag: true,
                        enablePrecess: true,
                        enableAutorun: true,
                        onTouchend: function(){
                            VIEW._owner.GlobalTouch.preventMove = false;
                        },
                        onTouchmove: function(x,y){
                            VIEW._owner.GlobalTouch.preventMove = x>5&&y<30;
                        },
                        onMove: function(index){
                            //Core.Event.trigger('analyticsCurView','bulletin='+index);
                        }
                    });
                }
            }
        }//end render


    }//end View
    return new ResultView(BaseView);
});

define('app/Controller/ResultController',['require','exports','module','../resources/Actions','app/model/Model','app/view/View','app/view/ResultView'],function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var BaseModel = require('app/model/Model');
    var BaseView = require('app/view/View');
    var ResultView = require('app/view/ResultView');

    function ResultController(){
        this.models = {
            Base: BaseModel
        }
        this.views = {
            Base: BaseView,
            Result: ResultView
        };

        var CTRL = this,
            viewNames,
            curViewId = '';

        viewNames = {
            'result': 'Result'
        }
        Core.Router.onChanged(onViewChanged)
            .subscribe('/result/',onViewResult);

        //统计视图
        Core.Event.on('analyticsCurView',analyticsCurView);
        //forwardResult
        Core.Event.on('forwardResult',forwardResult);


        function onViewChanged(){
            if(!Core.Router.currentMatch('/result/')){
                CTRL.views.Result.hide();
            }
        }
        function onViewResult(){
            curViewId = 'result';
            CTRL.views.Result.show();

            //追加统计
            analyticsCurView();
        }
        function forwardResult(arg){
            Core.Router.forward('/result/'+(arg||''));
        }

        function analyticsCurView(params,title){
            if( !Core.Router.currentMatch(['/result/']) ){
                return;
            }
            params = params?('&'+params):'';
            title = title||viewNames[curViewId]||document.title;
            
            Core.Event.trigger( 'analytics','viewid='+curViewId+params,title );
        }
    }
    return new ResultController;
});
define('app/App.js',['require','exports','module','lib/zepto','lib/Core','./Controller/Controller','./Controller/HomeController','./Controller/FormController','./Controller/ResultController'],function(require, exports, module) {
    require('lib/zepto');
    require('lib/Core');

    var BaseController = require('./Controller/Controller');
    var HomeController = require('./Controller/HomeController');
    var FormController = require('./Controller/FormController');
    var ResultController = require('./Controller/ResultController');

    function App(){
        var params = Core.localParam(),
            standalone = params.search['standalone'];//如果带此参数，初始页非首页的浏览器历史返回将不会回首页
        setTimeout(function(){
            //Core.Router.init(standalone?'':'/home/');
            Core.Router.init();
        },250);
    }
    window.App = new App;
});
require(["app/App.js"]);
}());