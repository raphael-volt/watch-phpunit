import { PHPUnitConfig } from "./iconfig";
import { join, relative, normalize } from "path";


export class PathResolver {
    private static _instance: PathResolver
    public static get instance() {
        if (!PathResolver._instance)
            PathResolver._instance = new PathResolver(null, process.cwd())
        return PathResolver._instance
    }
    protected constructor(
        public config: PHPUnitConfig,
        public cwd: string
    ) { }

    private _checkConfig() {
        if (!this.config)
            throw "PHPUnitConfig::config is undefined"
    }

    map(filename: string): string {
        this._checkConfig()
        const _config = this.config
        const from = join(this.cwd, _config.pathMapping.source)
        const rel = relative(from, filename)
        return join(_config.pathMapping.target, rel)
    }
    resolve(filename: string) {
        this._checkConfig()
        const src = this.config.pathMapping.source
        return join(src, filename)
    }
    checkPath(...parts: string[]) {
        parts = parts.filter(file => (file && file.length && file != "."))
        if(! parts.length)
            parts[0] = "."
        return normalize(join(...parts))
    }

}