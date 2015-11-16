var express = require('express');
var router = express.Router();
var _D = require('lodash');
var S = require('string');
var async = require('async');

/*
 This function takes test string and do the following operations
 1) Clean white spaces from start and end.
 2) Replace newline to spaces.
 3) Replace multiple spaces into one.
 */
function cleanText(text) {
    text = S(text).trim().stripPunctuation().s; //clean white spaces from start and end
    text = text.replace(/\n /, ' '); // replace new line to spaces
    text = text.replace(/[ ]{2,}/gi, ' '); //replace multiple spaces into one
    return text.toLowerCase();
}


/*
 This route outputs the word count of each document and
 the name of the file
 */
router.get('/', function (req, res, next) {
    var count = 0;
    var eachFiles = [];

    req.app.locals.corpuses.forEach(function (corpus) {
        var cleanedData = cleanText(corpus.data);

        var tmp = {
            name: corpus.name,
            count: cleanedData.split(' ').length
        };
        eachFiles.push(tmp);
        count += tmp.count;
    });

    res.render('counter_words', {
        title: req.app.locals.title,
        corpusWordLength: count,
        fileData: eachFiles
    });
});


/*
 this route is just a file selector for finding
 the top 100 words.
 */
router.get('/top', function (req, res, next) {
    var data = [];
    req.app.locals.corpuses.forEach(function (corpus) {
        data.push({
            name: corpus.name,
            id: _D.snakeCase(corpus.name)
        });
    });

    res.render('top_select', {
        title: req.app.locals.title,
        fileData: data
    });
});


/*
 this route catches the selected file from the url and outputs the entire document with
 the top 100 frequent words in that document
 */
router.get('/top/:name', function (req, res, next) {

    var selectedCorpus = _D.find(req.app.locals.corpuses, function (corpus) {
        return _D.snakeCase(corpus.name) === _D.snakeCase(req.params.name || '');
    });

    if (_D.isUndefined(selectedCorpus)) {
        return res.render('error', {
            message: 'The document not found',
            error: {
                status: 400,
                stack: ''
            }
        });
    }

    var wordIndex = [];
    selectedCorpus.data = cleanText(selectedCorpus.data);
    var corpusWords = selectedCorpus.data.split(' ');

    _D.forEach(corpusWords, function (word) {
        var tmp = _D.findWhere(wordIndex, {'word': word});
        if (_D.isUndefined(tmp)) {
            wordIndex.push({
                word: word,
                count: 0
            });
            tmp = _D.findWhere(wordIndex, {'word': word});
        }

        tmp.count++;
    });

    //this function sorts the collection by the count key and takes only the first 100
    wordIndex = _D.chain(wordIndex).sortByOrder(['count'], ['desc']).take(100).value();

    res.render('top_selected', {
        title: req.app.locals.title,
        selectedCorpus: selectedCorpus,
        wordIndex: wordIndex
    });
});

/*
 this function gets the corpus array and return the unique words in each corpus
 */
function getUniqueTerms(req, res, next) {
    var uniqueWord = [];
    // Array to hold async tasks
    var asyncTasks = [];
    var corpusDocuments = req.app.locals.corpuses;

    _D.forEach(corpusDocuments, function (corpus, corpusIndex) {

        asyncTasks.push(function (callback) {

            var corpusesWordsString = '';
            _D.each(corpusDocuments, function (corpuss, index) {
                if (index != corpusIndex) {
                    corpusesWordsString += ' ' + cleanText(corpuss.data);
                }
            });
            var tmp = {
                name: corpus.name,
                words: [],
                count: 0
            };


            var asyncTasks2 = [];
            var corpusWords = _D.uniq(cleanText(corpus.data).split(' '));
            var chunks = _D.chunk(corpusWords, 10);

            _D.forEach(chunks, function (chunksChunks) {
                asyncTasks2.push(function (chunksCallback) {
                    _D.forEach(chunksChunks, function (word) {
                        if (!S(corpusesWordsString).contains(word)) {
                            tmp.words.push(word);
                        }
                    });
                    return chunksCallback();
                });
            });

            async.parallel(asyncTasks2, function (err) {
                tmp.count = tmp.words.length;
                uniqueWord.push(tmp);
                return callback();
            });
        });

    });


    async.parallel(asyncTasks, function (err) {
        req.UniqueWord = uniqueWord;
        return next();
    });
}

/*
 this route counts the number of documents in each documents
 */
router.get('/unique', getUniqueTerms, function (req, res, next) {
    res.render('unique', {
        title: req.app.locals.title,
        fileData: req.UniqueWord
    });

});

/*
a middleware to get the unique word count in each documents
the unique words are computed from the 'getUniqueTerms' function which is stored in
request variable 'req.UniqueWord' and modifies it to have count with them
 */
function getUniqueTermsCount(req, res, next) {
    var asyncTasks = [];
    _D.forEach(req.UniqueWord, function (uniqWordDoc) {
        asyncTasks.push(function (uniqWordCallback) {

            var chunks = _D.chunk(uniqWordDoc.words, 10);
            var corpusDoc = _D.findWhere(req.app.locals.corpuses, {'name': uniqWordDoc.name});
            var asyncTasks2 = [];
            uniqWordDoc.words = [];

            var cleanedData = cleanText(corpusDoc.data);

            _D.forEach(chunks, function (chunksChunks) {
                asyncTasks2.push(function (chunksCallback) {
                    _D.forEach(chunksChunks, function (word) {
                        uniqWordDoc.words.push({
                            text: word,
                            count: S(cleanedData).count(word)
                        });
                    });
                    return chunksCallback();
                });
            });

            async.parallel(asyncTasks2, function (err) {
                return uniqWordCallback();
            });
        });
    });

    async.parallel(asyncTasks, function (err) {
        //req.UniqueWord = uniqueWord;
        return next();
    });

}

router.get('/unique/count', getUniqueTerms, getUniqueTermsCount, function (req, res, next) {

    res.render('unique_count', {
        title: req.app.locals.title,
        fileData: req.UniqueWord
    });

});

module.exports = router;
