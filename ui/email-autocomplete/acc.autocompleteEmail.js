ACC.autocompleteEmail = {
	_autoload: ["init"],
	init: function () {
		// extend the default autocomplete widget, to solve issue on multiple instances of the searchbox component
		$.widget("custom.autocompleteEmail", $.ui.autocomplete, {
			_create: function () {
				console.log('acc.autocompleteEmail.js - acc.autocompleteEmail._create - executed');

				// get instance specific options form the html data attr
				var option = this.element.data("options") || {};
				// set the options to the widget
				this._setOptions({
					minLength: option.minCharactersBeforeRequest,
					displayProductImages: option.displayProductImages,
					delay: option.waitTimeBeforeRequest,
					autocompleteUrl: option.autocompleteUrl,
					source: this.source
				});
				console.log(this.element);
				$('<div>yo</div>').insertAfter(this.element)
				// call the _super()
				$.ui.autocomplete.prototype._create.call(this);
			},
			options: {
				cache: {}, // init cache per instance
				focus: function () {
					return false;
				}, // prevent textfield value replacement on item focus
				select: function (event, ui) {
					console.log("acc.autocompleteEmail.js - select", arguments);
				},
				close: function (event, ui) {
					$(".container--suggestions").remove();
				}
			},
			_renderItem: function (ul, item) {
				console.log('acc.autocompleteEmail.js - _renderItem', arguments);
				return $("<div class='container--suggestions'>")
					.append(item.value)
					.appendTo(".search--suggestions");
			},
			source: function (request, response) {
				console.log('acc.autocompleteEmail.js - source', arguments);
				var autoSearchData = [];
				autoSearchData.push({
					value: "toto@gmail"
				});
				autoSearchData.push({
					value: "toto@outlook"
				});
				return response(autoSearchData);
			}
		});

		$("[data-emaildomains]").autocompleteEmail();
		$('.wrapper--search-desktop.site-search .ui-autocompleteEmail').niceScroll();
		$('.search--suggestions .js-site-search-input').bind('input', function () {
			this.value = this.value.toLowerCase();
		});

		// Fix to trigger an automatic scroll on mobile have a better display of the search field on mobile phone
		$('.menu-mobile .js-site-search-input').on('focus', function () {
			if (ACC.device.type === 'mobile') {
				var $parent = $('.menu-mobile');
				var $this = $(this);
				setTimeout(function () {
					$parent.animate({scrollTop: $this.offset().top});
				}, 1000);
			}
		});
		$(window).scroll(function () {
			$('.ui-autocompleteEmail').hide();
		});
	}
};


ACC.OLDautocompleteEmail = {
	selector: {
		inputEmail: 'input[data-emaildomain]'
	},
	_autoload: [
		"init"
	],
	genUid: function () {
		return "ui-id-" + Math.floor(Math.random() * 26) + Date.now();
	},
	setupEmailDomainAutocomplete: function (input) {
		var prefix = input.value.split('@')[0];
		input.list.innerHTML = input.dataset.emaildomain
			.replace((/^\[ *| *\]$/g), '')
			.split((/\s*,\s*/))
			.map(function (domain) {
				return '<option value="' + prefix + '@' + domain + '"/>';
			}).join('');
	},
	init: function () {
		$(document)
			.on('keyup', ACC.OLDautocompleteEmail.selector.inputEmail, function (e) {
				var input = this;
				if (!input.list) {
					// Initialisation de la datalist si elle n'existe pas, et rattachement à l'input
					var id = ACC.OLDautocompleteEmail.genUid();
					$('<datalist id="' + id + '"/>').insertAfter(input);
					$(input).attr('list', id);
				}
				if (input.value.indexOf("@") < 0) {
					// Le symbole '@' n'est pas encore saisie, on n'affiche pas d'autocomplete
					input.autocomplete = input._defaultAutocomplete;
					// on réinitialise les éventuelles valeurs précédentes
					input.list.innerHTML = '';
					input.lastValue = null;
					return;
				}
				var prefix = input.value.split('@')[0];
				if (input.lastValue !== prefix) {
					input.lastValue = prefix;
					if (!input._defaultAutocomplete) {
						input._defaultAutocomplete = input.autocomplete;
					}
					// https://bugzilla.mozilla.org/show_bug.cgi?id=1474137
					input.autocomplete = "off";
					clearTimeout(input._timer);
					input._timer = setTimeout(function () {
						ACC.OLDautocompleteEmail.setupEmailDomainAutocomplete(input);
					}, 10);
				}
			});
	}
};
