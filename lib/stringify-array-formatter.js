'use strict';

var Types = require('./types');

function StringifierArrayFormatter(options) {
	this._options = options || {};
	this._options.linkClass = this._options.linkClass || this._options.cssClass;
}

StringifierArrayFormatter.prototype.applications = function(dataType, applications) {
	var result = '';
	var strings = [];

	if (!applications) {
		return result;
	}

	for (var i = 0, l = applications.length; i < l; i++) {
		strings.push(this.type(applications[i]));
	}

  if (!/array/i.test(dataType)) {

    result = dataType;
    
    if (this._options.htmlSafe) {
      result += '&lt;';
    } else {
      result += '<';
    }

    result += `${strings.join(', ')}>`;
  } else {
    result += `${strings.join(', ')}<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array">[]</a>`;
  }

	return result;
};

StringifierArrayFormatter.prototype.elements = function(elements) {
	var result = '';
	var strings = [];

	if (!elements) {
		return result;
	}

	for (var i = 0, l = elements.length; i < l; i++) {
		strings.push(this.type(elements[i]));
	}

	result = '(' + strings.join('|') + ')';

	return result;
};

StringifierArrayFormatter.prototype.name = function(name) {
	return name || '';
};

StringifierArrayFormatter.prototype.new = function(funcNew) {
	return funcNew ? 'new:' + this.type(funcNew) : '';
};

StringifierArrayFormatter.prototype.nullable = function(nullable) {
	switch (nullable) {
		case true:
			return '?';
		case false:
			return '!';
		default:
			return '';
	}
};

StringifierArrayFormatter.prototype.optional = function(optional) {
	if (optional === true) {
		return '=';
	} else {
		return '';
	}
};

StringifierArrayFormatter.prototype.params = function(params) {
	var result = '';
	var strings = [];

	if (!params || params.length === 0) {
		return result;
	}

	for (var i = 0, l = params.length; i < l; i++) {
		strings.push(this.type(params[i]));
	}

	result = strings.join(', ');

	return result;
};

StringifierArrayFormatter.prototype.result = function(result) {
	return result ? ': ' + this.type(result) : '';
};

StringifierArrayFormatter.prototype.this = function(funcThis) {
	return funcThis ? 'this:' + this.type(funcThis) : '';
};

StringifierArrayFormatter.prototype.type = function(type) {
	var typeString = '';

	if (!type) {
		return typeString;
	}

	switch(type.type) {
		case Types.AllLiteral:
			typeString = this._formatNameAndType(type, '*');
			break;
		case Types.FunctionType:
			typeString = this._signature(type);
			break;
		case Types.NullLiteral:
			typeString = this._formatNameAndType(type, 'null');
			break;
		case Types.RecordType:
			typeString = this._record(type);
			break;
		case Types.TypeApplication:
      typeString = this.applications(this.type(type.expression), type.applications);
			break;
		case Types.UndefinedLiteral:
			typeString = this._formatNameAndType(type, 'undefined');
			break;
		case Types.TypeUnion:
			typeString = this.elements(type.elements);
			break;
		case Types.UnknownLiteral:
			typeString = this._formatNameAndType(type, '?');
			break;
		default:
			typeString = this._formatNameAndType(type);
	}

	// add optional/nullable/repeatable modifiers
	if (!this._options._ignoreModifiers) {
		typeString = this._addModifiers(type, typeString);
	}

	return typeString;
};

StringifierArrayFormatter.prototype.stringify = StringifierArrayFormatter.prototype.type;

StringifierArrayFormatter.prototype.key = StringifierArrayFormatter.prototype.type;

StringifierArrayFormatter.prototype._record = function(type) {
	var fields = this._recordFields(type.fields);

	return '{' + fields.join(', ') + '}';
};

StringifierArrayFormatter.prototype._recordFields = function(fields) {
	var field;
	var keyAndValue;

	var result = [];

	if (!fields) {
		return result;
	}

	for (var i = 0, l = fields.length; i < l; i++) {
		field = fields[i];

		keyAndValue = this.key(field.key);
		keyAndValue += field.value ? ': ' + this.type(field.value) : '';

		result.push(keyAndValue);
	}

	return result;
};

function combineNameAndType(nameString, typeString) {
	var separator = (nameString && typeString) ? ':' : '';

	return nameString + separator + typeString;
}

// Adds optional, nullable, and repeatable modifiers if necessary.
StringifierArrayFormatter.prototype._addModifiers = function(type, typeString) {
	var combined;

	var optional = '';
	var repeatable = '';

	if (type.repeatable) {
		repeatable = '...';
	}

	combined = this.nullable(type.nullable) + combineNameAndType('', typeString);
	optional = this.optional(type.optional);

	return repeatable + combined + optional;
};

StringifierArrayFormatter.prototype._addLinks = function(nameString) {
	var openTag;

	var linkClass = '';
	var options = this._options;

	if (options.links && Object.prototype.hasOwnProperty.call(options.links, nameString)) {
		if (options.linkClass) {
			linkClass = ' class="' + options.linkClass + '"';
		}

		openTag = '<a href="' + options.links[nameString] + '"' + linkClass + '>';
		nameString = openTag + nameString + '</a>';
	}

	return nameString;
};

StringifierArrayFormatter.prototype._formatNameAndType = function(type, literal) {
	var nameString = type.name || literal || '';
	var typeString = type.type ? this.type(type.type) : '';

	nameString = this._addLinks(nameString);

	return combineNameAndType(nameString, typeString);
};

StringifierArrayFormatter.prototype._signature = function(type) {
	var param;
	var prop;
	var signature;

	var params = [];
	// these go within the signature's parens, in this order
	var props = [
		'new',
		'this',
		'params'
	];

	for (var i = 0, l = props.length; i < l; i++) {
		prop = props[i];
		param = this[prop](type[prop]);
		if (param.length > 0) {
			params.push(param);
		}
	}

	signature = 'function(' + params.join(', ') + ')';
	signature += this.result(type.result);

	return signature;
};


module.exports = function(type, options) {
	return new StringifierArrayFormatter(options).stringify(type);
};
