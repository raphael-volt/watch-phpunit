import { expect} from 'chai';
import { PathResolver } from "../src/core/path-resolver";
import { PHPUnitConfig } from "../src/core/iconfig";
import { join } from "path";

const cwd = "/home/foo/projects/my-project"
const conf: PHPUnitConfig = {
    cmd:"",
    watch:[],
    pathMapping:{
        source: "www",
        target: "/var/www/html"
    },
    suites: [{
        pattern: "**/*.xml",
        dirs: [

        ]
    }]
}
const resolver: PathResolver = PathResolver.instance
resolver.cwd = cwd
resolver.config = conf
describe("PathResolver", ()=>{
    it("should map", ()=>{
        let cwd = "/home/foo/projects/my-project"
        let file = join(cwd,"www/specs/config/suite.xml")
        expect("/var/www/html/specs/config/suite.xml").eq(resolver.map(file))
    })
    it("should resolve", () => {

        let res = resolver.resolve("foo/bar")
        expect(res).eq("www/foo/bar")
        
    })
    it('should normalize', ()=>{
        let res = resolver.checkPath("www", "specs", "config")
        expect(res).eq("www/specs/config")
        res = resolver.checkPath("www", "specs", "..")
        expect(res).eq("www")
        res = resolver.checkPath("www", "", "specs")
        expect(res).eq("www/specs")
        
        res = resolver.checkPath("www", null, "specs")
        expect(res).eq("www/specs")
        
        res = resolver.checkPath(null)
        expect(res).eq(".")
        res = resolver.checkPath()
        expect(res).eq(".")
        res = resolver.checkPath(".")
        expect(res).eq(".")
    })
})