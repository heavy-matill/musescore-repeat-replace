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
            preserveOrder: true,
            parseAttributeValue: false,
            allowBooleanAttributes: false
        };
        const parser = new XMLParser(options);
        let jObj = parser.parse(content);

        // step through object with numbers
        const i_museScore = Object.values(jObj).findIndex(v => Object.keys(v).includes("museScore"))
        const museScore = jObj[i_museScore].museScore
        const i_Score = Object.values(museScore).findIndex(v => Object.keys(v).includes("Score"))
        const Score = museScore[i_Score].Score
        const i_Staffs = Object.keys(Score).filter(i => Object.keys(Score[i]).includes("Staff"))

        // iterate over possibly all Staffs
        for (const k of i_Staffs) {
            const Staff = Score[k].Staff
            // run through all measures
            const i_Measures = Object.keys(Staff).filter(i => Object.keys(Staff[i]).includes("Measure"))
            let i = 0;
            while (i < i_Measures.length) {
                const Measure = Staff[i_Measures[i]].Measure
                const i_Repeat = Object.values(Measure).findIndex(v => Object.keys(v).includes("measureRepeatCount"))
                let rep = (i_Repeat >= 0) ? Measure[i_Repeat].measureRepeatCount : 0
                // if a measure contains measureRepeatCount = 1
                if (rep == 1) {
                    // find following measureRepeatCounts e.g. 1, 1-2 or 1-4
                    while (1) {
                        // check next Measure for continuing repeat
                        const nextMeasure = Staff[i_Measures[i + rep]].Measure
                        const i_nextRepeat = Object.values(nextMeasure).findIndex(v => Object.keys(v).includes("measureRepeatCount"))
                        const nextRep = (i_nextRepeat >= 0) ? nextMeasure[i_nextRepeat].measureRepeatCount : 0
                        if (nextRep > rep) {
                            rep = nextRep
                        } else {
                            break
                        }
                    }
                    let j = i - rep
                    // replace voice of the repeating measures by the reference (e.g. measure before, or 1-2 measures before...)
                    while (j < i) {
                        const i_targetVoice = Object.values(jObj[i_museScore].museScore[i_Score].Score[k].Staff[i_Measures[j + rep]].Measure).findIndex(v => Object.keys(v).includes("voice"))
                        const i_sourceVoice = Object.values(jObj[i_museScore].museScore[i_Score].Score[k].Staff[i_Measures[j]].Measure).findIndex(v => Object.keys(v).includes("voice"))
                        jObj[i_museScore].museScore[i_Score].Score[k].Staff[i_Measures[j + rep]].Measure[i_targetVoice].voice = jObj[i_museScore].museScore[i_Score].Score[k].Staff[i_Measures[j + rep]].Measure[i_sourceVoice].voice
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