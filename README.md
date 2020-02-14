# watch-phpunit

A command line tool for `PHPUnit`.        
- test suite selection
- live reload on file system changes

# Usage

```txt
Usage: watch-phpunit [options]
Options:    
    -h, --help       Show help.
    -v, --version    Show version number.
    -c --config      Create or override the configuration file.
```
`watch-phpunit` will prompt you to pick a suite from the search result list:
```bash
watch-phpunit
```
Use keybord arrows to highlight your choice, then press `<return>`

After the tests execution, you can :
- restart the suite
- select another suite
- `add|remove` a default suite
    - when a default suite is defined, you won't be asked to select a suite at startup 
- abort

The test suite will restart automatically when watched files are saved.

# Installation

- Localy
    ```bash
    npm i -D watch-phpunit
    ```
- Globaly
    ```bash
    npm i -g watch-phpunit
    ```

# Configuration

### `watch-phpunit.config.json` example

```json
{
    "suites": [
        {
            "pattern": "**/*.xml",
            "dirs": [
                "specs/config"
            ]
        }
    ],
    "watch": [
        {
            "pattern": "**/*.php",
            "dirs": [
                "."
            ]
        },
        {
            "pattern": "**/*.xml",
            "dirs": [
                "specs/config"
            ]
        }
    ],
    "cmd": "docker exec my-container phpunit",
    "pathMapping": {
        "source": "www",
        "target": "/var/www/html"
    }
}
```

### Project structure:

```txt
├── docker-compose.yml
├── package.json
├── README.md
├── watch-phpunit.config.json
├── www
│   ├── specs
│   │   └── config
│   │       ├── autoload-back.php
│   │       ├── autoload-front.php
│   │       ├── back.xml
│   │       └── front.xml
...
```

# npm scripts

- Add script entries to `package.json`:
    ```json
    {
        "scripts": {
            "wpu":"watch-phpunit",
            "wpu:config":"watch-phpunit -c"
        }
    }
    ```
- Run the script:
    ```bash
    npm run wpu
    npm run wpu:config
    ```
- Answer the questions
