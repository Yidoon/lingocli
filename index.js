import { program } from "commander"
import OpenAI from "openai"
import dotenv from "dotenv"
import ora from "ora"
import pico from "picocolors"
import clipboard from "clipboardy"

dotenv.config()
const argv = process.argv
program.version("0.0.1").option("-s", "--save", "save to file")
let retry = 2
const oraInstance = ora({
  text: "Analyzing...",
  color: "green",
})

program.parse()

async function rquestOpenAi(text) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
  })
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
        你是一个翻译助手,帮我完成以下任务:
        1.将英文翻译成中文。
        2.如果文本有错误,请指出错误，如果没有则返回空字符串。
        3.对文本进行优化,给出一个优化后的文本,用英语表达。
        4.以 json的格式回复, json的key值有 origin, translate, correct, optimize。
      `,
      },
      {
        role: "user",
        content: text,
      },
    ],
    model: "gpt-3.5-turbo",
    temperature: 0,
  })
  return chatCompletion.choices[0].message.content
}

async function main(t) {
  oraInstance.stop()
  oraInstance.start()
  const text = t || argv[2]
  const result = await rquestOpenAi(text)
  // const result = await testFn(false, text)
  oraInstance.stop()
  try {
    const resultObj = JSON.parse(result)
    retry = 2
    oraInstance.stop()
    if (resultObj.correct) {
      console.log(pico.red(`😬 啊哦，有一丢丢错误哦 👇`))
      console.log(pico.red(`${resultObj.correct}`))
      console.log(pico.yellow(`💡 要不试试这个 👇`))
      console.log(pico.yellow(`${resultObj.optimize}`))
    } else {
      console.log(pico.red(`📝 ${resultObj.translate}`))
      console.log(pico.green(`😃 很棒，原文已复制到剪切板，可以直接粘贴使用哦`))
      clipboard.writeSync(text)
      console.log(pico.yellow(`😉 推荐方案: ${resultObj.optimize}`))
      console.log("按a 键选择推荐方案，按其他键退出")
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on("data", function (data) {
      const key = data.toString()
      if (key === "a") {
        clipboard.writeSync(resultObj.optimize)
      }
      process.exit()
    })
  } catch (error) {
    if (retry > 0) {
      retry -= 1
      main(text)
    } else {
      console.log(
        pico.red(
          `😭😭😭 sorry,代码好像坏掉了~~~, 要不重新试试？下面是报错信息 👇`
        )
      )
      console.log(error)
    }
  }
}

if (argv.length === 3) {
  main()
}
