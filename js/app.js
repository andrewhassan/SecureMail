global.$ = $;

var global_providers = [];

var pgp = require('openpgp');
var key = ["-----BEGIN PGP PUBLIC KEY BLOCK-----",
"Version: Keybase OpenPGP v0.1.15",
"Comment: https://keybase.io/crypto",
"",
"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",
"=EoXf",
"-----END PGP PUBLIC KEY BLOCK-----"].join('\n');

// debugger;

var pk = pgp.key.readArmored(key);
var pgpMessage = pgp.encryptMessage(pk.keys, 'Hello, World!');

debugger;

var app = {
	templates: require('dot').process({ path: "./views"}),
	gui: require('nw.gui')
};
global.app = app;
var shell = require('./js/app/widget/appshell');

shell.init().then(function()
{
	var settings = shell.settings();

	var providers = [];

	$.each(settings, function(i, o)
	{
		var ProviderClass = require('./js/app/provider/' + o.provider);

		var d = $.Deferred(function()
		{
			var def = this;

			var provider = new ProviderClass();

			provider.initialize(o.options);
			provider.connect().then(
				function()
				{
					console.log("authentication successful!");
					def.resolve(provider);
				},
				function()
				{
					console.log("authentication falied!");
					def.resolve(provider);
				}
			);

		});
		providers.push(d);
	});

	if (providers.length > 0)
	{
		$.when.apply($, providers).done(function()
		{
			var prepares = [];
			$.each(arguments, function(i, p)
			{
				prepares.push(p.prepare());
			});

			var messages = [];
			$.when.apply($, prepares).done(function()
			{
				$.each(arguments, function(j, p)
				{
					global_providers.push(p);
					var msgs = p.fetchMessages();
					messages = messages.concat(msgs);
					p.disconnect();
				});

				shell.list(messages);
			});
		});
	}
});


// CRAP CODE

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

$('#compose-email-button').on('click', function() {
	var $compose_dialog = $('.dialog-overlay'),
		$close_button = $('.close-dialog-button'),
		$email_form = $('#email-form'),
		$recipients = $email_form.find("#recipient-field"),
		$subject = $email_form.find("#subject-field"),
		$body = $email_form.find("#message-body");

	// Clear all the fields
	$recipients.val("");
	$subject.val("");
	$body.val("");

	// Show dialog
	$compose_dialog.show();

	$close_button.on('click', function() {
		// TODO: If there's stuff entered, ask if you want to discard it
		$compose_dialog.hide();
	});

	$email_form.submit(function (e) {
		e.preventDefault();

		var recipients = $recipients.val().split(/[;,]+/),
			pgp = true,
			final_recipients = [];

		// If there are any non-keybase users, then do not use PGP
		for (var r in recipients) {
			var recipient = recipients[r];
			if (validateEmail(recipient)) {
				pgp = false;
				final_recipients.push({
					email: recipient
				});
			}
			else {
				try {
					var regex_match = recipient.match(/(.+)[<](.+)[>]/);
					final_recipients.push({
						keybase: regex_match[1].trim(),
						email: regex_match[2].trim()
					});
				}
				catch(err) {
					alert("There was an error parsing the recipients. Double check that they are entered in correctly.");
					return;
				}
			}
		}

		if (!pgp && !confirm("Note: There is one or more non-keybase users in your recipient list. ONLY users using keybase will received an encrypted message. Everyone else will be sent PLAIN TEXT. Do you wish to continue?")) {
			return false;
		}

		for (var i in final_recipients) {
			var recipient = final_recipients[i];
			// plain email
			if (recipient.keybase === undefined) {
				console.log(recipient.email + " wants a plain email");
			}
			else {
				var public_key;
				$.ajax({
					async: false,
					type: "GET",
					url: "https://keybase.io/_/api/1.0/user/lookup.json?usernames=" + recipient.keybase,
					success: function(data) {
						public_key = data;
					}
				});

				if (public_key === null || public_key.them === null || public_key.them[0] === null) {
					alert("There was a problem finding keybase user: " + recipient.keybase);
					return;
				}

				console.log(recipient.email + " is hiding something from the NSA...PK: " + public_key.them[0])
			}
		}

		console.log("Sending email");
		return false;
	});

	// setTimeout(function() {
	// 	$overlay.hide();
	// 	$compose_dialog.hide();
	// }, 3000);
});
