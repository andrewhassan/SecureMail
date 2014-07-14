var BaseProvider = require('./base');
var Util = require('util');
var IMAP = require('imap');
var inbox = require('inbox');
var stream_to = require('stream-to');
var MP = require('mailparser').MailParser;

var ImapProvider = function()
{
	BaseProvider.apply(this, arguments);
};

Util.inherits(ImapProvider, BaseProvider);

ImapProvider.prototype = {
	getInfo: function()
	{
		return {
			id: 'imap',
			label: 'IMAP',
			description: 'IMAP Provider',
			icon: 'img/email.png'
		};
	},

	initialize: function(config)
	{
		var self = this;

		ImapProvider.super_.prototype.initialize.apply(self, arguments);

		// self.imap = new IMAP(self.config);

		// self.imap.once('error', function(err)
		// {
		// 	console.log(err);
		// });

		// self.imap.once('end', function()
		// {
		// 	console.log('Connection ended');
		// });

		// Create inbox connection
		self.imapConnection = inbox.createConnection(self.config.port, self.config.host, {
			secureConnection: self.config.tls,
			auth: {
				user: self.config.user,
				pass: self.config.password
			}
		});
	},

	connect: function()
	{
		var self = this;
		self.ready = false;

		var d = $.Deferred(function()
		{
			var def = this;

			// self.imap.once('ready', function()
			// {
			// 	console.log('connection ready');

			// 	self.ready = true;
			// 	def.resolve(self);
			// });

			// self.imap.connect();

			//console.log("Deferred connect: " + Util.inspect(self));

			self.imapConnection.on('connect', function() {
				console.log('connection ready');
				self.ready = true;
				def.resolve(self);
			});

			self.imapConnection.connect();
			console.log('connected');
		});

		return d;
	},

	disconnect: function()
	{
		var self = this;
		self.imapConnection.on('close', function() {
			console.log('disconnected');
		});
		self.imapConnection.close();
	},

	openInbox: function(callback)
	{
		var self = this;
		self.imapConnection.openMailbox('INBOX', {readOnly: true}, callback);
	},

	prepare: function() {
		var self = this;

		var d = $.Deferred(function()
		{
			var def = this;

			if (self.ready)
			{
				self.openInbox(function(err, box)
				{
					if (err)
					{
						console.log('ERROR', err);
						def.resolve([]);
						return;
					}

					var num_finished = 0;
					self.messages = [];

					// List 30 messages for now
					self.imapConnection.listMessages(-30, 30, function(err, messages) {
						if (err) { console.log ("There was an error fetching messages: " + err); }

						var num_messages = messages.length,
							loaded_messages = 0;

						// Load the content for each message
						for (var m in messages) {
							var message = messages[m],
								mailparser = new MP({
									streamAttachments: true
								}),
								message_stream = self.imapConnection.createMessageStream(message.UID).pipe(mailparser);

				      mailparser.on('end', function(email) {
				      	num_finished++;
				        message.html = email.html;
				        message.text = email.text;

				        self.messages.push(email);

				        if (num_finished === messages.length) {
				        	def.resolve(self);
				        }
				      });
						}
					});

					// var f = self.imap.seq.fetch('1:*', { bodies: '' });
					// self.messages = [];

					// var len = 0;

					// f.on('message', function(msg, seqno)
					// {
					// 	console.log('Message #%d', seqno);
					// 	len++;

					// 	var prefix = '(#' + seqno + ') ';
					// 	var attrs = {};
					// 	msg.on('body', function(stream, info)
					// 	{
					// 		var mailparser = new MailParser({
					// 			streamAttachments: true
					// 		});
					// 		mailparser.on("end", function(m)
					// 		{
					// 			$.each(attrs.flags, function(i, a)
					// 			{
					// 				/*
					// 			    Flags:
					// 			    \Seen		Message has been read
					// 			    \Answered 	Message has been answered
					// 			    \Flagged 	Message is "flagged" for urgent/special attention
					// 			    \Deleted 	Message is marked for removal
					// 			    \Draft 		Message has not completed composition (marked as a draft).
					// 			    */

					// 				if (a == '\\Seen')
					// 				{
					// 					m.read = true;
					// 				}
					// 			});

					// 			$.each(attrs['x-gm-labels'], function(i, a)
					// 			{
					// 				/*
					// 				Labels:
					// 				\Important	Messages has been marked important
					// 				\Starred	Messages has been marked important
					// 				 */

					// 				if (a == '\\Important')
					// 				{
					// 					m.important = true;
					// 				}
					// 				if (a == '\\Starred')
					// 				{
					// 					m.starred = true;
					// 				}
					// 			});

					// 			m.attrs = attrs;

					// 			console.log(prefix + 'Parsed');
					// 			//console.log(m);
					// 			self.messages.push(m);

					// 			if (self.messages.length == len)
					// 			{
					// 				def.resolve(self);
					// 			}
					// 		});
					// 		stream.pipe(mailparser);
					// 	});

					// 	msg.once('attributes', function(a)
					// 	{
					// 		attrs = a;
					// 	});
					// });

					// f.once('error', function(err)
					// {
					// 	console.log('Fetch error: ' + err);
					// });

					// f.once('end', function()
					// {
					// 	console.log('Done fetching all messages!');
					// });

				});
				return;
			}
			def.resolve([]);
		});

		return d;
	},

	fetchMessages: function()
	{
		return this.messages;
	},

	fetchFolders: function()
	{

	},

	fetchLabels: function()
	{

	},

	fetchMessage: function(id)
	{

	}
};

module.exports = ImapProvider;
