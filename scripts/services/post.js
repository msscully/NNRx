'use strict';

app.factory('Post', function () {
    var STORAGE_ID = 'posts';

    return {
        all: function () {
            return JSON.parse(localStorage.getItem(STORAGE_ID) || '{}');
        },

        get: function (postId) {
            return JSON.parse(localStorage.getItem(STORAGE_ID) || '{}')[postId];
        },

        put: function (posts) {
            localStorage.setItem(STORAGE_ID, JSON.stringify(posts));
        },

        
        create: function(post, callback){
            var lastPostId = JSON.parse(localStorage.getItem('nextPostId') || '0');
            var nextId = lastPostId + 1;
            var posts = this.all();
            post['id'] = nextId
            posts[nextId] = post

            localStorage.setItem('nextPostId', JSON.stringify(nextId));
            localStorage.setItem(STORAGE_ID, JSON.stringify(posts));

            callback(nextId);

        },

        delete: function(postId){
            var posts = JSON.parse(localStorage.getItem(STORAGE_ID) || '{}');
            delete posts[postId];
            this.put(posts);
        }
    };
});
