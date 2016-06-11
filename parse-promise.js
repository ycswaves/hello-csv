// please use promise approach to fight the naive one in parse-callback.js
'use strict';

const debug = require('debug')('hello');
const fs = require('fs');
const parse = require('csv-parse');
const helper = require('./helper');

const SMS_RETRY_TIMES = 7;
const LOG_RETRY_TIMES = 3;

new Promise(function(resolve, reject) {
    fs.readFile(__dirname + '/sample.csv', function thenParse(err, loadedCsv) {
        if (err) {
            reject(err);
        } else {
            resolve(loadedCsv);
        };
    })
})
.then(function(loadedCsv){
    return new Promise(function(resolve, reject) {
      parse(loadedCsv, function transformEachLine(err, parsed) {
          if (err) {
              reject(err);
          } else {
              let msgToSend = [];
              for (let index in parsed) {
                  if (index === 0) {
                    continue; //skip 1st line
                  }

                  const line = helper.transformLine(parsed[index]);
                  msgToSend.push(line);
              }
              resolve(msgToSend);
          }
      });
    });
})
.then(function(msgToSend){
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
})
