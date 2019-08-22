const PROTO_PATH = __dirname + '/../proto/mobileapi.proto';

const _ = require('lodash');
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const mobileapi = grpc.loadPackageDefinition(packageDefinition);
const server = new grpc.Server();

/** 
 * Dummy dataset for testing. List of objects where each object represents category and articles under that category.
*/
const dataset = require('../test-data/dataset');

/**
 * Implements the ListCategories RPC method.
 * @param {Writable} call Writable stream for responses with an additional
 */
function listCategories(call) {
    _.each(dataset, function (data) {
        const category = {
            id: data.id,
            title: data.title,
            image_url: data.image_url
        }
        call.write(category);
    });
    call.end();
}

/**
 * Implements the ListArticles RPC method.
 *  @param {Writable} call Writable stream for responses with an additional  
 */
function listArticles(call) {
    _.each(dataset, function (data) {
        if (data.id == call.request.id) {
            data.articles.forEach((a) => call.write(a.overview))
        } else {
            return;
        }
    });
    call.end();
}

/**
 * Implements the GetArticle RPC method.
 * @param {EventEmitter} call Call object for the handler to process  
 * @param {function(Error, feature)} callback Response callback
 */
function getArticle(call, callback) {
    var article;
    for (var i = 0; i < dataset.length; i++) {
        article = dataset[i].articles.find((a) => a.overview.id == call.request.id);
        if (article) {
            break;
        }
    }
    if (article) {
        callback(null, article)
    } else {
        callback({
            code: grpc.status.NOT_FOUND,
            details: "Not found"
        })
    }
}

/**
 * Implements the SetStarred RPC method.
 * @param {EventEmitter} call Call object for the handler to process  
 * @param {function(Error, feature)} callback Response callback
 */
function setStarred(call, callback) {
    let existingArticle;
    for (var i = 0; i < dataset.length; i++) {
        existingArticle = dataset[i].articles.find((a) => a.overview.id == call.request.article_id);
        if (existingArticle) {
            break;
        }
    }
    if (existingArticle) {
        existingArticle.overview.starred = call.request.star;
        callback(null, existingArticle);
    } else {
        callback({
            code: grpc.status.NOT_FOUND,
            details: "Not found"
        });
    }
}

/**
 * Starts an RPC server that receives requests for the MobileApi service at the
 * sample server port
 */
server.addService(mobileapi.MobileApi.service, {
    ListCategories: listCategories,
    ListArticles: listArticles,
    GetArticle: getArticle,
    SetStarred: setStarred,
});

server.bind('127.0.0.1:8001',
    grpc.ServerCredentials.createInsecure());
    console.log('Server is up on port 8001');
server.start();
