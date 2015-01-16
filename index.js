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
 * @todo    Add more restaurants!
 * @todo    See if there is more common API for lunch data fetch
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
                if (data == null) {
                    callback(null, null);
                } else {
                    var $ = cheerio.load(data);
                    var dishes = [];

                    $('table.todayLunch td.dish').each(function iterator(i, elem) {
                        dishes.push($(this).text());
                    });

                    callback(null, dishes.join(', '));
                }
            });
        }

        /**
         * Helper function to fetch lunch data from Vanha asemaravintola website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchAsema(callback) {
            helpers.download('http://vanhaasemaravintola.fi/lounaslista/', function success(data) {
                if (data == null) {
                    callback(null, null);
                } else {
                    var days = [
                        'Sunnuntai',
                        'Maanantai',
                        'Tiistai',
                        'Keskiviikko',
                        'Torstai',
                        'Perjantai',
                        'Lauantai'
                    ];

                    var date = new Date();
                    var day = date.getDate();
                    var month = date.getMonth() + 1;

                    if (day < 10) {
                        day = '0' + day;
                    }

                    if (month < 10) {
                        month = '0' + month;
                    }

                    var dayString = days[date.getDay()] + ' ' + day + '.' + month;
                    var $ = cheerio.load(data);
                    var dishes = $('div.content').find('h2:contains("' + dayString + '")').next().text().split('\n');

                    callback(null, dishes.join(', '));
                }
            });
        }

        /**
         * Helper function to fetch lunch data for Trattoria Aukio from Raflaamo website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchAukio(callback) {
            helpers.download('https://www.raflaamo.fi/fi/jyvaskyla/trattoria-aukio', function success(data) {
                if (data == null) {
                    callback(null, null);
                } else {
                    var $ = cheerio.load(data);
                    var dishes = [];
                    var currentDayElement = $('#days-chooser').find('div.day-option.active');
                    var currentDate = currentDayElement.data('date');
                    var currentDay = currentDayElement.find('span.long').text().trim();

                    $('#lunches-holder')
                        .find('span.long:contains("' + currentDay + ' ' + currentDate +'")')
                        .closest('.lunch-day').find('h4')
                        .each(function iterator() {
                            dishes.push($(this).find('span').eq(0).text().trim());
                        });

                    // Remove "week" dish
                    if (dishes.length > 1) {
                        dishes.pop();
                    }

                    callback(null, dishes.join(', '));
                }
            });
        }

        /**
         * Helper function to fetch lunch data for Pizzeria Best
         *
         * @param {Function}    callback    Callback function
         */
        function fetchBest(callback) {
            helpers.download('http://www.pizzeriabest.fi/onlinetilaus/index.php?main_page=page&id=1', function success(data) {
                if (data == null) {
                    callback(null, null);
                } else {
                    var $ = cheerio.load(data);
                    var days = [
                        'Su',
                        'Ma',
                        'Ti',
                        'Ke',
                        'To',
                        'Pe',
                        'La'
                    ];

                    var lines = _.map($('div.centerColumn div').text().match(/[^\r\n]+/g), function iterator(line) {
                        return line.trim();
                    });

                    var date = new Date();
                    var match = new RegExp('^' + days[date.getDay()] + ': ');
                    var dishes = _.find(lines, function iterator(line) {
                        if (match.test(line)) {
                            return true;
                        }
                    });

                    if (dishes) {
                        dishes = dishes.substr(3);
                    }

                    callback(null, dishes);
                }
            });
        }

        // Regex rules for plugin
        return {
            '^!lounas$': function lounas(from, matches) {
                // Define jobs
                var jobs = {
                    'Shalimar': fetchShalimar,
                    'Asemaravintola': fetchAsema,
                    'Trattoria': fetchAukio,
                    'Best': fetchBest
                };

                // Fetch lunch data parallel
                async.parallel(
                    jobs,
                    function callback(error, results) {
                        if (error) {
                            channel.say(from, 'Oh noes, error - ' + error);
                        } else {
                            _.each(results, function iterator(lunch, place) {
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
