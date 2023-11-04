import fs from "fs"
import decompress from "decompress"
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";

// find all mscz files
const msczFiles = fs.readdirSync("./").filter(f => f.endsWith(`.mscz`))
for (const msczFile of msczFiles) {
    // get file name without extension
    const name = msczFile.slice(0, -5)
    const path = "out/" + name

    // decompress mscz file
    const unzippedFiles = await decompress(msczFile, path)

    // iterate over all extracted mscx files
    for (const mscxFile of unzippedFiles.filter(f => f.path.endsWith(`.mscx`))) {

        var content = mscxFile.data.toString()

        // replace true value because its being parsed and rebuild wrong
        const strOrigTrue = `="true"`
        const strReplTrue = `="tru"`
        content = content.replaceAll(strOrigTrue, strReplTrue)

        // XML options
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

        // array of same length as Staff
        const staff_idx = Array(jObj.museScore.Score.Staff.length ?? 1)
        // iterate over possibly all StaffsF
        for (let k in staff_idx) {
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

        // rebuild xml
        const builder = new XMLBuilder(options);
        var updatedContent = builder.build(jObj);

        // replace true value back
        updatedContent = updatedContent.replaceAll(strReplTrue, strOrigTrue)

        fs.writeFileSync(path + "/" + mscxFile.path, updatedContent)
    }
}
console.log("done")