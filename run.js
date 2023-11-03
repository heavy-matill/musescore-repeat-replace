import fs from "fs"
import decompress from "decompress"
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";

const name = "duo"
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

console.log(Object.keys(jObj.museScore.Score.Staff))
for (let k in jObj.museScore.Score.Staff) {
    let i = 0;
    // run through all measures
    while (i < jObj.museScore.Score.Staff[k].Measure.length) {
        let rep = jObj.museScore.Score.Staff[k].Measure[i].measureRepeatCount ?? 0
        // if a measure contains measureRepeatCount = 1
        if (rep == 1) {
            // find following measureRepeatCounts e.g. 1, 1-2 or 1-4
            while ((jObj.museScore.Score.Staff[k].Measure[i + rep]?.measureRepeatCount ?? 0) > rep) {
                rep++
            }
            let j = i - rep
            // replace voice of the repeating measures by the reference (e.g. measure before, or 1-2 measures before...)
            while (j < i) {
                jObj.museScore.Score.Staff[k].Measure[j + rep].voice = jObj.museScore.Score.Staff[k].Measure[j].voice
                j++
            }
        }
        // skip over the current measure or all the forthfollwing repeated measures (e.g. 1-2, 1-4)
        i += Math.max(1, rep)
    }
}

const builder = new XMLBuilder(options);
var updatedContent = builder.build(jObj);

// replace true value back
updatedContent = updatedContent.replaceAll(strReplTrue, strOrigTrue)

fs.writeFileSync(mscxOutFile, updatedContent)

console.log("done")