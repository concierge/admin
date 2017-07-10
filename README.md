# Admin Controls

The `/admin` command provides the ability to control the usage of modules. For a full list of commands, use `/admin --help` (note commands can be chained).

### Installing
To install, use `/kpm install admin`.

### Configuration
Admin works through the concept of permission names. One or more permission names are associated with a module. Only if a user has been granted one of those permission names is it possible for them to use that module. Configuring should typically occur before starting the bot, as the `/admin` command is only designed for fine tuning after startup.

Configuration takes the form of the `admin` section in its `config.json` file in the following format:
```json
{
    "modules": {
        "<Module Name1>": ["<permissionName1>", "<permissionName2>", ...],
        "<Module Name2>": ["<permissionName3>", "<permissionName1>", ...],
        ...
    },
    "users": {
        "<Users Full Name Or ID in Lowercase>": {
            "<Thread Id Regex>": ["<permissionName1>", "<permissionName2>"]
        },
        ...
    }
}
```

For example, if you had the users "foo" and "bar". "foo" should be able to shutdown and update, but "bar" should only be able to update. The following configuration would achieve that (there are many ways of acheiving the same goal):
```json
{
    "modules": {
        "shutdown": ["canShutdown"],
        "update": ["canUpdate"]
    },
    "users": {
        "foo": {
            ".*": ["canShutdown", "canUpdate"]
        },
        "bar": {
            ".*": ["canUpdate"]
        }
    }
}
```

#### Notes
- Permissions can have any name.
- If no permission is added to a module, then everyone will have access.
- Users without access to a module will not see help for that module (if help is installed) and will not receive responses from it.
- It is possible to lock out everyone from a module. In the case that both `/shutdown` and `/restart` have no users that can access them - it is not possible to shutdown while safely saving module configuration.
- Other modules such as `kpm` can edit the configuration of `admin` at any time.
- The default user used by `test` integration is named `TESTING`.
