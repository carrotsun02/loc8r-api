const mongoose = require('mongoose');
const readLine = require('readline');
mongoose.set("strictQuery", false);

const dbPassword = process.env.MONGODB_PASSWORD;
const dbURI = `mongodb+srv://mj48114421:${dbPassword}@cluster0.mdizof0.mongodb.net/Loc8r`;

mongoose.connect(dbURI);

mongoose.connection.on('connected', function () {
    console.log(`Mongoose connected to ${dbURI}`);
});
mongoose.connection.on('error', err => {
    console.log(`Mongoose connection error: ${err}`);
});
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

var gracefulShutdown = (msg, callback) => {
    mongoose.connection.close( () => {
        console.log(`Mongoose disconnected through ${msg}`);
        callback();
    });
};

process.once('SIGUSR2', function () {
    gracefulShutdown('nodemon restart', () => {
        process.kill(process.pid, 'SIGUSR2');
    });
});

process.once('SIGINT', function () {
    gracefulShutdown('app termination', () => {
        process.exit(0);
    });
});

process.on('SIGTERM', function () {
    gracefulShutdown('Heroku app shutdown', () => {
        process.exit(0);
    });
});

require('./locations');

require('./users'); // 2021810051 이민준