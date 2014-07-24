var moment = require('moment');
var htmlToText = require('html-to-text');
var config = require('../core/preferences');
var global_password = global_keybase_password = '';
var md5 = require('MD5');

var Shell = {

	init: function()
	{
		var self = this;

		self.sync = {
			timer: false,
			active: false,
			start: function()
			{
				if (!self.sync.timer)
				{
					self.sync.active = true;
					var i = -7;
					self.sync.timer = setInterval(function()
					{
						self._syncbutton.css('background-position-y', (i * 36) + 5);
						i--;
						if (i < -7) { i = -0; }
						if (!self.sync.active && i == -7)
						{
							clearInterval(self.sync.timer);
							self.sync.timer = false;
						}
					}, 35);
				}
			},
			end: function()
			{
				self.sync.active = false;
			}
		};

		var d = $.Deferred(function()
		{
			var def = this;
			var body = $(window.document.body);

			//
			// application shell
			//

			body.html(app.templates.main({}));

			var height = $(window).height();
			var width = $(window).width();

			// Splitters
			$('#app').splitter({ sizeLeft: 200 });
			$('#right-side').splitter({ sizeLeft: 300 });

			$(window).resize(function()
			{
				if (height != $(window).height() || width != $(window).width())
				{
					// Redefines
					height = $(window).height();
					width = $(window).width();

					// Splitter
					$('#app').trigger('resize');

					self.redraw();
				}
			});

			console.log('shell loaded');

			//
			// Login (temporary just for testing)
			//

			body.append(app.templates.login({
				username: config.get('username'),
				password: '',
				keybase_username: config.get('keybase_username'),
				keybase_password: ''
			}));

			$('#loading form').on('submit', function()
			{
				$('#loading').hide();
				$('#overlay').show();

				var username = $('#loading #username').val();
				var keybase_username = $('#loading #keybase_username').val();
				var keybase_password = $('#loading #keybase_password').val();
				var password = $('#loading #password').val();

				process.logger.info("Attempting to log in user: " + username);

				config.set('username', username);
				config.set('keybase_username', keybase_username);
				global_password = password;
				global_keybase_password = keybase_password;
				// config.set('password', password);
				config.save();

				self.sync.start();

				def.resolve(true);

				return false;
			});

			console.log('login form loaded');


			//
			// Buttons
			//

			self._syncbutton = $('#refresh-button');

		});

		return d;
	},

	list: function(messages)
	{
		var self = this;

		var msglist = $('#messages-list');

		// Sort messages by date desc
		messages.sort(function(a, b) {
			if (moment(a.date).isSame(moment(b.date))) {
				return 0;
			}
			else if (moment(a.date).isAfter(moment(b.date))) {
				return -1;
			};

			return 1;
		});

		$.each(messages, function(i, m)
		{
			var txt = (m.text || m.html).substr(0, 50);
			// var txt = "Placeholder text";

			msglist.append(app.templates.row({
				id: i,
				account: 'Google Mail',
				icon: '',
				date: moment(m.date).calendar(),
				subject: m.subject,
				snipet: htmlToText.fromString(txt),
				read: m.read,
				starred: m.starred,
				important: m.important,
			}));
		});

		msglist.find('li').off('click').on('click', function()
		{
			msglist.find('.selected').removeClass('selected');
			$(this).addClass('selected');

			var id = $(this).data('id');
			var m = messages[id];

			self.open(m);

		});

		// show all
		$('#overlay').hide();
		self.sync.end();
	},

	open: function(message)
	{
		process.logger.info(config.get('username') + " read message " + md5(JSON.stringify(message)));
		var win = $('#post-window');
		win.empty();

		win.append(app.templates.message({
			id: message.id,
			subject: message.subject,
			from: message.from,
			date: moment(message.date).calendar()
		}));

		var html = !message.html ? '<pre style="white-space: pre-line">' + message.text + '</pre>' : message.html;

		win.find('iframe').contents().find('html').html(html);

		this.redraw();
	},

	redraw: function()
	{
		// Email body size
		var full = $('#message').height();
		var h = $('#post > header').height();
		var bb = $('#message > .bar').height();
		var v = full - (h + bb + 2);

		$('#post > .body').height(v);
	},

	settings: function()
	{
		var self = this;

		return [
			{
				provider: 'imap',
				label: 'Gmail Account',
				options: {
					user: config.get('username'),
					password: global_password,
					keybase_password: global_keybase_password,
					keybase_username: config.get('keybase_username'),
					host: 'imap.gmail.com',
					port: 993,
					tls: true,
					tlsOptions: { rejectUnauthorized: false }
				}
			}
		];
	}
};

module.exports = Shell;
