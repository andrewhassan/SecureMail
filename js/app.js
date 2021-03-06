global.$ = $;

var global_providers = [];

var pgp_module = require('openpgp');
var EP = require('exec-plan').ExecPlan;
var nodemailer = require('nodemailer');
var transport = null;
var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('logs/audit.log'), 'SecureMail');

process.logger = log4js.getLogger('SecureMail');
process.logger.info("SecureMail application opened");

var app = {
  templates: require('dot').process({ path: "./views"}),
  gui: require('nw.gui')
};
global.app = app;
var shell = require('./js/app/widget/appshell');

shell.init().then(function()
{
  process.logger.info("User " + shell.settings()[0].options.user + " logged in.");
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
function getPrivateKey(username, callback) {
  process.logger.info("Attempting to read " + username + "'s encrypted private key");
  var exec_plan = new EP({
    autoPrintOut: false,
    autoPrintErr: false,
    continueOnError: true
  });

  if (typeof(callback) !== "function") {
    callback = function() {};
    console.warn("Invalid parameter passed to callback");
  }

  exec_plan.add("gpg --export-secret-key -a \"" + username + "\"");
  exec_plan.execute();
  exec_plan.on('complete', function(stdout) {
    callback(stdout);
  });
}

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
    $('#email-form').unbind('submit');
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
        console.log("Sending unencrypted message to: " + recipient.email);
        var mailOptions = {
          from: shell.settings()[0].options.user, // sender address
          to: recipient.email, // list of receivers
          subject: $subject.val(), // Subject line
          text: $body.val(), // plaintext body
        };

        // If the gmail transport hasn't been initialized, then initialize it
        if (transport === null) {
          transport = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                  user: shell.settings()[0].options.user,
                  pass: shell.settings()[0].options.password
              }
          });
        }

        console.log("Before plain send");
        transport.sendMail(mailOptions, function(error, info) {
          console.log("In plain send");
          if(error){
              console.log(error);
          } else{
              console.log('Message sent: ' + info.response);
              $('#email-form').unbind('submit');
              $('.dialog-overlay').hide();
              alert('Message sent successfully!');
          }
        });
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

        if (public_key === null ||
          public_key.them === null ||
          public_key.them[0] === null ||
          public_key.them[0].public_keys === null ||
          public_key.them[0].public_keys.primary === null) {
          alert("There was a problem finding keybase user: " + recipient.keybase);
          return;
        }

        var public_key_bundle = public_key.them[0].public_keys.primary.bundle;
        var recipient_closure = recipient,
          $body_closure = $body,
          $subject_closure = $subject;
        getPrivateKey(shell.settings()[0].options.keybase_username, function(private_key) {
          var pgp_public_key = pgp_module.key.readArmored(public_key_bundle);
          var pgp_private_key = pgp_module.key.readArmored(private_key).keys[0];
          pgp_private_key.decrypt(shell.settings()[0].options.keybase_password);
          var message = pgp_module.signAndEncryptMessage(pgp_public_key.keys, pgp_private_key, $body.val());

          console.log("Body: " + $body.val());
          console.log("Subject: " + $subject.val());
          console.log("Sending encrypted message to: " + recipient_closure.keybase);

          // If the gmail transport hasn't been initialized, then initialize it
          if (transport === null) {
            transport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: shell.settings()[0].options.user,
                    pass: shell.settings()[0].options.password
                }
            });
          }

          var mailOptions = {
            from: shell.settings()[0].options.keybase_username + "<" + shell.settings()[0].options.user + ">", // sender address
            to: recipient_closure.email, // list of receivers
            subject: $subject.val(), // Subject line
            text: message, // plaintext body
          };

          console.log("Before encrypted send");
          transport.sendMail(mailOptions, function(error, info) {
            console.log("In encrypted send");
            if(error){
                console.log(error);
            }else{
                console.log('Message sent: ' + info.response);
                $('#email-form').unbind('submit');
                $('.dialog-overlay').hide();
                alert('Message sent successfully!');
            }
          });

        });
      }
    }

    return false;
  });
});

$('#refresh-messages-button').on('click', function() {
  $('#overlay').show();
  $("#messages-list").empty();

  var settings = shell.settings();

  $.each(global_providers, function(i, o)
  {
    o.initialize(shell.settings()[0].options);
    o.connect().then(
      function()
      {
        console.log("authentication successful!");
        if (global_providers.length > 0)
        {
          $.when.apply($, global_providers).done(function()
          {
            var prepares = [];
            $.each(arguments, function(i, p)
            {
              prepares.push(p.prepare());
            });

            var messages = [];
            $.when.apply($, prepares).done(function()
            {
              $.each(global_providers, function(i, p) {
                var msgs = p.fetchMessages();
                messages = messages.concat(msgs);
                p.disconnect();
              });

              shell.list(messages);
            });
          });
        }
      },
      function()
      {
        console.log("authentication falied!");
      }
    );
  });
});
