/**
 * Plugin dependencies.
 *
 * @type {exports}
 */
var request = require("request");
var cheerio = require('cheerio');
var async = require('async');
var _ = require('lodash');

/**
 * Lounas plugin for UniBot.
 *
 * This plugin fetches lunch information for today from specified restaurants. Currently plugin supports following
 * restaurants:
 *
 * Jyväskylä:
 *  - Shalimar (http://www.ravintolashalimar.fi/)
 *  - Jyväskylän vanha asemaravintola (http://vanhaasemaravintola.fi/)
 *  - Trattorian Aukio (https://www.raflaamo.fi/jyvaskyla/trattoria-aukio)
 *  - Pizzeria Best (http://www.pizzeriabest.fi/)
 *
 * Tampere:
 *  - Antell (http://www.antell.fi/lounaslistat/lounaslista.html?owner=84)
 *  - Kirveli (http://lounaat.info/lounas/kirveli/tampere)
 *  - Coriander (http://www.coriander-restaurant.com/)
 *
 * Also note that this plugin relies heavily to those websites and structure of them. So there will be times, when this
 * plugin doesn't work right.
 *
 * @todo    Add more restaurants!
 * @todo    See if there is more common API for lunch data fetch
 * @todo    Separate each restaurant to own modules
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
    String.prototype.capitalize = function() {
        return this.replace(/(^|\s)([a-z])/g, function(m, p1, p2) { return p1 + p2.toUpperCase(); } );
    };

    // Actual plugin implementation.
    return function plugin(channel) {
        /**
         * Helper function to fetch data from specified URL.
         *
         * @param   {String}    url         URL to fetch
         * @param   {Function}  callback    Callback function
         */
        function fetchData(url, callback) {
            request({
                uri: url,
                method: 'GET',
                timeout: 10000,
                followRedirect: true,
                maxRedirects: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36'
                }
            }, callback);
        }

        /**
         * Helper function to fetch lunch data from Shalimar website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchShalimar(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var $ = cheerio.load(body);
                    var dishes = [];

                    $('table.todayLunch td.dish').each(function iterator() {
                        dishes.push($(this).text());
                    });

                    callback(null, _.compact(dishes).join(', '))
                }
            };

            fetchData('http://www.ravintolashalimar.fi/', parser);
        }

        /**
         * Helper function to fetch lunch data from Vanha asemaravintola website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchAsema(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var date = new Date();
                    var day = date.getDate();
                    var month = date.getMonth() + 1;

                    if (day < 10) {
                        day = '0' + day;
                    }

                    if (month < 10) {
                        month = '0' + month;
                    }

                    var $ = cheerio.load(body);
                    var dishes = $('div.content').find('p:contains("' + day + '.' + month + '")').text().split('\n');

                    // Remove current date
                    dishes.shift();

                    callback(null, _.compact(dishes).join(', '))
                }
            };

            fetchData('http://vanhaasemaravintola.fi/lounaslista/', parser);
        }

        /**
         * Helper function to fetch lunch data for Trattoria Aukio from Raflaamo website.
         *
         * @param {Function}    callback    Callback function
         */
        function fetchAukio(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var $ = cheerio.load(body);
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

                    callback(null, _.compact(dishes).join(', '))
                }
            };

            fetchData('https://www.raflaamo.fi/fi/jyvaskyla/trattoria-aukio', parser);
        }

        /**
         * Helper function to fetch lunch data for Pizzeria Best
         *
         * @param {Function}    callback    Callback function
         */
        function fetchBest(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var $ = cheerio.load(body);
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
                        dishes = dishes.substr(3).trim();
                    }

                    callback(null, dishes);
                }
            };

            fetchData('http://www.pizzeriabest.fi/onlinetilaus/index.php?main_page=page&id=1', parser);
        }

        /**
         * Helper function to fetch lunch data for Antell (Tampere location)
         *
         * @param {Function}    callback    Callback function
         */
        function fetchAntell(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
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
                    var $ = cheerio.load(body);
                    var dishes = [];

                    $('#lunch-content-table')
                        .find('table td h2:contains("' + days[date.getDay()] +'")')
                        .closest('table')
                        .find('tr:not(.space)')
                        .each(function iterator(index) {
                            if (index !== 0) {
                                dishes.push($(this).find('td').eq(1).text().replace(/^\s+|\s+$/gm, ''));
                            }
                        });

                    callback(null, _.compact(dishes).join(', '))
                }
            };

            fetchData('http://www.antell.fi/lounaslistat/lounaslista.html?owner=84', parser);
        }

        /**
         * Helper function to fetch lunch data for Kirveli (Tampere).
         *
         * @param   {Function}  callback    Callback function
         */
        function fetchKirveli(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var days = [
                        'Sunnuntaina',
                        'Maanantaina',
                        'Tiistaina',
                        'Keskiviikkona',
                        'Torstaina',
                        'Perjantaina',
                        'Lauantaina'
                    ];

                    var date = new Date();
                    var $ = cheerio.load(body);
                    var dishes = [];

                    $('#menu')
                        .find('h3:contains("' + days[date.getDay()] + '")')
                        .closest('section')
                        .find('ul li')
                        .each(function iterator() {
                            dishes.push($(this).find('p.dish').text().replace(/\s+/g, ' ').trim());
                        });

                    callback(null, _.compact(dishes).join(', '));
                }
            };

            fetchData('http://lounaat.info/lounas/kirveli/tampere', parser);
        }

        /**
         * Helper function to fetch lunch data for Coriander (Tampere).
         *
         * @param   {Function}  callback    Callback function
         */
        function fetchCoriander(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var days = [
                        'tab-sunday',
                        'tab-monday',
                        'tab-tuesday',
                        'tab-wednesday',
                        'tab-thursday',
                        'tab-friday',
                        'tab-saturday'
                    ];

                    var date = new Date();
                    var $ = cheerio.load(body);
                    var dishes = [];

                    $('#' + days[date.getDay()])
                        .find('h5')
                        .each(function iterator() {
                            var dish = $(this).text().replace(/\s+/g, ' ').trim().replace(/^([0-9]\.)/, '').trim();

                            dishes.push(dish.toLowerCase().capitalize());
                        });

                    callback(null, _.compact(dishes).join(', '));
                }
            };

            fetchData('http://www.coriander-restaurant.com/', parser);
        }

        /**
         * Helper function to fetch lunch data for Dynamo (Jyväskylä).
         *
         * @param   {Function}  callback    Callback function
         */
        function fetchDynamo(callback) {
            var parser = function parser(error, response, body) {
                if (error) {
                    callback(error, null);
                } else {
                    var $ = cheerio.load(body);
                    var dishes = [];

                    $('.lunch_desc').each(function() {
                        var dishElement = $(this);
                        var dish = [];

                        dish.push(dishElement.find('span.fi.title').text());
                        dish.push(dishElement.find('span.fi.desc').text());

                        dishes.push(_.compact(dish).join(' ja '));
                    });

                    callback(null, _.compact(dishes).join(', '));
                }
            };

            fetchData('http://www.sodexo.fi/jamk-dynamo', parser);
        }

        // Regex rules for plugin
        return {
            '^!lounas(?: (.*))?$': function lounas(from, matches) {
                // Define jobs per location
                var jobs = {
                    'jyväskylä': {
                        'Shalimar': fetchShalimar,
                        'Asemaravintola': fetchAsema,
                        'Trattoria': fetchAukio,
                        'Best': fetchBest,
                        'Dynamo': fetchDynamo
                    },
                    'tampere': {
                        'Antell': fetchAntell,
                        'Kirveli': fetchKirveli,
                        'Coriander': fetchCoriander
                    }
                };

                // Default location
                var location = 'jyväskylä';

                if (matches[1]) {
                    if (jobs[matches[1].toLowerCase()]) {
                        location = matches[1].toLowerCase();
                    } else {
                        location = false;

                        channel.say(from + ': voi voi, ei tukea paikalle \'' + matches[1] + '\'');
                    }
                }

                if (location !== false) {
                    // Fetch lunch data parallel
                    async.parallel(
                        jobs[location],
                        function callback(error, results) {
                            if (error) {
                                channel.say(from, 'Oh noes, error - ' + error);
                            } else {
                                _.each(results, function iterator(lunch, place) {
                                    if (_.isEmpty(lunch)) {
                                        lunch = 'Ei mitään tänään';
                                    }

                                    channel.say(place + ': ' + lunch.trim());
                                });
                            }
                        }
                    );
                }
            }
        };
    };
};
