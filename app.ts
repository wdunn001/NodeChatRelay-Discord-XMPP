
var BotName = '', // name of bot needs to match in both discord and xmpp for simplicity
    //discord settings
    DiscordChannel = '', //channel to relay xmpp in discord example: 75630661951557632
    DiscordEmail = "", //discord email for login example: mymail@email.com
    DiscordPassword = "", //password for discord
    //xmpp settings
    XmppJid = '', //xmpp nickname + server example mynic@myxmppserver.com
    XmppPassword = '', //xmpp password
    XmppRoom = ''; //xmpp room for bot to relay
    
//---------------------------------------------------------------------------------------------------------
//discord connection
//---------------------------------------------------------------------------------------------------------
/*Variable area*/
var Discordbot = require('discord.io');
var bot = new Discordbot({
    email: DiscordEmail,
    password: DiscordPassword,
    autorun: true
});
/*Event area*/
bot.on("err", function (error) {
    console.log(error)
});

bot.on("ready", function (rawEvent) {
    console.log("Connected!");
    console.log("Logged in as: ");
    console.log(bot.username);
    console.log(bot.id);
    console.log("----------");
});

bot.on("message", function (user, userID, channelID, message, rawEvent) {
    console.log(user + " - " + userID);
    console.log("in " + channelID);
    console.log(message);
    console.log("----------");
    if ((user !== BotName) && (channelID.toString() === DiscordChannel)) {
        conn.send(new xmpp.Element('message', { to: room_jid, type: 'groupchat' }).
            c('body').t(user.match(/[ -~]+/) + " : " + message.match(/[ -~]+/))//regex to prevent unicode characters from breaking node-xmpp
        );
    }
    if (message === "ping") {
        sendMessages(channelID, ["Pong"]); //Sending a message with our helper function
    } else if (message === "picture") {
        sendFiles(channelID, ["fillsquare.png"]); //Sending a file with our helper function
    }
});

bot.on("presence", function (user, userID, status, rawEvent) {
    /*console.log(user + " is now: " + status);*/
});

bot.on("debug", function (rawEvent) {
    /*console.log(rawEvent)*/ //Logs every event
});

bot.on("disconnected", function () {
    console.log("Bot disconnected");
    /*bot.connect()*/ //Auto reconnect
});

/*Function declaration area*/
function sendMessages(ID, messageArr, interval) {
    var len = messageArr.length;
    var callback;
    var resArr = [];
    typeof (arguments[2]) === 'function' ? callback = arguments[2] : callback = arguments[3];
    if (typeof (interval) !== 'number') interval = 250;

    function _sendMessages() {
        setTimeout(function () {
            if (messageArr.length > 0) {
                bot.sendMessage({
                    to: ID,
                    message: messageArr[0]
                }, function (res) {
                    resArr.push(res);
                });
                messageArr.splice(0, 1);
                _sendMessages();
            }
        }, interval);
    }
    _sendMessages();

    var checkInt = setInterval(function () {
        if (resArr.length === len) {
            if (typeof (callback) === 'function') {
                callback(resArr);
            }
            clearInterval(checkInt);
        }
    }, 0);
}

function sendFiles(channelID, fileArr, interval) {
    var len = fileArr.length;
    var callback;
    var resArr = [];
    typeof (arguments[2]) === 'function' ? callback = arguments[2] : callback = arguments[3];
    if (typeof (interval) !== 'number') interval = 500;

    function _sendFiles() {
        setTimeout(function () {
            if (fileArr.length > 0) {
                bot.uploadFile({
                    channel: channelID,
                    file: fileArr[0]
                }, function (res) {
                    resArr.push(res);
                });
                fileArr.splice(0, 1);
                _sendFiles();
            }
        }, interval);
    }
    _sendFiles();

    var checkInt = setInterval(function () {
        if (resArr.length === len) {
            if (typeof (callback) === 'function') {
                callback(resArr);
            }
            clearInterval(checkInt);
        }
    }, 0);
}
//---------------------------------------------------------------------------------------------------------
//xmpp connection
//---------------------------------------------------------------------------------------------------------
var xmpp = require('node-xmpp'),
    sys = require('sys'),
    jid = XmppJid,
    password = XmppPassword,
    room_jid = XmppRoom,
    room_nick = BotName,
    conn = new xmpp.Client({
        jid: jid,
        password: password
    });

conn.on('online', function () {
    console.log('online');
    var elm2 = new xmpp.Element('presence', { from: jid, to: room_jid }).c('x', { 'xmlns': 'http://jabber.org/protocol/muc' }).up();

    conn.send(new xmpp.Element('presence', { to: room_jid + '/' + room_nick }).
        c('x', { xmlns: 'http://jabber.org/protocol/muc' })
    );
    conn.connection.socket.setTimeout(600000)
    conn.connection.socket.setKeepAlive(true, 10000)
    /*conn.send(new xmpp.Element('message', { to: room_jid, type: 'groupchat' }).
        c('body').t('test')
    );*/
});

conn.on('stanza', function (stanza) {
    if (stanza.is('message') &&
        // Important: never reply to errors!
        (stanza.attrs.type !== 'error') &&
        (stanza.children[0].children[0] !== BotName) &&
        (stanza.attrs.from.toString() !== BotName)
    ) {
        // Swap addresses...
        stanza.attrs.to = stanza.attrs.from

        delete stanza.attrs.from
        // and send back
        var ssender = stanza.attrs.to.split("/");
        console.log('Sending response: ' + stanza.root().toString() + '\r\n-------------------')
        console.log(ssender[1]);
        console.log(stanza.children[0].children[0]);
        if (ssender[1] !== BotName) {
            bot.sendMessage({
                to: DiscordChannel,
                message: "**" + ssender['1'] + "**" + " : " + stanza.children[0].children[0],
                nonce: "80085" //Optional
            }, function (response) { //CB Optional
                console.log(response.id); //Message ID
            });
        }
    }
});

conn.on('error', function (e) {
    sys.puts(e);
});
//---------------------------------------------------------------------------------------------------------
