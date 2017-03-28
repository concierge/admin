const argumentParser = require('concierge/arguments');

const cleanString = str => str.trim().toLowerCase();

const getHasPermission = (event, moduleName) => {
    if (!exports.config.modules || !exports.config.modules[moduleName] || exports.config.modules[moduleName].length === 0) {
        return true;
    }

    if (!exports.config.users || Object.keys(exports.config.users).length === 0) {
        return false;
    }

    const users = [exports.config.users[event.sender_id], exports.config.users[cleanString(event.sender_name)]].filter(u => u !== void(0) && u !== null);
    if (!users.length === 0) {
        return false;
    }

    let res = false;
    for (let user of users) {
        const tIds = Object.keys(user).filter(thread => (new RegExp(thread)).test(event.thread_id));
        for (let tId of tIds) {
            res = res || !!exports.config.modules[moduleName].find(p => user[tId].includes(p));
        }
    }
    return res;
};

const ensureCreated = (object, name, defaultVal = {}) => {
    if (Array.isArray(name)) {
        let curr = object;
        for (let i = 0; i < name.length; i++) {
            curr = ensureCreated(curr, name[i], i + 1 === name.length ? defaultVal : {});
        }
        return curr;
    }
    if (!object[name]) {
        object[name] = defaultVal;
    }
    return object[name];
};

const helpMiddleware = (mod, commandPrefix, event, next) => getHasPermission(event, mod.__descriptor.name) ? next() : false;
const matchMiddleware = (event, commandPrefix, descriptor, next) => getHasPermission(event, descriptor.name) ? next() : false;

// as help is its own module, it could load or unload at any time... sigh
let loaded = false;
const insertHelpMiddleware = () => {
    const help = exports.platform.getModule('help');
    // .length doesn't exist when length === 1, so help.length === 1 is always false
    if (!loaded && help && help.length !== 0 && !(help.length > 1) && help.use) {
        help.use('getHelp', helpMiddleware);
        loaded = true;
    }
};

const removeHelpMiddleware = () => {
    const help = exports.platform.getModule('help');
    if (loaded && help && help.length !== 0 && !(help.length > 1) && help.unuse) {
        help.unuse('getHelp', helpMiddleware);
        loaded = false;
    }
};

exports.load = platform => {
    platform.use('match', matchMiddleware);
    insertHelpMiddleware();
    platform.modulesLoader.on('load', insertHelpMiddleware);
    platform.modulesLoader.on('preunload', removeHelpMiddleware);
};

exports.unload = () => {
    exports.platform.unuse('match', matchMiddleware);
    exports.platform.modulesLoader.removeListener('load', insertHelpMiddleware);
    exports.platform.modulesLoader.removeListener('preunload', removeHelpMiddleware);
    removeHelpMiddleware();
};

exports.run = (api, event) => {
    const adminArguments = [
        {
            long: 'create',
            short: 'c',
            description: 'Assigns a new/existing permission to a module.',
            expects: ['Module Name', 'Permission Name'],
            run: (out, values) => {
                const name = values[0].trim().toLowerCase(),
                    permission = values[1].trim().toLowerCase();
                ensureCreated(exports.config, ['modules', name], []);
                if (exports.config.modules[name].includes(permission)) {
                    throw new Error('Failed to create permission. Please ensure permission has not already been created.');
                }
                exports.config.modules[name].push(permission);
            }
        },
        {
            long: 'delete',
            short: 'd',
            description: 'Removes an existing permission from a module.',
            expects: ['Module Name', 'Permission Name'],
            run: (out, values) => {
                const name = cleanString(values[0]),
                    permission = cleanString(values[1]);
                ensureCreated(exports.config, ['modules', name], []);
                const index = exports.config.modules[name].findIndex(i => i === permission);
                if (index < 0) {
                    throw new Error('Failed to delete permission. Please ensure permission has not already been deleted.');
                }
                exports.config.modules[name].splice(index, 1);
            }
        },
        {
            long: 'grant',
            short: 'g',
            description: 'Adds a timestamp to each output log message.',
            expects: ['Full Username/ID', 'Permission Name'],
            run: (out, values) => {
                const username = cleanString(values[0]),
                    permission = cleanString(values[1]);
                ensureCreated(exports.config, ['users', username, event.thread_id], []);
                if (exports.config.users[username][event.thread_id].includes(permission)) {
                    throw new Error('Failed to grant user permission. Please ensure permission has not already been granted.');
                }
                exports.config.users[username][event.thread_id].push(permission);
            }
        },
        {
            long: 'revoke',
            short: 'r',
            description: 'Sets the locale that should be used by the bot.',
            expects: ['Full Username/ID', 'Permission Name'],
            run: (out, values) => {
                const username = cleanString(values[0]),
                    permission = cleanString(values[1]);
                ensureCreated(exports.config, ['users', username, event.thread_id], []);
                const index = exports.config.users[username][event.thread_id].findIndex(i => i === permission);
                if (index < 0) {
                    throw new Error('Failed to revoke user permission. Please ensure permission has not already been revoked.');
                }
                exports.config.users[username][event.thread_id].splice(index, 1);
            }
        }
    ];

    try {
        const args = argumentParser.parseArguments(event.arguments.slice(1), adminArguments, {
            enabled: true,
            string: `${api.commandPrefix}admin`,
            colours: false
        });
        if (args.parsed['-h']) {
            api.sendMessage(args.parsed['-h'].out, event.thread_id);
        }
        else if (args.unassociated.length > 0 || event.arguments.length === 1) {
            api.sendMessage('Invalid usage of admin. Only grant, revoke, create and delete are avalible. See help or -h for usage.', event.thread_id);
        }
        else {
            api.sendMessage('Complete.', event.thread_id);
        }
    }
    catch (e) {
        api.sendMessage(e.message, event.thread_id);
    }
};
