(function ($) {
	if (typeof Element.prototype.clearChildren === 'undefined') {
		Object.defineProperty(Element.prototype, 'clearChildren', {
			configurable: true,
			enumerable: false,
			value: function () {
				while (this.firstChild && this.firstChild.nextSibling) this.removeChild(this.lastChild);
			}
		});
	}

	function genUid(p) {
		return p + Math.floor(Math.random() * 26) + Date.now();
	}

	function assertDatalist(input) {
		if (!input.list) {
			// Initialisation de la datalist si elle n'existe pas, et rattachement à l'input
			var id = genUid("ui-id-");
			$('<datalist id="' + id + '"/>').insertAfter(input);
			$(input).attr('list', id);
		}
	}

	function setDatalist(input) {
		console.log("update datalist");
		var prefix = input.value.split('@')[0];
		input.list.clearChildren();
		input._emailAutocomplete.domains.forEach(function (domain) {
			var v = domain === '' ? '' : (prefix + '@' + domain);
			// Add the <option> element to the <datalist>.
			input.list.append(new Option(v, v));
		});
		input.type = input._emailAutocomplete.type;
	}

	function clearDatalist(input) {
		console.log("clear datalist");
		var o = input._emailAutocomplete;
		// Le symbole '@' n'est pas encore saisie, on n'affiche pas d'autocomplete
		input.autocomplete = o.defaultAutocomplete;
		// on réinitialise les éventuelles valeurs précédentes
		input.list.clearChildren();
		o.lastValue = null;
	}

	function process(input) {
		input.type = "tmp";
		var o = input._emailAutocomplete;
		if (o.timeout < 0) {
			process2(input)
		} else {
			clearTimeout(o.timer0);
			o.timer0 = setTimeout(function () {
				process2(input)
			}, o.timeout);
		}
	}

	function process2(input) {
		var o = input._emailAutocomplete, l = input.list;
		console.log("process", o, input.value, input);
		if (input.value.length === 0 || (!o.startAtBeginning && input.value.indexOf("@") < 0)) {
			if (o.timeout < 0) {
				clearDatalist(input);
			} else {
				clearTimeout(o.timer);
				o.timer = setTimeout(function () {
					clearDatalist(input);
				}, o.timeout);
			}
		} else {
			var prefix = input.value.split('@')[0];
			if (o.lastValue !== prefix) {
				o.lastValue = prefix;
				// https://bugzilla.mozilla.org/show_bug.cgi?id=1474137
				input.autocomplete = "off";
				if (o.timeout < 0) {
					setDatalist(input);
				} else {
					clearTimeout(o.timer);
					o.timer = setTimeout(function () {
						setDatalist(input);
					}, o.timeout);
				}
			}
		}
	}

	var cn = "jq-emailAutocomplete";

	$(document)
		.on('keyup', '.' + cn + "_keyup", function (e) {
			console.log("keyup", this, e);
			process(this);
		})
		.on('keydown', '.' + cn + "_keydown", function (e) {
			console.log("keydown", this, e);
			process(this);
		})
		.on('keypress', '.' + cn + "_keypress", function (e) {
			console.log("keypress", this, e);
			process(this);
		})
		.on('input', '.' + cn + "_input", function (e) {
			console.log("input", this, e);
			process(this);
		});

	$.fn.emailAutocomplete = function (options) {
		var settings = $.extend({
			domains: function () {
				return [];
			},
			event: 'input',
			timeout: 10
		}, options);
		return this.each(function () {
			var input = this;
			input.classList.add(cn + "_" + settings.event);
			console.log("init", input, settings);
			assertDatalist(input);
			input._emailAutocomplete = {
				startAtBeginning: settings.startAtBeginning,
				domains: [''].concat(settings.domains(input)),
				timeout: settings.timeout,
				type: input.type,
				defaultAutocomplete: input.autocomplete
			}
		});
	};
})(jQuery);
