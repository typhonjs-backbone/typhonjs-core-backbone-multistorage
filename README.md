# typhonjs-core-backbone-localstorage
Provides an adapter for backbone-es6 using typhonjs-core-multistorage.

INCOMPLETE

Must comment out in Backbone.js:
```
//if (typeof this.$ === 'undefined')
//{
//   throw new Error("Backbone - ctor - could not locate global '$' (jQuery or equivalent).");
//}
```

Also in JSPM config.js must provide an empty map for jquery.
