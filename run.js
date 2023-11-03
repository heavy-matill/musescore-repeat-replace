import fs from "fs"
import decompress from "decompress"
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";

const name = "test"
const msczFile = name + ".mscz"
const path = "dist"
const mscxFile = path + "/" + name + ".mscx"
// rename to compare output
const mscxOutFile = mscxFile + "2"

// decompress mscz file
const files = await decompress(msczFile, path)

var content = fs.readFileSync(mscxFile, "utf-8")

// replace true value because its being parsed and rebuild wrong
const strOrigTrue = `="true"`
const strReplTrue = `="tru"`
content = content.replaceAll(strOrigTrue, strReplTrue)

const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@@",
    format: true,
    //preserveOrder: true,
    parseAttributeValue: false,
    allowBooleanAttributes: false
};
const parser = new XMLParser(options);
let jObj = parser.parse(content);

//console.log(jObj.museScore.Score.Staff)
let i = 0;
while (i < jObj.museScore.Score.Staff.Measure.length) {
    let rep = jObj.museScore.Score.Staff.Measure[i].measureRepeatCount ?? 0
    if (rep == 1) {
        while ((jObj.museScore.Score.Staff.Measure[i + rep]?.measureRepeatCount ?? 0) > rep) {
            rep++
        }
        let j = i - rep
        while (j < i) {
            jObj.museScore.Score.Staff.Measure[j + rep] = jObj.museScore.Score.Staff.Measure[j]
            j++
        }
    }
    i += Math.max(1, rep)
}

const builder = new XMLBuilder(options);
var updatedContent = builder.build(jObj);

// replace true value back
updatedContent = updatedContent.replaceAll(strReplTrue, strOrigTrue)

fs.writeFileSync(mscxOutFile, updatedContent)

console.log("done")