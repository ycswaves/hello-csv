// Please use async lib https://github.com/caolan/async

'use strict';

const debug = require('debug')('hello');
const fs = require('fs');
const parse = require('csv-parse');
const helper = require('./helper');
const async = require('async');

const SMS_RETRY_TIMES = 7;
const LOG_RETRY_TIMES = 3;

async.waterfall([
    function readFile(callback) {
        fs.readFile(__dirname + '/sample.csv', function thenParse(err, loadedCsv) {
            if (err) {
                callback(err);
                return;
            } else {
                callback(null, loadedCsv);
            };
        })
    },

    function parseLine(loadedCsv, callback) {
        parse(loadedCsv, function transformEachLine(err, parsed) {
            if (err) {
                callback(err);
                return;
            } else {
                let msgToSend = [];
                for (let index in parsed) {
                    if (index === 0) {
                      continue; //skip 1st line
                    }

                    const line = helper.transformLine(parsed[index]);
                    msgToSend.push(line);
                }
                callback(null, msgToSend);
            }
        });
    },

    function sendMessage(msgToSend, callback) {
        for (let index in msgToSend) {
            debug(`sending data index: ${index}`);
            const line = msgToSend[index];

            helper.sendSmsRetryable(SMS_RETRY_TIMES, line, function afterSending(err, sendingStatus) {
                let lineToLog;
                if (err) {
                    debug(err.message);

                    lineToLog = {
                        sendingStatus,
                        line,
                    };
                }

                if (lineToLog) {
                    helper.logToS3Retryable(LOG_RETRY_TIMES, lineToLog, function afterLogging(err, loggingStatus) {
                        if (err) {
                            debug(err.message);
                        }
                    });
                }
            });
        }
        callback();
    }
]);



