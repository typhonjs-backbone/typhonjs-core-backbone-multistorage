import                 '../../../src/multistorage.js';
import Backbone   from 'backbone';

const s_LOCAL_STORAGE = new Backbone.MultiStorage('multistorage-data');

class Item extends Backbone.Model
{
   /**
    * Default attributes for the item.
    *
    * @returns {object}
    */
   get defaults() { return { content: 'empty todo...', done: false }; }

   /**
    * Ensure that each item created has `content`.
    */
   initialize()
   {
      if (!this.get('content'))
      {
         this.set({ 'content': this.defaults.content });
      }
   }
}

class TodoList extends Backbone.Collection {
   /**
    * Reference to this collection's local storage.
    *
    * @returns {*}
    */
   get localStorage()
   {
      return s_LOCAL_STORAGE;
   }

   get model()
   {
      return Item;
   }
}

const todoList = new TodoList();

todoList.fetch();

if (todoList.models.length > 0)
{
   console.log('!! Test - 0');
}
else
{
   console.log('!! Test - 1');

   todoList.create({ name: 'test'});
}

//todoList.fetch().then(() =>
//{
//   if (todoList.models.length > 0)
//   {
//      console.log('!! Test - 0');
//   }
//   else
//   {
//      console.log('!! Test - 1');
//
//      todoList.create({ name: 'test'});
//   }
//});