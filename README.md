# unibot-lounas
Lounas plugin for UniBot, this will basically fetch just specified lunch information from couple of sites. Currently
plugin supports following locations and restaurants:

**Jyväskylä** ```!lounas```

* Shalimar (http://www.ravintolashalimar.fi/)
* Jyväskylän vanha asemaravintola (http://vanhaasemaravintola.fi/)
* Trattorian Aukio (https://www.raflaamo.fi/jyvaskyla/trattoria-aukio)
* Pizzeria Best (http://www.pizzeriabest.fi/)
* Dynamo (http://www.sodexo.fi/jamk-dynamo)
 
**Tampere** ```!lounas tampere```

* Antell (http://www.antell.fi/lounaslistat/lounaslista.html?owner=84)
* Kirveli (http://lounaat.info/lounas/kirveli/tampere)
* Coriander (http://www.coriander-restaurant.com/)

Please note that this plugin relies heavily on those site HTML structure to get all needed information.

## Install
To your UniBot application

```npm install git://github.com/tarlepp/unibot-lounas --save```

And after that register new plugin on IRC channels what you need

```plugin [#channel] lounas```

ps. remember to restart your UnitBot.

## Usage
After installation just type ```!lounas``` or ```!lounas tampere``` on that channel.

## Test plugin
You can easily test plugin by following command:

```node test.js```

This will basically mimic specified IRC commands for this plugin and fetch actual data and show those on shell.
