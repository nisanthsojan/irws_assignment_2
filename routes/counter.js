var express = require('express');
var router = express.Router();
var _D = require('lodash');
var S = require('string');

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

router.get('/unique', function (req, res, next) {

});

module.exports = router;
