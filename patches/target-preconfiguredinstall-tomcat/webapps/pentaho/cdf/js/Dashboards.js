$.ajaxSetup({
		type: "POST",
		async: false
	});

var GB_ANIMATION = true;
var CDF_CHILDREN = 1;
var CDF_SELF = 2;
var TRAFFIC_RED = "cdf/images/traffic_red.png";
var TRAFFIC_YELLOW = "cdf/images/traffic_yellow.png";
var TRAFFIC_GREEN = "cdf/images/traffic_green.png";

$.blockUI.defaults.message = '<div style="padding: 15px;"><img src="/pentaho/cdf/images/busy.gif" /> <h3>Processing...</h3></div>';
$.blockUI.defaults.css.left = '40%';
$.blockUI.defaults.css.top = '30%';
$.blockUI.defaults.css.marginLeft = '85px';
$.blockUI.defaults.css.width = '170px';
$.blockUI.defaults.css.opacity = '.8';
$.blockUI.defaults.css['-webkit-border-radius'] = '10px'; 
$.blockUI.defaults.css['-moz-border-radius'] = '10px';

if (typeof $.SetImpromptuDefaults == 'function')
	$.SetImpromptuDefaults({
			prefix: 'colsJqi',
			show: 'slideDown'
		});

var Dashboards = 
	{
		globalContext: true, // globalContext determines if components and params are retrieved from the current window's object or from the Dashboards singleton
		runningCalls: 0, // Used to control progress indicator for async mode
		components: [],
		parameters: [], // only used if globalContext = false
		args: [],
		monthNames : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	}

Dashboards.setGlobalContext = function(globalContext) {
	Dashboards.globalContext = globalContext;
}

Dashboards.showProgressIndicator = function() {
	Dashboards.blockUIwithDrag();
}

Dashboards.hideProgressIndicator = function() {
	if(Dashboards.runningCalls <= 0){
		$.unblockUI();
	}
}

Dashboards.incrementRunningCalls = function() {
	Dashboards.runningCalls++ ;
}

Dashboards.decrementRunningCalls = function() {
	Dashboards.runningCalls-- ;
	if(Dashboards.runningCalls<=0){
		Dashboards.hideProgressIndicator();
		Dashboards.runningCalls = 0; // Just in case
	}
}


Dashboards.bindControl = function(object) {

	// see if there is a class defined for this object
	var objectType = typeof object["type"]=='function'?object.type():object.type;
	var classNames = [ // try type as class name
	objectType,
	// try Type as class name
	objectType.substring(0,1).toUpperCase() + objectType.substring(1),
	// try TypeComponent as class name
	objectType.substring(0,1).toUpperCase() + objectType.substring(1) + 'Component'
	];
	var objectImpl;
	for (var i = 0; i < classNames.length && objectImpl == null; i++) {
		try {
			eval('objectImpl = new ' + classNames[i]);
			// this will add the methods from the inherited class. Overrides not allowed
			$.extend(object,objectImpl);
			break;
		} catch (e) {
		}
	}
	if (typeof objectImpl == 'undefined'){
		alert ("Object type " + object["type"] + " can't be mapped to a valid class");
	}
}

Dashboards.blockUIwithDrag = function() {
	$.blockUI();
	var handle = $('<div id="blockUIDragHandle" style="cursor: pointer; width: 170px; -webkit-border-radius: 5px; -moz-border-radius: 5px; background-color: rgba(0,0,0,0.25);" align="right"><a style="padding-right: 5px; text-decoration: none; color: black; font-weight: bold; font-color: black; font-size: 8pt" href="javascript:$.unblockUI()" title="Click to unblock">X</a></div>')
	$("div.blockUI.blockMsg").prepend(handle);
	$("div.blockUI.blockMsg").draggable({
			handle: "#blockUIDragHandle"
		});
}

//Dashboards.xactionCallback = function(object,str){
//	$('#'+object.htmlObject).html(str);
//	Dashboards.runningCalls--;
//}

Dashboards.update = function(object) {
	if(!(typeof(object.preExecution)=='undefined')){
		object.preExecution();
	}
	if (object.tooltip != undefined){
		object._tooltip = typeof object["tooltip"]=='function'?object.tooltip():object.tooltip;
	}
	// first see if there is an objectImpl
	if ((object.update != undefined) && 
		(typeof object['update'] == 'function')) {
		object.update();
	} else {
		// unsupported update call
	}

	if(!(typeof(object.postExecution)=='undefined')){
		object.postExecution();
	}
	// if we have a tooltip component, how is the time.
	if (object._tooltip != undefined){
		$("#" + object.htmlObject).attr("title",object._tooltip).tooltip({
				delay:0,
				track: true,
				fade: 250
			});
	}
};

Dashboards.getComponent = function(name){
	for (i in this.components){
		if (this.components[i].name == name)
			return this.components[i];
	}
};

Dashboards.getComponentByName = function(name) {
	if (Dashboards.globalContext) {
		return eval(name);
	} else {
		return Dashboards.getComponent(name);
	}
};

Dashboards.addComponents = function(components) {
	// attempt to convert over to component implementation
	for (var i =0; i < components.length; i++) {
		Dashboards.bindControl(components[i]);
	}
	this.components = this.components.concat(components);
};

Dashboards.addArgs = function(url){
	if(url != undefined)
		this.args = getURLParameters(url);
}

Dashboards.init = function(components){
	if(Dashboards.isArray(components)){
		Dashboards.addComponents(components);
	}
	$(function(){Dashboards.initEngine()});
};

Dashboards.initEngine = function(){
	components = this.components;
	var compCount = components.length;
	Dashboards.showProgressIndicator();

	for(var i= 0, len = components.length; i < len; i++){
		if(components[i].executeAtStart){
			this.update(components[i]);
		}
	}
	Dashboards.hideProgressIndicator();
};

Dashboards.resetAll = function(){
	var compCount = components.length;
	for(var i= 0, len = components.length; i < len; i++){
		components[i].clear();
	}
	var compCount = components.length;
	for(var i= 0, len = components.length; i < len; i++){
		if(components[i].executeAtStart){
			this.update(components[i]);
		}
	}
};

Dashboards.processChange = function(object_name){
	var object = Dashboards.getComponentByName(object_name);
	var parameter = object.parameter;
	var value;
	if (typeof object['getValue'] == 'function') {
		value = object.getValue();
	}
	if(!(typeof(object.preChange)=='undefined')){
		object.preChange(value);
	}
	this.fireChange(parameter,value);
	if(!(typeof(object.postChange)=='undefined')){
		object.postChange(value);
	}
};

/*$().ajaxStart($.blockUI).ajaxStop($.unblockUI);*/
Dashboards.fireChange = function(parameter, value) {
	//alert("begin block");
	Dashboards.showProgressIndicator();

	//alert("Parameter: " + parameter + "; Value: " + value);
	Dashboards.setParameter(parameter, value);

	for(var i= 0, len = components.length; i < len; i++){
		if(Dashboards.isArray(components[i].listeners)){
			for(var j= 0 ; j < components[i].listeners.length; j++){

				if(components[i].listeners[j] == parameter) {
					this.update(components[i]);
					break;
				}
				//alert("finished parameter " + j)
			}
		}
	}
	//alert("finish block");
	Dashboards.hideProgressIndicator();

};

Dashboards.isArray = function(testObject) {
	return testObject && !(testObject.propertyIsEnumerable('length')) && typeof testObject === 'object' && typeof testObject.length === 'number';
}

Dashboards.getParameterValue = function (parameterName) {
	if (Dashboards.globalContext) {
		return eval(parameterName);
	} else {
		return Dashboards.parameters[parameterName];
	}
}

Dashboards.getQueryParameter = function ( parameterName ) {
	// Add "=" to the parameter name (i.e. parameterName=value)
	var queryString = window.top.location.search.substring(1);
	var parameterName = parameterName + "=";
	if ( queryString.length > 0 ) {
		// Find the beginning of the string
		begin = queryString.indexOf ( parameterName );
		// If the parameter name is not found, skip it, otherwise return the value
		if ( begin != -1 ) {
			// Add the length (integer) to the beginning
			begin += parameterName.length;
			// Multiple parameters are separated by the "&" sign
			end = queryString.indexOf ( "&" , begin );
			if ( end == -1 ) {
				end = queryString.length
			}
			// Return the string
			return unescape ( queryString.substring ( begin, end ) );
		}
		// Return "" if no parameter has been found
		return "";
	}
};

Dashboards.setParameter = function(parameterName, parameterValue) {
	if (Dashboards.globalContext) {
		eval( parameterName + "= encode_prepare(\"" + parameterValue + "\")");
	} else {
		Dashboards.parameters[parameterName] = encode_prepare(parameterValue);
	}
}

Dashboards.clone = function clone(obj) {

	var c = obj instanceof Array ? [] : {};

	for (var i in obj) {
		var prop = obj[i];

		if (typeof prop == 'object') {
			if (prop instanceof Array) {
				c[i] = [];

				for (var j = 0; j < prop.length; j++) {
					if (typeof prop[j] != 'object') {
						c[i].push(prop[j]);
					} else {
						c[i].push(Dashboards.clone(prop[j]));
					}
				}
			} else {
				c[i] = Dashboards.clone(prop);
			}
		} else {
			c[i] = prop;
		}
	}

	return c;
}

Dashboards.getArgValue  = function(key)
{
	for (i=0;i<this.args.length;i++){
		if(this.args[i][0] == key){
			return this.args[i][1];
		}
	}

	return undefined;
}

Dashboards.ev = function(o){
	return typeof o == 'function'?o():o
};


/**
 *
 * UTF-8 data encode / decode
 * http://www.webtoolkit.info/
 *
 **/

function encode_prepare( s )
{
	if ($.browser == "mozilla"){
		alert("OK");
	}
	s = s.replace(/\+/g," ");
	if ($.browser == "msie" || $.browser == "opera"){
		return Utf8.decode(s);
	}

	return s;
}

var Utf8 = {

	// public method for url encoding
	encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	},

	// public method for url decoding
	decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}

		return string;
	}

}

function getURLParameters(sURL) 
{	
	if (sURL.indexOf("?") > 0){

		var arrParams = sURL.split("?");
		var arrURLParams = arrParams[1].split("&");
		var arrParam = [];

		for (i=0;i<arrURLParams.length;i++){
			var sParam =  arrURLParams[i].split("=");

			if (sParam[0].indexOf("param",0) == 0){
				var parameter = [sParam[0].substring(5,sParam[0].length),unescape(sParam[1])];
				arrParam.push(parameter);
			}
		}

	}

	return arrParam;
};

function toFormatedString(value) {
	value += '';
	x = value.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1))
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	return x1 + x2;
};


sprintfWrapper = {

	init : function () {

		if (typeof arguments == 'undefined') { 
			return null;
		}
		if (arguments.length < 1) { 
			return null;
		}
		if (typeof arguments[0] != 'string') { 
			return null;
		}
		if (typeof RegExp == 'undefined') { 
			return null;
		}

		var string = arguments[0];
		var exp = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g);
		var matches = new Array();
		var strings = new Array();
		var convCount = 0;
		var stringPosStart = 0;
		var stringPosEnd = 0;
		var matchPosEnd = 0;
		var newString = '';
		var match = null;

		while (match = exp.exec(string)) {
			if (match[9]) { 
				convCount += 1;
			}

			stringPosStart = matchPosEnd;
			stringPosEnd = exp.lastIndex - match[0].length;
			strings[strings.length] = string.substring(stringPosStart, stringPosEnd);

			matchPosEnd = exp.lastIndex;
			matches[matches.length] = {
				match: match[0],
				left: match[3] ? true : false,
				sign: match[4] || '',
				pad: match[5] || ' ',
				min: match[6] || 0,
				precision: match[8],
				code: match[9] || '%',
				negative: parseInt(arguments[convCount]) < 0 ? true : false,
				argument: String(arguments[convCount])
			};
		}
		strings[strings.length] = string.substring(matchPosEnd);

		if (matches.length == 0) { 
			return string;
		}
		if ((arguments.length - 1) < convCount) { 
			return null;
		}

		var code = null;
		var match = null;
		var i = null;

		for (i=0; i<matches.length; i++) {
			var m =matches[i];

			if (m.code == '%') { 
				substitution = '%'
			}
			else if (m.code == 'b') {
				m.argument = String(Math.abs(parseInt(m.argument)).toString(2));
				substitution = sprintfWrapper.convert(m, true);
			}
			else if (m.code == 'c') {
				m.argument = String(String.fromCharCode(parseInt(Math.abs(parseInt(m.argument)))));
				substitution = sprintfWrapper.convert(m, true);
			}
			else if (m.code == 'd') {
				m.argument = toFormatedString(String(Math.abs(parseInt(m.argument))));
				substitution = sprintfWrapper.convert(m);
			}
			else if (m.code == 'f') {
				m.argument = toFormatedString(String(Math.abs(parseFloat(m.argument)).toFixed(m.precision ? m.precision : 6)));
				substitution = sprintfWrapper.convert(m);
			}
			else if (m.code == 'o') {
				m.argument = String(Math.abs(parseInt(m.argument)).toString(8));
				substitution = sprintfWrapper.convert(m);
			}
			else if (m.code == 's') {
				m.argument = m.argument.substring(0, m.precision ? m.precision : m.argument.length)
				substitution = sprintfWrapper.convert(m, true);
			}
			else if (m.code == 'x') {
				m.argument = String(Math.abs(parseInt(m.argument)).toString(16));
				substitution = sprintfWrapper.convert(m);
			}
			else if (m.code == 'X') {
				m.argument = String(Math.abs(parseInt(m.argument)).toString(16));
				substitution = sprintfWrapper.convert(m).toUpperCase();
			}
			else {
				substitution = m.match;
			}

			newString += strings[i];
			newString += substitution;

		}
		newString += strings[i];

		return newString;

	},

	convert : function(match, nosign){
		if (nosign) {
			match.sign = '';
		} else {
			match.sign = match.negative ? '-' : match.sign;
		}
		var l = match.min - match.argument.length + 1 - match.sign.length;
		var pad = new Array(l < 0 ? 0 : l).join(match.pad);
		if (!match.left) {
			if (match.pad == '0' || nosign) {
				return match.sign + pad + match.argument;
			} else {
				return pad + match.sign + match.argument;
			}
		} else {
			if (match.pad == '0' || nosign) {
				return match.sign + match.argument + pad.replace(/0/g, ' ');
			} else {
				return match.sign + match.argument + pad;
			}
		}
	}
}

sprintf = sprintfWrapper.init;
