import Backbone      from 'backbone';
import MultiStorage  from 'typhonjs-core-multistorage/src/platforms/universal/MultiStorage.js';

console.log('localStorage - 0 - Backbone: ' + Backbone);
console.log('localStorage - 1 - MultiStorage: ' + MultiStorage);
console.log(MultiStorage);

// A simple module to replace `Backbone.sync` with `localStorage`-based
// persistence. Models are given GUIDS, and saved into a JSON object. Simple
// as that.

/**
 * Generate four random hex digits.
 *
 * @returns {string}
 */
const S4 = () =>
{
   return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
const guid = () =>
{
   return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
};

const isObject = (item) =>
{
   return item === Object(item);
};

const contains = (array, item) =>
{
   var i = array.length;
   while (i--) if (array[i] === item) return true;
   return false;
};

const extend = (obj, props) =>
{
   for (var key in props) obj[key] = props[key]
   return obj;
};

const result = (object, property) =>
{
   if (object == null) return void 0;
   var value = object[property];
   return (typeof value === 'function') ? object[property]() : value;
};

// localSync delegate to the model or collection's
// `localStorage` property, which should be an instance of `Store`.
// window.Store.sync and Backbone.localSync is deprecated, use Backbone.LocalStorage.sync instead
const s_LOCAL_SYNC = function(method, model, options)
{
   var store = result(model, 'localStorage') || result(model.collection, 'localStorage');

   var resp, errorMessage;
   //If $ is having Deferred - use it.

   var syncDfd = Backbone.$ ?
    (Backbone.$.Deferred && Backbone.$.Deferred()) :
    (Backbone.Deferred && Backbone.Deferred());

   try {

      switch (method) {
         case "read":
//TODO            resp = model.id != undefined ? store.find(model) : store.findAll();
            const promise = model.id != undefined ? store.find(model) : store.findAll();
            promise.then((value) =>
            {
               resp = value;
            });
            break;
         case "create":
            resp = store.create(model);
            break;
         case "update":
            resp = store.update(model);
            break;
         case "delete":
            resp = store.destroy(model);
            break;
      }

   } catch(error) {
      if (error.code === 22 && store._storageSize() === 0)
         errorMessage = "Private browsing is unsupported";
      else
         errorMessage = error.message;
   }

   if (resp) {
      if (options && options.success) {
         options.success(resp);
      }
      if (syncDfd) {
         syncDfd.resolve(resp);
      }
   }
   else
   {
      errorMessage = errorMessage ? errorMessage : "Record Not Found";

      if (options && options.error)
         options.error(errorMessage);

      if (syncDfd)
         syncDfd.reject(errorMessage);
   }

   // add compatibility with $.ajax
   // always execute callback for success and error
   if (options && options.complete) { options.complete(resp); }

   return syncDfd && syncDfd.promise();
};

// Our Store is represented by a single JS object in `localStorage`. Create it
// with a meaningful name, like the name you'd give a table.
// window.Store is deprectated, use Backbone.LocalStorage instead
class BackboneMultistorage
{
   constructor(name = 'multistorage', session = false, serializer)
   {
      if (!MultiStorage)
      {
         throw "Backbone.multiStorage: Environment does not support multiStorage."
      }

      this.name = name;

      this.serializer = serializer ||
      {
         serialize: function (item)
         {
            return isObject(item) ? JSON.stringify(item) : item;
         },
         // fix for "illegal access" error on Android when JSON.parse is passed null
         deserialize: function (data)
         {
            return data && JSON.parse(data);
         }
      };

      this.multiStorage = new MultiStorage.default(name, session);

      this.multiStorage.get(this.name).then((value) =>
      {
         var store = value;

         console.log('BackboneMultiStorage - ctor - 0 - store: ' + store);
         console.log(store);

         this.records = (store && store.split(",")) || [];
      });

      //var store = this.multiStorage.get(this.name);
      //this.records = (store && store.split(",")) || [];
   }

   localStorage()
   {
      return this.multiStorage;
   }

   // Save the current state of the `Store` to `localStorage`.
   save()
   {
      this.localStorage().set(this.name, this.records.join(","));
   }

   // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
   // have an id of it's own.
   create(model)
   {
      if (!model.id && model.id !== 0)
      {
         model.id = guid();
         model.set(model.idAttribute, model.id);
      }

      this.localStorage().set(this._itemName(model.id), this.serializer.serialize(model));
      this.records.push(model.id.toString());
      this.save();
      return this.find(model);
   }

   // Update a model by replacing its copy in `this.data`.
   update(model)
   {
      this.localStorage().set(this._itemName(model.id), this.serializer.serialize(model));
      var modelId = model.id.toString();

      if (!contains(this.records, modelId))
      {
         this.records.push(modelId);
         this.save();
      }

      return this.find(model);
   }

   // Retrieve a model from `this.data` by id.
   find(model)
   {
//TODO      return this.serializer.deserialize(this.localStorage().get(this._itemName(model.id)));
      return this.localStorage().get(this._itemName(model.id));
   }

   // Return the array of all models currently in storage.
   findAll()
   {
      var result = [];

      for (var i = 0, id, data; i < this.records.length; i++)
      {
         id = this.records[i];
         data = this.serializer.deserialize(this.localStorage().get(this._itemName(id)));
         if (data != null) result.push(data);
      }

      return result;
   }

   // Delete a model from `this.data`, returning it.
   destroy(model)
   {
      this.localStorage().delete(this._itemName(model.id));
      var modelId = model.id.toString();
      for (var i = 0, id; i < this.records.length; i++)
      {
         if (this.records[i] === modelId)
         {
            this.records.splice(i, 1);
         }
      }
      this.save();
      return model;
   }

   sync(method, model, options)
   {
      return s_LOCAL_SYNC(method, model, options);
   }

   // Clear localStorage for specific collection.
   _clear()
   {
      var local = this.localStorage(),
       itemRe = new RegExp("^" + this.name + "-");

      // Remove id-tracking item (e.g., "foo").
      local.delete(this.name);

      // Match all data items (e.g., "foo-ID") and remove.
      for (var k in local)
      {
         if (itemRe.test(k))
         {
            local.delete(k);
         }
      }

      this.records.length = 0;
   }

   // Size of localStorage.
   _storageSize()
   {
      return this.localStorage().length;
   }

   _itemName(id)
   {
      return this.name+"-"+id;
   }
}

Backbone.ajaxSync = Backbone.sync;

Backbone.getSyncMethod = function(model, options)
{
   var forceAjaxSync = options && options.ajaxSync;

   if(!forceAjaxSync && (result(model, 'localStorage') || result(model.collection, 'localStorage')))
   {
      return Backbone.localSync;
   }

   return Backbone.ajaxSync;
};

// Override 'Backbone.sync' to default to localSync,
// the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
Backbone.sync = function(method, model, options)
{
   return Backbone.getSyncMethod(model, options).apply(this, [method, model, options]);
};

Backbone.localSync = s_LOCAL_SYNC;

Backbone.MultiStorage = BackboneMultistorage;

export default BackboneMultistorage;