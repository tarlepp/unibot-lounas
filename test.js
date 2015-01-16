/**
 * Simple test file for unibot-lounas plugin.
 *
 * Purpose of this is just to "mimic" actual IRC messages on channel where plugin is enabled.
 *
 * Usage:
 *  node test.js
 */

/**
 * Runner dependencies.
 *
 * @type {exports}
 */
var _ = require('lodash');
var plugin = require('./index');

/**
 * Nick who is making query
 *
 * @type {string}
 */
var from = 'tarlepp';

/**
 * Actual IRC messages that will trigger unibot-lounas plugin to do something. These are basically "test" cases that
 * script uses to verify that plugin works like it should.
 *
 * @type {string[]}
 */
var messages = [
    '!lou',
    '!lounas',
    '!lounas tampere'
];

// Iterate each message (test case)
_.each(messages, function iterator(message) {
    /**
     * Iterate each plugin regexp pattern + callback.
     *
     * Also note that there is stub for channel.say function to just console.log every message out
     */
    _.each(plugin({})({say: function(message) { console.log(message); } }), function iterator(callback, pattern) {
        var expression = new RegExp(pattern, 'i');
        var matches = expression.exec(message);

        if (matches) {
            console.log('Plugin matches with: ' + message);

            callback(from, matches);
        } else {
            console.log('Plugin does not match with: ' + message);
        }
    });
});
