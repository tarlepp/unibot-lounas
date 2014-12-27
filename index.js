/**
 * Plugin dependencies.
 *
 * @type {exports}
 */
var helpers = require('unibot-helpers');
var cheerio = require('cheerio');
var async = require('async');
var _ = require('lodash');

/**
 * Lounas plugin for UniBot.
 *
 * This plugin fetches lunch information for today from specified restaurants. Currently plugin supports following
 * restaurants:
 *
 *  - Shalimar (http://www.ravintolashalimar.fi/)
 *  - Jyväskylän vanha asemaravintola (http://vanhaasemaravintola.fi/)
 *
 * Also note that this plugin relies heavily to those websites and structure of them. So there will be times, when this
 * plugin doesn't work right.
 *
 * @param  {Object} options Plugin options object, description below.
 *   db: {mongoose} the mongodb connection
 *   bot: {irc} the irc bot
 *   web: {connect} a connect + connect-rest webserver
 *   config: {object} UniBot configuration
 *
 * @return  {Function}  Init function to access shared resources
 */
module.exports = function init(options) {
    // Actual plugin implementation.
    return function plugin(channel) {
        /**
         * Helper function to fetch lunch data from Shalimar website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchShalimar(callback) {
            helpers.download('http://www.ravintolashalimar.fi/', function success(data) {
                var $ = cheerio.load(data);
                var dishes = [];

                $('table.todayLunch td.dish').each(function iterator(i, elem) {
                    dishes.push($(this).text());
                });

                callback(null, dishes.join(', '));
            });
        }

        /**
         * Helper function to fetch lunch data from Vanha asemaravintola website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchAsema(callback) {
            helpers.download('http://vanhaasemaravintola.fi/lounaslista/', function success(data) {
                var $ = cheerio.load(data);
                var dishes = $('div.rightcolumn p').eq(1).text().split('\n').slice(1) || [];

                callback(null, dishes.join(', '));
            });
        }


        return {
            '^!lounas$': function lounas(from, matches) {
                // Define jobs
                var jobs = {
                    'Shalimar': fetchShalimar,
                    'Asemaravintola': fetchAsema
                };

                // Fetch lunch data parallel
                async.parallel(
                    jobs,
                    function callback(error, results) {
                        if (error) {
                            channel.say('Oh noes, error - ' + error, from);
                        } else {
                            _.each(results, function(lunch, place) {
                                if (_.isEmpty(lunch)) {
                                    lunch = 'Ei mitään tänään';
                                }

                                channel.say(place + ': ' + lunch);
                            });
                        }
                    }
                );
            }
        };
    };
};