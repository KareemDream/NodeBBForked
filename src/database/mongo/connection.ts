import * as nconf from 'nconf';
import * as winston from 'winston';
import * as _ from 'lodash';

type mongoType = {
    uri?: string, 
    username?: string, 
    password?: string, 
    host?: string, 
    port?: number, 
    database?: string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    options?: any
}
interface ConnectionType {
    getConnectionString(mongo: mongoType): string;
    getConnectionOptions(mongo: mongoType): any;
    connect(options: any): Promise<any>;
}

const connection: ConnectionType = module.exports as ConnectionType;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
connection.getConnectionString = function (mongo: mongoType) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    mongo = mongo || nconf.get('mongo');
    let usernamePassword = '';
    const uri: string = mongo.uri || '';
    if (mongo.username && mongo.password) {
        usernamePassword = `${mongo.username}:${encodeURIComponent(mongo.password)}@`;
    } else if (!uri.includes('@') || !uri.slice(uri.indexOf('://') + 3, uri.indexOf('@'))) {
        winston.warn('You have no mongo username/password setup!');
    }

    // Sensible defaults for Mongo, if not set
    if (!mongo.host) {
        mongo.host = '127.0.0.1';
    }
    if (!mongo.port) {
        mongo.port = 27017;
    }
    const dbName = mongo.database;
    if (dbName === undefined || dbName === '') {
        winston.warn('You have no database name, using "nodebb"');
        mongo.database = 'nodebb';
    }

    const hosts = mongo.host.split(',');
    const ports = mongo.port.toString().split(',');
    const servers = [];

    for (let i = 0; i < hosts.length; i += 1) {
        servers.push(`${hosts[i]}:${ports[i]}`);
    }

    return uri || `mongodb://${usernamePassword}${servers.join()}/${mongo.database}`;
};

connection.getConnectionOptions = function (mongo) {
    mongo = mongo || nconf.get('mongo');
    const connOptions = {
        maxPoolSize: 10,
        minPoolSize: 3,
        connectTimeoutMS: 90000,
    };

    return _.merge(connOptions, mongo.options || {});
};

connection.connect = async function (options) {
    const { MongoClient } = require('mongodb'); 

    const connString = connection.getConnectionString(options);
    const connOptions = connection.getConnectionOptions(options);

    return await MongoClient.connect(connString, connOptions);
};

export default connection; 
