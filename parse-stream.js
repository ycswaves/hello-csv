// 0. Please use readline (https://nodejs.org/api/readline.html) to deal with per line file reading
// 1. Then use the parse API of csv-parse (http://csv.adaltas.com/parse/ find the Node.js Stream API section)

'use strict';

const debug = require('debug')('hello');
const readline = require('readline');
const fs = require('fs');
const parse = require('csv-parse');
const helper = require('./helper');

const SMS_RETRY_TIMES = 7;
const LOG_RETRY_TIMES = 3;

const rl = readline.createInterface({
    input: fs.createReadStream(__dirname + '/sample.csv')
});

rl.on('line', (rawLine) => {
    parse(rawLine, function transformEachLine(err, parsed) {
        if(Array.isArray(parsed)) {
            parsed = parsed[0];
            const line = helper.transformLine(parsed);
            debug(`sending line: ${line}`);

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
    });
    
});