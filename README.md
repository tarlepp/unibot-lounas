# unibot-lounas
Lounas plugin for UniBot, this will basically fetch just specified lunch information from couple of sites. Currently
plugin fetches lunch information from following sites:

 * Shalimar (http://www.ravintolashalimar.fi/)
 * Jyväskylän vanha asemaravintola (http://vanhaasemaravintola.fi/)

Please note that this plugin relies heavily on those site HTML structure to get all needed information.

## Install
To your UniBot application
```npm install git://github.com/tarlepp/unibot-lounas --save```

And after that register new plugin on IRC channels what you need
```plugin [#channel] lounas```

ps. remember to restart your UnitBot.

## Usage
After installation just type ```!lounas``` on that channel.
