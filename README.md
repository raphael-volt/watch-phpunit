# phpunit-watcher

A command line tool for `PHPUnit`.        
- test suite selection
- live reload on file system changes


# Configuration

Create the `phpunit.config.json` at the root of your project.

```json
{
    "filter": "/**/*.xml",
    "cwd":"www",
    "dirs": [
        "specs/config"
    ],
    "cmd": "docker exec mycontainer phpunit",
    "watch": [
        "**/*.php",
        "specs/**/.xml"
    ]
}
``` 

Adapt it according to your project structure.

## **filter**

A specific pattern to limit search result.

## **cwd**

The relative path to the server document root.

## **dirs**

The Directories where the suites are stored (recursive search).  

## **cmd**

The command to use to run `PHPUnit`. 

## **watch**

The directories to watch on file system changes to live reload the current suite.