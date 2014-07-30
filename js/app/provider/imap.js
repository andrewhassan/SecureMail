var BaseProvider = require('./base');
var Util = require('util');
var IMAP = require('imap');
var inbox = require('inbox');
var stream_to = require('stream-to');
var MP = require('mailparser').MailParser;
var EP = require('exec-plan').ExecPlan;
var request = require('request');
var openpgp = require('openpgp');

function blah(cb) {
  cb();
}

function getPrivateKey(username, callback, data) {
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
    callback(stdout, data);
  });
}

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

      self.imapConnection.on('connect', function() {
        console.log('connection ready');
        self.ready = true;
        def.resolve(self);
      });

      self.imapConnection.connect();
    });

    return d;
  },

  disconnect: function()
  {
    var self = this;
    self.ready = false;
    self.imapConnection.on('close', function() {
      console.log('disconnected');
    });
    self.imapConnection.close();
  },

  openInbox: function(callback)
  {
    var self = this;
    process.logger.info(self.config.user + ": Opened inbox");
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
            process.logger.info(self.config.user + ": Retrieved inbox messages");
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
                message.html = email.html;
                message.text = email.text;

                // If the message is encrypted
                if (email.text !== null && typeof(email.text) === 'string' && email.text.indexOf('-----BEGIN PGP MESSAGE-----') === 0) {
                  var sender_keybase_username = email.from[0].name;
                  var sender_email = email.from[0].address;
                  request('https://keybase.io/_/api/1.0/user/lookup.json?usernames=' + sender_keybase_username,
                    function (error, response, body) {
                    if (!error && response.statusCode === 200 && JSON.parse(body).status.code === 0) {
                      debugger;
                      var email_closure_1 = email;
                      var keybase_username_closure_1 = self.config.keybase_username;
                      var sender_email_closure_1 = sender_email;
                      var public_key_bundle = JSON.parse(body).them[0].public_keys.primary.bundle;

                      getPrivateKey(keybase_username_closure_1, function(private_key_string) {
                        var public_key_bundle_closure_1 = public_key_bundle;
                        var email_closure_2 = email_closure_1;

                        try {
                          var pgp_message = openpgp.message.readArmored(email_closure_2.text);
                          var pgp_public_key = openpgp.key.readArmored(public_key_bundle_closure_1).keys;
                          var pgp_private_key = openpgp.key.readArmored(private_key_string).keys[0];
                          pgp_private_key.decrypt(self.config.keybase_password);

                          var message = openpgp.decryptAndVerifyMessage(pgp_private_key, pgp_public_key, pgp_message);

                          email_closure_2.text = message.text;
                          self.messages.push(email_closure_2);
                        }
                        catch(e) {
                          console.log("Error verifying/decrypting: " + e);
                        }

                        num_finished++;
                        if (num_finished === messages.length) {
                          def.resolve(self);
                        }
                      });
                    }
                    else {
                      num_finished++;
                      if (num_finished === messages.length) {
                        def.resolve(self);
                      }
                    }
                  });
                }
                else {
                  self.messages.push(email);
                  num_finished++;
                }

                if (num_finished === messages.length) {
                  def.resolve(self);
                }
              });
            }
          });
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
