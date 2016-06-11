'use strict';

const debug = require('debug')('hello-helper');
const AWS = require('mock-aws-s3');

AWS.config.basePath = __dirname + '/buckets';

const s3 = AWS.S3({ params: { Bucket: 'example' } });

function surprise(name) {
    if (Math.floor(Math.random() * 100) + 1 <= 50) {
        return new Error(`w00t!!! ${name} error`);
    }
}

function sendSmsRetryable(trial, data, callback) {
    setTimeout(() => {
        if (trial > 1) {
            debug(`${trial} trial left, sending out sms: ${JSON.stringify(data)}`);
            if (surprise('sending-sms')) {
                sendSmsRetryable(trial-1, data, callback);
            }
        } else {
            callback(surprise('sending-sms'), {
                status: 200,
                message: 'OK',
            });
        }
    }, 200);  
}

function logToS3Retryable(trial, data, callback) {
    setTimeout(() => {
        if (trial > 1) {
            debug(`${trial} trial left, putting data to S3: ${JSON.stringify(data)}`);
            s3.putObject({
                Key: `row/line-${new Date().valueOf()}.json`,
                Body: JSON.stringify(data),
            }, (err) => {
                if (err || surprise('log-to-s3')) {
                    logToS3Retryable(trial-1, data, callback)
                }
            });
        } else {
            s3.putObject({
                Key: `row/line-${new Date().valueOf()}.json`,
                Body: JSON.stringify(data),
            }, (err) => {
                callback(err ? err : surprise('log-to-s3'), { data, logged: true });
            });
        }
     }, 200);
}

// simulates sending sms
exports.sendSms = function(data, callback) {

    setTimeout(() => {
        debug(`sending out sms: ${JSON.stringify(data)}`);
        callback(surprise('sending-sms'), {
            status: 200,
            message: 'OK',
        });
    }, 200);
};
// simulates logging to s3
exports.logToS3 = function(data, callback) {

    setTimeout(() => {
        debug(`putting data to S3: ${JSON.stringify(data)}`);
        s3.putObject({
            Key: `row/line-${new Date().valueOf()}.json`,
            Body: JSON.stringify(data),
        }, (err) => {
            callback(err ? err : surprise('log-to-s3'), { data, logged: true });
        });
    });
};

// replace first_name and last_name with full_name
exports.transformLine = function(line) {
    if (!Array.isArray(line) || line.length < 2) return line;

    const fullName = line[0] + ' ' + line[1];
    line.splice(0, 2, fullName); 
    return line;
}

exports.sendSmsRetryable = sendSmsRetryable;
exports.logToS3Retryable = logToS3Retryable;
